<?php

namespace ZenCommunity\Addons\Gameengine\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Site-wide settings for the gamification integration: which native surfaces
 * show, and how rank-ups / new badges are celebrated (per event).
 */
class Policy {

	const OPTION = 'zencommunity_gameengine_settings';

	const DEFAULTS = [
		'enabled'               => true,
		'show_profile_panel'    => true,
		'show_inline_chips'     => true,
		'show_leaderboard'      => true,
		// Celebration mode per event: both | notify | feed | none
		'celebrate_rank'        => 'notify',
		'celebrate_badge'       => 'notify',
		// Group to post celebration feed items into (0 = none).
		'announcement_group_id' => 0,
	];

	const MODES = [ 'both', 'notify', 'feed', 'none' ];

	public static function all() : array {
		$saved = get_option( self::OPTION, [] );
		$saved = is_array( $saved ) ? $saved : [];
		return self::cast( wp_parse_args( $saved, self::DEFAULTS ) );
	}

	public static function get( string $key ) {
		$all = self::all();
		return $all[ $key ] ?? ( self::DEFAULTS[ $key ] ?? null );
	}

	public static function update( array $values ) : array {
		$current = self::all();
		foreach ( self::DEFAULTS as $key => $default ) {
			if ( array_key_exists( $key, $values ) ) {
				$current[ $key ] = $values[ $key ];
			}
		}
		$current = self::cast( $current );
		update_option( self::OPTION, $current );
		return $current;
	}

	protected static function cast( array $v ) : array {
		$bools = [ 'enabled', 'show_profile_panel', 'show_inline_chips', 'show_leaderboard' ];
		foreach ( $bools as $k ) {
			$v[ $k ] = filter_var( $v[ $k ] ?? true, FILTER_VALIDATE_BOOLEAN );
		}
		foreach ( [ 'celebrate_rank', 'celebrate_badge' ] as $k ) {
			$v[ $k ] = in_array( $v[ $k ] ?? '', self::MODES, true ) ? $v[ $k ] : self::DEFAULTS[ $k ];
		}
		$v['announcement_group_id'] = absint( $v['announcement_group_id'] ?? 0 );
		return $v;
	}
}
