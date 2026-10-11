<?php

namespace ZenCommunity\Addons\AcademyLms\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use stdClass;
class QuizEndFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'academy_quizzes/api/after_quiz_attempt_finished',
			[ $this, 'notify' ],
			999, 3
		);
	}
	public function notify( stdClass $quiz ): void {
		if (
			empty( $quiz->course_id ) ||
			empty( $quiz->user_id )
		) {
			return;
		}

		$course_permalink = get_permalink( $quiz->course_id );
		$course_title = get_the_title( $quiz->course_id );
		$user = get_userdata( $quiz->user_id );
		$this->course_id = $quiz->course_id;
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
