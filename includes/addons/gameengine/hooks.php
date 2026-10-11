<?php

namespace ZenCommunity\Addons\Gameengine;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Addons\Gameengine\Classes\Policy;
use ZenCommunity\Addons\Gameengine\Classes\State;
use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Database\Models\Group;

/**
 * Display-side wiring: attach rank/points to member & feed-author payloads (so
 * inline chips render with no extra fetch), expose SPA config, and register the
 * Leaderboard route/menu.
 */
class Hooks {

	public static function init() : void {
		add_filter( 'zencommunity/assets/script_data', [ self::class, 'script_data' ] );

		if ( ! State::available() ) {
			return;
		}

		// Content restriction (GameEngine's restrict_content addon): let a post
		// carry a points/achievement/level requirement, and strip its body
		// server-side for anyone who doesn't meet it. This is access control,
		// not a UI preference, so it's wired regardless of the "enabled"/
		// display Policy toggles below — locking a post shouldn't silently
		// stop working just because someone turned off the gamification UI.
		add_filter( 'zencommunity/feed/create/sanitaization/rules', [ self::class, 'feed_restriction_rules' ], 10, 3 );
		add_filter( 'zencommunity/feed/wrapper/single', [ self::class, 'gate_feed_content' ] );

		if ( ! Policy::get( 'enabled' ) ) {
			return;
		}

		if ( Policy::get( 'show_inline_chips' ) ) {
			add_filter( 'zencommunity/members/wrapper/collection', [ self::class, 'enrich_members' ] );
			add_filter( 'zencommunity/members/wrapper/single', [ self::class, 'enrich_member' ] );
			add_filter( 'zencommunity/feed/wrapper/collection', [ self::class, 'enrich_feed_authors' ] );
			add_filter( 'zencommunity/feed/wrapper/single', [ self::class, 'enrich_feed_author' ] );
		}

		if ( Policy::get( 'show_leaderboard' ) ) {
			add_filter( 'zencommunity/menu', [ self::class, 'register_menu_items' ] );
			add_filter( 'zencommunity/rewrite/app_slugs', [ self::class, 'app_slugs' ] );
		}
	}

	public static function feed_restriction_rules( array $rules, array $data = [], int $group_id = 0 ) : array {
		// Locking a post behind points/level/achievement is a moderation
		// capability, not something every member should have. Only register
		// (and therefore accept) the restriction meta for group admins/moderators
		// and site admins. For anyone else the keys are never whitelisted, so the
		// sanitizer drops them — a crafted request can't gate a post either.
		$user_id = get_current_user_id();
		$can_restrict = $user_id && (
			user_can( $user_id, 'manage_options' ) ||
			Group::is_member_of( $user_id, $group_id, [ 'admin', 'moderator' ] )
		);

		if ( ! $can_restrict ) {
			return $rules;
		}

		$rules['meta.restriction.type']    = Sanitizer::KEY;
		$rules['meta.restriction.value']   = Sanitizer::INT;
		$rules['meta.restriction.message'] = Sanitizer::STRING;
		return $rules;
	}

	/**
	 * Redact a feed's body when the viewer doesn't meet its restriction —
	 * the gated HTML must never reach the client, not just be hidden by CSS.
	 */
	public static function gate_feed_content( array $feed ) : array {
		$restriction = $feed['meta']['restriction'] ?? null;
		$type        = $restriction['type'] ?? '';
		$value       = $restriction['value'] ?? 0;

		$feed['is_locked'] = false;

		if (
			empty( $type ) ||
			empty( $value ) ||
			! in_array( $type, [ 'points', 'achievement', 'level' ], true ) ||
			! class_exists( '\GameEngine\Addons\RestrictContent\Restriction_Helper' )
		) {
			return $feed;
		}

		$can_access = \GameEngine\Addons\RestrictContent\Restriction_Helper::can_access( $type, $value );
		$feed['is_locked'] = ! $can_access;

		if ( ! $can_access ) {
			$feed['content']  = '';
			$feed['rendered'] = '';

			// For points-gated posts, ship the viewer's progress so the SPA can
			// render a "352 of 550 points" meter instead of a bare lock message.
			// Uses the same grand total as Restriction_Helper::can_access() so
			// the numbers can never disagree with the access decision.
			if ( 'points' === $type && class_exists( '\GameEngine\Classes\PointsManager' ) ) {
				$user_id = get_current_user_id();
				$current = $user_id ? (int) ( new \GameEngine\Classes\PointsManager() )->get_grand_total( $user_id ) : 0;

				$feed['meta']['restriction']['progress'] = [
					'current'  => max( 0, $current ),
					'required' => (int) $value,
				];
			}
		}

		return $feed;
	}

	public static function script_data( array $data ) : array {
		$data['gameengine'] = [
			'enabled'            => (bool) ( Policy::get( 'enabled' ) && State::available() ),
			'show_profile_panel' => (bool) Policy::get( 'show_profile_panel' ),
			'show_inline_chips'  => (bool) Policy::get( 'show_inline_chips' ),
			'show_leaderboard'   => (bool) Policy::get( 'show_leaderboard' ),
			'restrict_content'   => class_exists( '\GameEngine\Addons\RestrictContent\Restriction_Helper' ),
		];
		return $data;
	}

	/* ----------------------------- enrichment ----------------------------- */

	public static function enrich_members( array $data ) : array {
		$ids     = array_filter( array_map( static fn( $p ) => absint( $p['user_id'] ?? 0 ), $data ) );
		$summary = State::summary_for_users( $ids );
		return array_map( static function ( $p ) use ( $summary ) {
			$p['gamification'] = $summary[ absint( $p['user_id'] ?? 0 ) ] ?? null;
			return $p;
		}, $data );
	}

	public static function enrich_member( array $profile ) : array {
		$summary = State::summary_for_users( [ absint( $profile['user_id'] ?? 0 ) ] );
		$profile['gamification'] = $summary[ absint( $profile['user_id'] ?? 0 ) ] ?? null;
		return $profile;
	}

	public static function enrich_feed_authors( array $data ) : array {
		$ids     = array_filter( array_map( static fn( $f ) => absint( $f['user_id'] ?? 0 ), $data ) );
		$summary = State::summary_for_users( $ids );
		return array_map( static function ( $f ) use ( $summary ) {
			$f['author_gamification'] = $summary[ absint( $f['user_id'] ?? 0 ) ] ?? null;
			return $f;
		}, $data );
	}

	public static function enrich_feed_author( array $feed ) : array {
		$summary = State::summary_for_users( [ absint( $feed['user_id'] ?? 0 ) ] );
		$feed['author_gamification'] = $summary[ absint( $feed['user_id'] ?? 0 ) ] ?? null;
		return $feed;
	}

	/* ------------------------------- menu --------------------------------- */

	public static function app_slugs( array $slugs ) : array {
		$slugs[] = 'leaderboard';
		return $slugs;
	}

	public static function register_menu_items( array $menus ) : array {
		$icon = [
			'type' => 'emoji',
			'src'  => '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2"/><path d="M6 3h12v6a6 6 0 0 1-12 0z"/><path d="M9 21h6M12 15v6"/></svg>',
		];

		$item = static fn( string $id ) : array => [
			'id'     => $id,
			'type'   => 'default',
			'label'  => 'Leaderboard',
			'route'  => '/leaderboard',
			'status' => true,
			'icon'   => $icon,
		];

		foreach ( [ 'primary_menu', 'profile_menu' ] as $key ) {
			if ( ! isset( $menus[ $key ] ) || ! is_array( $menus[ $key ] ) ) {
				continue;
			}
			$ids = array_column( $menus[ $key ], 'id' );
			$id  = 'menu_' . ( 'primary_menu' === $key ? '' : str_replace( '_menu', '', $key ) . '_' ) . 'leaderboard';
			if ( in_array( $id, $ids, true ) ) {
				continue;
			}
			$menus[ $key ][] = $item( $id );
		}

		return $menus;
	}
}
