<?php
namespace ZenCommunity\Addons\LifterLms\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Database\Utils\{ Model, QueryBuilder };
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Helper;

class Relation extends Model {
	protected string $table = 'zenc_llms_relations';
	protected ?string $alias = 'ar';
	protected array   $selects = [
		'ar.*'
	];

	public static array $events = [
		'course_enrollment',
		'course_complete',
		'user_question',
		'question_answer',
		'lesson_completion',
		// 'quiz_start',
		'quiz_end',
	];

	public static function group_by_course_id( int $course_id ) : array {
		$qb = static::ins()->qb()
			->where_in_subquery( 
				'ar.group_id', 
				fn( QueryBuilder $q) : QueryBuilder => $q
					->select( [ 'r.group_id' ] )
					->from( 'zenc_llms_group_course_relation', 'r' )
					->where( 'r.course_id', '=', $course_id )
			);
			
			
		return $qb->get();
	}
	
	/**
	 * Check if a Relation exists by ID.
	 *
	 * @param int $id
	 * @return bool
	 */
	public static function exists( int $group_id, ?int $course_id = null ) : bool {
		$qb = static::ins()->qb()
			->where( 'ar.group_id', '=', $group_id );
			if ( ! is_null( $course_id ) ) {
				$qb->where( 'ar.course_id', '=', $course_id );
			}
			
		return $qb->count() > 0;
	}
    
	public static function get( int $group_id, ?int $course_id = null ) : ?array {
		$qb = static::ins()->qb()
			->where( 'ar.group_id', '=', $group_id );

		if ( ! is_null( $course_id ) ) {
			$qb->where( 'ar.course_id', '=', $course_id );
		}

		if ( empty( $data = $qb->first() ) ) {
			throw new ZencommunityException( esc_html( __( 'Record not found.', 'zencommunity' ) ), 404 );
		}
		
		return  static::wrapper( $data );
	}


	public static function update( int $group_id, array $course_ids, array $events ) : ?array {
		$data = [];
		$data['created_by'] = get_current_user_id();
        $data['events']     = json_encode( array_intersect( 
			$events, 
			get_option( 'zenc_lifterlms_events', static::$events ) 
		) );
        $data['updated_at'] = current_time( 'mysql' );
		// wp_send_json($data);
		if ( ! static::exists( $group_id ) ) {
        	$data['group_id']   = $group_id;
        	$data['created_at'] = current_time( 'mysql' );
			static::ins()->insert( $data );
		}
		else {
			static::ins()->qb()
				->where( 'ar.group_id', '=', $group_id )
				->update( $data );
		}

		QueryBuilder::ins()
			->from( 'zenc_llms_group_course_relation' )
			->where( 'group_id', '=', $group_id )
			->delete();

		foreach( $course_ids as $course_id ) {
			QueryBuilder::ins()
				->from( 'zenc_llms_group_course_relation' )
				->create( 'zenc_llms_group_course_relation', [
					'group_id'  => $group_id,
					'course_id' => $course_id,
				] );
		}

		do_action( "zencommunity/integration/LifterLms/updated", ...func_get_args() );
		return $data;

	}
	
}
