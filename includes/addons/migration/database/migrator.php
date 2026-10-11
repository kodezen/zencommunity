<?php

namespace ZenCommunity\Addons\Migration\Database;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Database\Migrator as BaseMigrator;
/**
 * @class Migrator
 */
class Migrator extends BaseMigrator {
	protected array $migrations = [
		Migrations\CreateMigrationJobTable::class,
		Migrations\CreateMigrationRecordTable::class,
	];
}
