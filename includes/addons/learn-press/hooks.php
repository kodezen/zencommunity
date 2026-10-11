<?php

namespace ZenCommunity\Addons\LearnPress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Database\Utils\QueryBuilder;
use ZenCommunity\Addons\LearnPress\Database\Models\Relation;
class Hooks {
	public static function init() : void {
		add_action( 'zencommunity/group/created', [ self::CLASS, 'update' ] );
		add_action( 'zencommunity/group/updated', [ self::CLASS, 'update' ] );
		add_filter( "zencommunity/group/wrapper/collection", [ self::CLASS, 'response' ] );
		add_filter( "zencommunity/group/wrapper/single", [ self::CLASS, 'single_response' ], 10, 2 );
		add_filter( 'zencommunity/assets/script_data', [ self::CLASS, 'script_data' ] );
	}
	
	public static function script_data( array $data ) : array {
		$data['is_learnpress_active'] = is_plugin_active( 'learnpress/learnpress.php' );
		$data['learnpress_nonce']     = wp_create_nonce( 'learnpress_nonce' );
		return $data;
	}

	public static function update( int $group_id ) : void {
		
		$json = file_get_contents( 'php://input' );
		$data = json_decode( $json, true );

		if ( json_last_error() !== JSON_ERROR_NONE ) return;
		
		$data = Sanitizer::sanitize( $data, [
			'lp_course_ids.*' => Sanitizer::INT,
			'lp_events.*'     => Sanitizer::STRING,
		] );
		
		Relation::update( $group_id, $data['lp_course_ids'] ?? [], $data['lp_events'] ?? [] );
	}

	public static function response( array $group ) : array {
		$gids = array_column( $group, 'id' );
		$data = Relation::ins()->qb()->select( [
			'ar.events',
			'ar.group_id',
			'courses' => fn( QueryBuilder $q ) : QueryBuilder => $q
				->select( [ 'GROUP_CONCAT(JSON_OBJECT( "id", c.ID, "title", c.post_title ))' ] )
				->from( 'posts', 'c' )
				->where( 'c.post_type', '=', 'lp_course' )
				->where_in_subquery(  'c.ID',
					fn( QueryBuilder $q1 ) : QueryBuilder => $q1
						->select( [ 'cr.course_id' ] )
						->from( 'zenc_lp_group_course_relation', 'cr' )
						->where_column( 'cr.course_id', '=', 'c.ID' )
						->where_column( 'cr.group_id', '=', 'ar.group_id' )
				)
		] )
		->where_in( 'ar.group_id', $gids )
		->get();
		$new = [];
		foreach( $data as $gc ) {
			$gc['events']  = array_values( json_decode( "[{$gc['events']}]" ) );
			$gc['courses'] = json_decode( "[{$gc['courses']}]" );
			$new[$gc['group_id']] = $gc;
		}

		// print_r($new);
		return array_map( function( array $g ) use( $new ) : array {
			$g['lp_course'] = $new[$g['id']] ?? [];
			return $g;
		}, $group );
	}

	public static function single_response( array $group, bool $is_single ) : array {
		if ( ! $is_single ) return $group;
		$data = Relation::ins()->qb()->select( [
			'ar.events',
			'ar.group_id',
			'courses' => fn( QueryBuilder $q ) : QueryBuilder => $q
				->select( [ 'GROUP_CONCAT(JSON_OBJECT( "id", c.ID, "title", c.post_title, "author_id", c.post_author, "post_type", c.post_type ))' ] )
				->from( 'posts', 'c' )
				->where( 'c.post_type', '=', 'lp_course' )
				->where_in_subquery(  'c.ID',
					fn( QueryBuilder $q1 ) : QueryBuilder => $q1
						->select( [ 'cr.course_id' ] )
						->from( 'zenc_lp_group_course_relation', 'cr' )
						->where_column( 'cr.course_id', '=', 'c.ID' )
						->where_column( 'cr.group_id', '=', 'ar.group_id' )
				)
		] )
		->where( 'ar.group_id', '=', absint( $group['id'] ) )
		->first();

		// wp_send_json($data);
		$data['events']  = array_values( json_decode( "[" . ( $data['events'] ?? '{}' ) . "]", true )[0] ?? [] );
		$data['courses'] = json_decode( "[" . ( $data['courses'] ?? '{}' ) . "]", true );

		foreach( $data['courses'] as &$course ) {
			if( empty( $course ) )
				continue;

			$course['thumbnail'] = get_the_post_thumbnail_url( $course['id'] ?? 0, 'medium' );
			$course['categories'] = get_the_terms( $course['id'] ?? 0, 'lp_course_category' );
			$course['author']     = get_the_author_meta(
				'display_name',
				 $course['author_id']  ?? 0
			);
		}

		if ( empty( $data['courses'][0] ) )
			unset( $data['courses'][0] );

		$group['lp_course'] = $data;
		return $group;
	}
}