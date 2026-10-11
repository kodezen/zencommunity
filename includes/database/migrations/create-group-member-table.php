<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateGroupMemberTable extends Migration {
	protected ?string $table = 'zenc_group_members';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id           BIGINT AUTO_INCREMENT,
                group_id     BIGINT,
                user_id      BIGINT UNSIGNED,
                role         VARCHAR(100) NOT NULL DEFAULT 'member',
                status       VARCHAR(100)  NOT NULL DEFAULT 'pending',
                meta         longtext,
                joined_at    DATETIME,
			    UNIQUE KEY group_user_unique (group_id, user_id),
                PRIMARY KEY (id),
                KEY idx_gm (role(50), status(50))
            ) {$this->charsetCollate};
		";
        // KEY idx (role, status)
        // role         ENUM('admin', 'moderator', 'member') NOT NULL DEFAULT 'member',
        // status       ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'pending',,
        // FOREIGN KEY (group_id ) REFERENCES  {$this->table('zenc_groups')}(id) ON UPDATE CASCADE  ON DELETE CASCADE
	}

	public function down(): string
	{
		return '';
    }
}