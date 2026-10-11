<?php

namespace ZenCommunity\Api;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\StoreLicense;

/**
 * Backs the wp-admin Settings > License screen.
 *
 * ZenCommunity (free) is registered `is_free: true` with the StoreEngine
 * SDK, so there is no license key to activate — SE_License_SDK_Client::
 * license() throws a RuntimeException for free products, and the SDK's own
 * REST routes for that live under a separate `storeengine-sdk/v1` namespace
 * we don't enable here. This only proxies the SDK's usage-tracking opt-in
 * (SE_License_SDK_Insights), which has no such gate, through our existing
 * `zencommunity/v1` namespace so the settings tab can use the same `API`
 * helper and nonce every other tab already uses.
 */
class License extends Common\Base {

	public function init() : void {
		register_rest_route( $this->namespace, '/license/insights', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_insights' ],
				'permission_callback' => [ Common\Permissions::class, 'can_update_settings' ],
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'set_insights' ],
				'permission_callback' => [ Common\Permissions::class, 'can_update_settings' ],
				'args'                => [
					'opt_in' => [
						'required' => true,
						'type'     => 'boolean',
					],
				],
			],
		] );
	}

	public function get_insights() : WP_REST_Response {
		return new WP_REST_Response( $this->status() );
	}

	public function set_insights( WP_REST_Request $request ) : WP_REST_Response {
		$client = StoreLicense::get_client();

		if ( $client ) {
			if ( $request->get_param( 'opt_in' ) ) {
				$client->insights()->optIn();
			} else {
				$client->insights()->optOut();
			}
		}

		return new WP_REST_Response( $this->status() );
	}

	private function status() : array {
		$client = StoreLicense::get_client();

		return [
			'allowed'      => $client ? $client->insights()->is_tracking_allowed() : false,
			'version'      => defined( 'ZENCOMMUNITY_VERSION' ) ? ZENCOMMUNITY_VERSION : '',
			'package_name' => $client ? $client->getPackageName() : 'ZenCommunity',
			'purchase_url' => $client ? $client->get_purchase_url() : null,
			'device_id'    => $client ? $client->get_device_id() : '',
		];
	}
}
