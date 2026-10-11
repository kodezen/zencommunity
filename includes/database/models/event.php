<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Database\Utils\{ Model, QueryBuilder };
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Database\Models\Group;

class Event extends Model {
	protected string $table  = 'zenc_group_events';
	protected ?string $alias = 'evt';
	protected array   $selects = [ 'evt.*' ];

	public static function wrapper( array $event ) : array {
		$event['meta'] = json_decode( $event['meta'] ?? '{}', true ) ?? [];
		return $event;
	}

	public static function collection_wrapper( array $events ) : array {
		return array_map( [ static::class, 'wrapper' ], $events );
	}

	public static function create( int $group_id, array $data ) : ?int {
		$data = Sanitizer::sanitize( $data, [
			'title'       => Sanitizer::STRING,
			'description' => Sanitizer::HTML,
			'start_at'    => Sanitizer::STRING,
			'end_at'      => Sanitizer::STRING,
			'location'    => Sanitizer::STRING,
			'cover_image' => Sanitizer::STRING,
			'rsvp_limit'  => Sanitizer::INT,
		] );

		if ( empty( $data['title'] ) ) {
			throw new ZencommunityException( esc_html__( 'Event title is required.', 'zencommunity' ), 400 );
		}
		if ( empty( $data['start_at'] ) ) {
			throw new ZencommunityException( esc_html__( 'Event start date/time is required.', 'zencommunity' ), 400 );
		}

		$row = [
			'group_id'   => $group_id,
			'user_id'    => get_current_user_id(),
			'title'      => $data['title'],
			'status'     => 'active',
			'start_at'   => sanitize_text_field( $data['start_at'] ),
			'created_at' => current_time( 'mysql', true ),
			'updated_at' => current_time( 'mysql', true ),
		];

		foreach ( [ 'description', 'end_at', 'location', 'cover_image', 'rsvp_limit' ] as $field ) {
			if ( isset( $data[ $field ] ) && $data[ $field ] !== '' ) {
				$row[ $field ] = $data[ $field ];
			}
		}

		$id = static::ins()->insert( $row );
		if ( empty( $id ) ) {
			throw new ZencommunityException( esc_html__( 'Could not create event.', 'zencommunity' ), 500 );
		}

		return intval( $id );
	}

	public static function update( int $event_id, array $data ) : bool {
		$data = Sanitizer::sanitize( $data, [
			'title'       => Sanitizer::STRING,
			'description' => Sanitizer::HTML,
			'start_at'    => Sanitizer::STRING,
			'end_at'      => Sanitizer::STRING,
			'location'    => Sanitizer::STRING,
			'cover_image' => Sanitizer::STRING,
			'rsvp_limit'  => Sanitizer::INT,
			'status'      => Sanitizer::STRING,
		] );

		if ( isset( $data['status'] ) && ! in_array( $data['status'], [ 'active', 'cancelled' ], true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid event status.', 'zencommunity' ), 400 );
		}

		$data['updated_at'] = current_time( 'mysql', true );

		return static::ins()->qb()
			->where( 'evt.id', '=', $event_id )
			->update( $data );
	}

	public static function delete( int $event_id ) : bool {
		QueryBuilder::ins()
			->from( 'zenc_event_rsvps', 'rsvp' )
			->where( 'rsvp.event_id', '=', $event_id )
			->delete();

		return static::ins()->qb()
			->where( 'evt.id', '=', $event_id )
			->delete();
	}

	public static function can_view( int $group_id, ?int $user_id ) : void {
		$group = QueryBuilder::ins()
			->select( [ 'privacy' ] )
			->from( 'zenc_groups', 'grp' )
			->where( 'grp.id', '=', $group_id )
			->first();

		if ( ( $group['privacy'] ?? '' ) === 'public' ) {
			return;
		}

		if ( ! $user_id || ! Group::is_member_of( $user_id, $group_id ) ) {
			throw new ZencommunityException(
				esc_html__( 'You do not have permission to view events for this group.', 'zencommunity' ),
				401
			);
		}
	}

	public static function lists( int $group_id, array $params = [], ?int $user_id = null ) : array {
		static::can_view( $group_id, $user_id );

		$filter   = sanitize_text_field( $params['filter'] ?? 'upcoming' );
		$page     = absint( $params['page'] ?? 1 );
		$per_page = absint( $params['per_page'] ?? 10 );

		$qb = static::ins()->qb();
		static::add_rsvp_selects( $qb, $user_id );

		$qb->where( 'evt.group_id', '=', $group_id )
		   ->where( 'evt.status', '=', 'active' );

		if ( $filter === 'past' ) {
			$now = current_time( 'mysql', true );
			$qb->where( 'evt.start_at', '<', $now );
			$qb->order_by( 'evt.start_at', 'DESC' );
		} else {
			$now = current_time( 'mysql', true );
			$qb->where( 'evt.start_at', '>=', $now );
			$qb->order_by( 'evt.start_at', 'ASC' );
		}

		$result    = $qb->paginate( $page, $per_page );
		$result['records'] = static::collection_wrapper( $result['records'] ?? [] );
		return $result;
	}

	public static function by_id( int $event_id, ?int $user_id = null ) : ?array {
		$qb = static::ins()->qb();
		static::add_rsvp_selects( $qb, $user_id );

		$qb->where( 'evt.id', '=', $event_id );

		$event = $qb->first();
		if ( empty( $event ) ) {
			throw new ZencommunityException( esc_html__( 'Event not found.', 'zencommunity' ), 404 );
		}
		return static::wrapper( $event );
	}

	public static function rsvp( int $event_id, int $user_id, string $status ) : bool {
		if ( ! in_array( $status, [ 'going', 'interested', 'not_going' ], true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid RSVP status.', 'zencommunity' ), 400 );
		}

		$event = static::ins()->qb()
			->select( [ 'evt.rsvp_limit', 'evt.rsvp_count_going' ] )
			->where( 'evt.id', '=', $event_id )
			->first();

		if ( empty( $event ) ) {
			throw new ZencommunityException( esc_html__( 'Event not found.', 'zencommunity' ), 404 );
		}

		if ( $status === 'going' && ! empty( $event['rsvp_limit'] ) ) {
			$existing = QueryBuilder::ins()
				->from( 'zenc_event_rsvps', 'rsvp' )
				->select( [ 'rsvp.*' ] )
				->where( 'rsvp.event_id', '=', $event_id )
				->where( 'rsvp.user_id', '=', $user_id )
				->first();

			if ( empty( $existing ) && intval( $event['rsvp_count_going'] ) >= intval( $event['rsvp_limit'] ) ) {
				throw new ZencommunityException( esc_html__( 'RSVP limit reached.', 'zencommunity' ), 422 );
			}
		}

		$existing = QueryBuilder::ins()
			->from( 'zenc_event_rsvps', 'rsvp' )
			->select( [ 'rsvp.*' ] )
			->where( 'rsvp.event_id', '=', $event_id )
			->where( 'rsvp.user_id', '=', $user_id )
			->first();

		$now = current_time( 'mysql', true );

		if ( ! empty( $existing ) ) {
			$old_status = $existing['status'];
			if ( $old_status === $status ) return true;

			QueryBuilder::ins()
				->from( 'zenc_event_rsvps', 'rsvp' )
				->where( 'rsvp.event_id', '=', $event_id )
				->where( 'rsvp.user_id', '=', $user_id )
				->update( [ 'status' => $status, 'updated_at' => $now ] );

			static::adjust_rsvp_count( $event_id, $old_status, -1 );
		} else {
			QueryBuilder::ins()->create( 'zenc_event_rsvps', [
				'event_id'   => $event_id,
				'user_id'    => $user_id,
				'status'     => $status,
				'created_at' => $now,
				'updated_at' => $now,
			] );
		}

		static::adjust_rsvp_count( $event_id, $status, 1 );
		return true;
	}

	public static function remove_rsvp( int $event_id, int $user_id ) : bool {
		$existing = QueryBuilder::ins()
			->from( 'zenc_event_rsvps', 'rsvp' )
			->select( [ 'rsvp.*' ] )
			->where( 'rsvp.event_id', '=', $event_id )
			->where( 'rsvp.user_id', '=', $user_id )
			->first();

		if ( empty( $existing ) ) return true;

		QueryBuilder::ins()
			->from( 'zenc_event_rsvps', 'rsvp' )
			->where( 'rsvp.event_id', '=', $event_id )
			->where( 'rsvp.user_id', '=', $user_id )
			->delete();

		static::adjust_rsvp_count( $event_id, $existing['status'], -1 );
		return true;
	}

	private static function adjust_rsvp_count( int $event_id, string $status, int $delta ) : void {
		$col_map = [
			'going'       => 'rsvp_count_going',
			'interested'  => 'rsvp_count_interested',
			'not_going'   => 'rsvp_count_not_going',
		];
		$col = $col_map[ $status ] ?? null;
		if ( ! $col ) return;

		global $wpdb;
		$table = $wpdb->prefix . 'zenc_group_events';
		$sign  = $delta > 0 ? '+' : '-';
		$wpdb->query(
			$wpdb->prepare(
				"UPDATE `{$table}` SET `{$col}` = GREATEST(0, `{$col}` {$sign} 1) WHERE `id` = %d",
				$event_id
			)
		);
	}

	private static function add_rsvp_selects( QueryBuilder $qb, ?int $user_id ) : void {
		$selects = [
			'evt.*',
			'pf.first_name' => 'creator_first_name',
			'pf.last_name'  => 'creator_last_name',
			'pf.avatar_url' => 'creator_avatar_url',
		];

		if ( $user_id ) {
			$selects['rsvp.status'] = 'user_rsvp_status';
		}

		$qb->select( $selects )
		   ->join( 'zenc_profiles', 'pf', 'pf.user_id = evt.user_id', 'LEFT' );

		if ( $user_id ) {
			$qb->join( 'zenc_event_rsvps', 'rsvp', [
				[ 'rsvp.event_id', '=', 'evt.id' ],
				[ 'rsvp.user_id', '=', [ 'value' => $user_id ] ],
			], 'LEFT' );
		}
	}
}
