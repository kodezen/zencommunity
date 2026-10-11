<?php
namespace ZenCommunity\Addons\Learndash\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CourseCompletedFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'learndash_course_completed',
			[ $this, 'notify' ],
			10, 2
		);
	}

	public function notify( ?array $data ) : void {
		$course_permalink = get_permalink( $data['course']->ID );
		$course_title = $data['course']->post_title;
		$user = $data['user'];
		$this->course_id = $data['course']->ID;
		$this->title     = sprintf(
			/* translators:  %s is the username, %s is the course name */
			__( '%1$s has just completed @ %2$s!', 'zencommunity' ),
			esc_html( $user ? $user->display_name : '' ),
			esc_html( $course_title )
		);
		$this->message   = sprintf(
			/* translators:  %s is the username, %s is the course name */
			__( '🎉 Congratulations on completing %1$s, %2$s! Your dedication and hard work truly paid off. We’re proud of your achievement—well done! 🚀', 'zencommunity' ),
			esc_html( $course_title ),
			esc_html( $user ? $user->display_name : '' )
		);
		$this->event     = 'course_complete';
		$this->push();
	}
}
