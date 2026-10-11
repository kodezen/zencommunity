<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Database\Models\Event as EventModel;
use ZenCommunity\Database\Models\Group as GroupModel;
use ZenCommunity\Database\Utils\QueryBuilder;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;

class Event extends Common\Base {

	public function init() : void {
		register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/events', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_events' ],
				'permission_callback' => '__return_true',
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'create_event' ],
				'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/event/(?P<id>\d+)', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_event' ],
				'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
			],
			[
				'methods'             => 'PATCH',
				'callback'            => [ $this, 'update_event' ],
				'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
			],
			[
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'delete_event' ],
				'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/event/(?P<id>\d+)/rsvp', [
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'rsvp_event' ],
				'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
			],
			[
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'remove_rsvp' ],
				'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
			],
		] );
	}

	public function get_events( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$group_id = absint( $request->get_param( 'group_id' ) );
			$params   = [
				'filter'   => sanitize_text_field( $request->get_param( 'filter' ) ?? 'upcoming' ),
				'page'     => absint( $request->get_param( 'page' ) ?? 1 ),
				'per_page' => absint( $request->get_param( 'per_page' ) ?? 10 ),
			];
			$user_id = get_current_user_id() ?: null;
			return new WP_REST_Response( EventModel::lists( $group_id, $params, $user_id ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function create_event( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$group_id = absint( $request->get_param( 'group_id' ) );
			$user_id  = get_current_user_id();

			if (
				! user_can( $user_id, 'manage_options' ) &&
				! GroupModel::is_member_of( $user_id, $group_id, [ 'admin', 'moderator' ] )
			) {
				throw new ZencommunityException( esc_html__( 'You do not have permission to create events.', 'zencommunity' ), 403 );
			}

			$data = $request->get_json_params() ?: $request->get_body_params();
			$id   = EventModel::create( $group_id, $data );

			do_action( 'zencommunity/event/created', $id, $group_id, $data );

			$event = EventModel::by_id( $id, $user_id );
			return new WP_REST_Response( $event, 201 );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function get_event( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$event_id = absint( $request->get_param( 'id' ) );
			$user_id  = get_current_user_id() ?: null;
			return new WP_REST_Response( EventModel::by_id( $event_id, $user_id ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function update_event( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$event_id = absint( $request->get_param( 'id' ) );
			$user_id  = get_current_user_id();
			$this->check_event_admin_permission( $event_id, $user_id );

			$data = $request->get_json_params() ?: $request->get_body_params();
			EventModel::update( $event_id, $data );
			return new WP_REST_Response( EventModel::by_id( $event_id, $user_id ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function delete_event( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$event_id = absint( $request->get_param( 'id' ) );
			$user_id  = get_current_user_id();
			$this->check_event_admin_permission( $event_id, $user_id );

			EventModel::delete( $event_id );
			return new WP_REST_Response( [ 'deleted' => true ] );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function rsvp_event( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$event_id = absint( $request->get_param( 'id' ) );
			$user_id  = get_current_user_id();
			$body     = $request->get_json_params() ?: $request->get_body_params();
			$status   = sanitize_text_field( $body['status'] ?? '' );

			EventModel::rsvp( $event_id, $user_id, $status );
			return new WP_REST_Response( EventModel::by_id( $event_id, $user_id ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function remove_rsvp( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$event_id = absint( $request->get_param( 'id' ) );
			$user_id  = get_current_user_id();

			EventModel::remove_rsvp( $event_id, $user_id );
			return new WP_REST_Response( EventModel::by_id( $event_id, $user_id ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	private function check_event_admin_permission( int $event_id, int $user_id ) : void {
		if ( user_can( $user_id, 'manage_options' ) ) return;

		$event = QueryBuilder::ins()
			->from( 'zenc_group_events', 'evt' )
			->select( [ 'evt.group_id' ] )
			->where( 'evt.id', '=', $event_id )
			->first();

		if ( empty( $event ) ) {
			throw new ZencommunityException( esc_html__( 'Event not found.', 'zencommunity' ), 404 );
		}

		if ( ! GroupModel::is_member_of( $user_id, intval( $event['group_id'] ), [ 'admin', 'moderator' ] ) ) {
			throw new ZencommunityException( esc_html__( 'You do not have permission to manage this event.', 'zencommunity' ), 403 );
		}
	}
}
