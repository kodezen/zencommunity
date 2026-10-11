<?php
namespace ZenCommunity\Addons\Migration\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateMigrationJobTable extends Migration {
	protected ?string $table = 'zenc_migration_jobs';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
				id BIGINT UNSIGNED AUTO_INCREMENT,
				provider_key VARCHAR(100) NOT NULL,
				phase VARCHAR(100) NOT NULL DEFAULT 'default',
				mode VARCHAR(20) NOT NULL DEFAULT 'full',
				status VARCHAR(30) NOT NULL DEFAULT 'queued',
				options LONGTEXT NULL,
				current_entity_type VARCHAR(100) NULL,
				cursor_offset BIGINT UNSIGNED NOT NULL DEFAULT 0,
				totals LONGTEXT NULL,
				error_message TEXT NULL,
				processing_started_at DATETIME NULL,
				started_at DATETIME NULL,
				finished_at DATETIME NULL,
				created_by BIGINT UNSIGNED NULL,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (id),
				KEY idx_provider_status (provider_key, status),
				KEY idx_provider_phase_status (provider_key, phase, status)
            ) {$this->charsetCollate};
		";
	}

	public function down(): string
	{
		return '';
    }
}
