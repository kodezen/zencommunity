<?php

namespace ZenCommunity\Addons\Gameengine;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Classes\Addon\Base;
use ZenCommunity\Addons\Gameengine\Classes\Seeder;

/**
 * GameEngine integration: a native-feeling points / badges / ranks system for
 * the community. Community actions feed GameEngine's engine; rank, badges and a
 * leaderboard are surfaced natively inside the ZenCommunity SPA.
 */
class Gameengine extends Base {

	public function __construct() {
		$this->name        = 'GameEngine';
		$this->icon_src    = 'gameengine.svg';
		$this->version     = '1.0.0';
		$this->description = 'Native points, badges, ranks and leaderboard powered by GameEngine.';
	}

	public function activate(): void {
		Seeder::maybe_seed();
	}

	public function deactivate(): void {
		// Earned points/badges/ranks live in GameEngine and are intentionally kept.
	}

	public function boot(): void {
		// Earning side requires GameEngine itself.
		if ( self::gameengine_active() ) {
			Integration::register();
			Seeder::maybe_seed();
			Celebrations::init();
		}

		// Display side (BFF + SPA config) — guards internally when GE is absent.
		Hooks::init();
		RestApiInit::init();

		// One-time rewrite flush so the /leaderboard SPA slug resolves on installs
		// where the addon was already active before this version.
		if ( '1' !== get_option( 'zenc_gameengine_rewrite_v' ) ) {
			add_action( 'init', static function () {
				flush_rewrite_rules( false );
				update_option( 'zenc_gameengine_rewrite_v', '1' );
			}, 99 );
		}
	}

	public static function gameengine_active() : bool {
		return defined( 'GAMEENGINE_VERSION' ) || class_exists( '\GameEngine\Classes\TriggerRegistry' );
	}
}
