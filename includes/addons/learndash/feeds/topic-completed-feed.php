<?php
namespace ZenCommunity\Addons\Learndash\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TopicCompletedFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'learndash_topic_completed',
			[ $this, 'notify' ],
			10, 2
		);
	}

	public function notify( ?array $data ): void {
		$course_permalink = get_permalink( $data['course']->ID );
		$course_title = $data['course']->post_title;
		$lesson_title = $data['lesson']->post_title;
		$user = $data['user'];

		$this->course_id = $data['course']->ID;

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
