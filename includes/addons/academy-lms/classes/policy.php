<?php
namespace ZenCommunity\Addons\AcademyLms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Database\Models\Group;
use ZenCommunity\Addons\AcademyLms\Database\Models\Relation;

/**
 * Resolves the integration's behavior settings.
 *
 * Two layers: site-wide defaults (the `zencommunity_academy_settings` option,
 * editable in Settings → Academy LMS) and per-group overrides (stored on the
 * group's relation row). A group key set to null/absent inherits the global
 * value. Behaviors are never hardcoded — every enforcement point reads through
 * here.
 */
class Policy {

	const OPTION = 'zencommunity_academy_settings';

	/** How a group activity event (e.g. 'course_enrollment') is delivered. */
	const EVENT_DELIVERY_MODES   = [ 'feed', 'feed_and_notification', 'notification' ];
	const DEFAULT_EVENT_DELIVERY = 'feed';

	const DEFAULTS = [
		// Access ---------------------------------------------------------
		'membership_grants_access' => false, // members get free access to the group's courses
		'auto_join_on_enroll'      => true,  // enrolling joins the course's linked group(s)
		'auto_join_role'           => 'member',
		'revoke_on_leave'          => true,  // refund / downgrade removes auto-joined membership
		// Flow / UI (global only) ---------------------------------------
		'checkout_mode'            => 'drawer', // drawer | redirect | new_tab
		'learn_mode'               => 'embed',  // embed | redirect
		'allow_free_enroll'        => true,
		'require_login'            => false,
		'native_pages'             => false, // redirect Academy's own course pages into the SPA
		'show_catalog'             => true,  // expose the standalone catalog + menu item
	];

	/** Keys a single group may override; everything else is global-only. */
	const GROUP_KEYS = [
		'membership_grants_access',
		'auto_join_on_enroll',
		'auto_join_role',
		'revoke_on_leave',
	];

	/**
	 * Site-wide settings, defaults merged with the saved option (typed).
	 */
	public static function global() : array {
		$saved = get_option( self::OPTION, [] );
		$saved = is_array( $saved ) ? $saved : [];
		return self::cast( wp_parse_args( $saved, self::DEFAULTS ) );
	}

	/**
	 * Persist sanitized global settings (only known keys).
	 */
	public static function update_global( array $values ) : array {
		$current = self::global();
		foreach ( self::DEFAULTS as $key => $default ) {
			if ( array_key_exists( $key, $values ) ) {
				$current[ $key ] = $values[ $key ];
			}
		}
		$current = self::cast( $current );
		update_option( self::OPTION, $current );
		return $current;
	}

	/**
	 * Validate a raw per-group override map from a request: keep only group-
	 * overridable keys, drop "inherit"/empty (so they fall back to global).
	 */
	public static function sanitize_group_overrides( array $raw ) : array {
		$out = [];
		foreach ( self::GROUP_KEYS as $key ) {
			if ( ! array_key_exists( $key, $raw ) ) {
				continue;
			}
			$val = $raw[ $key ];
			if ( null === $val || '' === $val || 'inherit' === $val ) {
				continue; // inherit global
			}
			$out[ $key ] = $val;
		}
		return self::cast( $out, false );
	}

	/**
	 * Validate a raw per-group "event => delivery mode" map: keep only known
	 * events (Relation::$events) with a recognized mode.
	 */
	public static function sanitize_event_delivery( array $raw ) : array {
		$out = [];
		foreach ( $raw as $event => $mode ) {
			if (
				in_array( $event, Relation::$events, true ) &&
				in_array( $mode, self::EVENT_DELIVERY_MODES, true )
			) {
				$out[ $event ] = $mode;
			}
		}
		return $out;
	}

	/**
	 * How a group delivers a given activity event: to the feed, as a
	 * notification, or both. Defaults to 'feed' (the original behavior)
	 * when the group hasn't set an override.
	 */
	public static function delivery_mode_for_event( int $group_id, string $event ) : string {
		$settings = Relation::settings_for_group( $group_id );
		$map      = is_array( $settings['event_delivery'] ?? null ) ? $settings['event_delivery'] : [];
		$mode     = $map[ $event ] ?? self::DEFAULT_EVENT_DELIVERY;
		return in_array( $mode, self::EVENT_DELIVERY_MODES, true ) ? $mode : self::DEFAULT_EVENT_DELIVERY;
	}

	/**
	 * Per-group override map (only the keys the group has explicitly set).
	 */
	public static function group_overrides( int $group_id ) : array {
		$raw = Relation::settings_for_group( $group_id );
		$out = [];
		foreach ( self::GROUP_KEYS as $key ) {
			if ( array_key_exists( $key, $raw ) && null !== $raw[ $key ] && '' !== $raw[ $key ] && 'inherit' !== $raw[ $key ] ) {
				$out[ $key ] = $raw[ $key ];
			}
		}
		return self::cast( $out, false );
	}

	/**
	 * Resolve one setting for a group: override wins, else global default.
	 */
	public static function for_group( int $group_id, string $key ) {
		$overrides = self::group_overrides( $group_id );
		if ( array_key_exists( $key, $overrides ) ) {
			return $overrides[ $key ];
		}
		return self::global()[ $key ] ?? ( self::DEFAULTS[ $key ] ?? null );
	}

	/**
	 * Does the current/given user get free access to this course purely by
	 * being an active member of a linked group whose policy grants it?
	 */
	public static function membership_grants_access( int $course_id, int $user_id ) : bool {
		if ( ! $course_id || ! $user_id ) {
			return false;
		}

		// Memoize within the request — is_enrolled (and thus this check) fires
		// repeatedly on catalog/course screens.
		static $cache = [];
		$key = $course_id . ':' . $user_id;
		if ( isset( $cache[ $key ] ) ) {
			return $cache[ $key ];
		}

		$cache[ $key ] = false;
		foreach ( Relation::group_ids_for_course_via_categories( $course_id ) as $group_id ) {
			if (
				self::for_group( $group_id, 'membership_grants_access' ) &&
				Group::is_member_of( $user_id, $group_id, [], 'active' )
			) {
				$cache[ $key ] = true;
				return true;
			}
		}
		return $cache[ $key ];
	}

	const REVOKED_META_KEY = 'zenc_academy_revoked_courses';

	/**
	 * Has an admin explicitly removed this user's enrollment for this course
	 * (e.g. via Academy's own Students table)? If so, membership-granted
	 * access stays suppressed even while the user remains a group member —
	 * explicit removal wins until a real enrollment is (re-)granted.
	 */
	public static function is_access_revoked( int $course_id, int $user_id ) : bool {
		if ( ! $course_id || ! $user_id ) {
			return false;
		}
		return in_array( $course_id, self::revoked_course_ids( $user_id ), true );
	}

	/**
	 * Mark a course's membership-granted access as explicitly revoked for a
	 * user. Called when Academy's own enrollment record for that user/course
	 * is deleted.
	 */
	public static function revoke_access( int $course_id, int $user_id ) : void {
		if ( ! $course_id || ! $user_id ) {
			return;
		}
		$ids   = self::revoked_course_ids( $user_id );
		$ids[] = $course_id;
		update_user_meta( $user_id, self::REVOKED_META_KEY, wp_json_encode( array_values( array_unique( $ids ) ) ) );
	}

	/**
	 * Clear a prior revocation — called when a real enrollment is (re-)granted,
	 * so an admin re-enrolling the student isn't silently blocked by a stale
	 * revocation flag.
	 */
	public static function restore_access( int $course_id, int $user_id ) : void {
		if ( ! $course_id || ! $user_id ) {
			return;
		}
		$ids = array_values( array_diff( self::revoked_course_ids( $user_id ), [ $course_id ] ) );
		if ( empty( $ids ) ) {
			delete_user_meta( $user_id, self::REVOKED_META_KEY );
		} else {
			update_user_meta( $user_id, self::REVOKED_META_KEY, wp_json_encode( $ids ) );
		}
	}

	protected static function revoked_course_ids( int $user_id ) : array {
		$raw = json_decode( (string) get_user_meta( $user_id, self::REVOKED_META_KEY, true ), true );
		return array_values( array_filter( array_map( 'absint', (array) $raw ) ) );
	}

	/**
	 * Type-normalize a settings array. When $fill is false only the present
	 * keys are cast (used for sparse override maps).
	 */
	protected static function cast( array $values, bool $fill = true ) : array {
		$bool_keys = [ 'membership_grants_access', 'auto_join_on_enroll', 'revoke_on_leave', 'allow_free_enroll', 'require_login', 'native_pages', 'show_catalog' ];
		$enums = [
			'auto_join_role' => [ 'member', 'moderator' ],
			'checkout_mode'  => [ 'drawer', 'redirect', 'new_tab' ],
			'learn_mode'     => [ 'embed', 'redirect' ],
		];

		$out = [];
		foreach ( $values as $key => $value ) {
			if ( in_array( $key, $bool_keys, true ) ) {
				$out[ $key ] = filter_var( $value, FILTER_VALIDATE_BOOLEAN );
			} elseif ( isset( $enums[ $key ] ) ) {
				$out[ $key ] = in_array( $value, $enums[ $key ], true ) ? $value : self::DEFAULTS[ $key ];
			} else {
				$out[ $key ] = $value;
			}
		}
		return $out;
	}
}
