<?php
namespace ZenCommunity\Addons\AcademyLms\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Database\Utils\{ Model, QueryBuilder };
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Helper;

class Relation extends Model {
	protected string $table = 'zenc_alms_relations';
	protected ?string $alias = 'ar';
	protected array   $selects = [
		'ar.*'
	];

	public static array $events = [
		'course_enrollment',
		// 'course_start',
		'course_complete',
		'course_announcements',
		'user_question',
		'question_answer',
		'lesson_update',
		'quiz_start',
		'quiz_end',
	];

	/**
	 * Per-group integration settings override map (JSON column).
	 */
	public static function settings_for_group( int $group_id ) : array {
		$row = static::ins()->qb()
			->select( [ 'ar.settings' ] )
			->where( 'ar.group_id', '=', $group_id )
			->first();

		if ( empty( $row['settings'] ) ) {
			return [];
		}
		$decoded = json_decode( (string) $row['settings'], true );
		return is_array( $decoded ) ? $decoded : [];
	}

	/**
	 * Groups that contain a course — both explicitly linked and via the group's
	 * selected Academy categories. Used to resolve membership-based access.
	 */
	public static function group_ids_for_course_via_categories( int $course_id ) : array {
		$explicit = QueryBuilder::ins()
			->from( 'zenc_group_course_relation' )
			->select( [ 'group_id' ] )
			->where( 'course_id', '=', $course_id )
			->get();

		$ids = array_map( static fn( $r ) => absint( $r['group_id'] ?? 0 ), (array) $explicit );

		$terms = wp_get_post_terms( $course_id, 'academy_courses_category', [ 'fields' => 'ids' ] );
		if ( ! is_wp_error( $terms ) && ! empty( $terms ) ) {
			$terms = array_map( 'absint', $terms );
			$rows  = static::ins()->qb()
				->select( [ 'ar.group_id', 'ar.category_ids' ] )
				->where_not_null( 'ar.category_ids' )
				->get();

			foreach ( (array) $rows as $row ) {
				$cat_ids = json_decode( (string) ( $row['category_ids'] ?? '' ), true );
				if ( is_array( $cat_ids ) && array_intersect( array_map( 'absint', $cat_ids ), $terms ) ) {
					$ids[] = absint( $row['group_id'] ?? 0 );
				}
			}
		}

		return array_values( array_unique( array_filter( $ids ) ) );
	}

	public static function group_by_course_id( int $course_id ) : array {
		$qb = static::ins()->qb()
			->where_in_subquery( 
				'ar.group_id', 
				fn( QueryBuilder $q) : QueryBuilder => $q
					->select( [ 'r.group_id' ] )
					->from( 'zenc_group_course_relation', 'r' )
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


	/**
	 * Academy category ids a group surfaces courses from (dynamic linking).
	 */
	public static function category_ids_for_group( int $group_id ) : array {
		$row = static::ins()->qb()
			->select( [ 'ar.category_ids' ] )
			->where( 'ar.group_id', '=', $group_id )
			->first();

		if ( empty( $row['category_ids'] ) ) {
			return [];
		}

		$ids = json_decode( (string) $row['category_ids'], true );
		return is_array( $ids ) ? array_values( array_filter( array_map( 'absint', $ids ) ) ) : [];
	}

	public static function update( int $group_id, array $course_ids, array $events, array $category_ids = [], array $settings = [] ) : ?array {
		$data = [];
		$data['created_by'] = get_current_user_id();
        $data['events']     = json_encode( array_intersect(
			$events,
			get_option( 'zenc_academy_events', static::$events )
		) );
        $data['category_ids'] = json_encode( array_values( array_filter( array_map( 'absint', $category_ids ) ) ) );
        $data['settings']   = wp_json_encode( $settings );
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
			->from( 'zenc_group_course_relation' )
			->where( 'group_id', '=', $group_id )
			->delete();

		foreach( $course_ids as $course_id ) {
			QueryBuilder::ins()
				->from( 'zenc_group_course_relation' )
				->create( 'zenc_group_course_relation', [
					'group_id'  => $group_id,
					'course_id' => $course_id,
				] );
		}

		do_action( "zencommunity/integration/academylms/updated", ...func_get_args() );
		return $data;

	}
	
}
