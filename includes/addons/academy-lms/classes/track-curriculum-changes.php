<?php

namespace ZenCommunity\Addons\AcademyLms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}


class TrackCurriculumChanges {

	protected array $old = [];
	protected array $new = [];

	protected array $new_curriculums = [];
	protected array $new_topics = [];

	protected array $old_curriculums = [];
	protected array $old_topics = [];


	public function __construct( array $old, array $new ) {
		$this->old = $old;
		$this->new = $new;
	}


	public function get_changes() : array {

		$this->assign_old_data();
		$this->assign_new_data();

		$old_topic_ids = array_keys( $this->old_topics );
		$new_topic_ids = array_keys( $this->new_topics );

		$data = [];

		foreach ( array_diff( $old_topic_ids, $new_topic_ids ) as $topic_id ) {
			$data['updated'][]   = $this->old_topics[ $topic_id ];
			$data['curriculums'][ $this->old_topics[ $topic_id ]['slug'] ] = $this->old_curriculums[ $this->old_topics[ $topic_id ]['slug'] ];
		}

		foreach ( array_diff( $new_topic_ids, $old_topic_ids ) as $topic_id ) {
			$data['new'][] = $this->new_topics[ $topic_id ];
			$data['curriculums'][ $this->new_topics[ $topic_id ]['slug'] ] = $this->new_curriculums[ $this->new_topics[ $topic_id ]['slug'] ];
		}

		return $data;
	}


	public function assign_new_data(): void {

		foreach ( $this->new as $new ) {
			$slug = null;
			if ( array_key_exists( 'title', $new ) ) {
				$slug = sanitize_title( $new['title'] );
				$this->new_curriculums[ $slug ] = $new['title'];
			}

			foreach ( $new['topics'] ?? [] as $topic ) {
				if ( array_key_exists( 'id', $topic ) ) {
					if ( $slug ) {
						$topic['slug'] = $slug;
					}
					$this->new_topics[ $topic['id'] ] = $topic;
				}
			}
		}

	}


	public function assign_old_data(): void {

		foreach ( $this->old as $old ) {

			$slug = null;
			if ( array_key_exists( 'title', $old ) ) {
				$slug = sanitize_title( $old['title'] );
				$this->old_curriculums[ $slug ] = $old['title'];
			}

			foreach ( $old['topics'] ?? [] as $topic ) {
				if ( array_key_exists( 'id', $topic ) ) {
					if ( $slug ) {
						$topic['slug'] = $slug;
					}
					$this->old_topics[ $topic['id'] ] = $topic;
				}
			}
		}

	}
}
