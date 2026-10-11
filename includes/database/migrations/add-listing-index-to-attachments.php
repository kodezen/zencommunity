<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The admin media library (`GET /attachments`, Attachment::index() called
 * with a null $user_id for an admin) lists every attachment platform-wide
 * sorted by `created_at`/`id`, but the table's only index (idx_mda) leads
 * with `user_id` — unusable once there's no user filter. Full scan plus
 * filesort, growing with total site-wide upload volume. (The group/member
 * scoped attachment endpoints stay bounded by group_id/user_id and aren't
 * affected.)
 */
class AddListingIndexToAttachments extends Migration {
	protected ?string $table = 'zenc_attachments';

	public static function migrate(): void {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_attachments';

		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$has_idx = $wpdb->get_results( "SHOW INDEX FROM `{$table}` WHERE Key_name = 'idx_mda_created'" );
		if ( empty( $has_idx ) ) {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$wpdb->query( "ALTER TABLE `{$table}` ADD INDEX `idx_mda_created` (`created_at`)" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
