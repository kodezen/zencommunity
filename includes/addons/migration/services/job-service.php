<?php
namespace ZenCommunity\Addons\Migration\Services;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Addons\Migration\Database\Models\{ MigrationJob, MigrationRecord };
use ZenCommunity\Addons\Migration\ProviderRegistry;
use ZenCommunity\Exceptions\ZencommunityException;

/**
 * Class JobService
 *
 * Thin orchestration layer between the REST controller and (MigrationJob,
 * BatchRunner, DryRunService). Kept separate from the controller so the
 * job lifecycle rules live in one place regardless of caller.
 *
 * @package ZenCommunity\Addons\Migration\Services
 */
class JobService {

	protected static function get_provider( string $provider_key ) {
		$provider = ProviderRegistry::get( $provider_key );
		if ( ! $provider ) {
			throw new ZencommunityException( esc_html( __( 'Unknown migration provider.', 'zencommunity' ) ), 404 );
		}
		return $provider;
	}

	public static function list_providers() : array {
		$out = [];
		foreach ( ProviderRegistry::get_all() as $key => $class ) {
			$provider     = new $class();
			$availability = $provider->availability();

			// Always-visible migrated/total preview, not gated behind an
			// explicit "dry run" action — cheap (just COUNT()s), see
			// DryRunService's docblock. Flat, per-entity-type; phases below
			// reference which of these keys each phase covers so the UI can
			// build a per-phase totals table without a second request.
			$preview = [];
			if ( ! empty( $availability['available'] ) ) {
				try {
					$preview = DryRunService::run( $provider, [] )['entity_types'];
				} catch ( \Throwable $e ) {
					$preview = [];
				}
			}

			$phases = [];
			foreach ( $provider->phases() as $phase_key => $phase ) {
				$phases[ $phase_key ] = [
					'key'           => $phase_key,
					'label'         => $phase['label'] ?? $phase_key,
					'entity_types'  => $phase['entity_types'] ?? [],
					'active_job'    => MigrationJob::get_active( $provider->id(), $phase_key ),
				];
			}

			$out[] = [
				'key'           => $provider->id(),
				'label'         => $provider->label(),
				'description'   => $provider->description(),
				'available'     => $availability['available'],
				'missing'       => $availability['missing'] ?? [],
				'config_schema' => $provider->config_schema(),
				'preview'       => $preview,
				'phases'        => $phases,
			];
		}
		return $out;
	}

	public static function start_job( string $provider_key, string $phase, string $mode, array $options, ?int $actor_id ) : array {
		$provider     = self::get_provider( $provider_key );
		$availability = $provider->availability();
		if ( empty( $availability['available'] ) ) {
			throw new ZencommunityException( esc_html( implode( ' ', $availability['missing'] ?? [ __( 'Provider is unavailable.', 'zencommunity' ) ] ) ), 422 );
		}

		if ( ! isset( $provider->phases()[ $phase ] ) ) {
			throw new ZencommunityException( esc_html( __( 'Unknown migration phase.', 'zencommunity' ) ), 422 );
		}

		if ( 'dry_run' === $mode ) {
			$job    = MigrationJob::create( $provider_key, $phase, 'dry_run', $options, $actor_id );
			$report = DryRunService::run( $provider, $options );
			MigrationJob::set_status( $job['id'], 'completed', [
				'totals'      => wp_json_encode( $report['entity_types'] ),
				'finished_at' => current_time( 'mysql' ),
				'started_at'  => current_time( 'mysql' ),
			] );
			return MigrationJob::by_id( $job['id'] );
		}

		$job = MigrationJob::create( $provider_key, $phase, $mode, $options, $actor_id );
		BatchRunner::dispatch( $job['id'] );
		return $job;
	}

	/**
	 * Execute one batch right now instead of waiting for the next Action
	 * Scheduler tick. Called by the settings tab every ~10s while a job is
	 * active, to move things along faster while an admin is watching — the
	 * Action Scheduler chain (BatchRunner::dispatch()) keeps running on its
	 * own regardless, so the job still completes even if this is never
	 * called (tab closed, network hiccup, etc). Safe to call redundantly or
	 * concurrently with an Action Scheduler-triggered run: BatchRunner's
	 * atomic per-job claim means only one of them actually does work if
	 * both land at the same moment — this just no-ops rather than double
	 * processing.
	 */
	public static function run_batch( int $job_id ) : array {
		BatchRunner::process( $job_id );
		return MigrationJob::by_id( $job_id );
	}

	public static function get_job( int $job_id ) : array {
		$job                     = MigrationJob::by_id( $job_id );
		$job['failed_preview']   = MigrationRecord::failed_rows( $job_id );
		return $job;
	}

	public static function cancel_job( int $job_id ) : array {
		$job = MigrationJob::by_id( $job_id );
		if ( ! in_array( $job['status'], MigrationJob::ACTIVE_STATUSES, true ) ) {
			throw new ZencommunityException( esc_html( __( 'Job is not active.', 'zencommunity' ) ), 422 );
		}
		MigrationJob::set_status( $job_id, 'canceled', [ 'finished_at' => current_time( 'mysql' ) ] );
		return MigrationJob::by_id( $job_id );
	}

	public static function pause_job( int $job_id ) : array {
		$job = MigrationJob::by_id( $job_id );
		if ( 'running' !== $job['status'] && 'queued' !== $job['status'] ) {
			throw new ZencommunityException( esc_html( __( 'Job is not running.', 'zencommunity' ) ), 422 );
		}
		MigrationJob::set_status( $job_id, 'paused' );
		return MigrationJob::by_id( $job_id );
	}

	public static function resume_job( int $job_id ) : array {
		$job = MigrationJob::by_id( $job_id );
		if ( 'paused' !== $job['status'] ) {
			throw new ZencommunityException( esc_html( __( 'Job is not paused.', 'zencommunity' ) ), 422 );
		}
		MigrationJob::set_status( $job_id, 'running' );
		BatchRunner::dispatch( $job_id );
		return MigrationJob::by_id( $job_id );
	}

	public static function retry_failed( int $job_id, ?int $actor_id ) : array {
		$job = MigrationJob::by_id( $job_id );
		if ( empty( MigrationRecord::failed_rows( $job_id ) ) ) {
			throw new ZencommunityException( esc_html( __( 'No failed items to retry.', 'zencommunity' ) ), 422 );
		}
		$retry_job = MigrationJob::create( $job['provider_key'], $job['phase'], 'retry_failed', $job['options'], $actor_id );
		BatchRunner::dispatch( $retry_job['id'] );
		return $retry_job;
	}
}
