<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateReactionTable extends Migration {
	protected ?string $table = 'zenc_reactions';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id          BIGINT AUTO_INCREMENT,
                user_id     BIGINT UNSIGNED,
                feed_id     BIGINT DEFAULT NULL,
                comment_id  BIGINT DEFAULT NULL,
                type        VARCHAR(100), 
                ip          VARCHAR(100),
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_rc (user_id, feed_id, comment_id, type(50))
            ) {$this->charsetCollate};
		";
                // -- Foreign Keys
                // FOREIGN KEY (feed_id) REFERENCES {$this->table('zenc_feeds')}(id)
                //     ON UPDATE CASCADE ON DELETE CASCADE,

                // FOREIGN KEY (comment_id) REFERENCES {$this->table('zenc_comments')}(id)
                //     ON UPDATE CASCADE ON DELETE CASCADE
	}

	public function down(): string
	{
		return '';
    }
}