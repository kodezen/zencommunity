<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Database\Utils\Model;
use ZenCommunity\Exceptions\ZencommunityException;

class Report extends Model {
	protected string $table = 'zenc_reports';
	protected ?string $alias = 'rp';
	protected array   $selects = [ 'rp.*' ];

	const ALLOWED_OBJECT_TYPES = [ 'feed', 'comment' ];
	const ALLOWED_REASONS      = [ 'spam', 'harassment', 'hate_speech', 'nudity', 'misinformation', 'other' ];
	const ALLOWED_STATUSES     = [ 'pending', 'reviewed', 'dismissed', 'actioned' ];

	/**
	 * File a report. One report per (reporter, object) — re-reporting updates the note.
	 */
	public static function create( array $data, int $reporter_id ) : int {
		$object_type = sanitize_text_field( $data['object_type'] ?? '' );
		$object_id   = absint( $data['object_id'] ?? 0 );
		$reason      = sanitize_text_field( $data['reason'] ?? 'other' );
		$note        = sanitize_textarea_field( $data['note'] ?? '' );

		if ( ! in_array( $object_type, self::ALLOWED_OBJECT_TYPES, true ) || empty( $object_id ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid content reference.', 'zencommunity' ), 400 );
		}
		if ( ! in_array( $reason, self::ALLOWED_REASONS, true ) ) {
			$reason = 'other';
		}

		$existing = static::ins()->qb()
			->where( 'rp.object_type', '=', $object_type )
			->where( 'rp.object_id', '=', $object_id )
			->where( 'rp.reporter_id', '=', $reporter_id )
			->first();

		if ( ! empty( $existing ) ) {
			static::ins()->qb()
				->where( 'rp.id', '=', $existing['id'] )
				->update( [ 'reason' => $reason, 'note' => $note, 'status' => 'pending', 'updated_at' => current_time( 'mysql', true ) ] );
			return (int) $existing['id'];
		}

		return (int) static::ins()->insert( [
			'object_type' => $object_type,
			'object_id'   => $object_id,
			'reporter_id' => $reporter_id,
			'reason'      => $reason,
			'note'        => $note,
			'status'      => 'pending',
			'created_at'  => current_time( 'mysql', true ),
			'updated_at'  => current_time( 'mysql', true ),
		] );
	}

	/**
	 * Moderation queue (admin). Joins reporter profile for display.
	 */
	public static function index( array $params ) : array {
		$page     = absint( $params['page'] ?? 1 );
		$per_page = min( 100, absint( $params['per_page'] ?? 20 ) );
		$status   = sanitize_text_field( $params['status'] ?? '' );

		$qb = static::ins()->qb()
			->select( [
				'rp.*',
				'pf.first_name' => 'reporter_first_name',
				'pf.last_name'  => 'reporter_last_name',
				'pf.username'   => 'reporter_username',
				'pf.avatar_url' => 'reporter_avatar_url',
			] )
			->join( 'zenc_profiles', 'pf', 'pf.user_id = rp.reporter_id', 'LEFT' )
			->order_by( 'rp.created_at', 'DESC' );

		if ( $status && in_array( $status, self::ALLOWED_STATUSES, true ) ) {
			$qb->where( 'rp.status', '=', $status );
		}

		return $qb->paginate( $page, $per_page );
	}

	public static function update_status( int $id, string $status, int $resolver_id ) : bool {
		if ( ! in_array( $status, self::ALLOWED_STATUSES, true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid status.', 'zencommunity' ), 400 );
		}
		return static::ins()->qb()
			->where( 'rp.id', '=', $id )
			->update( [
				'status'      => $status,
				'resolved_by' => $resolver_id,
				'updated_at'  => current_time( 'mysql', true ),
			] );
	}

	public static function pending_count() : int {
		return static::ins()->qb()->where( 'rp.status', '=', 'pending' )->count();
	}
}
