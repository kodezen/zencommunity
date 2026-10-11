<?php

namespace ZenCommunity\Addons\Email\Database;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Database\Migrator as BaseMigrator;
/**
 * @class Migrator
 */
class Migrator extends BaseMigrator {
	protected array $migrations = [
		Migrations\CreateTemplateTable::class,
	];
}