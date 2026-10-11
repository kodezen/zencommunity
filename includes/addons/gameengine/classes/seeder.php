<?php

namespace ZenCommunity\Addons\Gameengine\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Seeds a sensible starter economy into GameEngine the first time the addon
 * runs: a "Community Points" point type, a ladder of ranks, a few badges, and
 * the rules wiring community triggers to them. Everything is fully editable in
 * GameEngine afterwards and is seeded only once (admins can delete freely).
 */
class Seeder {

	const SEEDED_OPTION = 'zenc_gameengine_seeded';
	const POINT_SLUG    = 'community-points';

	public static function maybe_seed() : void {
		if ( get_option( self::SEEDED_OPTION ) ) {
			return;
		}
		if ( ! defined( 'GAMEENGINE_VERSION' ) && ! class_exists( '\GameEngine\Classes\TriggerRegistry' ) ) {
			return;
		}

		global $wpdb;
		$tables = [ 'gameengine_point_types', 'gameengine_levels', 'gameengine_achievements', 'gameengine_requirements' ];
		foreach ( $tables as $t ) {
			$name = $wpdb->prefix . $t;
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $name ) ) !== $name ) {
				return; // GameEngine schema not installed yet — try again next boot.
			}
		}

		$point_type_id = self::ensure_point_type();
		if ( ! $point_type_id ) {
			return;
		}

		self::seed_levels( $point_type_id );
		$first_post = self::ensure_achievement( __( 'First Post', 'zencommunity' ), __( 'Published your first post in the community.', 'zencommunity' ) );
		$welcomed   = self::ensure_achievement( __( 'Welcomed', 'zencommunity' ), __( 'Joined your first community space.', 'zencommunity' ) );

		// Point rules.
		self::ensure_requirement( 'point_type', $point_type_id, 'zc_post_created',      [ 'points' => 10, 'log_label' => __( 'Created a post', 'zencommunity' ), 'limit' => '1_per_day' ] );
		self::ensure_requirement( 'point_type', $point_type_id, 'zc_comment_created',   [ 'points' => 5,  'log_label' => __( 'Wrote a comment', 'zencommunity' ), 'limit' => 'unlimited' ] );
		self::ensure_requirement( 'point_type', $point_type_id, 'zc_reaction_received', [ 'points' => 2,  'log_label' => __( 'Received a reaction', 'zencommunity' ), 'limit' => 'unlimited' ] );
		self::ensure_requirement( 'point_type', $point_type_id, 'zc_group_joined',      [ 'points' => 15, 'log_label' => __( 'Joined a space', 'zencommunity' ), 'limit' => 'unlimited' ] );

		// Badge rules (one-time).
		if ( $first_post ) {
			self::ensure_requirement( 'achievement', $first_post, 'zc_post_created', [ 'limit' => '1_time', 'log_label' => __( 'First post badge', 'zencommunity' ) ] );
		}
		if ( $welcomed ) {
			self::ensure_requirement( 'achievement', $welcomed, 'zc_group_joined', [ 'limit' => '1_time', 'log_label' => __( 'Welcomed badge', 'zencommunity' ) ] );
		}

		update_option( self::SEEDED_OPTION, current_time( 'mysql' ) );
	}

	protected static function ensure_point_type() : int {
		global $wpdb;
		$table = $wpdb->prefix . 'gameengine_point_types';

		// Reuse an existing point type so we don't create duplicates.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$existing = (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$table} WHERE slug = %s", self::POINT_SLUG ) );
		if ( $existing ) {
			return $existing;
		}
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$any = (int) $wpdb->get_var( "SELECT id FROM {$table} ORDER BY id ASC LIMIT 1" );
		if ( $any ) {
			return $any;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$wpdb->insert( $table, [
			'name'        => __( 'Community Point', 'zencommunity' ),
			'plural_name' => __( 'Community Points', 'zencommunity' ),
			'status'      => 'publish',
			'slug'        => self::POINT_SLUG,
			'created_at'  => current_time( 'mysql' ),
		] );
		return (int) $wpdb->insert_id;
	}

	protected static function seed_levels( int $point_type_id ) : void {
		$ranks = [
			[ __( 'Newcomer', 'zencommunity' ), 0 ],
			[ __( 'Contributor', 'zencommunity' ), 100 ],
			[ __( 'Regular', 'zencommunity' ), 300 ],
			[ __( 'Veteran', 'zencommunity' ), 700 ],
			[ __( 'Leader', 'zencommunity' ), 1500 ],
		];

		global $wpdb;
		$table = $wpdb->prefix . 'gameengine_levels';

		// Only seed ranks bound to our point type once.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$has = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE point_type_id = %d", $point_type_id ) );
		if ( $has > 0 ) {
			return;
		}

		foreach ( $ranks as $priority => $rank ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$wpdb->insert( $table, [
				'title'                      => $rank[0],
				'plural_name'                => $rank[0],
				'status'                     => 'publish',
				'description'                => '',
				'category'                   => 'community',
				'priority'                   => $priority,
				'unlock_with_points_enabled' => 1,
				'point_type_id'              => $point_type_id,
				'min_points'                 => $rank[1],
				'max_points'                 => 0,
				'congratulations_message'    => sprintf( __( 'You reached %s!', 'zencommunity' ), $rank[0] ),
				'created_at'                 => current_time( 'mysql' ),
			] );
		}
	}

	protected static function ensure_achievement( string $title, string $message ) : int {
		global $wpdb;
		$table = $wpdb->prefix . 'gameengine_achievements';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$existing = (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$table} WHERE title = %s", $title ) );
		if ( $existing ) {
			return $existing;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$wpdb->insert( $table, [
			'title'                    => $title,
			'plural_name'              => $title,
			'status'                   => 'publish',
			'category'                 => 'community',
			'congratulations_message'  => $message,
			'max_earnings_per_user'    => 1,
			'unlock_with_points_enabled' => 0,
			'created_at'               => current_time( 'mysql' ),
		] );
		return (int) $wpdb->insert_id;
	}

	protected static function ensure_requirement( string $reward_type, int $reward_id, string $trigger_key, array $params ) : void {
		global $wpdb;
		$table = $wpdb->prefix . 'gameengine_requirements';

		// Don't duplicate the same reward/trigger rule.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$exists = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(*) FROM {$table} WHERE reward_type = %s AND reward_id = %d AND trigger_key = %s",
			$reward_type,
			$reward_id,
			$trigger_key
		) );
		if ( $exists ) {
			return;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$wpdb->insert( $table, [
			'reward_type' => $reward_type,
			'reward_id'   => $reward_id,
			'trigger_key' => $trigger_key,
			'action_type' => 'award',
			'parameters'  => wp_json_encode( $params ),
			'priority'    => 0,
			'is_active'   => 1,
			'created_at'  => current_time( 'mysql' ),
		] );
	}
}
