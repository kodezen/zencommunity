<?php

namespace ZenCommunity\Addons\LearnPress\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use stdClass;
class QuizStartFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'learn-press/user/quiz-started',
			[ $this, 'notify' ],
			999, 3
		);
	}
	public function notify(  int $quiz_id, int $course_id  ): void {
		if ( empty( $user_id = get_current_user_id() ) ) {
			return;
		}
		$course_permalink = get_permalink( $course_id );
		$course_title = get_the_title( $course_id );
		$user = get_userdata( $user_id );
		$this->course_id = $course_id;
		
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
