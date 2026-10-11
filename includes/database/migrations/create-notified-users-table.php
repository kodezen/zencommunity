<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateNotifiedUsersTable extends Migration {
	protected ?string $table = 'zenc_notified_users';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
				id            BIGINT AUTO_INCREMENT,
				to_user_id    BIGINT UNSIGNED NOT NULL, 
				notification_id BIGINT NULL,
				is_read       TINYINT(1) DEFAULT 0,
				created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
				KEY idx_ntf_usr (to_user_id, notification_id,  is_read)
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