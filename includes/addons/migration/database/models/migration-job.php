<?php
namespace ZenCommunity\Addons\Migration\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Database\Utils\{ Model, QueryBuilder };
use ZenCommunity\Exceptions\ZencommunityException;

/**
 * Class MigrationJob
 *
 * One row per migration run. `status` is a small state machine:
 * queued -> running -> (paused|completed|completed_with_errors|failed|canceled)
 * `totals` is a JSON map of entity_type => { total, processed, succeeded, failed }.
 *
 * @package ZenCommunity\Addons\Migration\Database\Models
 */
class MigrationJob extends Model {
	protected string $table = 'zenc_migration_jobs';
	protected ?string $alias = 'mj';
	protected array   $selects = [ '*' ];

	/** Job states considered "in flight" — used to prevent concurrent runs of the same provider. */
	const ACTIVE_STATUSES = [ 'queued', 'running', 'paused' ];

	public static function wrapper( array $job ) : array {
		$job['options'] = json_decode( $job['options'] ?? '{}', true ) ?: [];
		$job['totals']  = json_decode( $job['totals'] ?? '{}', true ) ?: [];
		return $job;
	}

	public static function collection_wrapper( array $jobs ) : array {
		return array_map( [ static::class, 'wrapper' ], $jobs );
	}

	public static function by_id( int $id ) : array {
		$data = static::ins()->qb()->where( 'mj.id', '=', $id )->first();
		if ( empty( $data ) ) {
			throw new ZencommunityException( esc_html( __( 'Migration job not found.', 'zencommunity' ) ), 404 );
		}
		return static::wrapper( $data );
	}

	/**
	 * The currently active (queued/running/paused) job for a provider
	 * phase, if any. Scoped by phase, not just provider — the "tickets"
	 * and "conversations" phases of the same provider are independent jobs
	 * and are allowed to be active at the same time (see
	 * FluentSupportProvider::phases()); only two jobs for the *same* phase
	 * racing each other is what this guards against.
	 */
	public static function get_active( string $provider_key, string $phase = 'default' ) : ?array {
		$data = static::ins()->qb()
			->where( 'mj.provider_key', '=', $provider_key )
			->where( 'mj.phase', '=', $phase )
			->where_in( 'mj.status', self::ACTIVE_STATUSES )
			->order_by( 'mj.id', 'DESC' )
			->first();
		return empty( $data ) ? null : static::wrapper( $data );
	}

	public static function index_for_provider( string $provider_key, int $limit = 20 ) : array {
		$data = static::ins()->qb()
			->where( 'mj.provider_key', '=', $provider_key )
			->order_by( 'mj.id', 'DESC' )
			->limit( $limit )
			->get();
		return static::collection_wrapper( $data );
	}

	public static function create( string $provider_key, string $phase, string $mode, array $options, ?int $created_by ) : array {
		if ( ! in_array( $mode, [ 'dry_run', 'full', 'sync_new', 'retry_failed' ], true ) ) {
			throw new ZencommunityException( esc_html( __( 'Invalid migration mode.', 'zencommunity' ) ), 422 );
		}

		if ( 'dry_run' !== $mode && null !== static::get_active( $provider_key, $phase ) ) {
			throw new ZencommunityException( esc_html( __( 'A migration job is already running for this phase.', 'zencommunity' ) ), 409 );
		}

		$now = current_time( 'mysql' );
		$id  = static::ins()->insert( [
			'provider_key' => $provider_key,
			'phase'        => $phase,
			'mode'         => $mode,
			'status'       => 'queued',
			'options'      => wp_json_encode( $options ),
			'totals'       => wp_json_encode( [] ),
			'created_by'   => $created_by,
			'created_at'   => $now,
			'updated_at'   => $now,
		] );

		if ( empty( $id ) ) {
			throw new ZencommunityException( esc_html( __( 'Could not create migration job.', 'zencommunity' ) ), 500 );
		}

		return static::by_id( (int) $id );
	}

	/** Raw (unwrapped) update — pass already-JSON-encoded 'options'/'totals' if updating those. */
	public static function update( int $id, array $data ) : bool {
		$data['updated_at'] = current_time( 'mysql' );
		return static::ins()->qb()->where( 'mj.id', '=', $id )->update( $data );
	}

	public static function set_status( int $id, string $status, array $extra = [] ) : bool {
		$data = array_merge( [ 'status' => $status ], $extra );
		return static::update( $id, $data );
	}

	public static function set_totals( int $id, array $totals ) : bool {
		return static::update( $id, [ 'totals' => wp_json_encode( $totals ) ] );
	}

	public static function set_cursor( int $id, string $entity_type, int $offset ) : bool {
		return static::update( $id, [ 'current_entity_type' => $entity_type, 'cursor_offset' => $offset ] );
	}
}
