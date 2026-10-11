<?php

namespace ZenCommunity\Addons\LifterLms\Classes;
use Throwable;
use ZenCommunity\Database\Models\{ Feed, Group };
use ZenCommunity\Addons\LifterLms\Database\Models\Relation;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PushFeed {

	protected int $course_id;
	protected string $title;
	protected string $msg;
	protected string $event;

	protected array $global_events;
	protected array $groups;

	public function __construct( int $course_id, string $title, string $msg, string $event ) {
		$this->course_id = $course_id;
		$this->title = $title;
		$this->msg = $msg;
		$this->event = $event;
		$this->global_events = array_intersect( 
			get_option( 'zenc_lifterlms_events', Relation::$events ), 
			Relation::$events
		);

		$this->groups = Relation::group_by_course_id( $this->course_id );
	}

	public function post() : void {
		foreach( $this->groups as $group ) {
			$events = array_intersect( 
				json_decode( $group['events'] ?? '{}', true ), 
				Relation::$events
			);

			if( in_array( $this->event, $events ) ) {
				$user_id = is_user_logged_in() ? get_current_user_id() : get_post_field( 'post_author', $this->course_id );
				$group_id = absint( $group['group_id'] );

				try {
					Group::add_member( $user_id, $group_id );
				} catch ( Throwable $e ) {}
				
				try {
					Feed::create( $group_id, [
						'title'   => $this->title,
						'content' => "<h3 class=\"zencom-post-heading\">{$this->title}</h3>"  .   $this->msg,
						'status'  => 'published',
					], $user_id );
				} catch ( Throwable $e ) {}
				
			}
		}
	}
}
