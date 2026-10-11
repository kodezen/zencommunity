<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * `zenc_group_members` has no index covering `joined_at` — the Report &
 * Analytics feature's "Space joins" and per-Space "new members in range"
 * queries both aggregate on it directly.
 */
class AddReportingIndexToGroupMembers extends Migration {
	protected ?string $table = 'zenc_group_members';

	public static function migrate(): void {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_group_members';

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_gm_reporting'" );
		if ( empty( $has_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_gm_reporting` (`joined_at`)" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
