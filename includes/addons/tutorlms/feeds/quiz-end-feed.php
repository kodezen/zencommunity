<?php

namespace ZenCommunity\Addons\Tutorlms\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_User;
class QuizEndFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'tutor_quiz/attempt_ended',
			[ $this, 'notify' ],
			999, 3
		);
	}
	
	public function notify( int $attempt_id, int $course_id, int $user_id  ): void {
		$this->course_id = $course_id;
		$course_permalink = get_permalink( $this->course_id );
		$course_title = get_the_title( $this->course_id );
		// $quiz_title = get_the_title( $quiz_id );
		$user = get_user( $user_id  );
		

		$this->title     =  sprintf(
			/* translators: %s is the username, %s is the course_title */
			'<p>' . __( ' %1$s has completed a quiz in @ %2$s', 'zencommunity' ) . '</p>',
			wp_strip_all_tags( $user ? $user->display_name : '' ),
			wp_strip_all_tags( $course_title )
		);
		$this->message   = sprintf(
			/* translators: %s is the username, %s is the course_title */
			'<p>' . __( '✅ Great work, %1$s!You’ve successfully completed a quiz in %2$s. Keep up the momentum and continue pushing forward.', 'zencommunity' ) . '</p>',
			wp_strip_all_tags( $user ? $user->display_name : '' ),
			wp_strip_all_tags( $course_title )
		);
		$this->event     = 'quiz_end';
		$this->push();
	}
}
