<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_REST_Response;
use WP_REST_Server;

/**
 * Backs the wp-admin Settings > Connectivity screen: a shared secret external
 * services present to authenticate privileged REST requests (settings
 * changes, system actions) against this site.
 */
class Connectivity extends Common\Base {
	const OPTION_NAME = 'zencommunity_kb_token';

	public function init() : void {
		register_rest_route( $this->namespace, '/connectivity/kb-token', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_token' ],
				'permission_callback' => [ Common\Permissions::class, 'can_update_settings' ],
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'regenerate_token' ],
				'permission_callback' => [ Common\Permissions::class, 'can_update_settings' ],
			],
		] );
	}

	public function get_token() : WP_REST_Response {
		return new WP_REST_Response( [ 'kb_token' => (string) get_option( self::OPTION_NAME, '' ) ] );
	}

	public function regenerate_token() : WP_REST_Response {
		$token = bin2hex( random_bytes( 32 ) );
		// Not autoloaded: this secret is only read when the Connectivity
		// screen or an external caller's request needs it, not on every
		// page load.
		update_option( self::OPTION_NAME, $token, false );

		return new WP_REST_Response( [ 'kb_token' => $token ] );
	}
}
