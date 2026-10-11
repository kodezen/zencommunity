<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateReportTable extends Migration {
	protected ?string $table = 'zenc_reports';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id           BIGINT AUTO_INCREMENT,
                object_type  VARCHAR(50) NOT NULL,
                object_id    BIGINT NOT NULL,
                reporter_id  BIGINT UNSIGNED NOT NULL,
                reason       VARCHAR(100) NOT NULL,
                note         TEXT,
                status       VARCHAR(50) NOT NULL DEFAULT 'pending',
                resolved_by  BIGINT UNSIGNED DEFAULT NULL,
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_report (object_type(20), object_id, status(20), reporter_id)
            ) {$this->charsetCollate};
		";
	}

	public function down(): string
	{
		return '';
	}
}
