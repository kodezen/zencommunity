<?php
namespace ZenCommunity\Addons\Migration\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Database\Utils\Model;

/**
 * Class MigrationRecord
 *
 * The idempotency ledger — see database/migrations/create-migration-record-table.php
 * for the rationale. Every read/write here is scoped by (provider_key, entity_type,
 * source_id), never by job_id alone, so re-runs and resumes stay safe.
 *
 * @package ZenCommunity\Addons\Migration\Database\Models
 */
class MigrationRecord extends Model {
	protected string $table = 'zenc_migration_records';
	protected ?string $alias = 'mr';
	protected array   $selects = [ '*' ];

	public static function find( string $provider_key, string $entity_type, $source_id ) : ?array {
		$data = static::ins()->qb()
			->where( 'mr.provider_key', '=', $provider_key )
			->where( 'mr.entity_type', '=', $entity_type )
			->where( 'mr.source_id', '=', (string) $source_id )
			->first();
		return empty( $data ) ? null : $data;
	}

	public static function is_succeeded( string $provider_key, string $entity_type, $source_id ) : bool {
		$record = static::find( $provider_key, $entity_type, $source_id );
		return ! empty( $record ) && 'succeeded' === $record['status'];
	}

	/** @return array<string, string> source_id => destination_id, for every succeeded row of this entity type. */
	public static function succeeded_map( string $provider_key, string $entity_type ) : array {
		$rows = static::ins()->qb()
			->select( [ 'mr.source_id', 'mr.destination_id' ] )
			->where( 'mr.provider_key', '=', $provider_key )
			->where( 'mr.entity_type', '=', $entity_type )
			->where( 'mr.status', '=', 'succeeded' )
			->get();
		$map = [];
		foreach ( $rows as $row ) {
			$map[ $row['source_id'] ] = $row['destination_id'];
		}
		return $map;
	}

	public static function count_succeeded( string $provider_key, string $entity_type ) : int {
		return static::ins()->qb()
			->where( 'mr.provider_key', '=', $provider_key )
			->where( 'mr.entity_type', '=', $entity_type )
			->where( 'mr.status', '=', 'succeeded' )
			->count();
	}

	public static function failed_rows( int $job_id, ?string $entity_type = null ) : array {
		$qb = static::ins()->qb()
			->where( 'mr.job_id', '=', $job_id )
			->where( 'mr.status', '=', 'failed' );
		if ( $entity_type ) {
			$qb->where( 'mr.entity_type', '=', $entity_type );
		}
		return $qb->get();
	}

	/**
	 * Failed rows for a provider, regardless of which job last touched them.
	 * Used to drive "retry failed" jobs: a retry job's own job_id starts out
	 * with zero rows of its own, so retrying must look at the ledger's
	 * current failures for the provider, not at the new job's (empty) history.
	 *
	 * Excludes rows that have already exhausted $max_retry_count — without
	 * this cap, a row that fails for a structural reason (not a transient
	 * one) would be re-attempted, re-fail, and get re-queued forever, and
	 * the retry job would never see an empty batch to advance past it.
	 */
	public static function failed_rows_by_provider( string $provider_key, ?string $entity_type = null, int $max_retry_count = 5 ) : array {
		$qb = static::ins()->qb()
			->where( 'mr.provider_key', '=', $provider_key )
			->where( 'mr.status', '=', 'failed' )
			->where( 'mr.retry_count', '<', $max_retry_count );
		if ( $entity_type ) {
			$qb->where( 'mr.entity_type', '=', $entity_type );
		}
		return $qb->get();
	}

	public static function record_success( int $job_id, string $provider_key, string $entity_type, $source_id, $destination_id, ?string $source_hash = null ) : void {
		$existing = static::find( $provider_key, $entity_type, $source_id );
		$data     = [
			'job_id'         => $job_id,
			'provider_key'   => $provider_key,
			'entity_type'    => $entity_type,
			'source_id'      => (string) $source_id,
			'destination_id' => (string) $destination_id,
			'status'         => 'succeeded',
			'source_hash'    => $source_hash,
			'error'          => null,
			'updated_at'     => current_time( 'mysql' ),
		];
		if ( $existing ) {
			static::ins()->qb()->where( 'mr.id', '=', $existing['id'] )->update( $data );
			return;
		}
		$data['created_at'] = current_time( 'mysql' );
		static::ins()->insert( $data );
	}

	public static function record_failure( int $job_id, string $provider_key, string $entity_type, $source_id, string $error ) : void {
		$existing = static::find( $provider_key, $entity_type, $source_id );
		$data     = [
			'job_id'       => $job_id,
			'provider_key' => $provider_key,
			'entity_type'  => $entity_type,
			'source_id'    => (string) $source_id,
			'status'       => 'failed',
			'error'        => mb_substr( $error, 0, 1000 ),
			'updated_at'   => current_time( 'mysql' ),
		];
		if ( $existing ) {
			$data['retry_count'] = (int) $existing['retry_count'] + 1;
			static::ins()->qb()->where( 'mr.id', '=', $existing['id'] )->update( $data );
			return;
		}
		$data['created_at'] = current_time( 'mysql' );
		static::ins()->insert( $data );
	}
}
