<?php
namespace ZenCommunity\Addons\Migration\Api;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Addons\Migration\Services\JobService;
use ZenCommunity\Addons\Migration\Api\Common\Permissions;

class MigrationController extends Common\Base {
	use Schema\MigrationSchema;

	public function init() : void {

		register_rest_route( $this->namespace, '/migration/providers', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'providers' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/migration/jobs', [
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'start_job' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
				'args'                => $this->start_job_schema(),
			],
		] );

		register_rest_route( $this->namespace, '/migration/jobs/(?P<id>\d+)', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_job' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/migration/jobs/(?P<id>\d+)/cancel', [
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'cancel_job' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/migration/jobs/(?P<id>\d+)/pause', [
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'pause_job' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/migration/jobs/(?P<id>\d+)/resume', [
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'resume_job' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/migration/jobs/(?P<id>\d+)/retry-failed', [
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'retry_failed' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/migration/jobs/(?P<id>\d+)/run-batch', [
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'run_batch' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		] );
	}

	public function providers( WP_REST_Request $request ) : WP_REST_Response {
		try {
			return new WP_REST_Response( JobService::list_providers() );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function start_job( WP_REST_Request $request ) : WP_REST_Response {
		try {
			$schema  = $this->start_job_schema();
			$data    = $this->get_params_by_schema( $request, $schema );
			$job     = JobService::start_job(
				sanitize_key( $data['provider'] ),
				sanitize_key( $data['phase'] ),
				sanitize_key( $data['mode'] ),
				is_array( $data['options'] ?? null ) ? $data['options'] : [],
				get_current_user_id()
			);
			return new WP_REST_Response( $job, 201 );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function get_job( WP_REST_Request $request ) : WP_REST_Response {
		try {
			return new WP_REST_Response( JobService::get_job( absint( $request['id'] ) ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function cancel_job( WP_REST_Request $request ) : WP_REST_Response {
		try {
			return new WP_REST_Response( JobService::cancel_job( absint( $request['id'] ) ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function pause_job( WP_REST_Request $request ) : WP_REST_Response {
		try {
			return new WP_REST_Response( JobService::pause_job( absint( $request['id'] ) ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function resume_job( WP_REST_Request $request ) : WP_REST_Response {
		try {
			return new WP_REST_Response( JobService::resume_job( absint( $request['id'] ) ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function retry_failed( WP_REST_Request $request ) : WP_REST_Response {
		try {
			return new WP_REST_Response( JobService::retry_failed( absint( $request['id'] ), get_current_user_id() ), 201 );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}

	public function run_batch( WP_REST_Request $request ) : WP_REST_Response {
		try {
			return new WP_REST_Response( JobService::run_batch( absint( $request['id'] ) ) );
		} catch ( ZencommunityException $e ) {
			return $e->as_rest_response();
		}
	}
}
