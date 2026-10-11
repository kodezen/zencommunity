<?php
namespace ZenCommunity\Addons\LifterLms\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CreateGroupCourseRelationTable extends Migration {
	protected ?string $table = 'zenc_llms_group_course_relation';

	public function up(): string
	{
		return "
            CREATE TABLE {$this->table} (
				group_id BIGINT UNSIGNED NOT NULL,
				course_id BIGINT UNSIGNED NOT NULL
            ) {$this->charsetCollate};
		";
	}

	public function down(): string
	{
		return '';
    }
}