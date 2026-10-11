<?php
namespace ZenCommunity\Addons\Email\Api;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Helper;
use ZenCommunity\Addons\Email\Database\Models\Template;
use ZenCommunity\Addons\Email\Template as EmailTemplate;
use ZenCommunity\Addons\Email\Api\Common\Permissions;
class TemplateController extends Common\Base {
    use Schema\TemplateSchema;

	public function init() : void {

		register_rest_route( $this->namespace, "/email/templates", [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'templates' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		]);

		register_rest_route( $this->namespace, "/email/test", [
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'test' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		]);
		
		register_rest_route( $this->namespace, "/email/settings", [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'settings' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'settings_update' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
            	'args'                => $this->settings_schema()
			],
		]);

		register_rest_route( $this->namespace, "/email/template/(?P<event>[a-zA-Z0-9_]+)", [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'update' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
            	'args'                => $this->schema()
			],
		]);
	}

	public function settings( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$schema = $this->settings_schema();
			$data   = $this->get_params_by_schema( $request,  $schema );
			$settings = get_option( 'zenc_email_settings', [
				'from' => [
					'name' => '',
					'email' => get_option( 'admin_email' ),
				],
				'footer_text' => 'Thank you'
			] );
			return new WP_REST_Response( $settings );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function settings_update( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$schema = $this->settings_schema();
			$data   = $this->get_params_by_schema( $request,  $schema );
			// print_r($data);
			$settings = get_option( 'zenc_email_settings', [
				'from' => [
					'name' => '',
					'email' => get_option( 'admin_email' ),
				],
				'footer_text' => 'Thank you'
			] );
			update_option( 'zenc_email_settings', Helper::recursive_merge( $settings, $data ) );
			return new WP_REST_Response( [
				'success' => true
			] );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function test( WP_REST_Request $request ) : WP_REST_Response {
		try {
			
			( new EmailTemplate(
				sanitize_text_field( $request['event'] ),
				[],
				get_option( 'admin_email' )
			) )->send();
			return new WP_REST_Response( [
				'success' => true
			] );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function templates( WP_REST_Request $request ) : WP_REST_Response {
		try {
			return new WP_REST_Response(
				Template::get_templates()
			);
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function get( WP_REST_Request $request ) : WP_REST_Response {
		try {
			return new WP_REST_Response(
				Template::by_event( sanitize_text_field( $request['event'] ) )
			);
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function update( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$schema = $this->schema();
			$data   = $this->get_params_by_schema( $request,  $schema );
			return new WP_REST_Response(
				Template::update( sanitize_text_field( $request['event'] ), $data )
			);
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}
}
