<?php
namespace ZenCommunity\Addons\Masterstudy\Feeds\Abstracts;

use ZenCommunity\Addons\Masterstudy\Feeds\Interfaces\{ Pushable, Initializable };
use ZenCommunity\Addons\Masterstudy\Classes\PushFeed;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class EventFeed implements Pushable, Initializable {

	public int $course_id;
	public string $title;
	public string $message;
	public string $event;

	public function push(): void {
		( new PushFeed(
			$this->course_id,
			$this->title,
			$this->message,
			$this->event
		) )->post();
	}

}
