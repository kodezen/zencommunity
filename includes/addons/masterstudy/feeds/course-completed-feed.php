<?php
namespace ZenCommunity\Addons\Masterstudy\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CourseCompletedFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'stm_lms_progress_updated',
			[ $this, 'notify' ],
			10, 3
		);

	}
	public function notify( int $course_id, int $user_id, ?float $progress ) : void {
		if ( empty( $user_id ) || 100 > absint( $progress ) ) {
			return;
		}
		$course_permalink = get_permalink( $course_id );
		$course_title = get_the_title( $course_id );
		$user = get_userdata( $user_id );
		$this->course_id = $course_id;
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
