<?php
namespace ZenCommunity\Addons\Masterstudy\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class LessonCompleted extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'stm_lms_lesson_passed',
			[ $this, 'notify' ],
			10, 3
		);
	}
	public function notify( int $user_id, int $lesson_id, int $course_id ): void {

		if ( empty( $user_id ) ) {
			return;
		}

		$course_permalink = get_permalink( $course_id );
		$course_title = get_the_title( $course_id );
		$lesson_title = get_the_title( $lesson_id );
		$user = get_userdata( $user_id );

		$this->course_id = $course_id;
 		
 		$this->title     = sprintf(
			/* translators: %s is ua, %s is the course title */
			__( '%1$s  has completed a lesson in @ %2$s', 'zencommunity' ),
			esc_html( $user ? $user->display_name : '' ),
			esc_html( $lesson_title )
		);
		$this->message   = sprintf(
			/* translators: %s is ua, %s is the course title */
			__( '🎯 Nice progress,  %1$s ! You’ve just completed a lesson in %2$s . Keep going—consistent learning leads to great results.', 'zencommunity' ),
			esc_html( $user ? $user->display_name : '' ),
			esc_html( $lesson_title )
		);
		$this->event     = 'lesson_completion';
		$this->push();
	}
}
