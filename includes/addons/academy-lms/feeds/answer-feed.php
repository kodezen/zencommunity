<?php

namespace ZenCommunity\Addons\AcademyLms\Feeds;

use ZenCommunity\Addons\AcademyLms\Classes\TrackCurriculumChanges;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
class AnswerFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'academy/frontend/insert_course_qa_answered',
			[ $this, 'notify' ],
			10, 1
		);
	}
	public function notify( array $answer ): void {

		if (
			empty( $answer ) ||
			empty( $answer['_post'] ?? '' ) ||
			empty( $answer['author'] ?? '' ) ||
			empty( $answer['content'] ?? '' ) ||
			empty( $answer['parent'] ?? '' ) ||
			empty( $answer['post'] ?? '' )
		) {
			return;
		}

		$question = $answer['parent'] ? get_comment( $answer['parent'] ) : null;

		$course_permalink = $answer['_post']['permalink'];
		$course_title     = $answer['_post']['title'];

		$this->course_id = $question ? $question->comment_post_ID : '';

		$this->title     = sprintf(
			/* translators: %s is the username, %s is the Cname, %s is the CNTNT */
			__( '%1$s replied to a question in @ %2$s', 'zencommunity' ),
			esc_html( $answer['author_name'] ),
			esc_html( $course_title )
		);

		$this->message = sprintf(
			/* translators: %s is the username, %s is the Cname, %s is the CNTNT */
			__( '💬 %1$s has contributed an answer in %2$s.Thank you for supporting fellow learners and helping the community grow together.', 'zencommunity' ) . '<blockquote>%3$s</blockquote>',
			esc_html( $answer['author_name'] ),
			esc_html( $course_title ),
			esc_html( $answer['content']['rendered'] )
		);

		$this->event     = 'question_answer';
		$this->push();
	}
}
