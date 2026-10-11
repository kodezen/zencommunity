<?php
namespace ZenCommunity\Addons\AcademyLms\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CourseCompletedFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'academy/admin/course_complete_after',
			[ $this, 'notify' ],
			10, 2
		);

	}
	public function notify( int $course_id, int $user_id ) : void {
		if ( empty( $user_id ) ) {
			return;
		}
		$course_title = get_the_title( $course_id );
		$user = get_userdata( $user_id );
		$this->course_id = $course_id;
		$this->title     = sprintf(
			/* translators:  %s is the username, %s is the course name */
			__( '%1$s has just completed @ %2$s!', 'zencommunity' ),
			esc_html( $user ? $user->display_name : '' ),
			esc_html( $course_title )
		);
		// No certificate link here: the certificate endpoint mints a certificate
		// for whoever is logged in, so a shared feed link would let any member
		// generate one in their own name. The certificate is offered only on the
		// course detail page, gated to the user who actually completed the course.
		$this->message   = sprintf(
			/* translators:  %s is the username, %s is the course name */
			__( '🥳 Congratulations on completing %1$s, %2$s! Your dedication and hard work truly paid off. We’re proud of your achievement—well done! 🚀', 'zencommunity' ),
			esc_html( $course_title ),
			esc_html( $user ? $user->display_name : '' )
		);

		$this->event     = 'course_complete';
		$this->push();
	}
}
