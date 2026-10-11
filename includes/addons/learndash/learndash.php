<?php

namespace ZenCommunity\Addons\Learndash;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Classes\Addon\Base;
class Learndash extends Base {

	public function __construct() {
		$this->name 		= 'Learndash';
		$this->icon_src 	= 'learndash.png';
		$this->version 		= '1.0.0';
		$this->description  = 'Connect ZenCommunity with Learndash.';
	}
	
	/**
	 * Run when addon is activated.
	 */
	public function activate(): void{
		if ( ! is_plugin_active( 'learndash/sfwd_lms.php' ) ) {
			throw new ZencommunityException( esc_html( __( 'Learndash plugin needs to activate.', 'zencommunity' ) ), 400 );
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
