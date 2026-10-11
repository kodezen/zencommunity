<?php
namespace ZenCommunity\Traits;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\ActionQueue; 
trait Scheduler {
    public static function schedule( string $hook, ?array $args = null ) : void {
		$exists = ActionQueue::get_instance()
            ->get_next( $hook, $args );

		if ( ! $exists ) {
			ActionQueue::get_instance()->add( $hook, $args );
		}
    }
}