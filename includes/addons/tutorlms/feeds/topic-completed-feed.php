<?php
namespace ZenCommunity\Addons\Tutorlms\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TopicCompletedFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'tutor_lesson_completed_after',
			[ $this, 'notify' ],
			10, 2
		);
	}

	public function notify( int $lesson_id, int $user_id  ): void {
		$topic_id = wp_get_post_parent_id( $lesson_id );
		$this->course_id = wp_get_post_parent_id( $topic_id );
		$course_permalink = get_permalink( $this->course_id );
		$course_title = get_the_title( $this->course_id );
		$lesson_title = get_the_title( $lesson_id );
		$user = get_user( $user_id  );
 		
 		$this->title     = sprintf(
			/* translators: %s is ua, %s is the course title */
			__( '%1$s  has completed a topic in @ %2$s', 'zencommunity' ),
			esc_html( $user ? $user->display_name : '' ),
			esc_html( $lesson_title )
		);
		$this->message   = sprintf(
			/* translators: %s is ua, %s is the course title */
			__( '🎯 Nice progress,  %1$s ! You’ve just completed a topic in %2$s . Keep going—consistent learning leads to great results.', 'zencommunity' ),
			esc_html( $user ? $user->display_name : '' ),
			esc_html( $lesson_title )
		);
		$this->event     = 'topic_completed';
		$this->push();
	}
}
