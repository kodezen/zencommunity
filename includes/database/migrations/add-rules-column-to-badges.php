<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Adds the `rules` column to zenc_badges so a badge can optionally be
 * auto-assigned by an admin-defined condition (role, group membership, or a
 * profile field threshold) instead of always being hand-assigned. NULL/empty
 * keeps a badge exactly as it was: manual-only.
 */
class AddRulesColumnToBadges extends Migration {
	protected ?string $table = 'zenc_badges';

	public static function migrate(): void {
		global $wpdb;
		$table   = $wpdb->prefix . 'zenc_badges';
		$columns = $wpdb->get_results( "SHOW COLUMNS FROM `{$table}` LIKE 'rules'" ); // phpcs:ignore
		if ( empty( $columns ) ) {
			$wpdb->query( "ALTER TABLE `{$table}` ADD COLUMN `rules` LONGTEXT DEFAULT NULL AFTER `description`" ); // phpcs:ignore
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
