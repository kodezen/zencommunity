<?php
namespace ZenCommunity\Addons\AcademyLms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Database\Utils\QueryBuilder;
use ZenCommunity\Addons\AcademyLms\Database\Models\Relation;

/**
 * Backend-for-frontend for courses.
 *
 * Normalizes Academy LMS course data (+ StoreEngine pricing + ZenCommunity
 * group links) into the shapes the ZenCommunity React app consumes, so the SPA
 * never has to know about Academy or StoreEngine internals. All access goes
 * through Academy's own helpers/REST so enrollment & gating logic is never
 * duplicated.
 */
class CourseService {

	const STOREENGINE_PROVIDER = 'storeengine/academylms';
	const COURSE_POST_TYPE     = 'academy_courses';

	public static function academy_active() : bool {
		return class_exists( '\Academy\Helper' );
	}

	public static function storeengine_active() : bool {
		return class_exists( '\StoreEngine\Utils\Helper' );
	}

	/**
	 * Query published courses for the catalog.
	 *
	 * @param array $args { search, category, per_page, page, include }
	 * @return array { items, total, total_pages }
	 */
	public static function get_courses( array $args = [] ) : array {
		if ( ! self::academy_active() ) {
			return [ 'items' => [], 'total' => 0, 'total_pages' => 0 ];
		}

		$has_include = array_key_exists( 'include', $args );

		$args = wp_parse_args( $args, [
			'search'   => '',
			'category' => 0,
			'per_page' => 12,
			'page'     => 1,
			'include'  => [],
		] );

		$query_args = [
			'post_type'      => self::COURSE_POST_TYPE,
			'post_status'    => 'publish',
			'posts_per_page' => absint( $args['per_page'] ),
			'paged'          => max( 1, absint( $args['page'] ) ),
			's'              => sanitize_text_field( (string) $args['search'] ),
			'no_found_rows'  => false,
		];

		// Callers that scope to a fixed set of courses (group/member listings)
		// always pass 'include', even when that set is empty — which must mean
		// "show nothing", not "no restriction". Only the open catalog call omits
		// 'include' entirely, so check whether the caller passed the key at all,
		// not whether the (post-default-merge) value is empty.
		if ( $has_include ) {
			$query_args['post__in'] = array_filter( array_map( 'absint', (array) $args['include'] ) );
			$query_args['orderby']  = 'post__in';
			if ( empty( $query_args['post__in'] ) ) {
				return [ 'items' => [], 'total' => 0, 'total_pages' => 0 ];
			}
		}

		if ( ! empty( $args['category'] ) ) {
			$query_args['tax_query'] = [ [
				'taxonomy' => 'academy_courses_category',
				'field'    => 'term_id',
				'terms'    => absint( $args['category'] ),
			] ];
		}

		$query = new \WP_Query( $query_args );
		$items = array_map( [ self::class, 'card' ], $query->posts );

		return [
			'items'       => array_values( $items ),
			'total'       => (int) $query->found_posts,
			'total_pages' => (int) $query->max_num_pages,
		];
	}

	/**
	 * Course ids a group surfaces: explicitly linked courses
	 * (zenc_group_course_relation) PLUS every published course in the group's
	 * selected Academy categories (dynamic linking).
	 */
	public static function course_ids_for_group( int $group_id ) : array {
		$rows = QueryBuilder::ins()
			->from( 'zenc_group_course_relation' )
			->select( [ 'course_id' ] )
			->where( 'group_id', '=', $group_id )
			->get();

		$ids = array_filter( array_map(
			static fn( $row ) => absint( $row['course_id'] ?? 0 ),
			(array) $rows
		) );

		$category_ids = Relation::category_ids_for_group( $group_id );
		if ( ! empty( $category_ids ) && self::academy_active() ) {
			$by_cat = get_posts( [
				'post_type'   => self::COURSE_POST_TYPE,
				'post_status' => 'publish',
				'fields'      => 'ids',
				'numberposts' => -1,
				'tax_query'   => [ [
					'taxonomy' => 'academy_courses_category',
					'field'    => 'term_id',
					'terms'    => $category_ids,
				] ],
			] );
			$ids = array_merge( $ids, array_map( 'absint', (array) $by_cat ) );
		}

		return array_values( array_unique( array_filter( $ids ) ) );
	}

	/**
	 * Course ids a user is enrolled in (status 'completed').
	 */
	public static function course_ids_for_user( int $user_id ) : array {
		if ( ! $user_id || ! self::academy_active() ) {
			return [];
		}
		return array_values( array_filter( array_map(
			'absint',
			(array) \Academy\Helper::get_enrolled_courses_ids_by_user( $user_id )
		) ) );
	}

	/**
	 * Group ids a course is linked to.
	 */
	public static function group_ids_for_course( int $course_id ) : array {
		$rows = QueryBuilder::ins()
			->from( 'zenc_group_course_relation' )
			->select( [ 'group_id' ] )
			->where( 'course_id', '=', $course_id )
			->get();

		return array_values( array_filter( array_map(
			static fn( $row ) => absint( $row['group_id'] ?? 0 ),
			(array) $rows
		) ) );
	}

	/**
	 * Compact card shape for catalog grids.
	 *
	 * @param \WP_Post $post
	 */
	public static function card( $post ) : array {
		$course_id = (int) $post->ID;
		$user_id   = get_current_user_id();

		return [
			'id'           => $course_id,
			'title'        => get_the_title( $course_id ),
			'slug'         => $post->post_name,
			'permalink'    => get_permalink( $course_id ),
			'excerpt'      => wp_strip_all_tags( get_the_excerpt( $course_id ) ),
			// Fall back to Academy's own default course thumbnail when the course
			// has no featured image, so cards never show an empty placeholder.
			'thumbnail'    => method_exists( '\Academy\Helper', 'get_the_course_thumbnail_url_by_id' )
				? \Academy\Helper::get_the_course_thumbnail_url_by_id( $course_id, 'medium_large' )
				: ( get_the_post_thumbnail_url( $course_id, 'medium_large' ) ?: '' ),
			'author'       => get_the_author_meta( 'display_name', $post->post_author ),
			'author_id'    => (int) $post->post_author,
			'categories'   => self::terms( $course_id ),
			'course_type'  => self::course_type( $course_id ),
			'price_html'   => self::price_html( $course_id ),
			'is_enrolled'  => self::is_enrolled( $course_id, $user_id ),
			'rating'       => self::rating( $course_id ),
			'lesson_count' => self::lesson_count( $course_id ),
			'duration'     => self::duration( $course_id ),
			'is_scorm'     => self::is_scorm( $course_id ),
		];
	}

	/**
	 * Full detail shape for the single-course screen.
	 */
	public static function single( int $course_id ) : ?array {
		$post = get_post( $course_id );
		if ( ! $post || self::COURSE_POST_TYPE !== $post->post_type || 'publish' !== $post->post_status ) {
			return null;
		}

		$user_id = get_current_user_id();
		$data    = self::card( $post );

		$data['content']          = apply_filters( 'the_content', $post->post_content );
		$data['intro_video']      = get_post_meta( $course_id, 'academy_course_intro_video', true ) ?: null;
		$data['purchase_options'] = self::purchase_options( $course_id );
		$data['groups']           = self::linked_groups( $course_id );
		$data['can_access']       = self::can_access( $course_id, $user_id );
		$data['learn_url']        = self::learn_url( $course_id );
		$data['curriculum']       = self::curriculum( $course_id, $user_id );
		$data['is_complete']      = self::is_complete( $course_id, $user_id );
		$data['completion_percentage'] = self::completion_percentage( $course_id, $user_id );
		$data['certificate_url']  = self::certificate_url( $course_id, $user_id );

		return $data;
	}

	/**
	 * Whether the given user has completed the course, per Academy's own
	 * "course_completed" comment record.
	 */
	public static function is_complete( int $course_id, int $user_id ) : bool {
		if ( ! $user_id || ! self::academy_active() || ! method_exists( '\Academy\Helper', 'is_completed_course' ) ) {
			return false;
		}
		return (bool) \Academy\Helper::is_completed_course( $course_id, $user_id );
	}

	/**
	 * Percentage (0-100) of curriculum topics the user has completed so far.
	 */
	public static function completion_percentage( int $course_id, int $user_id ) : int {
		if ( ! $user_id || ! self::academy_active() || ! method_exists( '\Academy\Helper', 'get_percentage_of_completed_topics_by_student_and_course_id' ) ) {
			return 0;
		}
		return (int) \Academy\Helper::get_percentage_of_completed_topics_by_student_and_course_id( $user_id, $course_id );
	}

	/**
	 * Certificate view/download URL for a user who has completed the course —
	 * null if not completed, certificates aren't enabled for the course, or
	 * the certificates addon isn't active. Shared with CourseCompletedFeed so
	 * the feed message and the course page always agree on the same link.
	 */
	public static function certificate_url( int $course_id, int $user_id ) : ?string {
		if ( ! self::is_complete( $course_id, $user_id ) || ! class_exists( '\AcademyCertificates\Helper' ) ) {
			return null;
		}

		if ( ! get_post_meta( $course_id, 'academy_course_enable_certificate', true ) ) {
			return null;
		}

		$certificate_id = get_post_meta( $course_id, 'academy_course_certificate_id', true );
		if ( ! $certificate_id && method_exists( '\Academy\Helper', 'get_settings' ) ) {
			$certificate_id = \Academy\Helper::get_settings( 'academy_primary_certificate_id' );
		}
		if ( ! $certificate_id ) {
			return null;
		}

		$permalink = get_permalink( $course_id );
		return $permalink ? add_query_arg( [ 'source' => 'certificate' ], $permalink ) : null;
	}

	/**
	 * Ordered sections + topics (lessons/quizzes/etc.) for the curriculum view.
	 * Delegates to Academy's own helper so enrollment gating and per-user
	 * completion state are never duplicated here.
	 */
	protected static function curriculum( int $course_id, int $user_id ) : array {
		if ( ! self::academy_active() || ! method_exists( '\Academy\Helper', 'get_course_curriculum' ) ) {
			return [];
		}

		$sections = (array) \Academy\Helper::get_course_curriculum( $course_id, (bool) $user_id );

		return array_values( array_map( static function ( $section ) : array {
			$section = (array) $section;
			return [
				'title'  => $section['title'] ?? '',
				'topics' => array_values( array_map(
					[ self::class, 'map_curriculum_topic' ],
					(array) ( $section['topics'] ?? [] )
				) ),
			];
		}, $sections ) );
	}

	/**
	 * Normalize a single curriculum topic (lesson/quiz/etc.), recursing into
	 * nested sub-curriculum topics if present.
	 */
	protected static function map_curriculum_topic( $topic ) : array {
		$topic  = (array) $topic;
		$mapped = [
			'id'            => (int) ( $topic['id'] ?? 0 ),
			'name'          => $topic['name'] ?? '',
			'type'          => $topic['type'] ?? 'lesson',
			'duration'      => $topic['duration'] ?? '',
			'is_completed'  => ! empty( $topic['is_completed'] ),
			'is_accessible' => ! empty( $topic['is_accessible'] ),
		];

		if ( ! empty( $topic['topics'] ) && is_array( $topic['topics'] ) ) {
			$mapped['topics'] = array_values( array_map( [ self::class, 'map_curriculum_topic' ], $topic['topics'] ) );
		}

		return $mapped;
	}

	/**
	 * Purchase options assembled from StoreEngine integrations. Each option is a
	 * product/price pair plus a ready-to-use direct-checkout URL.
	 */
	public static function purchase_options( int $course_id ) : array {
		if ( ! self::storeengine_active() ) {
			return [];
		}

		$repo = \StoreEngine\Utils\Helper::get_integration_repository_by_id( self::STOREENGINE_PROVIDER, $course_id );
		if ( empty( $repo ) ) {
			return [];
		}

		$checkout = \StoreEngine\Utils\Helper::get_checkout_url();
		$options  = [];

		foreach ( $repo as $item ) {
			if ( empty( $item->price ) || empty( $item->integration ) ) {
				continue;
			}
			$product_id = (int) $item->integration->get_product_id();
			$price_id   = (int) $item->price->get_id();

			$options[] = [
				'product_id'   => $product_id,
				'price_id'     => $price_id,
				'price'        => (float) $item->price->get_price(),
				'price_name'   => $item->price->get_price_name(),
				'price_html'   => wp_kses_post( $item->price->get_price_html() ),
				'checkout_url' => esc_url_raw( add_query_arg( [
					'product_id' => $product_id,
					'price_id'   => $price_id,
				], $checkout ) ),
			];
		}

		return $options;
	}

	/**
	 * Free / public enroll. Returns the enrollment id or a WP_Error.
	 *
	 * @return int|\WP_Error
	 */
	public static function enroll( int $course_id, int $user_id ) {
		if ( ! self::academy_active() ) {
			return new \WP_Error( 'academy_inactive', __( 'Academy LMS is not available.', 'zencommunity' ), [ 'status' => 400 ] );
		}

		$type = self::course_type( $course_id );
		if ( 'paid' === $type && ! empty( self::purchase_options( $course_id ) ) ) {
			return new \WP_Error( 'course_requires_purchase', __( 'This course must be purchased.', 'zencommunity' ), [ 'status' => 402 ] );
		}

		$enroll_id = \Academy\Helper::do_enroll( $course_id, $user_id );
		if ( ! $enroll_id ) {
			// do_enroll() bails out (returns false) on ANY pre-existing, non-cancelled
			// enrollment row, regardless of its status. If that row is stuck at
			// something other than 'completed' (e.g. left 'pending' by an interrupted
			// purchase flow), do_enroll() will never promote it, and the user is
			// permanently unable to (re-)enroll. Detect that case here and complete it.
			$existing = \Academy\Helper::is_enrolled( $course_id, $user_id, 'any' );
			if ( $existing ) {
				if ( 'completed' === $existing->enrolled_status ) {
					return 0;
				}

				$updated = wp_update_post( [ 'ID' => $existing->ID, 'post_status' => 'completed' ], true );
				if ( is_wp_error( $updated ) ) {
					return new \WP_Error( 'enroll_failed', __( 'Could not enroll in this course.', 'zencommunity' ), [ 'status' => 500 ] );
				}

				update_user_meta( $user_id, 'is_academy_student', current_time( 'mysql' ) );
				$user = get_user_by( 'id', $user_id );
				if ( $user && ! in_array( 'academy_student', (array) $user->roles, true ) ) {
					$user->add_role( 'academy_student' );
				}
				do_action( 'academy/course/after_enroll', $course_id, $existing->ID, $user_id );

				return (int) $existing->ID;
			}

			return new \WP_Error( 'enroll_failed', __( 'Could not enroll in this course.', 'zencommunity' ), [ 'status' => 500 ] );
		}

		return (int) $enroll_id;
	}

	/* ---------------------------------------------------------------------
	 * Thin wrappers around Academy helpers (kept private to the BFF).
	 * ------------------------------------------------------------------- */

	protected static function course_type( int $course_id ) : string {
		return self::academy_active() ? (string) \Academy\Helper::get_course_type( $course_id ) : 'free';
	}

	protected static function is_enrolled( int $course_id, int $user_id ) : bool {
		if ( ! $user_id || ! self::academy_active() ) {
			return false;
		}
		return (bool) \Academy\Helper::is_enrolled( $course_id, $user_id );
	}

	protected static function can_access( int $course_id, int $user_id ) : bool {
		if ( ! self::academy_active() ) {
			return false;
		}
		if ( method_exists( '\Academy\Helper', 'has_permission_to_access_curriculum' ) ) {
			return (bool) \Academy\Helper::has_permission_to_access_curriculum( $course_id, $user_id );
		}
		return self::is_enrolled( $course_id, $user_id );
	}

	protected static function price_html( int $course_id ) : string {
		$options = self::purchase_options( $course_id );
		if ( ! empty( $options ) ) {
			if ( count( $options ) > 1 ) {
				return esc_html__( 'Paid', 'zencommunity' );
			}
			return (string) $options[0]['price_html'];
		}
		$type = self::course_type( $course_id );
		return in_array( $type, [ 'free', 'public' ], true ) ? esc_html__( 'Free', 'zencommunity' ) : esc_html__( 'Paid', 'zencommunity' );
	}

	protected static function rating( int $course_id ) : array {
		if ( self::academy_active() && method_exists( '\Academy\Helper', 'get_course_rating' ) ) {
			$rating = \Academy\Helper::get_course_rating( $course_id );
			return [
				'average' => (float) ( $rating->rating_avg ?? 0 ),
				'count'   => (int) ( $rating->rating_count ?? 0 ),
			];
		}
		return [ 'average' => 0, 'count' => 0 ];
	}

	protected static function lesson_count( int $course_id ) : int {
		if ( self::academy_active() && method_exists( '\Academy\Helper', 'get_course_curriculums_number_of_counts' ) ) {
			$counts = \Academy\Helper::get_course_curriculums_number_of_counts( $course_id );
			// Academy returns 'total_lessons'; older builds used 'lesson'.
			return (int) ( $counts['total_lessons'] ?? $counts['lesson'] ?? 0 );
		}
		return 0;
	}

	/**
	 * Whether the course is a SCORM package. academy-pro's SCORM addon
	 * intentionally reports an empty curriculum for these courses (the whole
	 * course is the SCORM player, not a lesson list), which would otherwise
	 * leave the card with no lesson-count/duration meta at all — this lets
	 * the frontend show a "SCORM course" label in that spot instead.
	 */
	protected static function is_scorm( int $course_id ) : bool {
		return (bool) get_post_meta( $course_id, '_academy_course_builder_scorm_file', true );
	}

	protected static function duration( int $course_id ) : string {
		if ( self::academy_active() && method_exists( '\Academy\Helper', 'get_course_duration' ) ) {
			$duration = (string) \Academy\Helper::get_course_duration( $course_id );
			if ( '' !== $duration ) {
				return $duration;
			}
		}
		// The course-level duration is optional in Academy's builder and often
		// left empty; fall back to the sum of the lessons' video durations.
		return self::duration_from_lessons( $course_id );
	}

	/**
	 * Total video runtime across the course's lessons, formatted like
	 * Academy's own duration strings ("2 hr 30 mins"). Empty when no lesson
	 * carries a duration.
	 */
	protected static function duration_from_lessons( int $course_id ) : string {
		$lesson_ids = [];
		$collect    = static function ( array $topics ) use ( &$collect, &$lesson_ids ) : void {
			foreach ( $topics as $topic ) {
				$topic = (array) $topic;
				if ( ( $topic['type'] ?? '' ) === 'lesson' && ! empty( $topic['id'] ) ) {
					$lesson_ids[] = absint( $topic['id'] );
				}
				if ( ! empty( $topic['topics'] ) && is_array( $topic['topics'] ) ) {
					$collect( $topic['topics'] );
				}
			}
		};

		foreach ( (array) get_post_meta( $course_id, 'academy_course_curriculum', true ) as $section ) {
			$section = (array) $section;
			if ( ! empty( $section['topics'] ) && is_array( $section['topics'] ) ) {
				$collect( $section['topics'] );
			}
		}

		$lesson_ids = array_values( array_unique( array_filter( $lesson_ids ) ) );
		if ( empty( $lesson_ids ) ) {
			return '';
		}

		global $wpdb;
		$table = $wpdb->prefix . 'academy_lessonmeta';
		$ph    = implode( ',', array_fill( 0, count( $lesson_ids ), '%d' ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$values = (array) $wpdb->get_col( $wpdb->prepare(
			"SELECT meta_value FROM {$table} WHERE meta_key = 'video_duration' AND lesson_id IN ($ph)",
			$lesson_ids
		) );

		$seconds = 0;
		foreach ( $values as $value ) {
			$d = json_decode( (string) $value, true );
			if ( ! is_array( $d ) ) {
				continue;
			}
			$seconds += absint( $d['hours'] ?? 0 ) * 3600
				+ absint( $d['minutes'] ?? 0 ) * 60
				+ absint( $d['seconds'] ?? 0 );
		}

		if ( $seconds <= 0 ) {
			return '';
		}

		$hours   = intdiv( $seconds, 3600 );
		$minutes = intdiv( $seconds % 3600, 60 );
		$parts   = [];
		if ( $hours > 0 ) {
			$parts[] = $hours . ' hr';
		}
		if ( $minutes > 0 ) {
			$parts[] = $minutes . ' mins';
		}
		if ( empty( $parts ) ) {
			$parts[] = ( $seconds % 60 ) . ' sec';
		}
		return implode( ' ', $parts );
	}

	/**
	 * Canonical "start/continue learning" URL from Academy.
	 */
	protected static function learn_url( int $course_id ) : string {
		if ( self::academy_active() && method_exists( '\Academy\Helper', 'get_start_course_permalink' ) ) {
			$url = \Academy\Helper::get_start_course_permalink( $course_id );
			if ( ! empty( $url ) ) {
				return $url;
			}
		}
		return (string) get_permalink( $course_id );
	}

	protected static function terms( int $course_id ) : array {
		$terms = get_the_terms( $course_id, 'academy_courses_category' );
		if ( ! $terms || is_wp_error( $terms ) ) {
			return [];
		}
		return array_map( static fn( $t ) => [
			'id'   => (int) $t->term_id,
			'name' => $t->name,
			'slug' => $t->slug,
		], $terms );
	}

	/**
	 * Minimal info on the ZenCommunity groups a course is linked to.
	 */
	protected static function linked_groups( int $course_id ) : array {
		$group_ids = self::group_ids_for_course( $course_id );
		if ( empty( $group_ids ) ) {
			return [];
		}

		$rows = QueryBuilder::ins()
			->from( 'zenc_groups' )
			->select( [ 'id', 'name', 'slug', 'privacy' ] )
			->where_in( 'id', $group_ids )
			->get();

		return array_map( static fn( $g ) => [
			'id'      => (int) $g['id'],
			'name'    => $g['name'],
			'slug'    => $g['slug'] ?? '',
			'privacy' => $g['privacy'] ?? 'public',
		], (array) $rows );
	}

	/**
	 * Published course categories (for the catalog filter).
	 */
	public static function categories() : array {
		$terms = get_terms( [
			'taxonomy'   => 'academy_courses_category',
			'hide_empty' => true,
		] );
		if ( is_wp_error( $terms ) ) {
			return [];
		}
		return array_map( static fn( $t ) => [
			'id'    => (int) $t->term_id,
			'name'  => $t->name,
			'slug'  => $t->slug,
			'count' => (int) $t->count,
		], $terms );
	}
}
