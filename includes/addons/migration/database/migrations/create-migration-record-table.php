<?php
namespace ZenCommunity\Addons\Migration\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The idempotency ledger. One row per migrated (or attempted) source record,
 * uniquely keyed on (provider_key, entity_type, source_id) — scoped to the
 * provider rather than a single job, so re-running the provider in a brand
 * new job (or resuming after a crash) is naturally idempotent: succeeded
 * rows are skipped, only genuinely new source rows get processed.
 */
class CreateMigrationRecordTable extends Migration {
	protected ?string $table = 'zenc_migration_records';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
				id BIGINT UNSIGNED AUTO_INCREMENT,
				job_id BIGINT UNSIGNED NOT NULL,
				provider_key VARCHAR(100) NOT NULL,
				entity_type VARCHAR(100) NOT NULL,
				source_id VARCHAR(100) NOT NULL,
				destination_id VARCHAR(100) NULL,
				status VARCHAR(20) NOT NULL DEFAULT 'succeeded',
				source_hash VARCHAR(64) NULL,
				error TEXT NULL,
				retry_count INT UNSIGNED NOT NULL DEFAULT 0,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (id),
				UNIQUE KEY uniq_provider_entity_source (provider_key, entity_type, source_id),
				KEY idx_job_id (job_id),
				KEY idx_job_entity_status (job_id, entity_type, status)
            ) {$this->charsetCollate};
		";
	}

	public function down(): string
	{
		return '';
    }
}
