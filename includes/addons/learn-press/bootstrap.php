<?php

namespace ZenCommunity\Addons\LearnPress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Classes\Addon\Base;
class Bootstrap extends Base {

	public function __construct() {
		$this->name 		= 'LearnPress';
		$this->icon_src 	= 'learnpress.svg';
		$this->version 		= '1.0.0';
		$this->description  = 'Connect ZenCommunity with LearnPress.';
	}
	
	/**
	 * Run when addon is activated.
	 */
	public function activate(): void{
		if ( ! is_plugin_active( 'learnpress/learnpress.php' ) ) {
			throw new ZencommunityException( esc_html( __( 'LearnPress plugin needs to activate.', 'zencommunity' ) ), 400 );
		}

		Database\Migrator::init();
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
		EventRegistration::init();
    }
}
