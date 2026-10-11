<?php
namespace ZenCommunity\Addons\Migration\Services;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use Throwable;
use ZenCommunity\ActionQueue;
use ZenCommunity\Addons\Migration\Database\Models\{ MigrationJob, MigrationRecord };
use ZenCommunity\Addons\Migration\ProviderRegistry;

/**
 * Class BatchRunner
 *
 * Orchestrates a migration job through Action Scheduler: one chained action
 * per batch (never one action per record), so a job with tens of thousands
 * of rows never floods the Action Scheduler queue and can be paused/canceled
 * within a single batch.
 *
 * Idempotency note: the id-mapping "context" passed to migrate_item() is
 * rebuilt from the MigrationRecord ledger at the top of every batch instead
 * of being kept in memory — each Action Scheduler invocation is a fresh PHP
 * process, so this is what makes the job genuinely resumable after a crash
 * or server restart, not just resumable in the happy path.
 *
 * @package ZenCommunity\Addons\Migration\Services
 */
class BatchRunner {

	const HOOK  = 'zenc_migration/process_batch';
	const GROUP = 'zencommunity-migration';

	/**
	 * A claim older than this is treated as abandoned (a crashed/killed
	 * batch, or a /run-batch request whose connection was dropped mid-flight
	 * — e.g. the browser tab closing) and stealable. A real batch normally
	 * finishes in well under a minute; this is deliberately short so a
	 * dropped request self-heals on its own within a couple of poll cycles
	 * rather than sitting dead until an admin notices and intervenes.
	 */
	const LOCK_TIMEOUT = 2 * MINUTE_IN_SECONDS;

	const WATCHDOG_HOOK = 'zenc_migration/watchdog';

	public static function init() : void {
		add_action( self::HOOK, [ static::class, 'process' ] );
		add_action( self::WATCHDOG_HOOK, [ static::class, 'watchdog' ] );
	}

	/**
	 * Every job's own last act (on success) is to schedule its next batch —
	 * that's what makes the chain self-perpetuating. But if the process
	 * holding the claim dies before it gets that far (not just before
	 * releasing the claim — see claim()/LOCK_TIMEOUT), no next Action
	 * Scheduler action ever gets scheduled, and the chain is dead, not just
	 * paused: nothing will resume it once the browser tab that was driving
	 * it via /run-batch closes, breaking the "the Action Scheduler chain
	 * keeps running even if the tab closes" guarantee this addon is built
	 * on. This recurring sweep is what actually keeps that promise: any
	 * queued/running job with no pending batch action gets one re-dispatched.
	 * Safe to call redundantly — a stray extra dispatch just no-ops against
	 * BatchRunner's own claim if the job turns out to already be moving.
	 */
	public static function watchdog() : void {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_migration_jobs';
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$job_ids = $wpdb->get_col( "SELECT id FROM {$table} WHERE status IN ( 'queued', 'running' )" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		$queue = ActionQueue::get_instance();
		foreach ( $job_ids as $job_id ) {
			$job_id = (int) $job_id;
			if ( ! $queue->get_next( self::HOOK, [ 'job_id' => $job_id ], self::GROUP ) ) {
				self::dispatch( $job_id );
			}
		}
	}

	public static function default_batch_size() : int {
		return 25;
	}

	/** Kick off (or resume) processing for a job — safe to call repeatedly. */
	public static function dispatch( int $job_id, int $delay = 0 ) : void {
		ActionQueue::get_instance()->schedule_single( time() + $delay, self::HOOK, [ 'job_id' => $job_id ], self::GROUP );
	}

	/**
	 * Process one bounded batch for a job, then either reschedule itself for
	 * the next batch, advance to the next entity type, or complete the job.
	 */
	public static function process( int $job_id ) : void {
		$job = self::safe_get_job( $job_id );
		if ( ! $job ) {
			return;
		}

		// Paused/canceled/completed jobs simply don't reschedule — this is the
		// entire pause/cancel mechanism, no separate signalling needed.
		if ( ! in_array( $job['status'], [ 'queued', 'running' ], true ) ) {
			return;
		}

		// Atomic claim: guards against two Action Scheduler actions for the same
		// job ever executing concurrently — e.g. resume() dispatching a fresh
		// batch while a stray pre-pause action is still pending and happens to
		// fire around the same time. Without this, both could pass the
		// idempotency check for the same source row before either writes the
		// ledger, creating a genuine duplicate ticket/conversation/customer —
		// the ledger's unique key only stops the *second ledger row*, not the
		// second Ticket::create() call that already ran by then.
		if ( ! self::claim( $job_id ) ) {
			return;
		}

		try {
			self::process_claimed( $job_id, $job );
		} finally {
			self::release( $job_id );
		}
	}

	protected static function claim( int $job_id ) : bool {
		global $wpdb;
		$table        = $wpdb->prefix . 'zenc_migration_jobs';
		$stale_before = gmdate( 'Y-m-d H:i:s', time() - self::LOCK_TIMEOUT );
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$wpdb->query( $wpdb->prepare(
			"UPDATE {$table} SET processing_started_at = %s WHERE id = %d AND ( processing_started_at IS NULL OR processing_started_at < %s )", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			current_time( 'mysql', true ),
			$job_id,
			$stale_before
		) );
		return 1 === (int) $wpdb->rows_affected;
	}

	protected static function release( int $job_id ) : void {
		global $wpdb;
		$wpdb->update( $wpdb->prefix . 'zenc_migration_jobs', [ 'processing_started_at' => null ], [ 'id' => $job_id ] );
	}

	/** The original per-batch work, run only once a claim has been won. */
	protected static function process_claimed( int $job_id, array $job ) : void {
		$provider = ProviderRegistry::get( $job['provider_key'] );
		if ( ! $provider ) {
			MigrationJob::set_status( $job_id, 'failed', [ 'error_message' => __( 'Provider is no longer registered.', 'zencommunity' ), 'finished_at' => current_time( 'mysql' ) ] );
			return;
		}

		$availability = $provider->availability();
		if ( empty( $availability['available'] ) ) {
			MigrationJob::set_status( $job_id, 'failed', [
				'error_message' => implode( ' ', $availability['missing'] ?? [] ),
				'finished_at'   => current_time( 'mysql' ),
			] );
			return;
		}

		if ( 'queued' === $job['status'] ) {
			MigrationJob::update( $job_id, [ 'status' => 'running', 'started_at' => $job['started_at'] ?: current_time( 'mysql' ) ] );
		}

		// The canonical, full entity-type order is what the id-mapping context
		// is built from (a "conversations" phase still needs the 'tickets'/
		// 'agents'/'customers' maps from an earlier, already-completed phase);
		// $phase_types is the subset THIS job actually iterates/advances
		// through. See ProviderInterface::phases() and ::entity_types().
		$canonical_types = $provider->entity_types();
		$phase           = $provider->phases()[ $job['phase'] ] ?? null;
		$phase_types     = $phase['entity_types'] ?? $canonical_types;

		if ( empty( $phase_types ) ) {
			self::complete( $job_id, $provider, $job, $phase_types );
			return;
		}

		$current_type = $job['current_entity_type'] ?: $phase_types[0];
		$phase_index  = array_search( $current_type, $phase_types, true );
		if ( false === $phase_index ) {
			$phase_index  = 0;
			$current_type = $phase_types[0];
		}

		$options              = $job['options'];
		// The admin who started the job — mappers use this as the "actor" for
		// business-logic methods (e.g. Ticket::create()) that gate certain
		// fields behind an agent/admin capability check, since there is no
		// logged-in user in an Action Scheduler request.
		$options['__actor_id'] = $job['created_by'];
		$options['__phase']    = $job['phase'];
		$batch_size = max( 1, (int) ( $options['batch_size'] ?? self::default_batch_size() ) );
		$offset     = (int) $job['cursor_offset'];

		// Rebuild the id-mapping context from the ledger — see class docblock.
		// Sliced from the canonical order up to $current_type's position in
		// it, not $phase_types' — that's what makes a later phase see
		// earlier phases' results.
		$canonical_index = array_search( $current_type, $canonical_types, true );
		$context          = self::build_context( $job['provider_key'], array_slice( $canonical_types, 0, false === $canonical_index ? 0 : $canonical_index ) );

		$rows = ( 'retry_failed' === $job['mode'] )
			? self::next_retry_batch( $job_id, $job['provider_key'], $current_type, $provider, $options, $batch_size )
			: $provider->fetch_batch( $current_type, $offset, $batch_size, $options );

		if ( empty( $rows ) ) {
			// This entity type is exhausted — advance to the next one in this
			// phase (or finish this job/phase).
			if ( $phase_index + 1 < count( $phase_types ) ) {
				MigrationJob::set_cursor( $job_id, $phase_types[ $phase_index + 1 ], 0 );
				self::dispatch( $job_id );
				return;
			}
			self::complete( $job_id, $provider, $job, $phase_types );
			return;
		}

		$totals = $job['totals'];
		if ( ! isset( $totals[ $current_type ] ) ) {
			$totals[ $current_type ] = [ 'total' => $provider->count( $current_type, $options ), 'processed' => 0, 'succeeded' => 0, 'failed' => 0 ];
		}

		foreach ( $rows as $row ) {
			$source_id = $row['id'] ?? null;
			if ( null === $source_id ) {
				continue;
			}

			// Idempotency guard: skip anything already migrated for this provider,
			// regardless of which job first migrated it — this is what makes a
			// brand new "full" run after an earlier one behave like "sync new only".
			if ( MigrationRecord::is_succeeded( $job['provider_key'], $current_type, $source_id ) ) {
				continue;
			}

			$totals[ $current_type ]['processed']++;

			try {
				$result = $provider->migrate_item( $current_type, $row, $context, $options );
				if ( empty( $result['destination_id'] ) ) {
					throw new \RuntimeException( $result['error'] ?? __( 'Unknown migration error.', 'zencommunity' ) );
				}
				MigrationRecord::record_success( $job_id, $job['provider_key'], $current_type, $source_id, $result['destination_id'], $result['source_hash'] ?? null );
				$context[ $current_type ][ $source_id ] = $result['destination_id'];
				$totals[ $current_type ]['succeeded']++;
			} catch ( Throwable $e ) {
				MigrationRecord::record_failure( $job_id, $job['provider_key'], $current_type, $source_id, $e->getMessage() );
				$totals[ $current_type ]['failed']++;
				// One bad row never aborts the batch — continue to the next item.
			}
		}

		MigrationJob::set_totals( $job_id, $totals );

		if ( 'retry_failed' === $job['mode'] ) {
			// retry batches are pulled directly from the ledger; just try again shortly.
			self::dispatch( $job_id, 2 );
			return;
		}

		MigrationJob::set_cursor( $job_id, $current_type, $offset + count( $rows ) );
		self::dispatch( $job_id, 2 );
	}

	/** @param string[] $preceding_entity_types */
	protected static function build_context( string $provider_key, array $preceding_entity_types ) : array {
		$context = [];
		foreach ( $preceding_entity_types as $type ) {
			$context[ $type ] = MigrationRecord::succeeded_map( $provider_key, $type );
		}
		return $context;
	}

	protected static function next_retry_batch( int $job_id, string $provider_key, string $entity_type, $provider, array $options, int $batch_size ) : array {
		// Scoped by provider, not by this (brand new) retry job's id — see
		// MigrationRecord::failed_rows_by_provider() docblock.
		$failed = MigrationRecord::failed_rows_by_provider( $provider_key, $entity_type );
		if ( empty( $failed ) ) {
			return [];
		}
		$ids = array_slice( array_column( $failed, 'source_id' ), 0, $batch_size );
		return $provider->fetch_by_ids( $entity_type, $ids, $options );
	}

	/**
	 * Final verification pass: compare live source counts vs. succeeded
	 * ledger counts — scoped to $phase_types (this job/phase's own entity
	 * types), not the provider's full canonical list; a "tickets" phase job
	 * has nothing to verify or finalize about conversations it never
	 * attempted.
	 */
	protected static function complete( int $job_id, $provider, array $job, array $phase_types ) : void {
		// Bulk, end-of-job corrections (e.g. final ticket status) that can't be
		// done safely per-item mid-migration — see ProviderInterface::finalize().
		// $options['__phase'] (set in process_claimed()) is what lets a
		// provider tell "tickets phase just finished" apart from
		// "conversations phase just finished".
		$options            = $job['options'];
		$options['__phase'] = $job['phase'];
		try {
			$provider->finalize( $options );
		} catch ( Throwable $e ) {
			// Non-fatal: the migration itself already succeeded: finalize() is a
			// polish pass, not a correctness requirement, so surface it as a
			// job-level note but still let the job complete.
			MigrationJob::update( $job_id, [ 'error_message' => 'finalize(): ' . $e->getMessage() ] );
		}

		$totals       = $job['totals'];
		$has_failures = false;

		foreach ( $phase_types as $type ) {
			$source_count    = $provider->count( $type, $job['options'] );
			$succeeded_count = MigrationRecord::count_succeeded( $job['provider_key'], $type );
			$failed_count    = count( MigrationRecord::failed_rows( $job_id, $type ) );

			$totals[ $type ] = array_merge( $totals[ $type ] ?? [], [
				'total'     => $source_count,
				'succeeded' => $succeeded_count,
				'failed'    => $failed_count,
				'verified'  => $succeeded_count >= $source_count,
			] );

			if ( $failed_count > 0 || $succeeded_count < $source_count ) {
				$has_failures = true;
			}
		}

		$final_status = $has_failures ? 'completed_with_errors' : 'completed';
		MigrationJob::update( $job_id, [
			'totals'      => wp_json_encode( $totals ),
			'status'      => $final_status,
			'finished_at' => current_time( 'mysql' ),
		] );

		self::maybe_start_next_phase( $provider, $job, $final_status );
	}

	/**
	 * Auto-chains to the next phase (e.g. "tickets" -> "conversations") when
	 * the provider declares one via phases()[$phase]['next_phase'] — so
	 * clicking "Start" once on the first phase carries the whole migration
	 * through to the end, rather than requiring a second manual click once
	 * the first phase finishes. Only chains on a genuinely finished phase
	 * (completed or completed_with_errors — a few failed tickets shouldn't
	 * block migrating everything that did succeed), never after
	 * failed/canceled. 'full' mode always, regardless of what the just-
	 * finished job's own mode was — an auto-continuation is never a dry run
	 * or a manual retry.
	 */
	protected static function maybe_start_next_phase( $provider, array $job, string $final_status ) : void {
		if ( ! in_array( $final_status, [ 'completed', 'completed_with_errors' ], true ) ) {
			return;
		}

		$next_phase_key = $provider->phases()[ $job['phase'] ]['next_phase'] ?? null;
		if ( ! $next_phase_key || ! isset( $provider->phases()[ $next_phase_key ] ) ) {
			return;
		}

		// Someone may have already started it by hand in the meantime.
		if ( MigrationJob::get_active( $job['provider_key'], $next_phase_key ) ) {
			return;
		}

		try {
			$next_job = MigrationJob::create( $job['provider_key'], $next_phase_key, 'full', $job['options'], $job['created_by'] );
			self::dispatch( $next_job['id'] );
		} catch ( Throwable $e ) {
			// Non-fatal — the phase that just finished is still fully valid;
			// the admin can start the next phase by hand if this failed.
			unset( $e );
		}
	}

	protected static function safe_get_job( int $job_id ) : ?array {
		try {
			return MigrationJob::by_id( $job_id );
		} catch ( Throwable $e ) {
			return null;
		}
	}
}
