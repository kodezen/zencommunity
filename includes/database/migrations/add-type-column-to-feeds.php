<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AddTypeColumnToFeeds extends Migration {
	protected ?string $table = 'zenc_feeds';

	public static function migrate(): void {
		global $wpdb;
		$table   = $wpdb->prefix . 'zenc_feeds';
		$columns = $wpdb->get_results( "SHOW COLUMNS FROM `{$table}` LIKE 'type'" );
		if ( empty( $columns ) ) {
			$wpdb->query( "ALTER TABLE `{$table}` ADD COLUMN `type` VARCHAR(50) NOT NULL DEFAULT 'post'" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
