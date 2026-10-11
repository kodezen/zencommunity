<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateGroupTable extends Migration {
	protected ?string $table = 'zenc_groups';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id            BIGINT AUTO_INCREMENT,
                name          VARCHAR(255),
                slug          VARCHAR(255),
                description   TEXT,
                featured_img  VARCHAR(255),
                category_id   BIGINT,
                privacy       VARCHAR(100) NOT NULL DEFAULT 'public',
                status        VARCHAR(100) NOT NULL DEFAULT 'published',
                meta          longtext,
                icon          longtext,
                member_count  BIGINT DEFAULT 0,
                created_by    BIGINT UNSIGNED,
                serial_number BIGINT UNSIGNED,
                created_at    DATETIME,
                updated_at    DATETIME,
                PRIMARY KEY (id),
                KEY idx_grp (category_id, status(50))
            ) {$this->charsetCollate};
		";
        // privacy       ENUM('public', 'private', 'hidden') NOT NULL DEFAULT 'public',
	}

	public function down(): string
	{
		return '';
    }
}