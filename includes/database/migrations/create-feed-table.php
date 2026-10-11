<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateFeedTable extends Migration {
	protected ?string $table = 'zenc_feeds';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id           BIGINT AUTO_INCREMENT,
                parent_id    BIGINT,
                group_id     BIGINT,
                user_id      BIGINT,
                is_featured  TINYINT(1) DEFAULT 0,
                title        VARCHAR(255),
                slug         VARCHAR(255),
                content      longtext,
                rendered     longtext,
                status        VARCHAR(100) NOT NULL DEFAULT 'published',
                comment_count BIGINT DEFAULT 0,
                like_count    BIGINT DEFAULT 0,
                meta          longtext,
                created_at   DATETIME,
                updated_at   DATETIME,
                PRIMARY KEY (id),
                KEY idx_fds (group_id,user_id)
            ) {$this->charsetCollate};
		";
        // FOREIGN KEY (group_id) REFERENCES {$this->table('zenc_groups')}(id) ON UPDATE CASCADE  ON DELETE CASCADE,
        // FOREIGN KEY (parent_id) REFERENCES {$this->table('zenc_feeds')}(id) ON UPDATE CASCADE  ON DELETE CASCADE
	}

	public function down(): string
	{
		return '';
    }
}