<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateUserBadgesTable extends Migration {
	protected ?string $table = 'zenc_user_badges';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id           BIGINT UNSIGNED AUTO_INCREMENT,
                user_id      BIGINT UNSIGNED NOT NULL,
                badge_id     BIGINT UNSIGNED NOT NULL,
                assigned_by  BIGINT UNSIGNED DEFAULT NULL,
                assigned_at  DATETIME,
                PRIMARY KEY (id),
                UNIQUE KEY user_badge_unique (user_id, badge_id),
                KEY idx_badge (badge_id)
            ) {$this->charsetCollate};
		";
	}

	public function down(): string
	{
		return '';
    }
}
