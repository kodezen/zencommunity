<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateMediaTable extends Migration {
	protected ?string $table = 'zenc_attachments';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id          BIGINT AUTO_INCREMENT,
                user_id     BIGINT,
                type        VARCHAR(100), 
                parent_object_id      BIGINT,
                parent_object_type    VARCHAR(100), 
                object_id   BIGINT,
                object_type VARCHAR(100), 
                mime        VARCHAR(100),
                path        text,
                ip          VARCHAR(100),
                meta        longtext,
                created_at  DATETIME,
                PRIMARY KEY (id),
                KEY idx_mda (user_id,object_id,object_type(40),parent_object_id,parent_object_type(40))
            ) {$this->charsetCollate};
		";
	}

	public function down(): string
	{
		return '';
    }
}