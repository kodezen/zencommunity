<?php
namespace ZenCommunity\Addons\LifterLms\Feeds;

use ZenCommunity\Addons\LifterLms\Classes\TrackCurriculumChanges;
use ZenCommunity\Addons\LifterLms\Utils;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
class QuestionFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'wp_insert_comment',
			[ $this, 'notify' ],
			10, 2
		);
	}
	public function notify( int $comment_id ): void {

        $comment = get_comment( $comment_id );
		if ( ! empty( $comment->comment_parent ) )
			return;
        $post_id = Utils::lesson_to_course( $comment->comment_post_ID );
        $post_type = get_post_type( $post_id );

        if ( 'course' !== $post_type )
			return;
			
		$course_permalink = get_permalink( $post_id );
		$course_title =  get_the_title( $post_id );
		$user = get_userdata( get_current_user_id() );

		$this->course_id = $post_id;

		$this->title     = sprintf(
			/* translators:  %s is the name, %s is the cname, %s is the q */
			__( ' %1$s asked a question in %2$s', 'zencommunity' ),
			wp_strip_all_tags( $user ? $user->display_name : '' ),
			esc_html( $course_title )
		);
		$this->message   = sprintf(
			/* translators:  %s is the name, %s is the cname, %s is the q */
			__( '❓ %1$s has posted a new question in %2$s.Jump into the discussion, share your thoughts, or help by providing an answer.', 'zencommunity' ) . '<blockquote>%3$s</blockquote>',
			wp_strip_all_tags( $user ? $user->display_name : '' ),
			esc_html( $course_title ),
			esc_html( $comment->comment_content )
		);
		$this->event     = 'user_question';
		$this->push();

	}
}
