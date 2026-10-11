<?php
namespace ZenCommunity\Addons\Migration\Services;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Addons\Migration\Contracts\ProviderInterface;
use ZenCommunity\Addons\Migration\Database\Models\MigrationRecord;

/**
 * Class DryRunService
 *
 * Dry runs are just a handful of COUNT()-style calls per entity type, cheap
 * even against a huge dataset — so unlike the real migration they run
 * synchronously in the REST request rather than through Action Scheduler,
 * giving the admin an instant pre-flight report before committing to a run.
 *
 * @package ZenCommunity\Addons\Migration\Services
 */
class DryRunService {

	public static function run( ProviderInterface $provider, array $options ) : array {
		$report = [ 'entity_types' => [] ];

		foreach ( $provider->entity_types() as $type ) {
			$total     = $provider->count( $type, $options );
			$already   = MigrationRecord::count_succeeded( $provider->id(), $type );
			$report['entity_types'][ $type ] = [
				'label'          => $provider->entity_type_label( $type ),
				'total'          => $total,
				'already_synced' => $already,
				'to_migrate'     => max( 0, $total - $already ),
			];
		}

		return $report;
	}
}
