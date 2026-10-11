<?php
namespace ZenCommunity\Addons\LearnPress\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class NewEnrollmentFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'learnpress/user/course-enrolled',
			[ $this, 'notify' ],
			10, 3
		);
	}
	public function notify( int $enroll_id, int $course_id, int $user_id ): void {

		if ( empty( $user_id ) ) {
			return;
		}

		$course_permalink = get_permalink( $course_id );
		$course_title = get_the_title( $course_id );
		$user = get_userdata( $user_id );

		$this->course_id = $course_id;

		$this->title     = sprintf(
			/* translators: %s is the username, %s is the course title */
			__( '%1$s has just enrolled in @ %2$s', 'zencommunity' ),
			esc_html( $user ? $user->display_name : '' ),
			esc_html( $course_title )
		);
		$this->message   = sprintf(
			/* translators: %s is the username, %s is the course title */
			__( 'Please join us in welcoming %1$s to %2$s 🎉! We’re excited to have you on board. Get ready to explore valuable lessons and start your learning journey with the community!', 'zencommunity' ),
			esc_html( $user ? $user->display_name : '' ),
			esc_html( $course_title )
		);
		$this->event     = 'course_enrollment';
		$this->push();
	}
}
