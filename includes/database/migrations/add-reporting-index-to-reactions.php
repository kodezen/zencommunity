<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * `zenc_reactions` has no index covering `created_at` at all (confirmed via
 * SHOW INDEX) — every Report & Analytics query aggregating reaction volume
 * over time needs one, or it falls back to a full table scan.
 */
class AddReportingIndexToReactions extends Migration {
	protected ?string $table = 'zenc_reactions';

	public static function migrate(): void {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_reactions';

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_rc_reporting'" );
		if ( empty( $has_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_rc_reporting` (`created_at`)" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
