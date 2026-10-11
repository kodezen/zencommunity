<?php
namespace ZenCommunity\Addons\AcademyLms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Course reviews BFF: list + submit star ratings/written reviews for a
 * course. Backed by Academy's own storage — one `academy_courses`-typed
 * WP_Comment per review, with the 1-5 rating in the `academy_rating` comment
 * meta — so it stays the same source of truth as Academy's own
 * `get_course_rating()` summary already surfaced on `course.rating`, and any
 * review submitted here also counts toward that aggregate.
 */
class ReviewService {

	const COMMENT_TYPE = 'academy_courses';

	/**
	 * @return array { items, total, total_pages, can_review, user_review }
	 */
	public static function for_course( int $course_id, int $page = 1, int $per_page = 10, int $viewer_id = 0 ) : array {
		$per_page = max( 1, min( 100, $per_page ) );
		$page     = max( 1, $page );

		$comments = ( new \WP_Comment_Query() )->query( [
			'post_id' => $course_id,
			'status'  => 'approve',
			'type'    => self::COMMENT_TYPE,
			'number'  => $per_page,
			'paged'   => $page,
			'orderby' => 'comment_ID',
			'order'   => 'DESC',
		] );

		$total = (int) get_comments( [
			'post_id' => $course_id,
			'status'  => 'approve',
			'type'    => self::COMMENT_TYPE,
			'count'   => true,
		] );

		return [
			'items'       => array_map( [ self::class, 'map_review' ], (array) $comments ),
			'total'       => $total,
			'total_pages' => max( 1, (int) ceil( $total / $per_page ) ),
			'can_review'  => self::can_review( $course_id, $viewer_id ),
			'user_review' => $viewer_id ? self::user_review( $course_id, $viewer_id ) : null,
		];
	}

	protected static function map_review( \WP_Comment $comment ) : array {
		$user = $comment->user_id ? get_userdata( $comment->user_id ) : false;

		// get_avatar_url() resolves comment objects only for WP core's default
		// comment type ('comment') — a non-standard type like 'academy_courses'
		// always gets `false` back. Resolve by user id / email instead so
		// reviewers actually get an avatar.
		$avatar_for = $comment->user_id ? (int) $comment->user_id : $comment->comment_author_email;

		return [
			'id'         => (int) $comment->comment_ID,
			'rating'     => (int) get_comment_meta( $comment->comment_ID, 'academy_rating', true ),
			'review'     => wp_kses_post( $comment->comment_content ),
			'name'       => ( $user && $user->display_name ) ? $user->display_name : $comment->comment_author,
			'avatar_url' => get_avatar_url( $avatar_for, [ 'size' => 96 ] ),
			'created_at' => $comment->comment_date_gmt,
		];
	}

	/**
	 * Whether $user_id may submit a review for $course_id right now: reviews
	 * not disabled (globally or per-course), and either a site admin or
	 * someone who has enrolled in AND completed the course — mirrors
	 * Academy's own `create_review_rating_permission_check()` gate exactly,
	 * since this is the same eligibility rule, just re-exposed for the SPA.
	 */
	public static function can_review( int $course_id, int $user_id ) : bool {
		if ( ! $user_id || ! CourseService::academy_active() || ! self::reviews_enabled( $course_id ) ) {
			return false;
		}

		if ( user_can( $user_id, 'administrator' ) ) {
			return true;
		}

		return \Academy\Helper::is_enrolled( $course_id, $user_id ) && \Academy\Helper::is_completed_course( $course_id, $user_id );
	}

	protected static function reviews_enabled( int $course_id ) : bool {
		if ( method_exists( '\Academy\Helper', 'get_settings' ) && ! (bool) \Academy\Helper::get_settings( 'is_enabled_course_review', true ) ) {
			return false;
		}
		return ! get_post_meta( $course_id, 'academy_is_disabled_course_review', true );
	}

	/**
	 * The viewer's own review for this course, if any — lets the SPA prefill
	 * the form and submit as an edit, since Academy upserts by (course, user)
	 * regardless of whether the client knows about the existing review.
	 */
	public static function user_review( int $course_id, int $user_id ) : ?array {
		$comments = get_comments( [
			'post_id' => $course_id,
			'user_id' => $user_id,
			'type'    => self::COMMENT_TYPE,
			'status'  => 'all',
			'number'  => 1,
		] );

		return empty( $comments ) ? null : self::map_review( current( $comments ) );
	}

	/**
	 * Create or update (one per user per course) a review.
	 *
	 * @return int|\WP_Error Comment ID on success.
	 */
	public static function submit( int $course_id, int $user_id, int $rating, string $review ) {
		if ( ! CourseService::academy_active() ) {
			return new \WP_Error( 'academy_inactive', __( 'Academy LMS is not available.', 'zencommunity' ), [ 'status' => 400 ] );
		}

		$post = get_post( $course_id );
		if ( ! $post || CourseService::COURSE_POST_TYPE !== $post->post_type ) {
			return new \WP_Error( 'course_not_found', __( 'Course not found.', 'zencommunity' ), [ 'status' => 404 ] );
		}

		if ( $rating < 1 || $rating > 5 ) {
			return new \WP_Error( 'invalid_rating', __( 'Rating must be between 1 and 5.', 'zencommunity' ), [ 'status' => 400 ] );
		}

		if ( ! self::can_review( $course_id, $user_id ) ) {
			return new \WP_Error(
				'review_not_allowed',
				__( 'You must enroll in and complete this course before submitting a review.', 'zencommunity' ),
				[ 'status' => 403 ]
			);
		}

		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return new \WP_Error( 'invalid_user', __( 'Invalid user.', 'zencommunity' ), [ 'status' => 401 ] );
		}

		$comment_data = [
			'comment_post_ID'      => $course_id,
			'comment_content'      => wp_kses_post( $review ),
			'user_id'              => $user_id,
			'comment_author'       => $user->display_name ?: $user->user_login,
			'comment_author_email' => $user->user_email,
			'comment_author_url'   => $user->user_url,
			'comment_type'         => self::COMMENT_TYPE,
			'comment_approved'     => '1',
		];

		$existing = get_comments( [
			'post_id' => $course_id,
			'user_id' => $user_id,
			'type'    => self::COMMENT_TYPE,
			'status'  => 'all',
			'number'  => 1,
		] );
		$existing = empty( $existing ) ? null : current( $existing );

		if ( $existing ) {
			$comment_data['comment_ID'] = (int) $existing->comment_ID;
			if ( false === wp_update_comment( $comment_data ) ) {
				return new \WP_Error( 'review_failed', __( 'Could not submit review.', 'zencommunity' ), [ 'status' => 500 ] );
			}
			update_comment_meta( (int) $existing->comment_ID, 'academy_rating', $rating );
			return (int) $existing->comment_ID;
		}

		$comment_data['comment_meta'] = [ 'academy_rating' => $rating ];
		$review_id = (int) wp_insert_comment( $comment_data );
		if ( ! $review_id ) {
			return new \WP_Error( 'review_failed', __( 'Could not submit review.', 'zencommunity' ), [ 'status' => 500 ] );
		}

		return $review_id;
	}
}
