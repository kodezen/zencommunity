<?php

namespace ZenCommunity\Addons\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Addons\Migration\Services\BatchRunner;

class Hooks {
	public static function init() : void {
		// Registering the Action Scheduler hook callback is safe at any time —
		// it's only *dispatching* new actions (as_schedule_*) that must wait
		// for `init`, and every dispatch call made directly from this addon's
		// normal flow happens from a REST callback or from inside an
		// already-running scheduled action, both of which are always past
		// `init`. The recurring watchdog schedule below is the one exception
		// (see schedule_watchdog()).
		BatchRunner::init();

		// Populate the provider registry now — by this point every other
		// plugin/addon (e.g. zencommunity-pro's Fluent Support provider) has
		// already hooked `zencommunity/migration/register_providers` at
		// file-load time, well before addons are booted.
		ProviderRegistry::boot();

		// Hooks::init() itself runs during addon boot (plugins_loaded-adjacent)
		// — too early for Action Scheduler's data store, which only
		// initializes on `init` (priority 1). Same gotcha, same fix pattern
		// as TicketingSystem::schedule_auto_close() in zencommunity-pro.
		// Throttled too: the check below is an Action Scheduler lookup, and
		// `init` runs on every request. See ScheduleGuard.
		add_action( 'init', function () {
			\ZenCommunity\ScheduleGuard::ensure( 'migration-watchdog', [ self::class, 'schedule_watchdog' ] );
		} );
	}

	/** Keeps BatchRunner::watchdog() recurring — see its docblock for why it exists. */
	public static function schedule_watchdog() : void {
		$action_queue = \ZenCommunity\ActionQueue::get_instance();
		if ( ! $action_queue->get_next( BatchRunner::WATCHDOG_HOOK ) ) {
			$action_queue->schedule_recurring( time(), BatchRunner::LOCK_TIMEOUT, BatchRunner::WATCHDOG_HOOK, [], BatchRunner::GROUP );
		}
	}
}
