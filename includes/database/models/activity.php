<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Database\Utils\{ Model, QueryBuilder };
class Activity extends Model {
	protected string $table = 'zenc_activities';
	protected ?string $alias = 'act';
	protected array   $selects = [
		'act.*'
	];

	public static function wrapper( array $activity ) : array {
		$activity['meta']    = json_decode( $activity['meta'] ?? '{}', true );
		return $activity;
	}

	public static function collection_wrapper( array $activitys ) : array {
		$data = [];
		foreach ( $activitys as $activity ) {
			$data[] = static::wrapper( $activity );
		}
		return $data;
	}

	public static function index( 
		?int $user_id = null, 
		?int $group_id = null, 
		array $type = [], 
		int $page = 1, 
		int $per_page = 20, 
		?int $logged_user_id = null 
	) : array {
		$qb = static::ins()->qb()
			->select( [
				'act.*', 
			] );
		
		if ( ! is_null( $logged_user_id ) && ! user_can( $logged_user_id, 'manage_options' ) ) {
			$qb->join( 'zenc_groups', 'g', 'act.group_id = g.id')
				->join( 'zenc_group_members', 'spm', 'act.group_id = spm.group_id' )
				->where_group( function( QueryBuilder $q ) use ( $logged_user_id ) : void {
				$q->where_group(  function( QueryBuilder $q_ ) use ( $logged_user_id ) : void {
					$q_->where( 'spm.user_id', '=', $logged_user_id );
					$q_->where( 'spm.status', '=', 'active' );
				} )
				->or_where( 'g.privacy', '=', 'public' );
			} );
		}

		if ( ! is_null( $user_id ) ) {
			$qb->where( 'act.user_id', '=', $user_id );
		}
		if ( ! is_null( $group_id ) ) {
			$qb->where( 'act.group_id', '=', $group_id );
		}
		$type = array_filter( $type );
		if ( ! empty( $type ) ) {
			$qb->where_in( 'act.event_type', $type );
		}


		$qb->order_by( 'act.created_at', 'DESC' );
        $qb->group_by( [ 'act.id' ] );
		// wp_send_json([$type,$qb->dump()]);
        $data = $qb->paginate( $page, $per_page );
		$data['records'] = static::collection_wrapper( $data['records'] ?? [] );
		return $data;
	}

	public static function add( array $params, bool $is_public = false ) : ?bool {
		// Extract individual variables from the passed $params array
		$type 		  = $params['type'] ?? '';
		$user_id      = $params['user_id'] ?? [];
		$data 		  = $params['data'] ?? null;
		$group_id     = $params['group_id'] ?? null;
		$feed_id      = $params['feed_id'] ?? null;
		$object_id    = $params['object_id'] ?? null;
		$object_type  = $params['object_type'] ?? null;
	
		// Validate the necessary conditions
		if ( 
			! Profile::exists( $user_id ) || 
			empty( $type ) || 
			( empty( $group_id ) && empty( $feed_id ) && empty( $object_id ) ) 
		) {
			return null;
		}
	
		// Prepare the activity data
		$activity_to_add = [
			'event_type'    => $type,
			'user_id'  	    => $user_id,
			'meta'          => wp_json_encode($data),
			'group_id'      => $group_id,
			'feed_id'       => $feed_id,
			'object_id'     => $object_id,
			'object_type'   => $object_type,
			'created_at'    => current_time( 'mysql', true ),
			'is_public'     => $is_public
		];
	
		// Insert activity
		return static::ins()->insert( $activity_to_add );
	}
		
	public static function remove( 
		string $type, 
		?int $user_id, 
		?int $feed_id = null, 
		?int $group_id = null, 
		?int $object_id = null, 
		?string $object_type = null
	) : bool {

		$qb = static::ins()->qb()
			->where( 'act.event_type', '=', $type );

		if ( ! is_null( $user_id ) ) {
			$qb->where( 'act.user_id', '=', $user_id );
		}

		if ( ! is_null( $feed_id ) ) {
            $qb->where( 'act.feed_id', '=', $feed_id );
        }

		if ( ! is_null( $group_id ) ) {
            $qb->where( 'act.group_id', '=', $group_id );
        }
		if ( ! is_null( $object_id ) ) {
            $qb->where( 'act.object_id', '=', $object_id );
        }
		if ( ! is_null( $object_type ) ) {
            $qb->where( 'act.object_type', '=', $object_type );
        }

		return $qb->delete();
	}
}