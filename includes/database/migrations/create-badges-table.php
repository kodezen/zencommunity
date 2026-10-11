<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateBadgesTable extends Migration {
	protected ?string $table = 'zenc_badges';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
                id           BIGINT UNSIGNED AUTO_INCREMENT,
                label        VARCHAR(100) NOT NULL,
                slug         VARCHAR(120) NOT NULL,
                color        VARCHAR(20) NOT NULL DEFAULT '#6B7280',
                icon         VARCHAR(50) DEFAULT NULL,
                description  VARCHAR(255) DEFAULT NULL,
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
