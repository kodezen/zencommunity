<?php
namespace ZenCommunity\Addons\AcademyLms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Virtual course access for community members.
 *
 * When a group's policy grants course access, its active members are treated as
 * enrolled in the group's courses — without an enrollment record. Access is
 * computed on the fly from membership, so a paid course is effectively free for
 * members and access disappears the instant they leave the group.
 *
 * We hook Academy's own gating filter, so every place Academy checks enrollment
 * (single course page, curriculum player, REST) respects it for free.
 */
class Gating {

	const ENROLLED_POST_TYPE = 'academy_enrolled';

	public static function init() : void {
		add_filter( 'academy/course/is_enrolled', [ self::class, 'grant_membership_access' ], 20, 3 );

		// An admin explicitly removing a student's enrollment (Academy's own
		// Students table, any code path) deletes the `academy_enrolled` post —
		// respect that even if community membership would otherwise grant the
		// course for free, until a real enrollment is granted again.
		add_action( 'deleted_post', [ self::class, 'on_enrollment_post_deleted' ], 10, 2 );
		add_action( 'academy/course/after_enroll', [ self::class, 'on_enrollment_granted' ], 10, 3 );
	}

	/**
	 * @param mixed $enrolled  Existing enrollment row/object or falsey.
	 * @param int   $course_id
	 * @param int   $user_id
	 * @return mixed
	 */
	public static function grant_membership_access( $enrolled, $course_id, $user_id ) {
		if ( ! empty( $enrolled ) ) {
			return $enrolled; // real enrollment already wins
		}

		if ( Policy::is_access_revoked( (int) $course_id, (int) $user_id ) ) {
			return $enrolled; // explicitly removed by an admin — don't re-grant via membership
		}

		if ( ! Policy::membership_grants_access( (int) $course_id, (int) $user_id ) ) {
			return $enrolled;
		}

		// Synthetic "completed" enrollment so Academy unlocks the course/curriculum.
		return (object) [
			'ID'              => 0,
			'post_author'     => (int) $user_id,
			'post_date'       => current_time( 'mysql' ),
			'post_date_gmt'   => current_time( 'mysql', 1 ),
			'post_title'      => __( 'Community membership access', 'zencommunity' ),
			'enrolled_status' => 'completed',
			'zenc_virtual'    => true,
		];
	}

	/**
	 * @param int      $post_id
	 * @param \WP_Post $post
	 */
	public static function on_enrollment_post_deleted( $post_id, $post ) : void {
		if ( ! $post || self::ENROLLED_POST_TYPE !== $post->post_type ) {
			return;
		}
		$course_id = (int) $post->post_parent;
		$user_id   = (int) $post->post_author;
		if ( $course_id && $user_id ) {
			Policy::revoke_access( $course_id, $user_id );
		}
	}

	/**
	 * @param int $course_id
	 * @param int $enroll_id
	 * @param int $user_id
	 */
	public static function on_enrollment_granted( $course_id, $enroll_id, $user_id ) : void {
		if ( $course_id && $user_id ) {
			Policy::restore_access( (int) $course_id, (int) $user_id );
		}
	}
}
