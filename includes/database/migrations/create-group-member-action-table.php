<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateGroupMemberActionTable extends Migration {
	protected ?string $table = 'zenc_group_member_actions';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id           BIGINT AUTO_INCREMENT,
                group_id     BIGINT NOT NULL,
                user_id      BIGINT UNSIGNED NOT NULL,
                actor_id     BIGINT UNSIGNED NOT NULL,
                type         VARCHAR(50) NOT NULL,
                reason       VARCHAR(100),
                note         TEXT,
                expires_at   DATETIME DEFAULT NULL,
                lifted_at    DATETIME DEFAULT NULL,
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_gma (group_id, user_id, type(20))
            ) {$this->charsetCollate};
		";
	}

	public function down(): string
	{
		return '';
	}
}
