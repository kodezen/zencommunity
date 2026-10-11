<?php

namespace ZenCommunity\Addons\LifterLms\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use stdClass;
use ZenCommunity\Addons\LifterLms\Utils;
class QuizEndFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'lifterlms_quiz_completed',
			[ $this, 'notify' ],
			999, 3
		);
	}
	public function notify(  int $user_id, int $quiz_id  ): void {
		if ( empty( $user_id ) ) {
			return;
		}
		$lesson_id = get_post_meta( $quiz_id, '_llms_lesson_id', true );
		if ( empty( $lesson_id ) ) {
			return;
		}

		$this->course_id = Utils::lesson_to_course( $lesson_id );
		if ( empty( $this->course_id ) ) {
			return;
		}

		$course_permalink = get_permalink( $this->course_id );
		$course_title = get_the_title( $this->course_id );
		$user = get_userdata( $user_id );

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
