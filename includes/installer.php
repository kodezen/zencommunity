<?php
namespace ZenCommunity;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Installer {
	protected string $zencommunity_version;
	public function __construct() {
		$this->zencommunity_version = get_option( 'zencommunity_version' );
		$this->save_option();
	}
	public static function init() {
		Prefixer::init();
		Database\Migrator::init();
		update_option( 'zencommunity_db_version', ZENCOMMUNITY_DB_VERSION );

		/**
		 * Flush the rewrite rules after install or update.
		 */
		do_action( 'zencommunity/flush_rewrite_rules' );
		do_action( 'zencommunity/activate' );
	}
	public function save_option() {
		if ( ! $this->zencommunity_version ) {
			add_option( 'zencommunity_version', ZENCOMMUNITY_VERSION );
		}

		if ( ! get_option( 'zencommunity_first_install_time' ) ) {
			add_option( 'zencommunity_first_install_time', time() );
		}
	}
}
