<?php

namespace ZenCommunity\Addons\LifterLms;

use ZenCommunity\Addons\LifterLms\Feeds\{
	Abstracts\EventFeed,
	AnnouncementFeed,
	NewEnrollmentFeed,
	LessonCompleted,
	CourseCompletedFeed,
	QuestionFeed,
	AnswerFeed,
	// QuizStartFeed,
	QuizEndFeed
};

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}


class EventRegistration {
	public array $events = [
		NewEnrollmentFeed::class,
		LessonCompleted::class,
		CourseCompletedFeed::class,
		QuestionFeed::class,
		AnswerFeed::class,
		// QuizStartFeed::class,
		QuizEndFeed::class,
	];
	public static function init() : void {
		$instance = new self();
		$instance->register_events();
	}

	public function register_events() : void {
		foreach ( $this->events as $event ) {
			$event_ins = new $event();
			if ( $event_ins instanceof EventFeed ) {
				$event_ins->init();
			}
		}
	}
}
