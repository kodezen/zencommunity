<?php

namespace ZenCommunity\Addons\Gameengine;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Throwable;
use ZenCommunity\Database\Models\Feed;
use ZenCommunity\Database\Models\Group;
use ZenCommunity\Database\Models\Notification;
use ZenCommunity\Addons\Gameengine\Classes\Policy;
use ZenCommunity\Addons\Gameengine\Classes\State;

/**
 * Announces rank-ups and new badges natively in the community — as a private
 * notification and/or a feed post, configurable per event in settings.
 */
class Celebrations {

	public static function init() : void {
		add_action( 'gameengine_level_awarded', [ self::class, 'on_level' ], 10, 3 );
		add_action( 'gameengine_achievement_unlocked', [ self::class, 'on_badge' ], 10, 3 );
	}

	public static function on_level( $user_id, $level_id, $user_level_id = 0 ) : void {
		$mode = Policy::get( 'celebrate_rank' );
		if ( 'none' === $mode ) {
			return;
		}
		$title = self::level_title( (int) $level_id );
		self::celebrate(
			(int) $user_id,
			$mode,
			'gamification_rank',
			sprintf( __( 'reached the %s rank', 'zencommunity' ), $title ),
			sprintf( __( '🎉 Reached the <strong>%s</strong> rank!', 'zencommunity' ), esc_html( $title ) )
		);
	}

	public static function on_badge( $user_id, $achievement_id, $user_achievement_id = 0 ) : void {
		$mode = Policy::get( 'celebrate_badge' );
		if ( 'none' === $mode ) {
			return;
		}
		$title = self::achievement_title( (int) $achievement_id );
		self::celebrate(
			(int) $user_id,
			$mode,
			'gamification_badge',
			sprintf( __( 'earned the “%s” badge', 'zencommunity' ), $title ),
			sprintf( __( '🏅 Earned the <strong>%s</strong> badge!', 'zencommunity' ), esc_html( $title ) )
		);
	}

	protected static function celebrate( int $user_id, string $mode, string $type, string $notice, string $feed_html ) : void {
		if ( ! $user_id ) {
			return;
		}

		if ( in_array( $mode, [ 'notify', 'both' ], true ) ) {
			try {
				$name = get_userdata( $user_id );
				Notification::send( [
					'type'        => $type,
					'to_user_ids' => [ $user_id ],
					'message'     => ( $name ? $name->display_name . ' ' : '' ) . $notice,
					'object_type' => 'gamification',
					'data'        => [ 'kind' => $type ],
				] );
			} catch ( Throwable $e ) {}
		}

		if ( in_array( $mode, [ 'feed', 'both' ], true ) ) {
			$group_id = (int) Policy::get( 'announcement_group_id' );
			if ( $group_id ) {
				try {
					// The author must be a member to post in the space — mirror how
					// other addons publish system feed items.
					try { Group::add_member( $user_id, $group_id ); } catch ( Throwable $e ) {}
					Feed::create( $group_id, [
						'title'   => wp_strip_all_tags( $feed_html ),
						'content' => '<p class="zencom-gamification-celebration">' . $feed_html . '</p>',
						'status'  => 'published',
					], $user_id );
				} catch ( Throwable $e ) {}
			}
		}
	}

	protected static function level_title( int $level_id ) : string {
		global $wpdb;
		$table = $wpdb->prefix . 'gameengine_levels';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$title = $wpdb->get_var( $wpdb->prepare( "SELECT title FROM {$table} WHERE id = %d", $level_id ) );
		return $title ?: __( 'a new', 'zencommunity' );
	}

	protected static function achievement_title( int $achievement_id ) : string {
		global $wpdb;
		$table = $wpdb->prefix . 'gameengine_achievements';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$title = $wpdb->get_var( $wpdb->prepare( "SELECT title FROM {$table} WHERE id = %d", $achievement_id ) );
		return $title ?: __( 'a new', 'zencommunity' );
	}
}
