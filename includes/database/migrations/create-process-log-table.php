<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateProcessLogTable extends Migration {
	protected ?string $table = 'zenc_process_logs';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id BIGINT AUTO_INCREMENT,
                status VARCHAR(255) DEFAULT 'pending',
                pid VARCHAR(255),
                handler VARCHAR(255),
                args LONGTEXT,
                retry BIGINT UNSIGNED DEFAULT 0,
                max_retry BIGINT UNSIGNED DEFAULT 5,
                error_msg VARCHAR(255),
                created_at BIGINT UNSIGNED,
                updated_at BIGINT UNSIGNED,
                PRIMARY KEY (id),
                KEY idx_bg_plog (pid,handler(40), created_at)
            ) {$this->charsetCollate};
		";
	}

	public function down(): string
	{
		return '';
  }
}