<?php

namespace ZenCommunity\Addons\AcademyLms\Database;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Database\Migrator as BaseMigrator;
/**
 * @class Migrator
 */
class Migrator extends BaseMigrator {
	protected array $migrations = [
		Migrations\CreateAcademyRelationTable::class,
		Migrations\CreateGroupCourseRelationTable::class,
	];
}