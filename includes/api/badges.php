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
use ZenCommunity\Database\Models\Badge as BadgeModel;

/**
 * Settings > Members > Badges: admin-managed label definitions (Moderator,
 * Affiliate, ...) and their per-member assignment. Definitions and
 * assignment are both admin-only - members only ever see badges read-only,
 * attached to profiles via the `zencommunity/members/wrapper/*` filters
 * (see BadgeModel::enrich_member(s), wired in includes/hooks.php).
 */
class Badges extends Common\Base {

	public function init() : void {
		register_rest_route( $this->namespace, '/badges', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'index' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'create' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/badges/item/(?P<id>\d+)', [
			[
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => [ $this, 'update' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
			[
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'delete' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/badges/item/(?P<id>\d+)/members', [
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => [ $this, 'members' ],
			'permission_callback' => [ Permissions::class, 'admin_can' ],
		] );

		register_rest_route( $this->namespace, '/badges/member/(?P<user_id>\d+)', [
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => [ $this, 'for_member' ],
			'permission_callback' => [ Permissions::class, 'admin_can' ],
		] );

		register_rest_route( $this->namespace, '/badges/member/(?P<user_id>\d+)/(?P<badge_id>\d+)', [
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'assign' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
			[
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => [ $this, 'unassign' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		] );
	}

	public function index( WP_REST_Request $request ) : WP_REST_Response {
		return new WP_REST_Response( BadgeModel::all() );
	}

	public function create( WP_REST_Request $request ) : WP_REST_Response {
		try {
			return new WP_REST_Response( [
				'success' => true,
				'badge'   => BadgeModel::create( $request->get_params() ),
			] );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function update( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$id = absint( $request->get_param( 'id' ) );
			return new WP_REST_Response( [
				'success' => true,
				'badge'   => BadgeModel::update( $id, $request->get_params() ),
			] );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function delete( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$id = absint( $request->get_param( 'id' ) );
			return new WP_REST_Response( [ 'success' => BadgeModel::delete( $id ), 'id' => $id ] );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function members( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$id       = absint( $request->get_param( 'id' ) );
			$page     = absint( $request->get_param( 'page' ) ?: 1 );
			$per_page = absint( $request->get_param( 'per_page' ) ?: 20 );
			return new WP_REST_Response( BadgeModel::members( $id, $page, $per_page ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function for_member( WP_REST_Request $request ) : WP_REST_Response {
		$user_id = absint( $request->get_param( 'user_id' ) );
		return new WP_REST_Response( BadgeModel::for_user( $user_id ) );
	}

	public function assign( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$user_id  = absint( $request->get_param( 'user_id' ) );
			$badge_id = absint( $request->get_param( 'badge_id' ) );
			$ok       = BadgeModel::assign( $user_id, $badge_id, get_current_user_id() );
			return new WP_REST_Response( [ 'success' => $ok, 'badges' => BadgeModel::for_user( $user_id ) ] );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function unassign( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$user_id  = absint( $request->get_param( 'user_id' ) );
			$badge_id = absint( $request->get_param( 'badge_id' ) );
			$ok       = BadgeModel::unassign( $user_id, $badge_id );
			return new WP_REST_Response( [ 'success' => $ok, 'badges' => BadgeModel::for_user( $user_id ) ] );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}
}
