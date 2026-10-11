<?php
namespace ZenCommunity\Addons\AcademyLms\Api;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
use ZenCommunity\Addons\AcademyLms\Classes\CourseService;
use ZenCommunity\Addons\AcademyLms\Classes\Policy;
use ZenCommunity\Addons\AcademyLms\Classes\QaService;
use ZenCommunity\Addons\AcademyLms\Classes\ReviewService;

/**
 * Course discovery + purchase BFF for the ZenCommunity SPA.
 *
 * Routes (all under zencommunity/v1):
 *   GET  /academy/courses                       catalog
 *   GET  /academy/course-categories             catalog filter terms
 *   GET  /academy/course/{id}                   single course detail
 *   POST /academy/course/{id}/enroll            free / public enroll
 *   GET  /academy/group/{group_id}/courses      courses linked to a group
 *   GET  /academy/member/{user_id}/courses      courses a member is enrolled in
 *   GET  /academy/course/{id}/qa                course-scoped Q&A feed
 *   GET  /academy/course/{id}/reviews            paginated course reviews
 *   POST /academy/course/{id}/reviews            submit/update own review
 */
class CourseController extends Common\Base {

	public function init() : void {
		register_rest_route( $this->namespace, '/academy/courses', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'index' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
				'args'                => $this->index_schema(),
			],
		] );

		register_rest_route( $this->namespace, '/academy/course-categories', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'categories' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/academy/course/(?P<id>\d+)', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'show' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/academy/course/(?P<id>\d+)/enroll', [
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'enroll' ],
				'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/academy/settings', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'get_settings' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'save_settings' ],
				'permission_callback' => [ Permissions::class, 'admin_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/academy/group/(?P<group_id>\d+)/courses', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'group_courses' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
				'args'                => $this->index_schema(),
			],
		] );

		register_rest_route( $this->namespace, '/academy/member/(?P<user_id>\d+)/courses', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'member_courses' ],
				'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
				'args'                => $this->index_schema(),
			],
		] );

		register_rest_route( $this->namespace, '/academy/course/(?P<id>\d+)/qa', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'qa' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
				'args'                => $this->index_schema(),
			],
		] );

		register_rest_route( $this->namespace, '/academy/course/(?P<id>\d+)/reviews', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'reviews' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
				'args'                => $this->pagination_schema(),
			],
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'submit_review' ],
				'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
				'args'                => [
					'rating' => [
						'type'              => 'integer',
						'required'          => true,
						'sanitize_callback' => 'absint',
					],
					'review' => [
						'type'              => 'string',
						'required'          => false,
						'default'           => '',
						'sanitize_callback' => 'wp_kses_post',
					],
				],
			],
		] );
	}

	protected function pagination_schema() : array {
		return [
			'page'     => [ 'type' => 'integer', 'default' => 1,  'sanitize_callback' => 'absint' ],
			'per_page' => [ 'type' => 'integer', 'default' => 10, 'sanitize_callback' => 'absint' ],
		];
	}

	protected function index_schema() : array {
		return [
			'search'   => [ 'type' => 'string',  'default' => '', 'sanitize_callback' => 'sanitize_text_field' ],
			'category' => [ 'type' => 'integer', 'default' => 0, 'sanitize_callback' => 'absint' ],
			'per_page' => [ 'type' => 'integer', 'default' => 12, 'sanitize_callback' => 'absint' ],
			'page'     => [ 'type' => 'integer', 'default' => 1, 'sanitize_callback' => 'absint' ],
		];
	}

	public function index( WP_REST_Request $request ) : WP_REST_Response {
		$result = CourseService::get_courses( [
			'search'   => $request->get_param( 'search' ),
			'category' => $request->get_param( 'category' ),
			'per_page' => $request->get_param( 'per_page' ) ?: 12,
			'page'     => $request->get_param( 'page' ) ?: 1,
		] );

		return new WP_REST_Response( $result );
	}

	public function categories() : WP_REST_Response {
		return new WP_REST_Response( CourseService::categories() );
	}

	public function show( WP_REST_Request $request ) : WP_REST_Response {
		$course = CourseService::single( absint( $request['id'] ) );

		if ( null === $course ) {
			return new WP_REST_Response(
				[ 'code' => 'course_not_found', 'message' => __( 'Course not found.', 'zencommunity' ) ],
				404
			);
		}

		return new WP_REST_Response( $course );
	}

	public function enroll( WP_REST_Request $request ) : WP_REST_Response {
		$course_id = absint( $request['id'] );
		$result    = CourseService::enroll( $course_id, get_current_user_id() );

		if ( is_wp_error( $result ) ) {
			$status = (int) ( $result->get_error_data()['status'] ?? 400 );
			return new WP_REST_Response(
				[ 'code' => $result->get_error_code(), 'message' => $result->get_error_message() ],
				$status
			);
		}

		return new WP_REST_Response( [
			'success'   => true,
			'enroll_id' => (int) $result,
			'course'    => CourseService::single( $course_id ),
		] );
	}

	public function get_settings() : WP_REST_Response {
		return new WP_REST_Response( Policy::global() );
	}

	public function save_settings( WP_REST_Request $request ) : WP_REST_Response {
		$params = $request->get_params();
		$saved  = Policy::update_global( is_array( $params ) ? $params : [] );
		return new WP_REST_Response( $saved );
	}

	public function group_courses( WP_REST_Request $request ) : WP_REST_Response {
		$group_id   = absint( $request['group_id'] );
		$course_ids = CourseService::course_ids_for_group( $group_id );

		$result = CourseService::get_courses( [
			'include'  => $course_ids,
			'per_page' => $request->get_param( 'per_page' ) ?: 50,
			'page'     => $request->get_param( 'page' ) ?: 1,
		] );

		return new WP_REST_Response( $result );
	}

	public function member_courses( WP_REST_Request $request ) : WP_REST_Response {
		$user_id    = absint( $request['user_id'] );
		$course_ids = CourseService::course_ids_for_user( $user_id );

		$result = CourseService::get_courses( [
			'include'  => $course_ids,
			'per_page' => $request->get_param( 'per_page' ) ?: 50,
			'page'     => $request->get_param( 'page' ) ?: 1,
		] );

		return new WP_REST_Response( $result );
	}

	public function qa( WP_REST_Request $request ) : WP_REST_Response {
		$course_id = absint( $request['id'] );

		return new WP_REST_Response( QaService::for_course(
			$course_id,
			$request->get_param( 'page' ) ?: 1,
			$request->get_param( 'per_page' ) ?: 15
		) );
	}

	public function reviews( WP_REST_Request $request ) : WP_REST_Response {
		$course_id = absint( $request['id'] );

		return new WP_REST_Response( ReviewService::for_course(
			$course_id,
			$request->get_param( 'page' ) ?: 1,
			$request->get_param( 'per_page' ) ?: 10,
			get_current_user_id()
		) );
	}

	public function submit_review( WP_REST_Request $request ) : WP_REST_Response {
		$course_id = absint( $request['id'] );
		$result    = ReviewService::submit(
			$course_id,
			get_current_user_id(),
			absint( $request->get_param( 'rating' ) ),
			(string) $request->get_param( 'review' )
		);

		if ( is_wp_error( $result ) ) {
			$status = (int) ( $result->get_error_data()['status'] ?? 400 );
			return new WP_REST_Response(
				[ 'code' => $result->get_error_code(), 'message' => $result->get_error_message() ],
				$status
			);
		}

		return new WP_REST_Response( [
			'success' => true,
			'reviews' => ReviewService::for_course( $course_id, 1, 10, get_current_user_id() ),
		] );
	}
}
