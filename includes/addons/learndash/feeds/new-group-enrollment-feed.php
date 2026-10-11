<?php
namespace ZenCommunity\Addons\Learndash\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class NewGroupEnrollmentFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'ld_added_group_access',
			[ $this, 'notify' ],
			10, 2
		);
	}
	
	public function notify( int $user_id, int $course_id  ): void {
		$course_permalink = get_permalink( $course_id );
		$course_title = get_the_title( $course_id );
		$user = get_userdata( $user_id );

		$this->course_id = $course_id;

		// $this->title     = sprintf(
		// 	/* translators:  %s is the username, %s is the groupname */
		// 	__( '%1$s is just enrolled @ %2$s group!', 'zencommunity' ),
		// 	esc_html( $user ? $user->display_name : '' ),
		// 	esc_html( $course_title )
		// );
		$this->title     = '';
		$this->message   = sprintf(
			/* translators: %s is the username */
			__( 'Please join us in welcoming %s, who has just enrolled in the', 'zencommunity' ) . ' <a href="%s">%s</a>! ' . __( '🎉 We\'re excited to have you on board. Get ready to dive into some amazing content and start your learning journey. Let\'s make this an awesome experience together!', 'zencommunity' ),
			esc_html( $user ? $user->display_name : '' ),
			esc_url( $course_permalink ),
			esc_html( $course_title )
		);
		$this->event     = 'group_course_enrollment';
		$this->push();
	}
}
