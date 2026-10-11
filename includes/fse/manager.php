<?php
/**
 * FSE (Gutenberg) render mode: registers ZenCommunity blocks that render as
 * React "islands" hydrated by the existing SPA bundle.
 *
 * @package ZenCommunity
 */

namespace ZenCommunity\Fse;

use ZenCommunity\Assets;
use ZenCommunity\Helper;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Manager {

	/**
	 * Block category slug used to group ZenCommunity blocks in the inserter.
	 */
	const CATEGORY = 'zencommunity';

	public static function init() : void {
		$self = new self();

		// Only register blocks, templates, patterns and the editor script when
		// FSE render mode is active — no point cluttering the block inserter of
		// every post/page (or registering FSE templates) while the site uses the
		// React SPA interface.
		if ( Helper::is_fse_mode() ) {
			add_action( 'init', [ $self, 'register_blocks' ] );
			add_action( 'init', [ $self, 'register_content' ] );
			add_filter( 'block_categories_all', [ $self, 'register_category' ] );
			add_action( 'enqueue_block_editor_assets', [ $self, 'enqueue_editor_assets' ] );
			add_action( 'wp_enqueue_scripts', [ $self, 'enqueue_block_styles' ], 5 );
			add_filter( 'zencommunity/assets/script_data', [ $self, 'inject_script_data' ] );
		}

		add_action( 'rest_api_init', [ $self, 'register_rest_routes' ] );
	}

	/**
	 * Expose which community routes have a distinct (customized/theme) per-view
	 * template. The SPA's shared-navigation does a full load for these so the
	 * dedicated template renders instead of client-routing within the current one.
	 */
	public function inject_script_data( $data ) {
		if ( is_array( $data ) && Helper::is_fse_mode() ) {
			$data['fse_view_routes'] = self::active_view_routes();
		}
		return $data;
	}

	/**
	 * Whether the current request renders the community in FSE mode.
	 */
	private static function is_fse_community_request() : bool {
		if ( ! Helper::is_fse_mode() ) {
			return false;
		}
		$slug     = get_query_var( ZENCOMMUNITY_APP_ROUTE_QUERY_VAR );
		$load_all = (bool) Helper::get_setting( 'load_on_entire_site', false );
		return $load_all || 'community' === $slug;
	}

	/**
	 * Force-load WordPress's core block + global (theme.json) styles on the FSE
	 * community route.
	 *
	 * The community renders through a forced template-canvas include, so WP's
	 * usual block-style enqueuing (which keys off block detection during
	 * wp_head, before our do_blocks runs) is skipped — leaving core layout
	 * blocks (columns, group flex, spacing) with no CSS. Enqueue them here so
	 * FSE-composed layouts (and users' own core blocks) render correctly.
	 */
	public function enqueue_block_styles() : void {
		if ( ! self::is_fse_community_request() ) {
			return;
		}

		wp_enqueue_style( 'wp-block-library' );
		wp_enqueue_style( 'wp-block-library-theme' );

		if ( function_exists( 'wp_enqueue_global_styles' ) ) {
			wp_enqueue_global_styles();
		}
		// The registered global-styles handle (theme.json layout + presets).
		if ( wp_style_is( 'global-styles', 'registered' ) ) {
			wp_enqueue_style( 'global-styles' );
		}

		// Dedicated FSE render-mode stylesheet — the isolation layer for every
		// FSE-only override. Depends on the SPA bundle's style handle so it
		// prints AFTER app.css and can override it, but its rules are all
		// scoped to FSE-only wrappers so nothing here reaches the React SPA.
		// Keeping FSE styles in their own file (instead of app.scss) stops the
		// two render modes — which share component class names — from conflicting.
		$fse_css = ZENCOMMUNITY_ASSETS_DIR_PATH . 'css/fse.css';
		if ( is_readable( $fse_css ) ) {
			wp_enqueue_style(
				'zencommunity-fse',
				ZENCOMMUNITY_ASSETS_URI . 'css/fse.css',
				[ 'zencommunity-app-style' ],
				filemtime( $fse_css ),
				'all'
			);
		}
	}

	/** Base community template slug (plugin namespace). */
	const TEMPLATE_SLUG = 'zencommunity//community';

	/**
	 * The block templates the plugin ships. Each is registered via
	 * register_block_template(), editable in the Site Editor, and overridable by
	 * a custom block theme (a theme file `templates/<slug>.html` wins).
	 * Per-view templates let site owners design each community view separately.
	 *
	 * @return array<string, string> slug => title
	 */
	public static function fse_templates() : array {
		return apply_filters( 'zencommunity/fse/templates', [
			'community'             => __( 'ZenCommunity: Community', 'zencommunity' ),
			'community-members'     => __( 'ZenCommunity: Members', 'zencommunity' ),
			'community-groups'      => __( 'ZenCommunity: Groups', 'zencommunity' ),
			'community-profile'     => __( 'ZenCommunity: Member Profile', 'zencommunity' ),
			'community-single-post' => __( 'ZenCommunity: Single Post', 'zencommunity' ),
		] );
	}

	/**
	 * Map a community route's first URL segment to a per-view template slug.
	 */
	public static function view_template_slug( string $view ) : string {
		$map = apply_filters( 'zencommunity/fse/view_map', [
			'members' => 'community-members',
			'member'  => 'community-profile',
			'groups'  => 'community-groups',
			'group'   => 'community-groups',
			'feed'    => 'community-single-post',
		] );
		return $map[ $view ] ?? 'community';
	}

	/**
	 * First URL segment of the current community route (e.g. "members"),
	 * relative to the configured community base path.
	 */
	public static function current_view() : string {
		$base = trim( (string) Helper::get_setting( 'path', '' ), '/' );
		$path = trim( (string) wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ?? '' ), PHP_URL_PATH ), '/' );

		if ( '' !== $base && 0 === strpos( $path, $base ) ) {
			$path = trim( substr( $path, strlen( $base ) ), '/' );
		}

		if ( '' === $path ) {
			return '';
		}
		$segments = explode( '/', $path );
		return $segments[0] ?? '';
	}

	/**
	 * Fetch a block template by slug: theme/custom first (so a block theme file
	 * or a Site Editor edit overrides the plugin default), then the plugin's
	 * registered default.
	 *
	 * @return \WP_Block_Template|null
	 */
	public static function get_template( string $slug ) {
		if ( ! function_exists( 'get_block_template' ) ) {
			return null;
		}
		$template = get_block_template( get_stylesheet() . '//' . $slug, 'wp_template' );
		if ( ! $template || empty( $template->content ) ) {
			$template = get_block_template( 'zencommunity//' . $slug, 'wp_template' );
		}
		return ( $template && ! empty( $template->content ) ) ? $template : null;
	}

	/**
	 * Whether a per-view template has actually been customized in the Site
	 * Editor or provided by the active theme (i.e. differs from the plugin
	 * default). Only then does the view get its own layout / dedicated template.
	 */
	public static function view_template_is_active( string $view ) : bool {
		$slug = self::view_template_slug( $view );
		if ( 'community' === $slug || ! function_exists( 'get_block_template' ) ) {
			return false;
		}
		$template = get_block_template( get_stylesheet() . '//' . $slug, 'wp_template' );
		return $template && ! empty( $template->content )
			&& in_array( $template->source, [ 'custom', 'theme' ], true );
	}

	/**
	 * Resolve the template for the current request: a per-view template when the
	 * site owner (or theme) has actually customized that view, otherwise the
	 * base community template. This keeps navigation smooth by default and only
	 * uses distinct per-view layouts where one was intentionally created.
	 *
	 * @return \WP_Block_Template|null
	 */
	public static function resolve_current_template() {
		$view = self::current_view();
		if ( self::view_template_is_active( $view ) ) {
			$specific = self::get_template( self::view_template_slug( $view ) );
			if ( $specific ) {
				return $specific;
			}
		}
		return self::get_template( 'community' );
	}

	/** Back-compat alias — the base community template. */
	public static function resolve_community_template() {
		return self::get_template( 'community' );
	}

	/**
	 * Route segments that resolve to an active (customized/theme) per-view
	 * template. Client-side navigation to these must do a full load so the
	 * distinct template renders. Exposed to JS via ZencommunityGlobal.
	 *
	 * @return array<int, string>
	 */
	public static function active_view_routes() : array {
		$routes = [];
		foreach ( array_keys( self::fse_templates() ) as $slug ) {
			if ( 'community' === $slug ) {
				continue;
			}
			// reverse-map template slug -> the route segments that use it
			foreach ( [ 'members', 'member', 'groups', 'group', 'feed' ] as $view ) {
				if ( self::view_template_slug( $view ) === $slug && self::view_template_is_active( $view ) ) {
					$routes[] = $view;
				}
			}
		}
		return array_values( array_unique( $routes ) );
	}

	/**
	 * Deep link to edit a community template in the Site Editor (block themes).
	 */
	public static function site_editor_url( string $slug = 'community' ) : string {
		$template = self::get_template( $slug );
		$id       = $template ? $template->id : ( get_stylesheet() . '//' . $slug );
		return admin_url( 'site-editor.php?postType=wp_template&postId=' . rawurlencode( $id ) . '&canvas=edit' );
	}

	/**
	 * REST route powering the "Edit in Site Editor" button + template list in
	 * admin settings.
	 */
	public function register_rest_routes() : void {
		register_rest_route(
			'zencommunity/v1',
			'/fse/community-page',
			[
				'methods'             => 'POST',
				'permission_callback' => function () {
					return current_user_can( 'edit_theme_options' );
				},
				'callback'            => function () {
					$templates = [];
					foreach ( self::fse_templates() as $slug => $title ) {
						$templates[] = [
							'slug'     => $slug,
							'title'    => $title,
							'edit_url' => self::site_editor_url( $slug ),
						];
					}
					return [
						'edit_url'       => self::site_editor_url( 'community' ),
						'templates'      => $templates,
						'is_block_theme' => (bool) wp_is_block_theme(),
					];
				},
			]
		);
	}

	/**
	 * Single source of truth for the ZenCommunity block catalog.
	 *
	 * Each block maps to a React component in the SPA bundle (see
	 * dev_zencommunity/fse/blockRegistry.js). `gate` names an optional
	 * dependency; the block is skipped when that dependency is inactive.
	 *
	 * @return array<string, array>
	 */
	public static function block_manifest() : array {
		return apply_filters( 'zencommunity/fse/blocks', [
			// ── Full community app (all routes work) ────────────────────────
			'community-app' => [
				'title'       => __( 'Community App', 'zencommunity' ),
				'description' => __( 'The complete community with working navigation — feed, members, groups, profiles and all sub-pages. Drop this in for a fully functional community.', 'zencommunity' ),
				'icon'        => 'screenoptions',
				'keywords'    => [ 'community', 'app', 'full', 'spa', 'router' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],

			// ── Content outlet (routed content for a custom composed layout) ─
			'content-outlet' => [
				'title'       => __( 'Community Content', 'zencommunity' ),
				'description' => __( 'The routed content area — shows the feed, members, groups, profiles and other views based on navigation. Place it alongside the Header and Sidebar blocks to build a fully custom, navigable layout.', 'zencommunity' ),
				'icon'        => 'welcome-view-site',
				'keywords'    => [ 'community', 'content', 'outlet', 'router', 'views' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],

			'content-body' => [
				'title'       => __( 'Community Content (no sidebars)', 'zencommunity' ),
				'description' => __( 'The routed content area (feed, members, groups…) WITHOUT its built-in sidebars — drop it in your own center column next to the Sidebar blocks. Navigation swaps just this area.', 'zencommunity' ),
				'icon'        => 'align-center',
				'keywords'    => [ 'community', 'content', 'body', 'router', 'views' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],

			// ── Granular chrome blocks (build your own nav bar, SureDash-style) ─
			'navigation' => [
				'title'       => __( 'Community Navigation', 'zencommunity' ),
				'description' => __( 'The community menu (feed, groups, members…) as a standalone nav. Drives the Content Outlet.', 'zencommunity' ),
				'icon'        => 'menu',
				'keywords'    => [ 'community', 'navigation', 'menu', 'nav' ],
				'attributes'  => [
					'menuKey'     => [ 'type' => 'string', 'default' => 'top_menu' ],
					'orientation' => [ 'type' => 'string', 'default' => 'horizontal' ],
				],
				'gate'        => null,
			],
			'search' => [
				'title'       => __( 'Community Search', 'zencommunity' ),
				'description' => __( 'Search the community feed with a live results dropdown.', 'zencommunity' ),
				'icon'        => 'search',
				'keywords'    => [ 'community', 'search', 'find' ],
				'attributes'  => [
					'placeholder' => [ 'type' => 'string', 'default' => '' ],
				],
				'gate'        => null,
			],
			'notifications' => [
				'title'       => __( 'Notifications', 'zencommunity' ),
				'description' => __( 'The real-time notifications bell.', 'zencommunity' ),
				'icon'        => 'bell',
				'keywords'    => [ 'community', 'notifications', 'bell', 'alerts' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],
			'identity' => [
				'title'       => __( 'Identity', 'zencommunity' ),
				'description' => __( 'The signed-in user avatar + profile menu, or a sign-in button for guests.', 'zencommunity' ),
				'icon'        => 'admin-users',
				'keywords'    => [ 'community', 'profile', 'account', 'avatar', 'login' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],
			'theme-toggle' => [
				'title'       => __( 'Light / Dark Toggle', 'zencommunity' ),
				'description' => __( 'Switch between light and dark mode.', 'zencommunity' ),
				'icon'        => 'visibility',
				'keywords'    => [ 'community', 'theme', 'dark mode', 'light' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],

			// ── Layout parts (compose a single custom view) ─────────────────
			'header' => [
				'title'       => __( 'Community Header', 'zencommunity' ),
				'description' => __( 'The ZenCommunity top bar with search, notifications and profile.', 'zencommunity' ),
				'icon'        => 'admin-site-alt3',
				'keywords'    => [ 'community', 'header', 'topbar', 'nav' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],
			'chat-head' => [
				'title'       => __( 'Community Chat Head', 'zencommunity' ),
				'description' => __( 'Floating chat bubbles and the quick Messages panel opened from the header. Add once per page alongside the Header block.', 'zencommunity' ),
				'icon'        => 'format-chat',
				'keywords'    => [ 'community', 'chat', 'messages', 'floating' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],
			'left-sidebar' => [
				'title'       => __( 'Community Left Sidebar', 'zencommunity' ),
				'description' => __( 'Profile card, navigation menu and collections/spaces.', 'zencommunity' ),
				'icon'        => 'align-pull-left',
				'keywords'    => [ 'community', 'sidebar', 'menu', 'navigation' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],
			'right-sidebar' => [
				'title'       => __( 'Community Right Sidebar', 'zencommunity' ),
				'description' => __( 'Members, events and welcome banner widgets.', 'zencommunity' ),
				'icon'        => 'align-pull-right',
				'keywords'    => [ 'community', 'sidebar', 'members', 'events' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],
			'feed-stream' => [
				'title'       => __( 'Feed Stream', 'zencommunity' ),
				'description' => __( 'The community activity feed.', 'zencommunity' ),
				'icon'        => 'list-view',
				'keywords'    => [ 'community', 'feed', 'posts', 'activity' ],
				'attributes'  => [
					'sortBy'  => [ 'type' => 'string', 'default' => 'created_at' ],
					'groupId' => [ 'type' => 'number', 'default' => 0 ],
				],
				'gate'        => null,
			],
			'post-composer' => [
				'title'       => __( 'Post Composer', 'zencommunity' ),
				'description' => __( 'The "start a post" composer box.', 'zencommunity' ),
				'icon'        => 'edit',
				'keywords'    => [ 'community', 'post', 'composer', 'write' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],
			'welcome-banner' => [
				'title'       => __( 'Welcome Banner', 'zencommunity' ),
				'description' => __( 'The community welcome banner.', 'zencommunity' ),
				'icon'        => 'megaphone',
				'keywords'    => [ 'community', 'banner', 'welcome', 'announcement' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],
			'guest-cta' => [
				'title'       => __( 'Guest Sign-in CTA', 'zencommunity' ),
				'description' => __( 'Sign-in / sign-up prompt shown to logged-out visitors.', 'zencommunity' ),
				'icon'        => 'admin-users',
				'keywords'    => [ 'community', 'login', 'signup', 'guest' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],

			// ── Full views (self-contained; place on their own template) ────
			'groups-view' => [
				'title'       => __( 'Groups', 'zencommunity' ),
				'description' => __( 'The community groups directory.', 'zencommunity' ),
				'icon'        => 'groups',
				'keywords'    => [ 'community', 'groups' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],
			'members-view' => [
				'title'       => __( 'Members', 'zencommunity' ),
				'description' => __( 'The community members directory.', 'zencommunity' ),
				'icon'        => 'admin-users',
				'keywords'    => [ 'community', 'members', 'people' ],
				'attributes'  => new \stdClass(),
				'gate'        => null,
			],
			'leaderboard-view' => [
				'title'       => __( 'Leaderboard', 'zencommunity' ),
				'description' => __( 'Gamification leaderboard (requires GameEngine).', 'zencommunity' ),
				'icon'        => 'awards',
				'keywords'    => [ 'community', 'leaderboard', 'gamification', 'points' ],
				'attributes'  => new \stdClass(),
				'gate'        => 'gameengine',
			],
		] );
	}

	/**
	 * Whether a manifest `gate` dependency is satisfied.
	 */
	private static function gate_passes( ?string $gate ) : bool {
		if ( empty( $gate ) ) {
			return true;
		}

		switch ( $gate ) {
			case 'gameengine':
				return is_plugin_active( 'gameengine/gameengine.php' );
		}

		return (bool) apply_filters( "zencommunity/fse/gate/{$gate}", false );
	}

	/**
	 * Block-editor `supports` shared by every ZenCommunity block so authors can
	 * customize each one from the block Settings sidebar. These are WordPress's
	 * native supports — the controls appear automatically in the editor and the
	 * generated styles are applied server-side via get_block_wrapper_attributes()
	 * in render_block(), so they work on the dynamic island wrappers too.
	 *
	 * @return array<string, mixed>
	 */
	public static function customize_supports() : array {
		return apply_filters( 'zencommunity/fse/block_supports', [
			'html'       => false,
			'align'      => [ 'wide', 'full' ],
			'spacing'    => [
				'margin'  => true,
				'padding' => true,
			],
			'dimensions' => [
				'minHeight' => true,
			],
			'color'      => [
				'background' => true,
				'gradients'  => true,
				'text'       => false,
			],
		] );
	}

	/**
	 * Register each manifest block server-side with a shared render callback.
	 */
	public function register_blocks() : void {
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		foreach ( self::block_manifest() as $name => $config ) {
			if ( ! self::gate_passes( $config['gate'] ?? null ) ) {
				continue;
			}

			$attributes = $config['attributes'] ?? new \stdClass();
			if ( $attributes instanceof \stdClass ) {
				$attributes = [];
			}

			register_block_type(
				'zencommunity/' . $name,
				[
					'api_version'     => 3,
					'title'           => $config['title'],
					'description'     => $config['description'] ?? '',
					'category'        => self::CATEGORY,
					'icon'            => $config['icon'] ?? 'screenoptions',
					'keywords'        => $config['keywords'] ?? [],
					'attributes'      => $attributes,
					'render_callback' => [ $this, 'render_block' ],
					'supports'        => self::customize_supports(),
				]
			);
		}

		$this->register_portal_block();
	}

	/**
	 * The "Community Portal" container block (SureDash-style): a single parent
	 * block that holds inner blocks (the header, sidebars, content-outlet, …).
	 * Composing the community layout becomes drag-and-drop inner-block editing
	 * instead of juggling many top-level blocks. Its save is <InnerBlocks.Content>
	 * (see the editor bundle); this render wraps the inner blocks in a layout
	 * container so they arrange as a flex column.
	 */
	public function register_portal_block() : void {
		register_block_type(
			'zencommunity/portal',
			[
				'api_version'     => 3,
				'title'           => __( 'Community Portal', 'zencommunity' ),
				'description'     => __( 'A container for the whole community layout. Add the Header, Sidebar and Content blocks inside and arrange them — the easy way to manage your portal layout.', 'zencommunity' ),
				'category'        => self::CATEGORY,
				'icon'            => 'layout',
				'keywords'        => [ 'community', 'portal', 'layout', 'container' ],
				'render_callback' => [ $this, 'render_portal' ],
				'supports'        => self::customize_supports(),
			]
		);
	}

	/**
	 * Render the Community Portal: wrap the (already block-rendered) inner
	 * content in a layout container. do_blocks() renders any inner blocks the
	 * editor saved as raw markup, matching the InnerBlocks.Content save.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $content    Inner blocks markup.
	 */
	public function render_portal( array $attributes, string $content ) : string {
		$wrapper = function_exists( 'get_block_wrapper_attributes' )
			? get_block_wrapper_attributes( [ 'class' => 'zencom-fse-portal' ] )
			: 'class="zencom-fse-portal"';

		return sprintf( '<div %1$s>%2$s</div>', $wrapper, do_blocks( $content ) );
	}

	/**
	 * Shared render callback: emits an island mount node the SPA hydrates.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $content    Inner content (unused).
	 * @param object $block      WP_Block instance.
	 */
	public function render_block( array $attributes, string $content, $block ) : string {
		$this->enqueue_runtime();

		// e.g. "zencommunity/feed-stream" -> "feed-stream"
		$type  = isset( $block->name ) ? str_replace( 'zencommunity/', '', $block->name ) : '';
		$props = wp_json_encode( (object) $attributes );
		if ( false === $props ) {
			$props = '{}';
		}

		$wrapper = function_exists( 'get_block_wrapper_attributes' )
			? get_block_wrapper_attributes( [ 'class' => 'zencom-fse-block zencom-fse-block--' . sanitize_html_class( $type ) ] )
			: 'class="zencom-fse-block"';

		return sprintf(
			'<div %1$s data-zc-block="%2$s" data-props="%3$s"></div>',
			$wrapper,
			esc_attr( $type ),
			esc_attr( $props )
		);
	}

	/**
	 * Enqueue the SPA runtime + config once, when a block actually renders.
	 * Delegates to the shared Assets runtime enqueue so the SPA template, page
	 * shortcode embeds and FSE blocks all boot the exact same bundle + global.
	 */
	public function enqueue_runtime() : void {
		Assets::enqueue_app_runtime();
	}

	/**
	 * Default community layout: the full app block so every route (feed,
	 * members, groups, member/:id, group/:id, …) works out of the box. Used by
	 * the community page, the starter pattern and the block template.
	 */
	private static function default_layout_markup() : string {
		return '<!-- wp:zencommunity/community-app /-->';
	}

	/** Wrap composable layout markup in the Community Portal container block. */
	private static function wrap_portal( string $inner ) : string {
		return '<!-- wp:zencommunity/portal -->' . $inner . '<!-- /wp:zencommunity/portal -->';
	}

	/**
	 * Decomposed layout for advanced single-view pages: header + sidebars +
	 * feed built from individual blocks. Registered as an alternative pattern.
	 * Note: this composes the feed view only — cross-view routing (members,
	 * groups, profiles) needs the Community App block.
	 */
	private static function classic_layout_markup() : string {
		// The full pre-built header bar + the routed content outlet.
		return self::wrap_portal(
			'<!-- wp:zencommunity/header /-->'
			. '<!-- wp:zencommunity/chat-head /-->'
			. '<!-- wp:zencommunity/content-outlet /-->'
		);
	}

	/** A custom top bar built from granular blocks + the content outlet. */
	private static function modern_layout_markup() : string {
		return self::wrap_portal(
			'<!-- wp:group {"align":"full","className":"zencom-fse-topbar","layout":{"type":"flex","justifyContent":"space-between","flexWrap":"nowrap"}} -->'
				. '<div class="wp-block-group alignfull zencom-fse-topbar">'
					. '<!-- wp:zencommunity/navigation /-->'
					. '<!-- wp:zencommunity/search /-->'
					. '<!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap"}} --><div class="wp-block-group">'
						. '<!-- wp:zencommunity/notifications /-->'
						. '<!-- wp:zencommunity/theme-toggle /-->'
						. '<!-- wp:zencommunity/identity /-->'
					. '</div><!-- /wp:group -->'
				. '</div>'
			. '<!-- /wp:group -->'
			. '<!-- wp:zencommunity/content-outlet /-->'
		);
	}

	/** Minimal app-style bar: navigation + identity + content. */
	private static function application_layout_markup() : string {
		return self::wrap_portal(
			'<!-- wp:group {"align":"full","className":"zencom-fse-topbar","layout":{"type":"flex","justifyContent":"space-between","flexWrap":"nowrap"}} -->'
				. '<div class="wp-block-group alignfull zencom-fse-topbar">'
					. '<!-- wp:zencommunity/navigation /-->'
					. '<!-- wp:zencommunity/identity /-->'
				. '</div>'
			. '<!-- /wp:group -->'
			. '<!-- wp:zencommunity/content-outlet /-->'
		);
	}

	/**
	 * Default content for the block templates: a header + a navigable, columned
	 * layout (left sidebar / routed content / right sidebar) that site owners
	 * can rearrange per view.
	 */
	private static function portal_default_markup() : string {
		return self::wrap_portal(
			'<!-- wp:zencommunity/header /-->'
			. '<!-- wp:zencommunity/chat-head /-->'
			. '<!-- wp:columns {"align":"wide"} --><div class="wp-block-columns alignwide">'
				. '<!-- wp:column {"width":"280px"} --><div class="wp-block-column" style="flex-basis:280px">'
					. '<!-- wp:zencommunity/left-sidebar {"style":{"spacing":{"padding":{"top":"16px","right":"12px","bottom":"16px","left":"12px"}}}} /-->'
				. '</div><!-- /wp:column -->'
				. '<!-- wp:column --><div class="wp-block-column">'
					. '<!-- wp:zencommunity/content-body /-->'
				. '</div><!-- /wp:column -->'
				. '<!-- wp:column {"width":"300px"} --><div class="wp-block-column" style="flex-basis:300px">'
					. '<!-- wp:zencommunity/right-sidebar {"style":{"spacing":{"padding":{"top":"16px","right":"12px","bottom":"16px","left":"12px"}}}} /-->'
				. '</div><!-- /wp:column -->'
			. '</div><!-- /wp:columns -->'
		);
	}

	/**
	 * Register the starter pattern and (on block themes) a block template so
	 * switching to FSE mode reproduces the default community out of the box.
	 */
	public function register_content() : void {
		if ( function_exists( 'register_block_pattern_category' ) ) {
			register_block_pattern_category(
				self::CATEGORY,
				[ 'label' => __( 'ZenCommunity', 'zencommunity' ) ]
			);
		}

		if ( function_exists( 'register_block_pattern' ) ) {
			register_block_pattern(
				'zencommunity/full-community',
				[
					'title'       => __( 'Full Community (all routes)', 'zencommunity' ),
					'description' => __( 'The complete community app with working navigation.', 'zencommunity' ),
					'categories'  => [ self::CATEGORY ],
					'content'     => self::default_layout_markup(),
				]
			);

			register_block_pattern(
				'zencommunity/portal-classic',
				[
					'title'       => __( 'Portal: Classic', 'zencommunity' ),
					'description' => __( 'The full header bar + content. Simple and complete.', 'zencommunity' ),
					'categories'  => [ self::CATEGORY ],
					'content'     => self::classic_layout_markup(),
				]
			);

			register_block_pattern(
				'zencommunity/portal-modern',
				[
					'title'       => __( 'Portal: Modern', 'zencommunity' ),
					'description' => __( 'A custom top bar (navigation, notifications, theme toggle, identity) + content — built from individual blocks you can rearrange.', 'zencommunity' ),
					'categories'  => [ self::CATEGORY ],
					'content'     => self::modern_layout_markup(),
				]
			);

			register_block_pattern(
				'zencommunity/portal-application',
				[
					'title'       => __( 'Portal: Application', 'zencommunity' ),
					'description' => __( 'A minimal app-style bar (navigation + identity) + content.', 'zencommunity' ),
					'categories'  => [ self::CATEGORY ],
					'content'     => self::application_layout_markup(),
				]
			);
		}

		// Plugin-provided block templates for the Site Editor (WP 6.7+, block
		// themes). The base "community" template plus one per major view — each
		// editable in the Site Editor and overridable by a custom block theme
		// (a theme file templates/<slug>.html takes precedence).
		if ( function_exists( 'register_block_template' ) ) {
			foreach ( self::fse_templates() as $slug => $title ) {
				register_block_template(
					'zencommunity//' . $slug,
					[
						'title'       => $title,
						'description' => 'community' === $slug
							? __( 'Base community layout composed from ZenCommunity blocks.', 'zencommunity' )
							: __( 'Per-view community layout — customize to give this view its own design. A block theme can override it.', 'zencommunity' ),
						'content'     => self::portal_default_markup(),
					]
				);
			}
		}
	}

	/**
	 * Register the ZenCommunity block category.
	 */
	public function register_category( array $categories ) : array {
		foreach ( $categories as $category ) {
			if ( isset( $category['slug'] ) && self::CATEGORY === $category['slug'] ) {
				return $categories;
			}
		}

		array_unshift(
			$categories,
			[
				'slug'  => self::CATEGORY,
				'title' => __( 'ZenCommunity', 'zencommunity' ),
				'icon'  => null,
			]
		);

		return $categories;
	}

	/**
	 * Enqueue the block-editor script that registers the blocks for the inserter.
	 */
	public function enqueue_editor_assets() : void {
		$asset_path = ZENCOMMUNITY_ASSETS_DIR_PATH . sprintf( 'build/fse-editor.%s.asset.php', ZENCOMMUNITY_VERSION );
		if ( ! file_exists( $asset_path ) ) {
			return;
		}
		$dependencies = include $asset_path;

		wp_enqueue_script(
			'zencommunity-fse-editor',
			ZENCOMMUNITY_ASSETS_URI . sprintf( 'build/fse-editor.%s.js', ZENCOMMUNITY_VERSION ),
			$dependencies['dependencies'],
			$dependencies['version'],
			true
		);

		wp_localize_script(
			'zencommunity-fse-editor',
			'ZencommunityFseBlocks',
			[
				'category' => self::CATEGORY,
				'blocks'   => self::editor_manifest(),
			]
		);

		// The editor renders the REAL frontend components as live previews
		// (see fse/editor/LivePreview.js), which need the same runtime config the
		// frontend app gets — REST url + nonce for data fetches, the plugin asset
		// URL to load app.css into the editor iframe, and the theme palette.
		wp_localize_script( 'zencommunity-fse-editor', 'ZencommunityGlobal', Assets::localized_data() );

		wp_set_script_translations( 'zencommunity-fse-editor', 'zencommunity', ZENCOMMUNITY_ROOT_DIR_PATH . 'i18n/languages' );
	}

	/**
	 * The manifest reduced to what the editor bundle needs to register blocks.
	 *
	 * @return array<int, array>
	 */
	private static function editor_manifest() : array {
		$blocks = [];
		foreach ( self::block_manifest() as $name => $config ) {
			if ( ! self::gate_passes( $config['gate'] ?? null ) ) {
				continue;
			}
			$attributes = $config['attributes'] ?? new \stdClass();
			if ( $attributes instanceof \stdClass ) {
				$attributes = [];
			}
			$blocks[] = [
				'name'        => 'zencommunity/' . $name,
				'title'       => $config['title'],
				'description' => $config['description'] ?? '',
				'icon'        => $config['icon'] ?? 'screenoptions',
				'keywords'    => $config['keywords'] ?? [],
				'attributes'  => (object) $attributes,
			];
		}
		return $blocks;
	}
}
