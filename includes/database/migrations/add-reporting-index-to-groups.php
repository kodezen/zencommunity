<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * `zenc_groups` has indexes on `category_id`/`status` only — no index covers
 * `created_at`, which the Report & Analytics feature's "new Spaces" trend
 * query aggregates on directly.
 */
class AddReportingIndexToGroups extends Migration {
	protected ?string $table = 'zenc_groups';

	public static function migrate(): void {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_groups';

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_grp_reporting'" );
		if ( empty( $has_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_grp_reporting` (`created_at`)" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
