<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateNotificationTable extends Migration {
	protected ?string $table = 'zenc_notifications';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
				id            BIGINT AUTO_INCREMENT,
				from_user_id  BIGINT UNSIGNED NULL,
				group_id      BIGINT NULL,
				feed_id       BIGINT NULL,
				object_id     BIGINT NULL,
				object_type   VARCHAR(100) NULL,
				event_type    VARCHAR(100) NULL,
				message       LONGTEXT,
                meta          longtext,
				created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
				KEY idx_ntf (from_user_id, group_id, feed_id, event_type(50), object_id)
            ) {$this->charsetCollate};
		";

                // FOREIGN KEY (feed_id) REFERENCES {$this->table('zenc_feeds')}(id) ON UPDATE CASCADE  ON DELETE CASCADE,
                // FOREIGN KEY (group_id) REFERENCES {$this->table('zenc_groups')}(id) ON UPDATE CASCADE  ON DELETE CASCADE,
                // FOREIGN KEY (to_user_id) REFERENCES {$this->table('zenc_profiles')}(user_id) ON UPDATE CASCADE  ON DELETE CASCADE
	}

	public function down(): string
	{
		return '';
    }
}