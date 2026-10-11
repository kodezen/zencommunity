<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateEventTable extends Migration {
	protected ?string $table = 'zenc_group_events';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id                    BIGINT AUTO_INCREMENT,
                group_id              BIGINT NOT NULL,
                user_id               BIGINT NOT NULL,
                title                 VARCHAR(255) NOT NULL,
                description           LONGTEXT,
                start_at              DATETIME NOT NULL,
                end_at                DATETIME,
                location              VARCHAR(500),
                cover_image           VARCHAR(500),
                rsvp_limit            INT,
                rsvp_count_going      INT DEFAULT 0,
                rsvp_count_interested INT DEFAULT 0,
                rsvp_count_not_going  INT DEFAULT 0,
                status                VARCHAR(50) NOT NULL DEFAULT 'active',
                meta                  LONGTEXT,
                created_at            DATETIME,
                updated_at            DATETIME,
                PRIMARY KEY (id),
                KEY idx_evt_group (group_id)
            ) {$this->charsetCollate};
		";
	}

	public function down(): string
	{
		return '';
	}
}
