<?php

namespace ZenCommunity\Api;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Throwable;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Classes\RoleManager;

class LiveChat extends Common\Base {

	public function init(): void {
		register_rest_route( $this->namespace, '/livechat/socket-credentials', [
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => [ $this, 'get_socket_credentials' ],
			'permission_callback' => fn(): bool => is_user_logged_in(),
		] );
	}

	public function get_socket_credentials( WP_REST_Request $request ): WP_REST_Response {
		$user_id = get_current_user_id();
		$token   = '';

		// Mint a socket token via the active JWT provider. This is how a
		// cookie-logged-in user obtains a token for the WebSocket handshake.
		if ( class_exists( \ZenCommunityPro\WebSocket\Auth\Provider::class ) ) {
			$token = (string) \ZenCommunityPro\WebSocket\Auth\Provider::issue( $user_id );
		}

		$host   = get_option( 'zenc_ws_host', 'localhost' );
		$port   = get_option( 'zenc_ws_port', 8080 );
		$status = get_option( 'zenc_ws_status' );
		$local  = get_option( 'zenc_ws_push_from_local' );

		return new WP_REST_Response( [
			'success' => true,
			'data'    => [
				'token'    => $token,
				'is_local' => boolval( $local ),
				'status'   => $status,
				'ws_host'  => $host,
				'ws_port'  => $port,
				'user_id'  => $user_id,
			],
		] );
	}
}
