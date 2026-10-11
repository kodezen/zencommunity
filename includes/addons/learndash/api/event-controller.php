<?php
namespace ZenCommunity\Addons\Learndash\Api;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Helper;
use ZenCommunity\Addons\Learndash\Database\Models\Relation;
use ZenCommunity\Addons\Learndash\Api\Common\Permissions;
class EventController extends Common\Base {
    use Schema\EventsSchema;

	public function init() : void {
		register_rest_route( $this->namespace, "/learndash/events", [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'events' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'events_update' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
            	'args'                => $this->schema()
			],
		]);

	}

	public function events( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$events = get_option( 'zenc_learndash_events', Relation::$events );
			return new WP_REST_Response( $events );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function events_update( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$schema = $this->schema();
			$data   = $this->get_params_by_schema( $request,  $schema );
			$events = get_option( 'zenc_learndash_events', Relation::$events );
			update_option( 'zenc_learndash_events', $data['events'] ?? [] );
			return new WP_REST_Response( [
				'success' => true
			] );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

}
