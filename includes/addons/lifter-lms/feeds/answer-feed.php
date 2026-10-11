<?php

namespace ZenCommunity\Addons\LifterLms\Feeds;

use ZenCommunity\Addons\LifterLms\Classes\TrackCurriculumChanges;
use ZenCommunity\Addons\LifterLms\Utils;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
class AnswerFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'wp_insert_comment',
			[ $this, 'notify' ],
			10, 2
		);
	}
	public function notify( int $comment_id ): void {

        $ans = get_comment( $comment_id );
		if ( empty( $ans->comment_parent ) )
			return;

        $post_id = Utils::lesson_to_course( $ans->comment_post_ID );
        $post_type = get_post_type( $post_id );

        if ( 'course' !== $post_type )
			return;
			
		$course_permalink = get_permalink( $post_id );
		$course_title =  get_the_title( $post_id );
		$user = get_userdata( get_current_user_id() );

		$this->course_id = $post_id;


		$question = get_comment( $ans->comment_parent );

		
		$this->title     = sprintf(
			/* translators: %s is the username, %s is the Cname, %s is the CNTNT */
			__( '%1$s replied to a question in @ %2$s', 'zencommunity' ),
			esc_html( $ans->comment_author ),
			esc_html( $course_title )
		);

		$this->message = sprintf(
			/* translators: %s is the username, %s is the Cname, %s is the CNTNT */
			__( '💬 %1$s has contributed an answer in %2$s.Thank you for supporting fellow learners and helping the community grow together.', 'zencommunity' ) . '<blockquote>%3$s</blockquote>',
			esc_html( $ans->comment_author ),
			esc_html( $course_title ),
			esc_html( $ans->comment_content )
		);

		$this->event     = 'question_answer';
		$this->push();
	}
}
