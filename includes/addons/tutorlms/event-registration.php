<?php

namespace ZenCommunity\Addons\Tutorlms;

use ZenCommunity\Addons\Tutorlms\Feeds\{
	Abstracts\EventFeed,
	NewEnrollmentFeed,
	CourseCompletedFeed,
	TopicCompletedFeed,
	QuizStartFeed,
	QuizEndFeed
};

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}


class EventRegistration {
	public array $events = [
		NewEnrollmentFeed::class,
		CourseCompletedFeed::class,
		TopicCompletedFeed::class,
		QuizStartFeed::class,
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
