<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Database\Models\Activity as ActivityModel;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
class Activity extends Common\Base {
    use Schema\ActivitySchema;
    public function init() : void {
        register_rest_route( $this->namespace, '/activities',  [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'activities' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
                'args'                => $this->index_schema(),
            ],
        ] );

        register_rest_route( $this->namespace, '/member/(?P<user_id>\d+)/activities',  [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'user_activities' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
                'args'                => $this->index_schema(),
            ],
        ] );

        register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/activities',  [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'group_activities' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
                'args'                => $this->index_schema(),
            ],
        ] );
    }

    public function activities( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $request->get_params();
            $user_id = get_current_user_id();
            $types = explode( ',' , sanitize_text_field( $params['type'] ?? null ) );
            $page = absint( $params['page'] ?? 0 );
            $per_page = absint( $params['per_page'] ?? 20 );

            $data = ActivityModel::index( null, null, $types, $page, $per_page, $user_id );
            return new WP_REST_Response(  $data );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function user_activities( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $request->get_params();
            $logged_user_id = get_current_user_id();
            $types = explode( ',' , sanitize_text_field( $params['type'] ?? null ) );
            $page = absint( $params['page'] ?? 0 );
            $per_page = absint( $params['per_page'] ?? 20 );
            $user_id = absint( $params['user_id'] ?? 20 );

            $data = ActivityModel::index( $user_id, null, $types, $page, $per_page, $logged_user_id );
            return new WP_REST_Response(  $data );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function group_activities( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $request->get_params();
            $logged_user_id = get_current_user_id();
            $types = explode( ',' , sanitize_text_field( $params['type'] ?? null ) );
            $page = absint( $params['page'] ?? 0 );
            $per_page = absint( $params['per_page'] ?? 20 );
            $group_id = absint( $params['group_id'] ?? 20 );

            $data = ActivityModel::index( null, $group_id, $types, $page, $per_page, $logged_user_id );
            return new WP_REST_Response(  $data );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }
}