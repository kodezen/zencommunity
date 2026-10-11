<?php
namespace ZenCommunity;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Migration {
	protected ?string $zencommunity_version;
	protected ?string $zencommunity_db_version;
	public function __construct() {
		$this->zencommunity_version    = get_option( 'zencommunity_version' );
		$this->zencommunity_db_version = get_option( 'zencommunity_db_version' );
	}

	public static function init() {
		$self = new self();
		add_action( 'init', [ $self, 'run_migration' ] );
	}

	public function run_migration() {
		if ( 
			empty( $this->zencommunity_db_version ) || 
			empty( get_option( 'zenc_is_pefixed' ) )
		) {
			Installer::init();
			add_option( 'zencommunity_version', ZENCOMMUNITY_VERSION );
			update_option( 'zenc_is_pefixed', 'prefixed' );
			return;
		}



		
		if ( ZENCOMMUNITY_DB_VERSION !== $this->zencommunity_db_version ) {
			Database\Migrator::init();
			update_option( 'zencommunity_db_version', ZENCOMMUNITY_DB_VERSION );
		}

		if ( ZENCOMMUNITY_VERSION !== $this->zencommunity_version ) {
			Prefixer::init();
			update_option( 'zencommunity_version', ZENCOMMUNITY_VERSION );
		}
	}
}
