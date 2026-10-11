<?php
namespace ZenCommunity\Addons\AcademyLms\Feeds;

use ZenCommunity\Addons\AcademyLms\Classes\TrackCurriculumChanges;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
class QuestionFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'academy/frontend/insert_course_qa',
			[ $this, 'notify' ],
			10, 1
		);
	}
	public function notify( array $question ): void {

		if (
			empty( $question ) ||
			empty( $question['_post'] ?? '' ) ||
			empty( $question['author'] ?? '' ) ||
			empty( $question['content'] ?? '' ) ||
			empty( $question['post'] ?? '' )
		) {
			return;
		}

		$course_permalink = $question['_post']['permalink'];
		$course_title = $question['_post']['title'];

		$this->course_id = $question['post'] ?? 0;

		$this->title     = sprintf(
			/* translators:  %s is the name, %s is the cname, %s is the q */
			__( ' %1$s asked a question in %2$s', 'zencommunity' ),
			esc_html( $question['author_name'] ),
			esc_html( $course_title )
		);
		$this->message   = sprintf(
			/* translators:  %s is the name, %s is the cname, %s is the q */
			__( '💬 %1$s just posted a new question in %2$s! Join the discussion, share your insights, or help out with an answer. ✨', 'zencommunity' ) . '<blockquote>%3$s</blockquote>',
			esc_html( $question['author_name'] ),
			esc_html( $course_title ),
			esc_html( $question['content']['rendered'] )
		);
		$this->event     = 'user_question';
		$this->push();

	}
}
