<?php
namespace ZenCommunity;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Classes\RoleManager;
use ZenCommunity\Database\Models\{
	Profile,
	Group
};
use Throwable;
use stdClass;
class Assets {

	/**
	 * Guards the shared app-runtime enqueue so the SPA template, page shortcode
	 * embeds and FSE blocks can all request it on the same request without
	 * double-enqueuing the bundle or re-declaring the localized global.
	 *
	 * @var bool
	 */
	protected static $runtime_enqueued = false;

	public static function init() {
		$self = new self();
		add_action( 'wp_enqueue_scripts', [ $self, 'frontend_scripts' ] );
		add_action( 'admin_enqueue_scripts', [ $self, 'enqueue_admin_assets' ] );
		add_filter( 'zencommunity/assets/script_data', [ self::CLASS, 'add_socket_data' ] );
		if(!is_admin()){
			add_action( 'wp_print_styles', [ self::CLASS, 'remove_theme_styles' ] , 1 );
			add_action( 'wp_print_scripts', [ self::CLASS, 'remove_theme_scripts' ] , 1 );
		}
		add_action( 'wp_head', [ self::CLASS, 'add_theme_mode_css' ] , 1 );

		// Hide StoreEngine's floating mini-cart on the community app via its
		// dedicated render-time filter (StoreEngine >= the version that added
		// `storeengine/frontend/show_floating_cart`).
		add_filter( 'storeengine/frontend/show_floating_cart', [ self::CLASS, 'disable_floating_cart_in_community' ] );
	}
	
	/**
	 * Filter callback for `storeengine/frontend/show_floating_cart`: hide
	 * StoreEngine's floating mini-cart on the community app, where it would
	 * just float over the ZenCommunity UI. The filter fires on `wp_footer`, so
	 * the main query is parsed and the community route var is available.
	 *
	 * @param bool $show Whether StoreEngine should render the floating cart.
	 * @return bool False on the community app, otherwise unchanged.
	 */
	public static function disable_floating_cart_in_community( $show ) {
		if ( ! $show ) {
			return $show;
		}

		$load_on_entire_site = (bool) Helper::get_setting( 'load_on_entire_site', false );

		if ( $load_on_entire_site || get_query_var( ZENCOMMUNITY_APP_ROUTE_QUERY_VAR ) === 'community' ) {
			return false;
		}

		return $show;
	}

	public static function is_enqueueable( string $src ) : bool {
		$whilists = apply_filters( 
			'zencommunity/enqueueable/plugins',
			[
				'zencommunity',
				'zencommunity-pro',
				'zencommunity-live-chat',
			]
		);

		$plugin_dir = plugins_url();
		foreach( $whilists as $plugin ) {
			if ( strpos( $src, "{$plugin_dir}/{$plugin}" ) === 0 ) 
				return true;
		}
		return false;
	}
	public static function remove_theme_scripts() : void {
        global $zencommunity_settings;

		// In Gutenberg (FSE) render mode the community is composed from blocks and
		// rendered through the theme's block-template pipeline, so it NEEDS the
		// theme + core scripts (wp-i18n, wp-element, interactivity, block view
		// scripts). Stripping non-whitelisted handles here deregisters core
		// dependencies like wp-i18n, which then silently drops the SPA runtime
		// (app.js) because a declared dependency is missing. Only strip for the
		// standalone React SPA, which wants a clean slate.
		if ( Helper::is_fse_mode() ) {
			return;
		}

        $load_on_entire_site = (bool) Helper::get_setting( 'load_on_entire_site', false ); // $zencommunity_settings->load_on_entire_site ?? false;

		if ( ! $load_on_entire_site && get_query_var( ZENCOMMUNITY_APP_ROUTE_QUERY_VAR ) !== 'community' ) {
			return;
		}

		global $wp_scripts;

		$theme_uris = [
			get_stylesheet_directory_uri(), // child theme
			get_template_directory_uri(),   // parent theme
		];

		// Protect the SPA runtime and its ENTIRE dependency chain from the strip
		// below. app.js declares core handles (react, react-dom,
		// react-jsx-runtime, wp-i18n, lodash, moment) as dependencies; those
		// aren't served from a ZenCommunity plugin, so the "not enqueueable"
		// rule would deregister them — and WordPress then silently refuses to
		// print app.js because a declared dependency is missing, taking the
		// whole community SPA down. Walk the dep graph and never strip a handle
		// app.js needs.
		$protected = [];
		$stack     = [ 'zencommunity-app-scripts' ];
		while ( $stack ) {
			$handle = array_pop( $stack );
			if ( isset( $protected[ $handle ] ) ) {
				continue;
			}
			$protected[ $handle ] = true;
			$registered = $wp_scripts->registered[ $handle ] ?? null;
			if ( $registered && ! empty( $registered->deps ) ) {
				foreach ( $registered->deps as $dep ) {
					$stack[] = $dep;
				}
			}
		}

		foreach ( $wp_scripts->queue ?? [] as $handle ) {
			if ( isset( $protected[ $handle ] ) ) {
				continue;
			}

			$script = wp_scripts()->registered[ $handle ] ?? null;

			if ( $script && isset( $script->src ) ) {
				foreach ( $theme_uris as $theme_uri ) {
					if (
						strpos( $script->src, $theme_uri ) === 0  ||
						! static::is_enqueueable( $script->src )
					) {
						// var_dump( 'Dequeued theme script: ' . $handle );
						wp_dequeue_script( $handle );
						wp_deregister_script( $handle );
						break;
					}
				}
			}
		}
	}

	public static function remove_theme_styles() : void {
		// Only act on the community itself.
		$load_on_entire_site = (bool) Helper::get_setting( 'load_on_entire_site', false );
		if ( ! $load_on_entire_site && get_query_var( ZENCOMMUNITY_APP_ROUTE_QUERY_VAR ) !== 'community' ) {
			return;
		}

		global $wp_styles;

		$theme_uris = [
			get_stylesheet_directory_uri(),
			get_template_directory_uri(),
		];

		$is_fse = Helper::is_fse_mode();

		foreach ( $wp_styles->queue ?? [] as $handle ) {
			$style = wp_styles()->registered[ $handle ] ?? null;

			if ( ! $style || ! is_string( $style->src ?? null ) || '' === $style->src ) {
				continue;
			}

			$src = $style->src;

			if ( $is_fse ) {
				// Gutenberg (FSE) render mode composes the community from blocks
				// in the theme's template, so it KEEPS the theme + core block/
				// global styles (layout, spacing, presets). But OTHER active
				// plugins' global frontend CSS has no business in the community
				// and conflicts with its component styling — e.g. growfund /
				// elementor common.css ship an aggressive `*{padding:0}` reset
				// that flattens every button and strips spacing. Strip only
				// those third-party plugin styles; keep zencommunity, theme, core.
				if ( static::is_enqueueable( $src ) ) {
					continue; // zencommunity's own styles
				}
				if ( strpos( $src, '/wp-includes/' ) !== false ) {
					continue; // WordPress core (block library, etc.)
				}
				$is_theme = false;
				foreach ( $theme_uris as $theme_uri ) {
					if ( strpos( $src, $theme_uri ) === 0 ) {
						$is_theme = true;
						break;
					}
				}
				if ( $is_theme ) {
					continue; // active theme (block styles / theme.json)
				}

				// Anything left is a third-party plugin style — drop it.
				wp_dequeue_style( $handle );
				wp_deregister_style( $handle );
				continue;
			}

			// React SPA render mode: clean slate — strip the theme and every
			// non-zencommunity stylesheet.
			foreach ( $theme_uris as $theme_uri ) {
				if (
					strpos( $src, $theme_uri ) === 0 ||
					! static::is_enqueueable( $src )
				) {
					wp_dequeue_style( $handle );
					wp_deregister_style( $handle );
					break;
				}
			}
		}
	}

	public static function add_socket_data( array $data ) : array {
        try {
			$roles = RoleManager::get_global_roles_by_user_id( get_current_user_id() );
			foreach ( $roles as $role => [ 'capabilities' => $capabilities ] ) {
				foreach ( $capabilities as $capability => [ 'disabled' => $disabled ] ) {
					$data['global_roles'][$role][$capability] = ! $disabled;
				}
			}
        }
        catch ( Throwable $e ) {}

		return $data;
	}
	
	public static function get_theme_mode_css( ?stdClass $settings) : array {
        if ( ! isset( $settings->theme ) )
            $settings->theme = new stdClass;

        if ( ! isset( $settings->theme->light ) )
            $settings->theme->light = new stdClass;

        if ( ! isset( $settings->theme->dark ) )
            $settings->theme->dark = new stdClass;

		$uid = get_current_user_id();
		$theme_mode = $uid ? get_user_meta(
				$uid,
				'zenc_theme_mode',
				true
			) : null;
		$theme_mode = in_array( $theme_mode, [ 'dark', 'light' ] ) ? $theme_mode : 'light';

		return [
			'theme_mode' => $theme_mode,
			'dark' => wp_parse_args(
				$settings->theme->dark ?? [],
				zencommunity_default_theme_settings()['theme']['dark']
			),
			'light' => wp_parse_args(
				$settings->theme->light ?? [],
				zencommunity_default_theme_settings()['theme']['light']
			)
		]; 
	}

	public static function add_theme_mode_css() : void {
		global $zencommunity_settings;
		$load_on_entire_site = (bool) Helper::get_setting( 'load_on_entire_site', false );
		if ( false === $load_on_entire_site  && 'community' !== get_query_var( ZENCOMMUNITY_APP_ROUTE_QUERY_VAR )  ) { 
			return;
		}

		$theme_settings = static::get_theme_mode_css( $zencommunity_settings );
		$curr_theme_fields = $theme_settings[$theme_settings['theme_mode']];
		
		// Map old variable names to new ones
		$variable_mapping = [
			'content_body_color' => 'body_background',
			'content_background_color' => 'background',
			'text_color' => 'font_color',
		];
		
		// Rename the keys before processing
		foreach ( $variable_mapping as $old_key => $new_key ) {
			if ( isset( $curr_theme_fields[ $old_key ] ) ) {
				$curr_theme_fields[ $new_key ] = $curr_theme_fields[ $old_key ];
				unset( $curr_theme_fields[ $old_key ] );
			}
		}
		
		array_walk(
			$curr_theme_fields,
			function( string &$val, string $key, string $prefix ) : void {
				$val = "\t\t" . $prefix . str_replace( '_', '-', $key ) . ': ' . $val . ';';
			},
			'--zencom-'
		);
		
		echo "<style>\n" . 
			"\t:root {\n".
				implode( "\n", $curr_theme_fields ) . "\n" .
			"\t}\n" . 
			"</style>\n";
	}

	public function frontend_scripts() {
		global $zencommunity_settings;
        $load_on_entire_site = (bool) Helper::get_setting( 'load_on_entire_site', false );
		if ( false === $load_on_entire_site  && 'community' !== get_query_var( ZENCOMMUNITY_APP_ROUTE_QUERY_VAR )  ) {
			return;
		}

		static::enqueue_app_runtime();
	}

	/**
	 * Enqueue the community React runtime (bundle + styles + localized global)
	 * exactly once per request. This is the single source of truth used by the
	 * SPA template (frontend_scripts), the page shortcode embeds and the FSE
	 * block render callback — all of which need the same app.js bundle to boot
	 * on pages WordPress doesn't otherwise route into the community.
	 */
	public static function enqueue_app_runtime() : void {
		if ( static::$runtime_enqueued ) {
			return;
		}

		$asset_path = ZENCOMMUNITY_ASSETS_DIR_PATH . sprintf( 'build/app.%s.asset.php', ZENCOMMUNITY_VERSION );
		if ( ! file_exists( $asset_path ) ) {
			return;
		}

		static::$runtime_enqueued = true;

		if ( ! did_action( 'wp_enqueue_media' ) ) {
			wp_enqueue_media();
		}

		wp_enqueue_style( 'zencommunity-app-style', ZENCOMMUNITY_ASSETS_URI . 'build/app.css', array(), filemtime( ZENCOMMUNITY_ASSETS_DIR_PATH . 'build/app.css' ), 'all' );

		// StoreEngine's floating mini-cart button renders on every frontend page via its
		// own wp_footer hook; it has no relevance inside the ZenCommunity app UI.
		wp_add_inline_style( 'zencommunity-app-style', '.storeengine-floating-cart { display: none !important; }' );

		// NOTE: FSE render-mode overrides do NOT belong here (this handle serves
		// the React SPA too). They live in the dedicated, FSE-only stylesheet
		// assets/css/fse.css, enqueued by FSE\Manager::enqueue_block_styles() —
		// keeping the two render modes' styling isolated so they can't conflict.

		$dependencies = include $asset_path;

		wp_enqueue_script(
            'zencommunity-app-scripts',
            ZENCOMMUNITY_ASSETS_URI . sprintf( 'build/app.%s.js', ZENCOMMUNITY_VERSION ),
            $dependencies['dependencies'],
            $dependencies['version'],
            true
        );

		wp_localize_script( 'zencommunity-app-scripts', 'ZencommunityGlobal', static::localized_data() );

		// Inter, bundled locally (assets/fonts/inter) — no third-party font request.
		wp_enqueue_style(
			'zencommunity-web-font',
			ZENCOMMUNITY_ASSETS_URI . 'fonts/inter/inter.css',
			[],
			ZENCOMMUNITY_VERSION
		);
		wp_set_script_translations( 'zencommunity-app-scripts', 'zencommunity', ZENCOMMUNITY_ROOT_DIR_PATH . 'i18n/languages' );
	}

	/**
	 * Installed/active state for one "Extend your Community" dashboard
	 * product, discovered dynamically (get_plugins() on its folder) rather
	 * than a hardcoded main-file name, so it correctly reports "not
	 * installed" when the folder doesn't exist yet.
	 *
	 * @param string $slug Plugin folder name, e.g. 'academy'.
	 * @return array{installed: bool, active: bool, file: ?string}
	 */
	protected static function extend_product_status( string $slug ) : array {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$plugins = get_plugins( '/' . $slug );
		if ( empty( $plugins ) ) {
			return [ 'installed' => false, 'active' => false, 'file' => null ];
		}
		$plugin_file = $slug . '/' . array_keys( $plugins )[0];
		return [ 'installed' => true, 'active' => is_plugin_active( $plugin_file ), 'file' => $plugin_file ];
	}

	/**
	 * Resolves a Login & Registration tab page selector ('zencommunity' | 'wordpress' |
	 * a WP Page ID) to an actual destination URL, or null when the community's
	 * own built-in /signin route should handle it. When left on the default
	 * "zencommunity" value, it still falls back to WP's native login/register
	 * page if the "Override WordPress Registration Setting" toggle is off -
	 * ZenCommunity's own signup form can't accept registrations in that case
	 * (see Auth::signup()), so there's nothing for the in-app page to do.
	 */
	protected static function resolve_auth_page_url( $value, bool $override_wp_registration, bool $is_register ) : ?string {
		if ( 'wordpress' === $value ) {
			return $is_register ? wp_registration_url() : wp_login_url();
		}
		if ( 'zencommunity' === $value || empty( $value ) ) {
			if ( ! $override_wp_registration ) {
				return $is_register ? wp_registration_url() : wp_login_url();
			}
			return null;
		}
		$permalink = get_permalink( absint( $value ) );
		return $permalink ?: null;
	}

	/**
	 * Pre-flight checks for the Setup Wizard's first step: PHP/WP version
	 * against this plugin's own header minimums (see the plugin file's
	 * "Requires PHP"/"Requires at least" headers), plus a short list of
	 * other community plugins that overlap ZenCommunity's own member/group
	 * features closely enough to cause confusion (roles, forums, groups)
	 * if both are active at once.
	 */
	protected static function env_check() : array {
		$required_php = '7.4';
		$required_wp  = '6.8';
		$wp_version   = get_bloginfo( 'version' );

		$known_conflicts = [
			'buddypress/bp-loader.php' => __( 'BuddyPress', 'zencommunity' ),
			'bbpress/bbpress.php'      => __( 'bbPress', 'zencommunity' ),
		];

		$conflicts = [];
		foreach ( $known_conflicts as $plugin_file => $label ) {
			if ( is_plugin_active( $plugin_file ) ) {
				$conflicts[] = $label;
			}
		}

		return [
			'php_version'  => PHP_VERSION,
			'required_php' => $required_php,
			'php_ok'       => version_compare( PHP_VERSION, $required_php, '>=' ),
			'wp_version'   => $wp_version,
			'required_wp'  => $required_wp,
			'wp_ok'        => version_compare( $wp_version, $required_wp, '>=' ),
			'conflicts'    => $conflicts,
		];
	}

	public static function localized_data( ?string $type = null) : ?array {
		global $zencommunity_settings;

		$data = [
				//  Security
				'timestamps'         => time(),
				'is_configured'      => ! empty( get_option( ZENCOMMUNITY_SETTINGS_NAME ) ),
				'is_permalink_plain' => empty( get_option( 'permalink_structure' ) ),
				'nonce'              => wp_create_nonce( 'wp_rest' ),
				'community_nonce'    => wp_create_nonce( 'zencommunity_nonce' ),

				//  Setup Wizard pre-flight (Step 1: PHP/WP version + known conflicts).
				'env_check'          => static::env_check(),

				// Site locale, normalized to moment.js's locale code format
				// (lowercase, hyphenated — e.g. "it_IT" -> "it-it") so the
				// frontend can set moment's locale for relative timestamps
				// ("2 hr ago" etc.), which otherwise always render in English
				// regardless of the admin's/translator's .mo files.
				'locale'             => str_replace( '_', '-', strtolower( get_locale() ) ),

				//  URLs & Paths
				'rest_url'           => esc_url_raw( rest_url() ),
				'ajaxurl'            => admin_url( 'admin-ajax.php' ),
				'admin_dashboard_url' => admin_url( 'admin.php?page=zencommunity-settings' ),
				'site_url'           => site_url(),
				'plugin_root_url'    => plugins_url( '', ZENCOMMUNITY_PLUGIN_FILE ),
				'plugin_root_path'   => plugin_dir_path( ZENCOMMUNITY_PLUGIN_FILE ),
				'current_permalink'  => get_permalink(),
				'is_plain_permalink' => ! get_option( 'permalink_structure' ),
				'active_addons'      => array_values( ( new Classes\Addon\Manager() )->get_activated() ),

				//  REST API
				'namespace'          => 'zencommunity/v1',
				'route_path'         => '/',
				'is_pro_active'      => is_plugin_active( 'zencommunity-pro/zencommunity-pro.php' ),

				//  Space content types (SureDash-style) for the create/edit UI
				'space_types'        => Classes\SpaceType::types(),
				//  Registered feed post types (extensions add their own)
				'feed_types'         => Database\Models\Feed::types(),

				//  Upload limits (bytes): WordPress's per-file limit, and the
				//  plugin's own image cap (Attachment::max_image_size_kb()).
				'max_upload_size'       => wp_max_upload_size(),
				'max_image_upload_size' => Database\Models\Attachment::max_image_size_kb() * KB_IN_BYTES,

				//  Current User
				'is_logged_in'        => is_user_logged_in(),
				'current_logged_user' => Profile::current(),
				'current_user_can'    => [
					'manage_options'     => current_user_can( 'manage_options' ),
				],
				// 'groups' 		  => Group::get_categories_with_its_groups( get_current_user_id() ),

				//  Settings from plugin
				'community_path'           => $zencommunity_settings->path ?? null,
				'render_mode'              => Helper::render_mode(),
				'is_fse_mode'              => Helper::is_fse_mode(),
				// FSE render mode requires a block theme (it builds the frontend from
				// block templates in the Site Editor). Surface the active theme's
				// capability so the settings UI can lock the FSE option when the
				// active theme is a classic (non-block) theme.
				'is_block_theme'           => function_exists( 'wp_is_block_theme' ) ? wp_is_block_theme() : false,
				'community_visibility'     => $zencommunity_settings->community_visibility ?? null,
				'allow_member_registration'=> $zencommunity_settings->allow_member_registration ?? null,
				'enable_date_of_birth_field' => $zencommunity_settings->enable_date_of_birth_field ?? false,
				'override_wp_registration' => $zencommunity_settings->override_wp_registration ?? true,
				// WordPress core's own "Anyone can register" option (Settings > General) -
				// read-only here; the Login & Registration tab surfaces it alongside the
				// override toggle that lives in $zencommunity_settings itself.
				'wp_users_can_register'    => (bool) get_option( 'users_can_register' ),
				'wp_general_settings_url'  => admin_url( 'options-general.php' ),
				// Login & Registration tab page selectors - resolved server-side to a
				// ready-to-use URL (or null when the in-app /signin route applies).
				'login_page'        => $zencommunity_settings->login_page ?? 'zencommunity',
				'register_page'     => $zencommunity_settings->register_page ?? 'zencommunity',
				'login_page_url'    => static::resolve_auth_page_url( $zencommunity_settings->login_page ?? 'zencommunity', $zencommunity_settings->override_wp_registration ?? true, false ),
				'register_page_url' => static::resolve_auth_page_url( $zencommunity_settings->register_page ?? 'zencommunity', $zencommunity_settings->override_wp_registration ?? true, true ),
				'site_logo'=> $zencommunity_settings->site_logo ?? null,
				'site_logo_dark'=> $zencommunity_settings->site_logo_dark ?? null,
				'show_cover_placeholder' => $zencommunity_settings->feed->show_cover_placeholder ?? true,
				'notification_position'=> $zencommunity_settings->notification_position ?? null,
				'theme_settings' => static::get_theme_mode_css( $zencommunity_settings ),
				'permitted_social_sites_for_link_sharing' => $zencommunity_settings->permitted_social_sites_for_link_sharing ?? [
                    'facebook',
                    'x',
                    'instagram',
                    'linkedin',
                    'email',
				],
				'pass_reset_url' => site_url( '/wp-login.php?action=lostpassword' ),
					
				'is_feed_title_required'=> $zencommunity_settings->feed->is_title_required ?? false,
				'feed_default_sort_by'=> $zencommunity_settings->feed->default_sort_by ?? 'created_at',
		];

		// "Extend your Community" dashboard cards - installed/active state for
		// each Kodezen sister product, computed the same way as the existing
		// is_academy_active/is_learndash_active flags the LMS addons expose.
		foreach ( [ 'academy', 'ablocks', 'storeengine', 'gemcrm', 'gemboards', 'gameengine', 'gembooking', 'zaplane', 'gemsecurity', 'trueplayer' ] as $slug ) {
			$status = static::extend_product_status( $slug );
			$data[ "is_{$slug}_installed" ] = $status['installed'];
			$data[ "is_{$slug}_active" ]    = $status['active'];
			$data[ "{$slug}_plugin_file" ]  = $status['file'];
		}

		return apply_filters(
			'zencommunity/assets' . ( empty( $type ) ? '' : '/' . $type ) . '/script_data',
			$data
		);
	}

	public function enqueue_admin_assets() : void {
		wp_enqueue_style(
			'zencommunity-admin-menu-style', ZENCOMMUNITY_ASSETS_URI . 'css/admin.menu.css',
			[],
			filemtime( ZENCOMMUNITY_ASSETS_DIR_PATH . 'css/admin.menu.css' )
		);
		
		// Load the settings SPA on every ZenCommunity admin screen (Dashboard +
		// the Spaces / Collections / Settings submenu pages), each of which has
		// its own page slug — screen->id differs per submenu, so gate on the page.
		if ( AdminMenu::is_current_admin_page() ) {
			
			if ( ! did_action( 'wp_enqueue_media' ) ) {
				wp_enqueue_media();
			}

			wp_enqueue_style( 'zencommunity-app-style', ZENCOMMUNITY_ASSETS_URI . 'build/app.css', array(), filemtime( ZENCOMMUNITY_ASSETS_DIR_PATH . 'build/app.css' ), 'all' );

			wp_enqueue_style( 'zencommunity-settings-style', ZENCOMMUNITY_ASSETS_URI . 'build/settings.css', array( 'wp-components' ), filemtime( ZENCOMMUNITY_ASSETS_DIR_PATH . 'build/settings.css' ), 'all' );

			$dependencies = include ZENCOMMUNITY_ASSETS_DIR_PATH . sprintf( 'build/settings.%s.asset.php', ZENCOMMUNITY_VERSION );

			wp_enqueue_script(
				'zencommunity-settings-scripts',
				ZENCOMMUNITY_ASSETS_URI . sprintf( 'build/settings.%s.js', ZENCOMMUNITY_VERSION ),
				$dependencies['dependencies'],
				$dependencies['version'],
				true
			);

			wp_set_script_translations( 'zencommunity-settings-scripts', 'zencommunity', ZENCOMMUNITY_ROOT_DIR_PATH . 'i18n/languages' );

			// wp_localize_script( 'zencommunity-settings-scripts', 'zencommunitySettings', [
			// 	'root'  => esc_url_raw(rest_url()),
			// 	'nonce' => wp_create_nonce('wp_rest'),
			// ] );
			// Reuse the full frontend payload so the wp-admin settings app has the
			// same globals it does on the frontend (theme_settings, active_addons,
			// current_logged_user, integration flags, render_mode, …). Add the
			// admin-only license page URL on top.
			wp_localize_script(
				'zencommunity-settings-scripts',
				'ZencommunityGlobal',
				array_merge(
					static::localized_data(),
					[ 'license_page_url' => admin_url( 'options-general.php?page=zencommunity-pro' ) ]
				)
			);
		}
	}
}