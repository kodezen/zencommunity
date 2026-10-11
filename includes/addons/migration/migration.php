<?php

namespace ZenCommunity\Addons\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Classes\Addon\Base;

class Migration extends Base {

	public function __construct() {
		$this->name        = 'Migration';
		$this->icon_src     = 'migration.svg';
		$this->version      = '1.0.0';
		$this->description  = 'Migrate data into ZenCommunity from other plugins — a common home for every migration source.';
	}

	/**
	 * Run when addon is activated.
	 */
	public function activate(): void{
		Database\Migrator::init();
		Hooks::init();
    }

	/**
	 * Run when addon is deactivated.
	 */
	public function deactivate(): void{
		//
    }

	/**
	 * Bootstrap addon logic.
	 */
	public function boot(): void{
		Hooks::init();
		RestApiInit::init();
    }
}
