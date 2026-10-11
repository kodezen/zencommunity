<?php
namespace ZenCommunity\Addons\Migration\Api\Schema;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
trait MigrationSchema {

	public function start_job_schema() : array {
		return apply_filters( 'zencommunity/migration/start_job/schema', [
			'provider' => [
				'description'       => __( 'Provider key', 'zencommunity' ),
				'type'              => 'string',
				'required'          => true,
				'sanitize_callback' => 'sanitize_key',
			],
			'phase' => [
				'description'       => __( 'Which of the provider\'s phases() to run as this job — e.g. "tickets" or "conversations".', 'zencommunity' ),
				'type'              => 'string',
				'required'          => true,
				'sanitize_callback' => 'sanitize_key',
			],
			'mode' => [
				'description'       => __( 'Migration mode', 'zencommunity' ),
				'type'              => 'string',
				'required'          => true,
				'enum'              => [ 'dry_run', 'full', 'sync_new' ],
				'sanitize_callback' => 'sanitize_key',
			],
			'options' => [
				'description' => __( 'Provider-specific options', 'zencommunity' ),
				'type'        => 'object',
				'required'    => false,
				'default'     => [],
			],
		] );
	}
}
