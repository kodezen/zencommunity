<?php
namespace ZenCommunity;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Keeps recurring jobs scheduled without asking the database on every request.
 *
 * Four addons make sure their recurring job still exists by hooking `init` and
 * asking Action Scheduler whether it is queued. That question is not free: each
 * one is a hook-and-status lookup against wp_actionscheduler_actions, and `init`
 * runs on every page view, every REST call and every admin-ajax request. On an
 * idle local install it measured fourteen queries per request — paid again by
 * each of the ten endpoints a ticket screen used to open, to re-learn four
 * answers that had not changed. A live site's actions table is far larger than
 * an idle one's, and these lookups scale with it.
 *
 * The answers change almost never, so they are worth remembering. Each job is
 * checked at most once an hour; in between this costs nothing at all, because
 * the timestamps live in a single autoloaded option WordPress has already read
 * by the time anything asks.
 *
 * Guard where a job is hooked to `init`, never inside the scheduling function
 * itself — activation and a settings save call those directly and must still
 * take effect at once. Only the every-request path is throttled.
 *
 * This stays self-healing. A job dropped by hand, or lost with a failed queue,
 * is rescheduled by the first request after its window passes, rather than
 * waiting for someone to deactivate and reactivate the plugin.
 */
class ScheduleGuard {

	/** Autoloaded, so reading it costs nothing on top of what WordPress already loads. */
	private const OPTION = 'zencommunity_schedule_checks';

	/** How long an answer stands before the job is checked again. */
	private const TTL = HOUR_IN_SECONDS;

	/**
	 * Run $schedule only if this key has not been checked recently.
	 *
	 * @param string   $key      Names the job, and its slot in the record.
	 * @param callable $schedule Does the real check-and-schedule work.
	 * @param int      $ttl      Seconds an answer stands for.
	 */
	public static function ensure( string $key, callable $schedule, int $ttl = self::TTL ) : void {
		$checked = get_option( self::OPTION, [] );

		if ( ! is_array( $checked ) ) {
			$checked = [];
		}

		// An upgrade may have changed a job's interval, its hook, or added one,
		// and none of that should wait out an answer remembered from the old
		// version. Every key goes stale together when the version moves.
		if ( ( $checked['_version'] ?? '' ) !== ZENCOMMUNITY_VERSION ) {
			$checked = [ '_version' => ZENCOMMUNITY_VERSION ];
		}

		$last = isset( $checked[ $key ] ) ? (int) $checked[ $key ] : 0;
		$now  = time();

		// A timestamp in the future means the clock moved backwards; treat it
		// as stale rather than letting it silence the check until time catches
		// up with it.
		if ( $last > 0 && $last <= $now && ( $now - $last ) < $ttl ) {
			return;
		}

		$schedule();

		$checked[ $key ] = $now;

		update_option( self::OPTION, $checked, true );
	}

	/**
	 * Forget every answer, so the next request checks each job again.
	 *
	 * For an upgrade or a repair routine that has reason to believe the queue
	 * no longer matches what the plugin expects.
	 */
	public static function flush() : void {
		delete_option( self::OPTION );
	}
}
