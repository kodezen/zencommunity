<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Profile::index() (the member directory — GET /members) filters by
 * `status` for non-admin callers and always sorts by `last_activity`
 * (the default order_by), but the table's only secondary index (idx_pf)
 * leads with `user_id`, which neither of those queries filter on. That
 * forces a full table scan plus filesort on every listing request,
 * growing with member volume.
 */
class AddListingIndexToProfiles extends Migration {
	protected ?string $table = 'zenc_profiles';

	public static function migrate(): void {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_profiles';

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_pf_status_activity'" );
		if ( empty( $has_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_pf_status_activity` (`status`, `last_activity`)" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
