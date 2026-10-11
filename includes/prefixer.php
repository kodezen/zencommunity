<?php
namespace ZenCommunity;
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
/**
 * Rename plugin tables, options from old prefix (zc_) to new prefix (zenc_)
 */
class Prefixer {
	protected array $tables = [
		'zc_activities',
		'zc_attachments',
		'zc_comments',
		'zc_email_templates',
		'zc_feeds',
		'zc_group_members',
		'zc_groups',
		'zc_profiles',
		'zc_reactions',
		'zc_notifications',
		'zc_notified_users',
		'zc_alms_relations',
		'zc_email_templates',
		'zc_group_course_relation',
	];
	protected array $options = [
		'zc_active_addons',
		'zc_academy_events',
		'zc_email_settings',
	];

	protected string $old_prefix = 'zc_';
	protected string $new_prefix = 'zenc_';

	public static function init() : void {
		$ins = new static;
		$ins->check_tables();
		$ins->check_options();
	}

	public function check_tables() : void {
		global $wpdb;
		foreach ( $this->tables as $table ) {
			$table = $wpdb->prefix . $table;
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$table_exists = $wpdb->get_var( $wpdb->prepare(
				"SHOW TABLES LIKE %s",
				$table
			) );
			
			$new_table = str_replace( 
				$this->old_prefix, 
				$this->new_prefix, 
				$table 
			);
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$new_table_exists = $wpdb->get_var( $wpdb->prepare(
				"SHOW TABLES LIKE %s",
				$new_table
			) );

			if ( $table_exists && ! $new_table_exists ) {
				$new_table = str_replace( 
					$this->old_prefix, 
					$this->new_prefix, 
					$table 
				);
				
				$sql = "RENAME TABLE `{$table}` TO `{$new_table}`;";
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared 
				$wpdb->query( $sql );
			}
		}
	}

	public function check_options() : void {
		foreach ( $this->options as $option_name ) {
			$value = get_option( $option_name );
			if ( $value !== false ) {
				$new_option_name = str_replace( 
					$this->old_prefix, 
					$this->new_prefix, 
					$option_name 
				);
				update_option( $new_option_name, $value );
				delete_option( $option_name );
			}
		}
	}
}
