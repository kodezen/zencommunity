<?php
namespace ZenCommunity;
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
use WP_REST_Server;
use WP_REST_Request;
use ZenCommunity\Database\Models\Profile;
class RestApiInit {
	/** register rest api */
	protected static array $api_classes = [
		// One request for the handful a page needs before it can draw anything.
		Api\Bootstrap::class,
		Api\Settings::class,
		Api\License::class,
		Api\Auth::class,
		Api\Member::class,
		Api\Category::class,
		Api\Group::class,
		Api\Media::class,
		Api\Feed::class,
		Api\Activity::class,
		Api\Roles::class,
		Api\Menu::class,
		Api\SidebarWidgets::class,
		Api\Addons::class,
		Api\Ticker::class,
		Api\BgProcess::class,
		Api\Event::class,
		Api\Report::class,
		Api\Badges::class,
	];

	/**
	 * Initialize rest api
	 */
	public static function init() {
		add_filter( 'rest_pre_dispatch', [ __CLASS__, 'load_logged_user_profile' ], 10, 3 );

		add_action( 'rest_api_init', function () {
			array_map( function( string $class ) {
				if ( ! class_exists( $class ) || ! ( $ins = new $class ) instanceof Api\Common\Base ) return;
				$ins->init();
			}, static::$api_classes );
		} );
	}

	/**
	 * Initializes the user profile during REST API requests.
	 *
	 * This function checks if the current REST API request URL starts with
	 * 'zencommunity/v1'. If so, it ensures the current user has a profile.
	 * If the profile does not exist, it creates a new one.
	 *
	 * After ensuring a profile exists, the profile data is set to a global variable
	 * for use elsewhere in the application.
	 *
	 * @return $response
	 */
	public static function load_logged_user_profile( $response, WP_REST_Server $server, WP_REST_Request $request ) {
		global $zencommunity_current_user;
		$route = $request->get_route();
    	if ( FALSE !== strpos( $route, 'zencommunity/v1' ) ) {
			$zencommunity_current_user = Profile::current();
			
			if ( empty( $zencommunity_current_user ) ) {
				return $response;
			}

			$last_activity = strtotime( (string) $zencommunity_current_user['last_activity'] );
			$debounce_seconds = 20;
			if ( ! $last_activity || ( time() - $last_activity ) > $debounce_seconds ) {
				Profile::update_last_activity();
			}

			
		}
		return $response;
	}
}
