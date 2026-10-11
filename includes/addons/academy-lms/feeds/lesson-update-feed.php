<?php
namespace ZenCommunity\Addons\AcademyLms\Feeds;

use ZenCommunity\Addons\AcademyLms\Classes\TrackCurriculumChanges;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
class LessonUpdateFeed extends Abstracts\EventFeed {
	public function init(): void {
		add_action(
			'rest_insert_academy_courses',
			[ $this, 'notify' ],
			400000, 3
		);
	}
	public function notify( $post, $request, $creating ) : void {
		$course_id_array = $request->get_params();
		$old_data = get_post_meta( $post->ID, 'academy_course_curriculum', true );
		$course_curriculum = isset( $course_id_array['meta']['academy_course_curriculum'] ) ? $course_id_array['meta']['academy_course_curriculum'] : [];
		if ( ! is_array( $old_data ) || ! is_array( $course_curriculum ) ) {
			return;
		}
		$changes = ( new TrackCurriculumChanges( $old_data, $course_curriculum ) )->get_changes();
		if ( empty( $post->ID ) || empty( $changes ) ) {
			return;
		}

		$this->course_id = $post->ID;
		$course_title = $post->post_title;

		$content = '';
		$titleContent = '';
		if ( array_key_exists( 'new', $changes ) ) {
			$titleContent .= sprintf(
				/* translators: %s is the course title */
				__( 'A lesson has been added in @ %s', 'zencommunity' ),
				esc_html( $course_title )
			);
			$content .= '<h4>' . __( '🆕 Following Lessions is  added at ', 'zencommunity' ) . '</h4>';
			$content .= '<ul>';
			foreach ( $changes['new'] as $lession ) {
				$content .= sprintf(
					'<li><strong><mark>%s: %s</mark></strong> <i>' . __( 'from', 'zencommunity' ) . ' %s</i></li>',
					strtoupper( wp_strip_all_tags( $lession['type'] ) ),
					strtoupper( wp_strip_all_tags( $lession['name'] ) ),
					strtoupper( wp_strip_all_tags( $changes['curriculums'][ $lession['slug'] ] ?? $lession['slug'] ) ),
				);
			}
			$content .= '</ul>';
		}

		if ( array_key_exists( 'updated', $changes ) ) {
			$titleContent .= sprintf(
				/* translators: %s is the course title */
				__( 'A lesson has been updated in @ %s', 'zencommunity' ),
				esc_html( $course_title )
			);
			$content .= '<h4>' . __( '📝 Following Lessions is updated at ', 'zencommunity' ) . '</h4>';
			$content .= '<ul>';
			foreach ( $changes['updated'] as $lession ) {
				$content .= sprintf(
					'<li><strong><mark>%s: %s</mark></strong> <i>' . __( 'from', 'zencommunity' ) . ' %s</i></li>',
					strtoupper( wp_strip_all_tags( $lession['type'] ) ),
					strtoupper( wp_strip_all_tags( $lession['name'] ) ),
					strtoupper( wp_strip_all_tags( $changes['curriculums'][ $lession['slug'] ] ?? $lession['slug'] ) ),
				);
			}
			$content .= '</ul>';
		}

		$this->title     = esc_html( $titleContent );
		$this->message   = wp_kses_post( $content );
		$this->event     = 'lesson_update';
		$this->push();

	}
}
