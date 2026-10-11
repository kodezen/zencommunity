<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * `zenc_comments` already has `created_at` as part of a wide composite index
 * (idx_cmmnt: feed_id, user_id, parent_id, like_count, comment_count,
 * created_at, updated_at) — useless for the Report & Analytics feature's own
 * queries, which aggregate by `created_at` alone with no feed_id/user_id
 * predicate (a composite index only helps a query that filters on its
 * leading columns). A dedicated single-column index is needed for those
 * `GROUP BY`s to use an index range scan instead of a full table scan.
 */
class AddReportingIndexToComments extends Migration {
	protected ?string $table = 'zenc_comments';

	public static function migrate(): void {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_comments';

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_cmmnt_reporting'" );
		if ( empty( $has_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_cmmnt_reporting` (`created_at`)" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
