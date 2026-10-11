<?php

namespace ZenCommunity\Addons\AcademyLms\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use stdClass;
class QuizStartFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'academy_quizzes/api/after_quiz_attempt_start',
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
		$this->title     = sprintf(
			/* translators:  %s is the username1, %s is the username2 */
			__( '%1$s has started a quiz in @ %2$s ', 'zencommunity' ),
			wp_strip_all_tags( $user ? $user->display_name : '' ),
			wp_strip_all_tags( $course_title )
		);
		$this->message   = sprintf(
			/* translators:  %s is the username1, %s is the username2 */
			__( '📝 %1$s has begun a quiz in %2$s course. Best of luck! Every step forward brings you closer to your learning goals.', 'zencommunity' ),
			wp_strip_all_tags( $user ? $user->display_name : '' ),
			wp_strip_all_tags( $course_title )
		);
		$this->event     = 'quiz_start';
		$this->push();
	}
}
