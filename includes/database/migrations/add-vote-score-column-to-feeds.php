<?php
namespace ZenCommunity\Database\Migrations;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AddVoteScoreColumnToFeeds extends Migration {
	protected ?string $table = 'zenc_feeds';

	public static function migrate(): void {
		global $wpdb;
		$table   = $wpdb->prefix . 'zenc_feeds';
		$columns = $wpdb->get_results( "SHOW COLUMNS FROM `{$table}` LIKE 'vote_score'" );
		if ( empty( $columns ) ) {
			$wpdb->query( "ALTER TABLE `{$table}` ADD COLUMN `vote_score` INT NOT NULL DEFAULT 0" );
		}
	}

	public function up(): string {
		return '';
	}

	public function down(): string {
		return '';
	}
}
