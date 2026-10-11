<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateCustomRolesTable extends Migration {
	protected ?string $table = 'zenc_custom_roles';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id           BIGINT UNSIGNED AUTO_INCREMENT,
                slug         VARCHAR(120) NOT NULL,
                label        VARCHAR(100) NOT NULL,
                capabilities longtext,
                created_at   DATETIME,
                updated_at   DATETIME,
                PRIMARY KEY (id),
                UNIQUE KEY slug_unique (slug)
            ) {$this->charsetCollate};
		";
	}

	public function down(): string
	{
		return '';
    }
}
