<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreatePollVotesTable extends Migration {
	protected ?string $table = 'zenc_poll_votes';

	public function up(): string {
		return "
            CREATE TABLE {$this->table} (
                id         BIGINT AUTO_INCREMENT,
                feed_id    BIGINT NOT NULL,
                option_id  BIGINT NOT NULL,
                user_id    BIGINT NOT NULL,
                created_at DATETIME,
                PRIMARY KEY (id),
                UNIQUE KEY idx_pvt_unique (feed_id, option_id, user_id),
                KEY idx_pvt_feed_user (feed_id, user_id)
            ) {$this->charsetCollate};
		";
	}

	public function down(): string {
		return '';
	}
}
