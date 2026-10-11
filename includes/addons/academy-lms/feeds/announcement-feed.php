<?php
namespace ZenCommunity\Addons\AcademyLms\Feeds;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AnnouncementFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'rest_insert_academy_announcement',
			[ $this, 'notify' ],
			999, 3
		);
	}
	public function notify( $post, $request, $creating ) : void {
		$course_id_array = $request->get_params();

		if ( $creating ) {
			$course_id_array = $course_id_array['meta']['academy_announcements_course_ids'] ?? [];

			foreach ( $course_id_array as $course ) {
				$this->course_announcements(
					$course['value'],
					apply_filters( 'the_content', $post->post_content )
				);
			}
		}
	}
	public function course_announcements( int $course_id, ?string $text ): void {

		$course_permalink = get_permalink( $course_id );
		$course_title     = get_the_title( $course_id );

		$ins = new self();
		$ins->course_id = $course_id;
		$ins->title     = sprintf(
			/* translators:  %s is the name*/
			__( 'New announcement posted in %s.', 'zencommunity' ),
			esc_html( $course_title )
		);
		$ins->message   = sprintf(
			/* translators:  %s is the name*/
			__( '📢 An important update has been shared in %1$s. Please take a moment to review the announcement and stay up to date with the latest course information.', 'zencommunity' ) . 
			'<p>%2$s</p>',
			esc_html( $course_title ),
			wp_strip_all_tags( $text )
		);
		$ins->event     = 'course_announcements';
		$ins->call_parent_push();
	}
	public function call_parent_push(): void {
		parent::push();
	}
}
