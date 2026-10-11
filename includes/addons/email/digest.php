<?php

namespace ZenCommunity\Addons\Email;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Database\Models\Notification;
use ZenCommunity\Addons\Email\Database\Models\Template as TmpModel;
use WP_User_Query;

/**
 * Batches notification emails for members who've opted into a daily/weekly
 * digest (Preferences page) instead of an email per event. A single daily
 * WP-Cron tick decides, per user, whether their chosen interval is due —
 * no separate "weekly" cron schedule needed.
 */
class Digest {

	const CRON_HOOK       = 'zenc_email_digest_tick';
	const LAST_SENT_META  = 'zenc_email_digest_last_sent';
	const MAX_ITEMS       = 50;

	public static function init() : void {
		add_action( 'init', [ static::class, 'schedule' ] );
		add_action( self::CRON_HOOK, [ static::class, 'run' ] );
	}

	public static function schedule() : void {
		if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_event( time(), 'daily', self::CRON_HOOK );
		}
	}

	public static function unschedule() : void {
		wp_clear_scheduled_hook( self::CRON_HOOK );
	}

	/**
	 * Cron entry point: walk every user with a non-instant digest
	 * preference and send theirs if it's due.
	 */
	public static function run() : void {
		$query = new WP_User_Query( [
			'fields'     => 'ID',
			'meta_query' => [ [
				'key'     => 'zenc_email_digest_frequency',
				'value'   => [ 'daily', 'weekly' ],
				'compare' => 'IN',
			] ],
		] );

		foreach ( $query->get_results() as $user_id ) {
			try {
				self::maybe_send_for_user( (int) $user_id );
			}
			catch ( \Throwable $e ) {
				error_log( print_r( [
					'origin'  => 'email_digest',
					'user_id' => $user_id,
					'file'    => $e->getFile(),
					'line'    => $e->getLine(),
					'msg'     => $e->getMessage(),
				], true ) );
			}
		}
	}

	protected static function maybe_send_for_user( int $user_id ) : void {
		$frequency = zencommunity_get_user_email_digest_frequency( $user_id );
		if ( 'instant' === $frequency ) {
			return;
		}

		$interval  = 'weekly' === $frequency ? WEEK_IN_SECONDS : DAY_IN_SECONDS;
		$last_sent = (int) get_user_meta( $user_id, self::LAST_SENT_META, true );

		if ( $last_sent && ( time() - $last_sent ) < $interval ) {
			return; // Not due yet.
		}

		$since = $last_sent
			? gmdate( 'Y-m-d H:i:s', $last_sent )
			: gmdate( 'Y-m-d H:i:s', time() - $interval );

		$notifications = array_values( array_filter(
			Notification::for_digest( $user_id, $since, self::MAX_ITEMS ),
			fn( array $n ) : bool => zencommunity_user_allows_notification( $user_id, (string) ( $n['event_type'] ?? '' ) )
		) );

		// Stamp last-sent regardless, so an empty window doesn't get
		// reprocessed (and re-checked) on every subsequent tick.
		update_user_meta( $user_id, self::LAST_SENT_META, time() );

		if ( ! empty( $notifications ) ) {
			self::send( $user_id, $frequency, $notifications );
		}
	}

	protected static function send( int $user_id, string $frequency, array $notifications ) : void {
		$items = '';
		foreach ( $notifications as $notification ) {
			$message = wp_strip_all_tags( (string) ( $notification['message'] ?? '' ) );
			if ( '' === $message ) {
				continue;
			}
			$url    = MagicLink::url( $user_id, zencommunity_notification_target_path( $notification ) );
			$items .= sprintf(
				'<li style="margin-bottom:10px;"><a href="%s" style="color:#4a4aff;text-decoration:none;">%s</a></li>',
				esc_url( $url ),
				esc_html( $message )
			);
		}

		if ( '' === $items ) {
			return;
		}

		$periods = zencommunity_email_digest_frequencies();
		$data    = [
			'to_user_id'   => $user_id,
			'from_user_id' => 0,
			'meta'         => [
				'route' => [
					'digest' => [
						'items'  => '<ul style="list-style:none;padding:0;margin:0;">' . $items . '</ul>',
						'period' => $periods[ $frequency ] ?? $frequency,
						'count'  => count( $notifications ),
					],
				],
			],
		];

		try {
			( new Template( 'notification_digest', $data ) )->send();
		}
		catch ( \Throwable $e ) {
			// Self-heal: on a fresh/older install the digest event may not
			// be in the template table yet (it's only inserted on rescan).
			try {
				TmpModel::rescan_templates();
				( new Template( 'notification_digest', $data ) )->send();
			}
			catch ( \Throwable $e2 ) {
				unset( $e2 );
			}
		}
	}
}
