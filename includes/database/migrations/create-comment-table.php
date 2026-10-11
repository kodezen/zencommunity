<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateCommentTable extends Migration {
	protected ?string $table = 'zenc_comments';

	public function up(): string
	{
		return "
        CREATE TABLE {$this->table} (
            id            BIGINT NOT NULL AUTO_INCREMENT,
            user_id       BIGINT UNSIGNED NOT NULL,
            feed_id       BIGINT DEFAULT NULL,
            parent_id     BIGINT DEFAULT NULL,
            content       LONGTEXT DEFAULT NULL,
            rendered      LONGTEXT DEFAULT NULL,
            comment_count BIGINT DEFAULT 0,
            like_count    BIGINT DEFAULT 0,
            meta          LONGTEXT DEFAULT NULL,
            ip            VARCHAR(100) DEFAULT NULL,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_cmmnt (feed_id, user_id, parent_id, like_count, comment_count, created_at, updated_at)
        ) {$this->charsetCollate};
		";
        // -- Foreign keys
        // FOREIGN KEY (feed_id) REFERENCES {$this->table('zenc_feeds')}(id)
        //     ON UPDATE CASCADE ON DELETE CASCADE,
        // FOREIGN KEY (parent_id) REFERENCES {$this->table('zenc_comments')}(id)
        //     ON UPDATE CASCADE ON DELETE CASCADE
	}

	public function down(): string
	{
		return '';
    }
}