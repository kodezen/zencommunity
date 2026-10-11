<?php
namespace ZenCommunity\Addons\Migration\Contracts;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Interface ProviderInterface
 *
 * Contract every migration source (Fluent Support, Zendesk, Help Scout, ...)
 * must implement to plug into the generic Migration engine. Providers are
 * registered via the `zencommunity/migration/register_providers` action —
 * see ProviderRegistry.
 *
 * @package ZenCommunity\Addons\Migration\Contracts
 */
interface ProviderInterface {

	/** Unique, stable key for this provider (used as the ledger's provider_key). */
	public function id() : string;

	/** Human readable label shown on the provider card. */
	public function label() : string;

	/** Short description of what this provider migrates. */
	public function description() : string;

	/**
	 * Evaluated at request time (not registration time) so the UI can explain
	 * exactly why a provider is greyed out.
	 *
	 * @return array{available: bool, missing: string[]}
	 */
	public function availability() : array;

	/**
	 * The full, canonical ordered list of every entity type key this
	 * provider migrates, in the order they must be processed to satisfy
	 * foreign-key dependencies — regardless of how phases() groups them
	 * into separate jobs. This is what the id-mapping context is built
	 * from (see BatchRunner::build_context()): a phase that only processes
	 * ['conversations'] still needs the 'tickets'/'agents'/'customers' maps
	 * from earlier in this canonical order, even though those types belong
	 * to a different, already-completed job/phase.
	 *
	 * @return string[]
	 */
	public function entity_types() : array;

	/**
	 * Named, independently-runnable phases — each its own MigrationJob,
	 * not just a step within one job. A phase groups a subset of
	 * entity_types() (in the same relative order) that makes sense to
	 * commit to, inspect, and complete on its own before moving on — e.g.
	 * "migrate every ticket, batched" as one job, then "migrate every
	 * reply, batched" as a separate one, so each has its own progress/
	 * pause/retry lifecycle instead of the two being inseparably bundled
	 * into one all-or-nothing run.
	 *
	 * An optional `next_phase` key on a phase auto-starts that phase the
	 * moment this one finishes (completed or completed_with_errors — see
	 * BatchRunner::maybe_start_next_phase()), so starting the first phase
	 * carries the whole migration through without a second manual click.
	 * Omit it on a phase that should stop and wait for the admin instead.
	 *
	 * A provider with nothing to split returns a single phase covering all
	 * of entity_types() — every part of this addon that's phase-aware
	 * degrades to today's single-job behavior in that case.
	 *
	 * @return array<string, array{label: string, entity_types: string[], next_phase?: string}>
	 */
	public function phases() : array;

	/** Human label for an entity type, e.g. 'tickets' => 'Tickets'. */
	public function entity_type_label( string $entity_type ) : string;

	/** Count of source rows available to migrate for this entity type. */
	public function count( string $entity_type, array $options ) : int;

	/**
	 * Fetch a batch of raw source rows for an entity type.
	 *
	 * @return array<int, array{id: int|string}> Each row must include a stable 'id' key.
	 */
	public function fetch_batch( string $entity_type, int $offset, int $limit, array $options ) : array;

	/**
	 * Fetch specific source rows by id — used by the "retry failed" job to
	 * re-attempt exactly the rows that previously failed, without re-walking
	 * the whole offset range.
	 *
	 * @param array $source_ids
	 * @return array<int, array{id: int|string}>
	 */
	public function fetch_by_ids( string $entity_type, array $source_ids, array $options ) : array;

	/**
	 * Migrate a single source row.
	 *
	 * @param array $source_row One row from fetch_batch().
	 * @param array $context    Mutable id-mapping cache shared across the whole job
	 *                          (e.g. $context['agents'][$fs_person_id] = $wp_user_id),
	 *                          built up as earlier entity types complete.
	 * @param array $options    The job's options (config_schema()-shaped: mapping
	 *                          choices, the acting admin's user id, etc).
	 *
	 * @return array{destination_id: int|string|null, error: string|null, source_hash?: string|null}
	 */
	public function migrate_item( string $entity_type, array $source_row, array &$context, array $options ) : array;

	/**
	 * Describe provider-specific options the settings UI should render as a
	 * form (e.g. default type/priority mapping). Kept generic/JSON-schema-ish
	 * so the free plugin never needs to know provider-specific field names.
	 *
	 * @return array
	 */
	public function config_schema() : array;

	/**
	 * Called once, after every entity type *in the current phase* has been
	 * fully processed and before the job is marked complete — for any
	 * correction that can only be done safely in bulk, at the end, rather
	 * than per-item. $options['__phase'] carries which phase key just
	 * completed (see phases()), since the right thing to do here often
	 * depends on it — e.g. only the phase that migrates replies is the
	 * right place to flip a ticket from draft to its real final status;
	 * doing that after the phase that only migrates the tickets themselves
	 * would make it "real" before it has any of its replies yet. No-op if a
	 * provider has nothing to finalize for the given phase.
	 */
	public function finalize( array $options ) : void;
}
