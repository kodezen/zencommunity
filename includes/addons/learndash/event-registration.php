<?php

namespace ZenCommunity\Addons\Learndash;

use ZenCommunity\Addons\Learndash\Feeds\{
	Abstracts\EventFeed,
	NewEnrollmentFeed,
	NewGroupEnrollmentFeed,
	CourseCompletedFeed,
	TopicCompletedFeed,
	QuizEndFeed
};

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}


class EventRegistration {
	public array $events = [
		NewEnrollmentFeed::class,
		NewGroupEnrollmentFeed::class,
		CourseCompletedFeed::class,
		TopicCompletedFeed::class,
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
