<?php

namespace ZenCommunity\Addons\AcademyLms\Classes;
use Throwable;
use ZenCommunity\Database\Models\{ Feed, Group, Notification };
use ZenCommunity\Addons\AcademyLms\Database\Models\Relation;
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
			get_option( 'zenc_academy_events', Relation::$events ), 
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

				$mode = Policy::delivery_mode_for_event( $group_id, $this->event );

				$feed_id = null;
				if ( in_array( $mode, [ 'feed', 'feed_and_notification' ], true ) ) {
					try {
						$feed_id = Feed::create( $group_id, [
							'title'   => $this->title,
							'content' => "<h3 class=\"zencom-post-heading\">{$this->title}</h3>"  .   $this->msg,
							'status'  => 'published',
							'meta'    => [
								'course_id' => $this->course_id,
								'event'     => $this->event,
							],
						], $user_id );
					} catch ( Throwable $e ) {}
				}

				if ( in_array( $mode, [ 'notification', 'feed_and_notification' ], true ) ) {
					try {
						$this->notify_group( $group_id, $user_id, $feed_id );
					} catch ( Throwable $e ) {}
				}
			}
		}
	}

	/**
	 * Notify a group's admins/moderators of the event (excluding the actor).
	 */
	protected function notify_group( int $group_id, int $actor_id, ?int $feed_id ) : void {
		$recipients = Group::member_query( $group_id )
			->where_in( 'spm.role', [ 'admin', 'moderator' ] )
			->where( 'spm.status', '=', 'active' )
			->values( 'pf.user_id' );

		$recipients = array_values( array_diff( array_map( 'absint', $recipients ), [ $actor_id ] ) );
		if ( empty( $recipients ) ) {
			return;
		}

		Notification::send( [
			'type'         => $this->event,
			'from_user_id' => $actor_id ?: null,
			'to_user_ids'  => $recipients,
			'message'      => $this->title,
			'group_id'     => $group_id,
			'feed_id'      => $feed_id,
		] );
	}
}
