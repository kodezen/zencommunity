<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The moderation queue (Report::index()) always sorts by `created_at DESC`
 * and commonly filters by `status` alone (e.g. pending reports), but the
 * table's only index (idx_report) leads with `object_type`/`object_id` —
 * columns that index exists to support the "does a report already exist for
 * this object" check, not the queue listing. Full scan plus filesort on
 * every admin moderation-queue request, growing with total reports filed.
 */
class AddListingIndexToReports extends Migration {
	protected ?string $table = 'zenc_reports';

	public static function migrate(): void {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_reports';

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_created_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_reports_created'" );
		if ( empty( $has_created_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_reports_created` (`created_at`)" );
		}

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_status_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_reports_status_created'" );
		if ( empty( $has_status_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_reports_status_created` (`status`, `created_at`)" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
