<?php
namespace ZenCommunity\Addons\AcademyLms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Database\Utils\QueryBuilder;

/**
 * Course-scoped Q&A feed: surfaces the `user_question` / `question_answer`
 * feed posts (already pushed into a course's linked groups by PushFeed) back
 * out as a single, course-centric list — independent of which group a given
 * question/answer happened to land in.
 *
 * Filters by `meta.course_id`/`meta.event` in PHP rather than SQL: the
 * QueryBuilder's column sanitizer whitelists JSON_EXTRACT() but rejects the
 * `$` in a JSON path expression (`$.course_id`), so there's no safe way to
 * push that predicate into the query itself.
 */
class QaService {

	const EVENTS = [ 'user_question', 'question_answer' ];

	/**
	 * @return array { items, total, total_pages }
	 */
	public static function for_course( int $course_id, int $page = 1, int $per_page = 15 ) : array {
		$group_ids = CourseService::group_ids_for_course( $course_id );
		if ( empty( $group_ids ) ) {
			return [ 'items' => [], 'total' => 0, 'total_pages' => 0 ];
		}

		$per_page = max( 1, min( 100, $per_page ) );
		$page     = max( 1, $page );

		$rows = QueryBuilder::ins()
			->from( 'zenc_feeds', 'fd' )
			->select( [
				'fd.id', 'fd.title', 'fd.content', 'fd.user_id', 'fd.group_id',
				'fd.comment_count', 'fd.like_count', 'fd.meta', 'fd.created_at',
				'pf.first_name', 'pf.last_name', 'pf.username', 'pf.avatar_url',
			] )
			->join( 'zenc_profiles', 'pf', 'pf.user_id = fd.user_id' )
			->where_in( 'fd.group_id', $group_ids )
			->where( 'fd.status', '=', 'published' )
			->order_by( 'fd.created_at', 'DESC' )
			->limit( 1000 )
			->get();

		$matching = array_values( array_filter( (array) $rows, static function ( $row ) use ( $course_id ) {
			$meta = json_decode( $row['meta'] ?? '{}', true ) ?: [];
			return (int) ( $meta['course_id'] ?? 0 ) === $course_id
				&& in_array( $meta['event'] ?? '', self::EVENTS, true );
		} ) );

		$total       = count( $matching );
		$total_pages = max( 1, (int) ceil( $total / $per_page ) );
		$page_rows   = array_slice( $matching, ( $page - 1 ) * $per_page, $per_page );

		$items = array_map( static function ( $row ) {
			$meta = json_decode( $row['meta'] ?? '{}', true ) ?: [];
			return [
				'id'            => (int) $row['id'],
				'title'         => $row['title'],
				'content'       => $row['content'],
				'event'         => $meta['event'] ?? '',
				'comment_count' => (int) ( $row['comment_count'] ?? 0 ),
				'like_count'    => (int) ( $row['like_count'] ?? 0 ),
				'created_at'    => $row['created_at'],
				'author'        => [
					'id'         => (int) $row['user_id'],
					'name'       => trim( ( $row['first_name'] ?? '' ) . ' ' . ( $row['last_name'] ?? '' ) ) ?: $row['username'],
					'avatar_url' => $row['avatar_url'] ?? '',
				],
			];
		}, $page_rows );

		return [
			'items'       => $items,
			'total'       => $total,
			'total_pages' => $total_pages,
		];
	}
}
