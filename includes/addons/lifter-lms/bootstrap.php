<?php

namespace ZenCommunity\Addons\LifterLms;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Classes\Addon\Base;
class Bootstrap extends Base {

	public function __construct() {
		$this->name 		= 'LifterLMS';
		$this->icon_src 	= 'lifterlms.png';
		$this->version 		= '1.0.0';
		$this->description  = 'Connect ZenCommunity with LifterLMS.';
	}
	
	/**
	 * Run when addon is activated.
	 */
	public function activate(): void{
		if ( ! is_plugin_active( 'lifterlms/lifterlms.php' ) ) {
			throw new ZencommunityException( esc_html( __( 'LifterLMS plugin needs to activate.', 'zencommunity' ) ), 400 );
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
