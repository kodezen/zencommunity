<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * `zenc_group_events` only indexes `group_id` — no index covers
 * `created_at`, which the Report & Analytics feature's "events created"
 * trend query aggregates on directly. (Discovered after the initial design
 * pass only listed five tables — this table's own `created_at` column was
 * missed until the Event model's aggregation methods were actually written
 * and its schema re-checked; see openspec/changes/report-analytics.)
 */
class AddReportingIndexToGroupEvents extends Migration {
	protected ?string $table = 'zenc_group_events';

	public static function migrate(): void {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_group_events';

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_evt_reporting'" );
		if ( empty( $has_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_evt_reporting` (`created_at`)" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
