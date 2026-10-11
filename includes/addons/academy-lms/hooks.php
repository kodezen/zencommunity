<?php

namespace ZenCommunity\Addons\AcademyLms;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Database\Utils\QueryBuilder;
use ZenCommunity\Addons\AcademyLms\Database\Models\Relation;
class Hooks {
	/**
	 * Set to the course id when the current request is a native learn route
	 * ({community}/learn/{id}); consumed by native_learn_template().
	 */
	private static $learn_course_id = 0;

	public static function init() : void {
		add_action( 'zencommunity/group/created', [ self::CLASS, 'update' ] );
		add_action( 'zencommunity/group/updated', [ self::CLASS, 'update' ] );
		add_filter( "zencommunity/group/wrapper/collection", [ self::CLASS, 'response' ] );
		add_filter( "zencommunity/group/wrapper/single", [ self::CLASS, 'single_response' ], 10, 2 );
		add_filter( 'zencommunity/assets/script_data', [ self::CLASS, 'script_data' ] );
		add_filter( 'zencommunity/rewrite/app_slugs', [ self::CLASS, 'app_slugs' ] );
		// Native learn route: detect + set up before the SPA redirect (10) and
		// win the template (100, after ZenCommunity's own template_include).
		add_action( 'template_redirect', [ self::CLASS, 'maybe_render_native_learn' ], 5 );
		add_filter( 'template_include', [ self::CLASS, 'native_learn_template' ], 100 );
		add_action( 'template_redirect', [ self::CLASS, 'maybe_redirect_to_spa' ] );
		add_filter( 'zencommunity/menu', [ self::CLASS, 'register_menu_items' ] );
		add_filter( 'zencommunity/feed/create/sanitaization/rules', [ self::CLASS, 'feed_meta_rules' ] );
		add_filter( 'zencommunity/feed/wrapper/single', [ self::CLASS, 'enrich_course_feed' ] );
	}

	/**
	 * Attach course display data to academy-triggered feed posts so the SPA can
	 * render rich cards (badge, linked course name, "View course") without an
	 * extra fetch. Old posts already carry meta.course_id, so they get the new
	 * UI too. Skipped when the course is gone — the SPA falls back to the plain
	 * rendered content.
	 */
	public static function enrich_course_feed( array $feed ) : array {
		$course_id = absint( $feed['meta']['course_id'] ?? 0 );
		$event     = (string) ( $feed['meta']['event'] ?? '' );

		if ( ! $course_id || '' === $event ) {
			return $feed;
		}

		$course = get_post( $course_id );
		if ( ! $course || 'academy_courses' !== $course->post_type ) {
			return $feed;
		}

		$terms = get_the_terms( $course_id, 'academy_courses_category' );

		$feed['meta']['course'] = [
			'id'       => $course_id,
			'title'    => get_the_title( $course ),
			'author'   => get_the_author_meta( 'display_name', (int) $course->post_author ),
			'category' => ( is_array( $terms ) && ! empty( $terms ) ) ? $terms[0]->name : '',
		];

		return $feed;
	}

	/**
	 * Let academy-triggered feed posts (enrollment, completion, Q&A, etc.) carry
	 * the source course id + event key in `meta`, so they can be queried back
	 * for a course-scoped view (e.g. "Course Q&A").
	 */
	public static function feed_meta_rules( array $rules ) : array {
		$rules['meta.course_id'] = Sanitizer::INT;
		$rules['meta.event']     = Sanitizer::STRING;
		return $rules;
	}

	/**
	 * Add a "Courses" item to the primary and profile menus so admins can
	 * show/hide/reorder it from Menu settings like any native item. The SPA
	 * resolves the "Courses" label (or explicit route) to the /courses route.
	 * Not added to the top menu by default.
	 */
	public static function register_menu_items( array $menus ) : array {
		if ( ! class_exists( '\Academy\Helper' ) ) {
			return $menus;
		}

		// Hide the catalog menu item when the standalone catalog is turned off.
		if ( ! \ZenCommunity\Addons\AcademyLms\Classes\Policy::global()['show_catalog'] ) {
			return $menus;
		}

		$icon = [
			'type' => 'emoji',
			'src'  => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
		];

		$item = static fn( string $id ) : array => [
			'id'     => $id,
			'type'   => 'default',
			'label'  => 'Courses',
			'route'  => '/courses',
			'status' => true,
			'icon'   => $icon,
		];

		foreach ( [ 'primary_menu', 'profile_menu' ] as $key ) {
			if ( ! isset( $menus[ $key ] ) || ! is_array( $menus[ $key ] ) ) {
				continue;
			}
			// Skip if already present (filter can run more than once).
			$ids = array_column( $menus[ $key ], 'id' );
			$id  = 'menu_' . ( 'primary_menu' === $key ? '' : str_replace( '_menu', '', $key ) . '_' ) . 'courses';
			if ( in_array( $id, $ids, true ) ) {
				continue;
			}
			$menus[ $key ][] = $item( $id );
		}

		return $menus;
	}

	/**
	 * Register the SPA course routes so deep links resolve on root-domain installs.
	 */
	public static function app_slugs( array $slugs ) : array {
		return array_merge( $slugs, [ 'courses', 'course', 'learn' ] );
	}

	/**
	 * Render Academy's course-learning experience natively at the community URL
	 * {community}/learn/{course_id}, instead of iframing Academy's standalone
	 * page. We reuse Academy's own JS-render learn template + assets so the real
	 * player (curriculum, progress, quizzes) runs, but served inside a
	 * ZenCommunity-owned, chrome-free document that "exits" back to the
	 * community. Runs in both SPA and FSE render modes (it short-circuits the
	 * template loader before either).
	 */
	public static function maybe_render_native_learn() : void {
		if ( ! class_exists( '\Academy\Helper' ) ) {
			return;
		}
		// Only community app requests carry this query var.
		if ( 'community' !== (string) get_query_var( ZENCOMMUNITY_APP_ROUTE_QUERY_VAR ) ) {
			return;
		}

		$base  = trim( (string) ( $GLOBALS['zencommunity_settings']->path ?? '' ), '/' );
		$path  = trim( (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ), '/' ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		$route = $path;
		if ( '' !== $base ) {
			if ( 0 !== strpos( $path, $base ) ) {
				return;
			}
			$route = trim( substr( $path, strlen( $base ) ), '/' );
		}

		if ( ! preg_match( '#^learn/(\d+)#', $route, $m ) ) {
			return;
		}

		$course_id = (int) $m[1];
		$course    = get_post( $course_id );
		if ( ! $course || 'academy_courses' !== $course->post_type ) {
			return;
		}

		$community_url = home_url( '' !== $base ? trailingslashit( $base ) : '/' );

		// Access gate — guests sign in; non-enrolled (and non-admin) users go back
		// to the course page. is_enrolled reflects ZenCommunity virtual access
		// (membership-grants-access) via the academy/course/is_enrolled filter.
		if ( ! is_user_logged_in() ) {
			wp_safe_redirect( $community_url . 'signin' );
			exit;
		}
		if (
			! current_user_can( 'administrator' )
			&& ! \Academy\Helper::is_enrolled( $course_id, get_current_user_id() )
		) {
			wp_safe_redirect( $community_url . 'course/' . $course_id );
			exit;
		}

		self::$learn_course_id = $course_id;

		// Academy's js-render template reads the course from the global post
		// (get_the_ID / get_the_title / get_the_permalink).
		$GLOBALS['post'] = $course; // phpcs:ignore WordPress.WP.GlobalVariablesOverride
		setup_postdata( $course );

		// Chrome: no admin bar, no theme header/footer (our template owns the doc).
		add_filter( 'show_admin_bar', '__return_false' );

		// Make Academy enqueue its own common + JS-render learn assets (and the
		// AcademyGlobal localized data the player JS needs) on this request.
		// Also expose them through Academy's own page-check filters for any code
		// that reads them.
		add_filter( 'academy/is_load_common_scripts', '__return_true' );
		add_filter( 'academy/is_load_course_lessons_scripts', '__return_true' );
		add_action( 'wp_enqueue_scripts', [ self::CLASS, 'enqueue_native_learn_assets' ], 20 );

		// ZenCommunity strips every non-ZenCommunity script/style on community
		// pages (Assets::remove_theme_scripts/styles) — which would wipe Academy's
		// player assets we just enqueued. This template is a self-contained
		// document that doesn't load theme chrome, so disable that stripping here.
		remove_action( 'wp_print_styles', [ 'ZenCommunity\Assets', 'remove_theme_styles' ], 1 );
		remove_action( 'wp_print_scripts', [ 'ZenCommunity\Assets', 'remove_theme_scripts' ], 1 );

		$course_url = $community_url . 'course/' . $course_id;

		// "Exit" / back returns to the community course page, not Academy's.
		add_filter( 'academy/templates/learn_page_exit_permalink', static function () use ( $course_url ) {
			return $course_url;
		} );

		// The learn topbar's "Back to course" link uses the course permalink
		// (data-course-permalink = get_the_permalink()). Point that at the
		// community course page too so the learner never leaves the community.
		add_filter( 'post_type_link', static function ( $link, $post ) use ( $course_id, $course_url ) {
			if ( $post && (int) $post->ID === $course_id && 'academy_courses' === $post->post_type ) {
				return $course_url;
			}
			return $link;
		}, 10, 2 );
	}

	/**
	 * Swap in the native learn template once maybe_render_native_learn() has
	 * flagged the request. Priority 100 so it overrides ZenCommunity's own
	 * template_include (SPA app.php / FSE canvas).
	 */
	public static function native_learn_template( $template ) {
		if ( self::$learn_course_id ) {
			return __DIR__ . '/templates/learn.php';
		}
		return $template;
	}

	/**
	 * Enqueue Academy's own learn-player assets directly on the native learn
	 * page. Calls Academy's public asset methods (common + JS-render lessons) so
	 * the exact bundles + `AcademyGlobal` localized data load — independent of
	 * Academy's page-detection, which never matches a ZenCommunity URL. Also
	 * drops the ZenCommunity SPA bundle, which isn't needed here (this template
	 * has no SPA mount point).
	 */
	public static function enqueue_native_learn_assets() : void {
		if ( ! class_exists( '\Academy\Assets' ) ) {
			return;
		}
		$assets = new \Academy\Assets();
		if ( method_exists( $assets, 'frontend_common_assets' ) ) {
			$assets->frontend_common_assets();
		}
		if ( method_exists( $assets, 'frontend_lessons_assets' ) ) {
			$assets->frontend_lessons_assets();
		}

		// The ZenCommunity SPA app has no mount point on this template; drop it.
		wp_dequeue_script( 'zencommunity-app-scripts' );
		wp_dequeue_style( 'zencommunity-app-style' );
	}

	/**
	 * Opt-in: route Academy's standalone course pages into the community SPA so a
	 * community-focused site feels like one product. Disabled by default; enable
	 * with the `zencommunity_academy_native_pages` option (or filter below).
	 *
	 * The learning experience (curriculum) is never redirected — the SPA's Learn
	 * screen embeds those Academy pages in an iframe (with ?zc_embed=1).
	 */
	public static function maybe_redirect_to_spa() : void {
		$enabled = (bool) apply_filters(
			'zencommunity/academy/native_pages',
			\ZenCommunity\Addons\AcademyLms\Classes\Policy::global()['native_pages']
		);

		if ( ! $enabled || ! empty( $_GET['zc_embed'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}

		// Never touch the curriculum / learning context.
		if ( '' !== (string) get_query_var( 'curriculum_type' ) ) {
			return;
		}

		// Academy renders special course views (certificate PDF, curriculum
		// player, lesson pages) on the course permalink itself via a `source`
		// query var, late on `template_include`. Redirecting here would fire
		// first (`template_redirect`) and steal those requests — so leave any
		// `source`-flagged request for Academy to handle.
		if ( '' !== (string) get_query_var( 'source' ) ) {
			return;
		}

		$base = home_url( trim( (string) ( $GLOBALS['zencommunity_settings']->path ?? '' ), '/' ) );

		if ( is_post_type_archive( 'academy_courses' ) ) {
			wp_safe_redirect( trailingslashit( $base ) . 'courses' );
			exit;
		}

		if ( is_singular( 'academy_courses' ) ) {
			wp_safe_redirect( trailingslashit( $base ) . 'course/' . get_queried_object_id() );
			exit;
		}
	}
	
	public static function script_data( array $data ) : array {
		$data['is_academy_active'] = is_plugin_active( 'academy/academy.php' );
		$data['academy_nonce']     = wp_create_nonce( 'academy_nonce' );

		$globals = \ZenCommunity\Addons\AcademyLms\Classes\Policy::global();

		// Native-courses config consumed by the ZenCommunity React app.
		$data['academy'] = [
			'enabled'           => class_exists( '\Academy\Helper' ),
			'storeengine'       => class_exists( '\StoreEngine\Utils\Helper' ),
			'courses_archive'   => function_exists( 'get_post_type_archive_link' )
				? ( get_post_type_archive_link( 'academy_courses' ) ?: '' )
				: '',
			'checkout_url'      => class_exists( '\StoreEngine\Utils\Helper' )
				? \StoreEngine\Utils\Helper::get_checkout_url()
				: '',
			// REST base the SPA's Learn screen uses for curriculum + progress.
			'rest_base'         => 'academy/v1',
			// Resolved global policy that drives SPA behavior.
			'checkout_mode'     => $globals['checkout_mode'],
			'learn_mode'        => $globals['learn_mode'],
			'allow_free_enroll' => $globals['allow_free_enroll'],
			'require_login'     => $globals['require_login'],
			'show_catalog'      => $globals['show_catalog'],
		];

		return $data;
	}

	public static function update( int $group_id ) : void {
		
		$json = file_get_contents( 'php://input' );
		$data = json_decode( $json, true );

		if ( json_last_error() !== JSON_ERROR_NONE ) return;

		// Per-group policy overrides are a nested map; validate separately from
		// the flat fields the Sanitizer handles.
		$course_settings = (array) ( $data['course_settings'] ?? [] );
		$settings        = \ZenCommunity\Addons\AcademyLms\Classes\Policy::sanitize_group_overrides( $course_settings );

		$event_delivery = \ZenCommunity\Addons\AcademyLms\Classes\Policy::sanitize_event_delivery(
			(array) ( $course_settings['event_delivery'] ?? [] )
		);
		if ( ! empty( $event_delivery ) ) {
			$settings['event_delivery'] = $event_delivery;
		}

		$data = Sanitizer::sanitize( $data, [
			'course_ids.*'          => Sanitizer::INT,
			'events.*'              => Sanitizer::STRING,
			'course_category_ids.*' => Sanitizer::INT,
		] );

		Relation::update(
			$group_id,
			$data['course_ids'] ?? [],
			$data['events'] ?? [],
			$data['course_category_ids'] ?? [],
			$settings
		);
	}

	public static function response( array $group ) : array {
		$gids = array_column( $group, 'id' );
		$data = Relation::ins()->qb()->select( [
			'ar.events',
			'ar.group_id',
			'courses' => fn( QueryBuilder $q ) : QueryBuilder => $q
				->select( [ 'GROUP_CONCAT(JSON_OBJECT( "id", c.ID, "title", c.post_title ))' ] )
				->from( 'posts', 'c' )
				->where( 'c.post_type', '=', 'academy_courses' )
				->where_in_subquery(  'c.ID',
					fn( QueryBuilder $q1 ) : QueryBuilder => $q1
						->select( [ 'cr.course_id' ] )
						->from( 'zenc_group_course_relation', 'cr' )
						->where_column( 'cr.course_id', '=', 'c.ID' )
				)
		] )
		->where_in( 'ar.group_id', $gids )
		->get();
		$new = [];
		foreach( $data as $gc ) {
			$gc['events']  = array_values( json_decode( "[{$gc['events']}]" ) );
			$gc['courses'] = json_decode( "[{$gc['courses']}]" );
			$new[$gc['group_id']] = $gc;
		}

		// print_r($new);
		return array_map( function( array $g ) use( $new ) : array {
			$g['courses'] = $new[$g['id']] ?? [];
			return $g;
		}, $group );
	}

	public static function single_response( array $group, bool $is_single ) : array {
		if ( ! $is_single ) return $group;
		$data = Relation::ins()->qb()->select( [
			'ar.events',
			'ar.category_ids',
			'ar.settings',
			'ar.group_id',
			'courses' => fn( QueryBuilder $q ) : QueryBuilder => $q
				->select( [ 'GROUP_CONCAT(JSON_OBJECT( "id", c.ID, "title", c.post_title, "author_id", c.post_author ))' ] )
				->from( 'posts', 'c' )
				->where( 'c.post_type', '=', 'academy_courses' )
				->where_in_subquery(  'c.ID',
					fn( QueryBuilder $q1 ) : QueryBuilder => $q1
						->select( [ 'cr.course_id' ] )
						->from( 'zenc_group_course_relation', 'cr' )
						->where_column( 'cr.course_id', '=', 'c.ID' )
				)
		] )
		->where( 'ar.group_id', '=', absint( $group['id'] ) )
		->first();

		// wp_send_json($data);
		$category_ids = $data['category_ids'] ?? '';
		$settings     = $data['settings'] ?? '';
		$data['events']  = array_values( json_decode( "[" . ( $data['events'] ?? '{}' ) . "]", true )[0] ?? [] );
		$data['courses'] = json_decode( "[" . ( $data['courses'] ?? '' ) . "]", true );
		$data['category_ids'] = ! empty( $category_ids )
			? array_values( array_filter( array_map( 'absint', (array) json_decode( (string) $category_ids, true ) ) ) )
			: [];
		$data['settings'] = ! empty( $settings ) ? (array) json_decode( (string) $settings, true ) : [];

		foreach( $data['courses'] as &$course ) {
			$course['thumbnail'] = get_the_post_thumbnail_url( $course['id'] ?? 0, 'medium' );
			$course['categories'] = get_the_terms( $course['id'] ?? 0, 'academy_courses_category' );
			$course['author']     = get_the_author_meta(
				'display_name',
				 $course['author_id']  ?? 0
			);
		}

		$group['courses'] = $data;
		return $group;
	}
}