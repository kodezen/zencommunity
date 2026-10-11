<?php

namespace ZenCommunity\Addons\Email;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Classes\Addon\Base;
class Email extends Base {

	public function __construct() {
		$this->name 		= 'Email';
		$this->icon_src 	= 'email.svg';
		$this->version 		= '1.0.0';
		$this->description  = 'Enables sending and notification to users.';
	}
	
	/**
	 * Run when addon is activated.
	 */
	public function activate(): void{
		Database\Migrator::init();
		Hooks::init();
		// Database\Models\Template::rescan_templates();
    }

	/**
	 * Run when addon is deactivated.
	 */
	public function deactivate(): void{
		Digest::unschedule();
    }

	/**
	 * Bootstrap addon logic.
	 */
	public function boot(): void{
		Hooks::init();
		RestApiInit::init();
    }
}
