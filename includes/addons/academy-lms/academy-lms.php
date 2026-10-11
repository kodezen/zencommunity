<?php

namespace ZenCommunity\Addons\AcademyLms;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Classes\Addon\Base;
use ZenCommunity\Addons\AcademyLms\Classes\Sync;
use ZenCommunity\Addons\AcademyLms\Classes\Gating;
class AcademyLms extends Base {

	public function __construct() {
		$this->name 		= 'Academy LMS';
		$this->icon_src 	= 'academy-lms.svg';
		$this->version 		= '1.0.0';
		$this->description  = 'Connect ZenCommunity with Academy LMS.';
	}
	
	/**
	 * Run when addon is activated.
	 */
	public function activate(): void{
		if ( ! is_plugin_active( 'academy/academy.php' ) ) {
			throw new ZencommunityException( esc_html( __( 'Academy LMS plugin required', 'zencommunity' ) ), 400 );
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
		Sync::init();
		Gating::init();

		// One-time rewrite flush so the new SPA course slugs resolve on installs
		// where the addon was already active before this version.
		if ( '1' !== get_option( 'zenc_alms_rewrite_v' ) ) {
			add_action( 'init', static function () {
				flush_rewrite_rules( false );
				update_option( 'zenc_alms_rewrite_v', '1' );
			}, 99 );
		}

		// Version-gated schema sync so columns added after first activation (e.g.
		// category_ids) are applied to already-active installs. dbDelta is idempotent.
		if ( '3' !== get_option( 'zenc_alms_db_v' ) ) {
			Database\Migrator::init();
			update_option( 'zenc_alms_db_v', '3' );
		}
    }
}
