<?php
namespace ZenCommunity\Addons\Email\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateTemplateTable extends Migration {
	protected ?string $table = 'zenc_email_templates';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
				id BIGINT UNSIGNED AUTO_INCREMENT,
				created_by BIGINT UNSIGNED,
				status VARCHAR(100) NOT NULL DEFAULT 'active',
				event VARCHAR(100) NOT NULL,
				subject VARCHAR(255) NOT NULL,
				heading VARCHAR(255) NOT NULL,
				template LONGTEXT NOT NULL,
				created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (id)
            ) {$this->charsetCollate};
		";
	}

	public function down(): string
	{
		return '';
    }
}