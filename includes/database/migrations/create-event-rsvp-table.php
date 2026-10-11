<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateEventRsvpTable extends Migration {
	protected ?string $table = 'zenc_event_rsvps';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id         BIGINT AUTO_INCREMENT,
                event_id   BIGINT NOT NULL,
                user_id    BIGINT NOT NULL,
                status     VARCHAR(50) NOT NULL,
                created_at DATETIME,
                updated_at DATETIME,
                PRIMARY KEY (id),
                UNIQUE KEY idx_rsvp_event_user (event_id, user_id)
            ) {$this->charsetCollate};
		";
	}

	public function down(): string
	{
		return '';
	}
}
