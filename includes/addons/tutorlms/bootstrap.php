<?php

namespace ZenCommunity\Addons\Tutorlms;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Classes\Addon\Base;
class Bootstrap extends Base {

	public function __construct() {
		$this->name 		= 'TutorLMS';
		$this->icon_src 	= 'tutor_logo.png';
		$this->version 		= '1.0.0';
		$this->description  = 'Connect ZenCommunity with Tutorlms.';
	}
	
	/**
	 * Run when addon is activated.
	 */
	public function activate(): void{
		if ( ! is_plugin_active( 'tutor/tutor.php' ) ) {
			throw new ZencommunityException( esc_html( __( 'Tutorlms plugin needs to activate.', 'zencommunity' ) ), 400 );
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
