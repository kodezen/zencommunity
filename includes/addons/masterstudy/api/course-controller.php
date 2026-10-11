<?php
namespace ZenCommunity\Addons\Masterstudy\Api;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Helper;
use ZenCommunity\Addons\Masterstudy\Api\Common\Permissions;
use ZenCommunity\Database\Utils\QueryBuilder;
class CourseController extends Common\Base {
    use Schema\EventsSchema;

	public function init() : void {
		register_rest_route( $this->namespace, "/masterstudy/courses", [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'courses' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		]);

	}

	public function courses( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$page = absint( $request['page'] ?? 1 );
			$per_page = absint( $request['per_page'] ?? 15 );
			$search = sanitize_text_field( $request['search'] ?? '' );
			
			$qb = QueryBuilder::ins()
				->select( [ 's.post_title', 's.ID' ] )
				->from( 'posts', 's' )
				->where( 's.post_type', '=', 'stm-courses' );

			if ( ! empty( $search ) )
				$qb->where( 's.post_title', 'LIKE', "%{$search}%" );

			return new WP_REST_Response( $qb->paginate( $page, $per_page ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}
}
