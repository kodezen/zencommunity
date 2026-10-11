<?php
namespace ZenCommunity\Addons\LearnPress\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateAcademyRelationTable extends Migration {
	protected ?string $table = 'zenc_lp_relations';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
				id BIGINT UNSIGNED AUTO_INCREMENT,
				created_by BIGINT UNSIGNED,
				group_id BIGINT UNSIGNED NOT NULL,
				events LONGTEXT NOT NULL,
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