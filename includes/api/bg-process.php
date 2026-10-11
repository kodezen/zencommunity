<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Database\Models\ProcessLog;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
use ZenCommunity\Exceptions\ZencommunityException;
class BgProcess extends Common\Base {

    public function init() : void {
        register_rest_route( $this->namespace, '/bg/process/(?P<pid>[A-Za-z0-9-,.]+)',  [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'process' ],
                'permission_callback' => [ Common\Permissions::class, 'even_guest_user_can' ],
            ],
        ] );
    }

    public function process( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $pid = (string) $request->get_param( 'pid' );

            // The route stays open to guests because the dispatch that calls it
            // is an unauthenticated loopback, but open to guests is not the same
            // as open to anyone: without this, knowing a pid was enough to run
            // somebody else's job, and an AI job is a paid provider call.
            if ( ! ProcessLog::verify_signature( $pid, (string) $request->get_param( 'sig' ) ) ) {
                return new WP_REST_Response( [ 'success' => false, 'message' => __( 'Invalid signature.', 'zencommunity' ) ], 403 );
            }

            return new WP_REST_Response( ProcessLog::dispatch( $pid ), 200 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }
}