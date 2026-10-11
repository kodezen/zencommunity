<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * `zenc_event_rsvps` only indexes (event_id, user_id) — no index covers
 * `created_at`, which the Report & Analytics feature's RSVP-volume trend
 * query aggregates on directly.
 */
class AddReportingIndexToEventRsvps extends Migration {
	protected ?string $table = 'zenc_event_rsvps';

	public static function migrate(): void {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_event_rsvps';

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_rsvp_reporting'" );
		if ( empty( $has_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_rsvp_reporting` (`created_at`)" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
