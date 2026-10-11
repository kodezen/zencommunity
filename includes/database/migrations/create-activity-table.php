<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateActivityTable extends Migration {
	protected ?string $table = 'zenc_activities';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
				id            BIGINT AUTO_INCREMENT,
				user_id       BIGINT UNSIGNED NOT NULL,
				feed_id       BIGINT NULL,
				group_id      BIGINT NULL,
				object_id     BIGINT NULL,
				object_type   VARCHAR(100) NULL,
				event_type    VARCHAR(100) NULL,
				is_public     TINYINT(1) DEFAULT 0,
                meta          longtext,
				created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
				KEY idx_act (user_id, feed_id, group_id, is_public, object_id, event_type(40),object_type(50))
            ) {$this->charsetCollate};
		";
		// FOREIGN KEY (feed_id) REFERENCES {$this->table('zenc_feeds')}(id) ON UPDATE CASCADE  ON DELETE CASCADE,
		// FOREIGN KEY (group_id) REFERENCES {$this->table('zenc_groups')}(id) ON UPDATE CASCADE  ON DELETE CASCADE
	}

	public function down(): string
	{
		return '';
    }
}