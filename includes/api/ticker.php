<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Database\Utils\QueryBuilder;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
class Ticker extends Common\Base {
    public function init() : void {
        register_rest_route( $this->namespace, '/ticker/(?P<timestamps>[0-9]+)',  [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'ticker_data' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
            ],
        ] );

    }

    public function ticker_data( WP_REST_Request $request ) : WP_REST_Response {
        $params = $request->get_params();
        $last_timestamp = sanitize_text_field( $params['timestamps'] ?? null );

        if ( empty( $last_timestamp ) ) {
            return new WP_REST_Response( [
                'success'    => false,
                'timestamps' => time(),
            ], 422 );
        }
        $last_datetime = gmdate( 'Y-m-d H:i:s', (int) $last_timestamp );
        $qbf = QueryBuilder::ins()->from( 'zenc_feeds', 'fd' )
			->join( 'zenc_groups', 'sp', 'sp.id = fd.group_id' )
            ->where( 'fd.created_at', '>', $last_datetime );

            
        $logged_user_id = get_current_user_id();
		if ( 
			! user_can( $logged_user_id, 'manage_options' )
		) {
			// logged-in users: public OR member of private category
			$qbf->where_group( function ( QueryBuilder $q ) use ( $logged_user_id ) {
				$q->where( 'sp.privacy', '=', 'public' );
				$q->or_where_exists( function ( QueryBuilder $sub ) use ( $logged_user_id ) {
					$sub->from( 'zenc_group_members', 'spm' )
						->where_column( 'spm.group_id', '=', 'fd.group_id' )
						->where( 'spm.user_id', '=', $logged_user_id )
						->where( 'spm.status', '=', 'active' );
				});
			});
		} 

        $new_notifications = is_user_logged_in() ? ( 
            QueryBuilder::ins()->from('zenc_notified_users')
                ->where( 'to_user_id', '=', $logged_user_id )
                ->where( 'is_read', '=', 0 )
                ->where( 'created_at', '>', $last_datetime )
                ->count() 
        ) : 0;
        return new WP_REST_Response( [
            'success'                        => true,
            'new_feeds'         => $qbf->count(),
            'new_notifications' => $new_notifications,
            'timestamps'                     => time(),
        ], 200 );
    }
}