<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
use ZenCommunity\Database\Models\Report as ReportModel;

class Report extends Common\Base {

	public function init() : void {
		register_rest_route( $this->namespace, '/report', [
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => [ $this, 'create' ],
			'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
		] );

		register_rest_route( $this->namespace, '/reports', [
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => [ $this, 'index' ],
			'permission_callback' => [ Permissions::class, 'admin_can' ],
		] );

		register_rest_route( $this->namespace, '/report/(?P<id>\d+)/status', [
			'methods'             => WP_REST_Server::EDITABLE,
			'callback'            => [ $this, 'update_status' ],
			'permission_callback' => [ Permissions::class, 'admin_can' ],
		] );
	}

	public function create( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$id = ReportModel::create( $request->get_params(), get_current_user_id() );
			return new WP_REST_Response( [
				'success' => true,
				'id'      => $id,
				'message' => __( 'Thanks — this content has been reported to the moderators.', 'zencommunity' ),
			] );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function index( WP_REST_Request $request ) : WP_REST_Response {
		try {
			return new WP_REST_Response( ReportModel::index( $request->get_params() ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function update_status( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$id     = absint( $request->get_param( 'id' ) );
			$status = sanitize_text_field( $request->get_param( 'status' ) );
			$ok     = ReportModel::update_status( $id, $status, get_current_user_id() );
			return new WP_REST_Response( [ 'success' => $ok, 'id' => $id, 'status' => $status ] );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}
}
