<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateProfileTable extends Migration {
	protected ?string $table = 'zenc_profiles';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id            BIGINT AUTO_INCREMENT,
                user_id       BIGINT UNSIGNED NOT NULL,
                first_name    VARCHAR(255),
                last_name     VARCHAR(255),
                username      VARCHAR(90),
                points        INT UNSIGNED NOT NULL DEFAULT 0,
                bio           TEXT,
                avatar_url    VARCHAR(255),
                meta          longtext,
                usertype      VARCHAR(90) DEFAULT 'member',
                last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                status        VARCHAR(90) NOT NULL DEFAULT 'pending',
                PRIMARY KEY (id),
				KEY idx_pf (user_id,status(50))
            ) {$this->charsetCollate};
		";
        // status        ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'pending',
	}

	public function down(): string
	{
		return '';
    }
}