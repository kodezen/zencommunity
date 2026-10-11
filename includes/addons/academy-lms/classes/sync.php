<?php
namespace ZenCommunity\Addons\AcademyLms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Database\Models\Group;
use ZenCommunity\Exceptions\ZencommunityException;

/**
 * Keeps Academy enrollment and ZenCommunity group membership in sync so that
 * "buy a course" feels like "join the community".
 *
 * - On enrollment (free or paid → StoreEngine already enrolls on payment), the
 *   student is auto-joined as an active member of every group the course is
 *   linked to.
 * - On enrollment downgrade (refund sets the enrollment to on-hold/cancelled),
 *   we remove the student only from groups they were auto-joined into. Groups
 *   they joined manually are never touched — provenance is tracked per user.
 */
class Sync {

	/** user_meta: [ group_id => [ course_id, ... ] ] of memberships we created. */
	const AUTOJOIN_META = 'zenc_alms_autojoined_groups';

	const DOWNGRADE_STATUSES = [ 'on-hold', 'cancel', 'cancelled', 'pending', 'trash', 'draft' ];

	public static function init() : void {
		add_action( 'academy/course/after_enroll', [ self::class, 'on_enroll' ], 10, 3 );
		add_action( 'transition_post_status', [ self::class, 'on_enrollment_status' ], 10, 3 );
	}

	/**
	 * @param int $course_id
	 * @param int $enroll_id
	 * @param int $user_id
	 */
	public static function on_enroll( $course_id, $enroll_id, $user_id ) : void {
		$course_id = absint( $course_id );
		$user_id   = absint( $user_id );
		if ( ! $course_id || ! $user_id ) {
			return;
		}

		$markers = self::get_markers( $user_id );

		foreach ( CourseService::group_ids_for_course( $course_id ) as $group_id ) {
			try {
				// Respect the group's policy — auto-join can be turned off.
				if ( ! Policy::for_group( $group_id, 'auto_join_on_enroll' ) ) {
					continue;
				}

				if ( Group::is_member_of( $user_id, $group_id, [], null ) ) {
					// Already a member (auto or manual) — leave membership as-is,
					// only record provenance if we previously created it.
					continue;
				}

				$role = Policy::for_group( $group_id, 'auto_join_role' );
				$role = in_array( $role, [ 'member', 'moderator' ], true ) ? $role : 'member';

				$data = [
					'group_id'  => $group_id,
					'user_id'   => $user_id,
					'role'      => $role,
					'status'    => 'active',
					'joined_at' => current_time( 'mysql', true ),
				];

				// Direct insert: a purchase/enrollment grants immediate access,
				// bypassing join-request and approval gates that Group::add_member
				// enforces for self-service joins.
				\ZenCommunity\Database\Utils\QueryBuilder::ins()->create( 'zenc_group_members', $data );
				Group::cache_member_count( $group_id );
				do_action( 'zencommunity/group/user_added', $group_id, $data );

				$markers[ $group_id ]   = $markers[ $group_id ] ?? [];
				$markers[ $group_id ][] = $course_id;
				$markers[ $group_id ]   = array_values( array_unique( $markers[ $group_id ] ) );
			} catch ( ZencommunityException $e ) {
				continue;
			}
		}

		self::save_markers( $user_id, $markers );
	}

	/**
	 * @param string   $new_status
	 * @param string   $old_status
	 * @param \WP_Post $post
	 */
	public static function on_enrollment_status( $new_status, $old_status, $post ) : void {
		if ( ! $post instanceof \WP_Post || 'academy_enrolled' !== $post->post_type ) {
			return;
		}
		if ( 'completed' !== $old_status || ! in_array( $new_status, self::DOWNGRADE_STATUSES, true ) ) {
			return;
		}

		$course_id = absint( $post->post_parent );
		$user_id   = absint( $post->post_author );
		if ( ! $course_id || ! $user_id ) {
			return;
		}

		$markers = self::get_markers( $user_id );

		foreach ( CourseService::group_ids_for_course( $course_id ) as $group_id ) {
			if ( empty( $markers[ $group_id ] ) || ! in_array( $course_id, $markers[ $group_id ], true ) ) {
				continue; // Not auto-joined via this course — never touch.
			}

			// Respect the group's policy — revoke-on-leave can be turned off.
			if ( ! Policy::for_group( $group_id, 'revoke_on_leave' ) ) {
				continue;
			}

			$markers[ $group_id ] = array_values( array_diff( $markers[ $group_id ], [ $course_id ] ) );

			// Only drop membership once no auto-join course keeps it alive.
			if ( empty( $markers[ $group_id ] ) ) {
				try {
					Group::remove_member( $user_id, $group_id );
				} catch ( ZencommunityException $e ) {
					// Already gone — fine.
				}
				unset( $markers[ $group_id ] );
			}
		}

		self::save_markers( $user_id, $markers );
	}

	protected static function get_markers( int $user_id ) : array {
		$markers = get_user_meta( $user_id, self::AUTOJOIN_META, true );
		return is_array( $markers ) ? $markers : [];
	}

	protected static function save_markers( int $user_id, array $markers ) : void {
		if ( empty( $markers ) ) {
			delete_user_meta( $user_id, self::AUTOJOIN_META );
			return;
		}
		update_user_meta( $user_id, self::AUTOJOIN_META, $markers );
	}
}
