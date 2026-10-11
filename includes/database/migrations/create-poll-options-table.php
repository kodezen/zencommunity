<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreatePollOptionsTable extends Migration {
	protected ?string $table = 'zenc_poll_options';

	public function up(): string {
		return "
            CREATE TABLE {$this->table} (
                id         BIGINT AUTO_INCREMENT,
                feed_id    BIGINT NOT NULL,
                text       VARCHAR(500) NOT NULL,
                sort_order INT DEFAULT 0,
                created_at DATETIME,
                PRIMARY KEY (id),
                KEY idx_popt_feed (feed_id)
            ) {$this->charsetCollate};
		";
	}

	public function down(): string {
		return '';
	}
}
