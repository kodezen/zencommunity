<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The main feed, group-feed, and profile-feed listings (Feed::index()) all
 * sort by `created_at` by default, and the unfiltered global feed has no
 * group_id/user_id predicate to lean on — but the table's only secondary
 * index (idx_fds) is (group_id, user_id), which doesn't cover `created_at`
 * or `status` at all. Today that's masked by an accident of a small groups
 * table giving the optimizer a cheap join path; it stops working once
 * groups/feeds grow, forcing a full scan plus filesort on every request.
 */
class AddListingIndexToFeeds extends Migration {
	protected ?string $table = 'zenc_feeds';

	public static function migrate(): void {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_feeds';

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_created_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_fds_created'" );
		if ( empty( $has_created_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_fds_created` (`created_at`)" );
		}

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_status_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_fds_status_created'" );
		if ( empty( $has_status_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_fds_status_created` (`status`, `created_at`)" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
