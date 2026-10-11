<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Database\Utils\Model;
use ZenCommunity\Exceptions\ZencommunityException;

class Group_Member_Action extends Model {
	protected string $table = 'zenc_group_member_actions';
	protected ?string $alias = 'gma';
	protected array   $selects = [ 'gma.*' ];

	const ALLOWED_TYPES = [ 'warning', 'mute', 'suspend' ];

	const DURATIONS = [
		'1h'  => HOUR_IN_SECONDS,
		'1d'  => DAY_IN_SECONDS,
		'3d'  => 3 * DAY_IN_SECONDS,
		'7d'  => WEEK_IN_SECONDS,
		'30d' => 30 * DAY_IN_SECONDS,
	];

	/**
	 * Insert a moderation action row. Low-level — callers (warn/mute/suspend) validate first.
	 */
	public static function create_action( int $group_id, int $user_id, int $actor_id, string $type, string $reason = '', string $note = '', ?string $expires_at = null ) : int {
		if ( ! in_array( $type, self::ALLOWED_TYPES, true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid action type.', 'zencommunity' ), 400 );
		}

		return (int) static::ins()->insert( [
			'group_id'   => $group_id,
			'user_id'    => $user_id,
			'actor_id'   => $actor_id,
			'type'       => $type,
			'reason'     => sanitize_text_field( $reason ),
			'note'       => sanitize_textarea_field( $note ),
			'expires_at' => $expires_at,
			'created_at' => current_time( 'mysql', true ),
			'updated_at' => current_time( 'mysql', true ),
		] );
	}

	public static function is_muted( int $user_id, int $group_id ) : bool {
		return static::ins()->qb()
			->where( 'gma.user_id', '=', $user_id )
			->where( 'gma.group_id', '=', $group_id )
			->where( 'gma.type', '=', 'mute' )
			->where_null( 'gma.lifted_at' )
			->count() > 0;
	}

	/**
	 * The currently active (un-lifted) suspension row for a member, if any.
	 */
	public static function active_suspension( int $user_id, int $group_id ) : ?array {
		$row = static::ins()->qb()
			->where( 'gma.user_id', '=', $user_id )
			->where( 'gma.group_id', '=', $group_id )
			->where( 'gma.type', '=', 'suspend' )
			->where_null( 'gma.lifted_at' )
			->order_by( 'gma.id', 'DESC' )
			->first();

		return empty( $row ) ? null : $row;
	}

	/**
	 * Mark all currently-active rows of a type as lifted (idempotent: a no-op if none are active).
	 */
	public static function lift( int $group_id, int $user_id, string $type ) : bool {
		return (bool) static::ins()->qb()
			->where( 'gma.group_id', '=', $group_id )
			->where( 'gma.user_id', '=', $user_id )
			->where( 'gma.type', '=', $type )
			->where_null( 'gma.lifted_at' )
			->update( [
				'lifted_at' => current_time( 'mysql', true ),
				'updated_at' => current_time( 'mysql', true ),
			] );
	}

	/**
	 * Full moderation history for a member in a group, newest first.
	 */
	public static function list_for_member( int $group_id, int $user_id ) : array {
		return static::ins()->qb()
			->where( 'gma.group_id', '=', $group_id )
			->where( 'gma.user_id', '=', $user_id )
			->order_by( 'gma.created_at', 'DESC' )
			->get();
	}

	/**
	 * Members currently under an active (un-lifted) action of a given type in a group,
	 * with profile/role data joined in — the same row shape Group::members() returns,
	 * for the "Muted"/"Suspended" admin list tabs.
	 */
	public static function list_active_members( int $group_id, string $type ) : array {
		if ( ! in_array( $type, self::ALLOWED_TYPES, true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid action type.', 'zencommunity' ), 400 );
		}

		return static::ins()->qb()
			->select( [
				'pf.user_id'     => 'id',
				'pf.first_name'  => 'first_name',
				'pf.last_name'   => 'last_name',
				'pf.username'    => 'username',
				'pf.avatar_url'  => 'avatar_url',
				'spm.role'       => 'role',
				'gma.reason'     => 'reason',
				'gma.note'       => 'note',
				'gma.expires_at' => 'expires_at',
				'gma.created_at' => 'action_created_at',
			] )
			->join( 'zenc_profiles', 'pf', 'pf.user_id = gma.user_id', 'INNER' )
			->join( 'zenc_group_members', 'spm', [
				[ 'spm.user_id', '=', 'gma.user_id' ],
				[ 'spm.group_id', '=', 'gma.group_id' ],
			], 'INNER' )
			->where( 'gma.group_id', '=', $group_id )
			->where( 'gma.type', '=', $type )
			->where_null( 'gma.lifted_at' )
			->order_by( 'gma.created_at', 'DESC' )
			->get();
	}

	public static function warn( int $group_id, int $user_id, int $actor_id, string $reason = '', string $note = '' ) : int {
		if ( ! Group::is_member_of( $user_id, $group_id, [], null ) ) {
			throw new ZencommunityException( esc_html__( 'Member does not exist.', 'zencommunity' ), 404 );
		}

		return static::create_action( $group_id, $user_id, $actor_id, 'warning', $reason, $note );
	}

	public static function mute( int $group_id, int $user_id, int $actor_id, string $reason = '', string $note = '' ) : int {
		if ( ! Group::is_member_of( $user_id, $group_id, [], null ) ) {
			throw new ZencommunityException( esc_html__( 'Member does not exist.', 'zencommunity' ), 404 );
		}
		if ( static::is_muted( $user_id, $group_id ) ) {
			throw new ZencommunityException( esc_html__( 'Member is already muted.', 'zencommunity' ), 400 );
		}

		return static::create_action( $group_id, $user_id, $actor_id, 'mute', $reason, $note );
	}

	public static function unmute( int $group_id, int $user_id ) : bool {
		return static::lift( $group_id, $user_id, 'mute' );
	}

	/**
	 * Suspend an active member for a fixed duration. Reuses Group::change_member_status()
	 * so every existing 'active'-status enforcement gate blocks the member for free,
	 * exactly like ban already does.
	 */
	public static function suspend( int $group_id, int $user_id, int $actor_id, string $reason, string $note, string $duration_key ) : int {
		if ( ! isset( self::DURATIONS[ $duration_key ] ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid suspension duration.', 'zencommunity' ), 400 );
		}
		if ( ! Group::is_member_of( $user_id, $group_id, [], 'active' ) ) {
			throw new ZencommunityException( esc_html__( 'Only an active member can be suspended.', 'zencommunity' ), 400 );
		}

		$expires_timestamp = time() + self::DURATIONS[ $duration_key ];
		$expires_at         = gmdate( 'Y-m-d H:i:s', $expires_timestamp );

		$action_id = static::create_action( $group_id, $user_id, $actor_id, 'suspend', $reason, $note, $expires_at );

		Group::change_member_status( $user_id, $group_id, 'suspended', $actor_id );

		as_schedule_single_action(
			$expires_timestamp,
			'zencommunity/queue/member_suspension_expired',
			[ 'group_id' => $group_id, 'user_id' => $user_id, 'action_id' => $action_id ]
		);

		return $action_id;
	}

	/**
	 * Manually end an active suspension early. Only reverts status to 'active' if it's
	 * still 'suspended' — avoids clobbering a ban applied in the meantime.
	 */
	public static function unsuspend( int $group_id, int $user_id, ?int $actor_id = null ) : bool {
		$action = static::active_suspension( $user_id, $group_id );

		if ( empty( $action ) ) {
			throw new ZencommunityException( esc_html__( 'Member is not currently suspended.', 'zencommunity' ), 400 );
		}

		static::lift( $group_id, $user_id, 'suspend' );

		as_unschedule_action(
			'zencommunity/queue/member_suspension_expired',
			[ 'group_id' => $group_id, 'user_id' => $user_id, 'action_id' => (int) $action['id'] ]
		);

		if ( Group::is_member_of( $user_id, $group_id, [], 'suspended' ) ) {
			Group::change_member_status( $user_id, $group_id, 'active', $actor_id );
		}

		return true;
	}

	/**
	 * Action Scheduler callback: auto-lift a suspension at its expiry.
	 * No-op if it was already manually lifted (idempotency against a lift/expiry race)
	 * or if the member's status moved on to something else (e.g. banned) since suspending.
	 */
	public static function expire_suspension( int $group_id, int $user_id, int $action_id ) : void {
		$action = static::ins()->qb()
			->where( 'gma.id', '=', $action_id )
			->where_null( 'gma.lifted_at' )
			->first();

		if ( empty( $action ) ) {
			return;
		}

		static::lift( $group_id, $user_id, 'suspend' );

		if ( Group::is_member_of( $user_id, $group_id, [], 'suspended' ) ) {
			Group::change_member_status( $user_id, $group_id, 'active' );
		}
	}
}
