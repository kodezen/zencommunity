<?php

namespace ZenCommunity\Addons\Learndash\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_User;
class QuizEndFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'learndash_quiz_completed',
			[ $this, 'notify' ],
			999, 3
		);
	}
	
	public function notify( ?array $quiz, ?WP_User $user ): void {
		$course_permalink = get_permalink( $quiz['course']->ID );
		$course_title = $quiz['course']->post_title;
		
		$this->course_id = $quiz['course']->ID;
		
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
