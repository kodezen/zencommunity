<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The activity stream (Activity::index()) always sorts by `created_at DESC`,
 * but for the default global view — no `user_id`/`group_id` filter, just the
 * privacy/membership check — none of that is covered by the table's only
 * index (idx_act, which leads with `user_id`). That forces a full scan plus
 * filesort on every request, growing with total platform activity.
 */
class AddListingIndexToActivities extends Migration {
	protected ?string $table = 'zenc_activities';

	public static function migrate(): void {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_activities';

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_act_created'" );
		if ( empty( $has_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_act_created` (`created_at`)" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
