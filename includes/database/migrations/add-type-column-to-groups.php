<?php
namespace ZenCommunity\Database\Migrations;

use ZenCommunity\Database\Utils\Migration;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Adds the `type` column to zenc_groups so a Space can hold a specific kind of
 * content (SureDash-style). Existing groups default to 'discussion' — the
 * classic feed + members behaviour — so nothing changes for them.
 *
 * Type-specific configuration (external_url, page content, resources, display
 * settings, …) lives in the existing `meta` JSON column; only the `type`
 * selector is a real column so views can filter/branch on it cheaply.
 */
class AddTypeColumnToGroups extends Migration {
	protected ?string $table = 'zenc_groups';

	public static function migrate(): void {
		global $wpdb;
		$table   = $wpdb->prefix . 'zenc_groups';
		$columns = $wpdb->get_results( "SHOW COLUMNS FROM `{$table}` LIKE 'type'" ); // phpcs:ignore
		if ( empty( $columns ) ) {
			$wpdb->query( "ALTER TABLE `{$table}` ADD COLUMN `type` VARCHAR(50) NOT NULL DEFAULT 'discussion' AFTER `slug`" ); // phpcs:ignore
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
