<?php

namespace ZenCommunity\Addons\Tutorlms\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use stdClass;
class QuizStartFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'tutor_quiz/start/before',
			[ $this, 'notify' ],
			999, 32
		);
	}
	public function notify( int $quiz_id, int $user_id  ): void {
		$topic_id = wp_get_post_parent_id( $quiz_id );
		$this->course_id = wp_get_post_parent_id( $topic_id );
		$course_permalink = get_permalink( $this->course_id );
		$course_title = get_the_title( $this->course_id );
		// $quiz_title = get_the_title( $quiz_id );
		$user = get_user( $user_id  );
		
		
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
