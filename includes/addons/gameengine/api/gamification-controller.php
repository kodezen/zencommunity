<?php

namespace ZenCommunity\Addons\Gameengine\Api;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Api\Common\Base;
use ZenCommunity\Api\Common\Permissions;
use ZenCommunity\Addons\Gameengine\Classes\State;
use ZenCommunity\Addons\Gameengine\Classes\Policy;

/**
 * Native gamification BFF for the ZenCommunity SPA. Reads GameEngine state
 * (GameEngine's own leaderboard/profile REST is admin-only) and exposes it
 * under ZenCommunity permissions.
 *
 *   GET  /gamification/me
 *   GET  /gamification/profile/{user_id}
 *   GET  /gamification/ranks/{user_id}      full rank ladder + progress
 *   GET  /gamification/badges/{user_id}     full badge catalog (earned + locked)
 *   GET  /gamification/history/{user_id}    paginated points transaction log
 *   GET  /gamification/journey/{user_id}    progress_map roadmap (ranks+badges, completed/locked)
 *   GET  /gamification/leaderboard
 *   GET/POST /gamification/settings   (admin)
 */
class GamificationController extends Base {

	public function init() : void {
		register_rest_route( $this->namespace, '/gamification/me', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'me' ],
				'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/gamification/profile/(?P<user_id>\d+)', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'profile' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/gamification/ranks/(?P<user_id>\d+)', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'ranks' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/gamification/badges/(?P<user_id>\d+)', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'badges' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/gamification/history/(?P<user_id>\d+)', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'history' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/gamification/journey/(?P<user_id>\d+)', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'journey' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/gamification/leaderboard', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'leaderboard' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/gamification/settings', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_settings' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'save_settings' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		] );
	}

	public function me() : WP_REST_Response {
		return new WP_REST_Response( State::for_user( get_current_user_id() ) );
	}

	public function profile( WP_REST_Request $request ) : WP_REST_Response {
		return new WP_REST_Response( State::for_user( absint( $request['user_id'] ) ) );
	}

	public function ranks( WP_REST_Request $request ) : WP_REST_Response {
		return new WP_REST_Response( State::all_ranks( absint( $request['user_id'] ) ) );
	}

	public function badges( WP_REST_Request $request ) : WP_REST_Response {
		return new WP_REST_Response( State::all_badges( absint( $request['user_id'] ) ) );
	}

	public function history( WP_REST_Request $request ) : WP_REST_Response {
		return new WP_REST_Response( State::points_history(
			absint( $request['user_id'] ),
			absint( $request->get_param( 'page' ) ) ?: 1,
			absint( $request->get_param( 'per_page' ) ) ?: 20
		) );
	}

	public function journey( WP_REST_Request $request ) : WP_REST_Response {
		return new WP_REST_Response( State::journey( absint( $request['user_id'] ) ) );
	}

	public function leaderboard( WP_REST_Request $request ) : WP_REST_Response {
		$period = (string) $request->get_param( 'period' );
		if ( ! in_array( $period, [ 'week', 'month', 'all' ], true ) ) {
			$period = 'all';
		}

		return new WP_REST_Response( State::leaderboard(
			absint( $request->get_param( 'per_page' ) ) ?: 20,
			absint( $request->get_param( 'page' ) ) ?: 1,
			$period,
			get_current_user_id()
		) );
	}

	public function get_settings() : WP_REST_Response {
		return new WP_REST_Response( Policy::all() );
	}

	public function save_settings( WP_REST_Request $request ) : WP_REST_Response {
		$params = $request->get_params();
		return new WP_REST_Response( Policy::update( is_array( $params ) ? $params : [] ) );
	}
}
