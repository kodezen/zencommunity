<?php
namespace ZenCommunity\Classes;

use ZenCommunity\Exceptions\ZencommunityException;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Space content types (SureDash-style). A Space (group) holds one kind of
 * content, chosen when it is created. The `type` is a real column on
 * zenc_groups; type-specific configuration + shared display settings live in
 * the group's `meta` JSON.
 *
 * Events and Courses are already group-scoped features (zenc_group_events,
 * zenc_group_course_relation), so those types simply make that the group's
 * primary view. Single Page, External Link and Resource Library are the
 * net-new content modes and store their data in `meta`.
 *
 * This class is the single source of truth: it registers `type` + the new
 * meta keys with the group REST schema and the model's sanitize rules via the
 * existing filters, so no core model/schema files need editing.
 */
class SpaceType {

	const DEFAULT_TYPE = 'discussion';

	public static function init() : void {
		$self = new static();
		// Let `type` survive get_params_by_schema() (top-level key filter).
		add_filter( 'zencommunity/group/schema', [ $self, 'extend_schema' ] );
		// Whitelist the new meta.* keys in both directions, but `type` only on
		// create — see extend_update_rules() for why update deliberately does
		// not accept it.
		add_filter( 'zencommunity/group/create/sanitaization/rules', [ $self, 'extend_create_rules' ] );
		add_filter( 'zencommunity/group/update/sanitaization/rules', [ $self, 'extend_update_rules' ] );
		// Coerce an unknown/empty type to the default (only for real groups,
		// and only on create — see normalize_type()).
		add_filter( 'zencommunity/group/default_data', [ $self, 'normalize_type' ], 10, 2 );
		// A Space whose type was registered by an extension that is no longer
		// active can't be rendered — reject a direct fetch, drop it from listings.
		add_filter( 'zencommunity/group/wrapper/single', [ $self, 'reject_unregistered_single' ], 10, 2 );
		add_filter( 'zencommunity/group/wrapper/collection', [ $self, 'strip_unregistered_collection' ] );
	}

	/**
	 * The canonical type catalogue. `view` = a group-scoped feature that this
	 * type surfaces as the primary view; the frontend branches on the key.
	 *
	 * @return array<string, array>
	 */
	public static function types() : array {
		return apply_filters( 'zencommunity/space/types', [
			'discussion' => [
				'label'       => __( 'Discussion', 'zencommunity' ),
				'description' => __( 'Spark threaded conversations with members.', 'zencommunity' ),
				'icon'        => 'chat',
			],
			'single-page' => [
				'label'       => __( 'Single Page', 'zencommunity' ),
				'description' => __( 'Publish a standalone article or announcement.', 'zencommunity' ),
				'icon'        => 'file',
			],
			'external-link' => [
				'label'       => __( 'External Link', 'zencommunity' ),
				'description' => __( 'Send members to a URL outside your community.', 'zencommunity' ),
				'icon'        => 'link',
			],
			'event' => [
				'label'       => __( 'Event', 'zencommunity' ),
				'description' => __( 'Schedule sessions with RSVPs and reminders.', 'zencommunity' ),
				'icon'        => 'calendar',
			],
			'course' => [
				'label'       => __( 'Course', 'zencommunity' ),
				'description' => __( 'Deliver linked lessons with progress tracking.', 'zencommunity' ),
				'icon'        => 'book',
			],
			'resource-library' => [
				'label'       => __( 'Resource Library', 'zencommunity' ),
				'description' => __( 'Organise searchable files and downloads.', 'zencommunity' ),
				'icon'        => 'folder',
			],

		] );
	}

	/** @return string[] valid type keys. */
	public static function keys() : array {
		return array_keys( self::types() );
	}

	public static function is_valid( ?string $type ) : bool {
		return is_string( $type ) && in_array( $type, self::keys(), true );
	}

	/**
	 * Register `type` as a top-level schema field so it passes the REST layer.
	 */
	public function extend_schema( array $schema ) : array {
		$schema['type'] = [
			'description'       => __( 'Space content type', 'zencommunity' ),
			'type'              => 'string',
			'enum'              => self::keys(),
			'default'           => self::DEFAULT_TYPE,
			'context'           => [ 'view', 'edit' ],
			'required'          => false,
			'sanitize_callback' => 'sanitize_text_field',
		];
		return $schema;
	}

	/**
	 * The type-config / display meta keys shared by both create and update —
	 * factored out once so the two rule sets below can never drift apart on
	 * anything except whether `type` itself is included.
	 */
	protected function shared_meta_rules() : array {
		return [
			// Shared display settings (SureDash space layout).
			'meta.container_width' => Sanitizer::STRING, // global|normal|narrow|full
			'meta.container_style' => Sanitizer::STRING, // global|boxed|unboxed
			'meta.allow_comments'  => Sanitizer::BOOL,
			'meta.banner'          => Sanitizer::URL,

			// External Link.
			'meta.external_url' => Sanitizer::URL,
			'meta.open_new_tab' => Sanitizer::BOOL,

			// Single Page.
			'meta.page_content' => Sanitizer::HTML,
			'meta.page_post_id' => Sanitizer::INT,

			// Course (an LMS course id linked to this space).
			'meta.course_id' => Sanitizer::INT,
			'meta.lms'       => Sanitizer::STRING,

			// Resource Library (array of file entries).
			'meta.resources.*.media_id'    => Sanitizer::INT,
			'meta.resources.*.title'       => Sanitizer::STRING,
			'meta.resources.*.url'         => Sanitizer::URL,
			'meta.resources.*.mime'        => Sanitizer::STRING,
			'meta.resources.*.size'        => Sanitizer::INT,
			'meta.resources.*.description' => Sanitizer::STRING,
		];
	}

	/**
	 * Create-time rules: `type` is whitelisted here (and only here) since a
	 * Space's type is chosen once, at creation.
	 */
	public function extend_create_rules( array $rules ) : array {
		return array_merge( $rules, [ 'type' => Sanitizer::STRING ], $this->shared_meta_rules() );
	}

	/**
	 * Update-time rules: deliberately omits `type`. Without this, a raw
	 * update request could silently change an existing Space's type after
	 * creation — the admin UI already disables the type picker on edit, this
	 * makes that the actual, enforced behavior instead of a client-side-only
	 * convention. Every other type's meta remains editable as before.
	 */
	public function extend_update_rules( array $rules ) : array {
		return array_merge( $rules, $this->shared_meta_rules() );
	}

	/**
	 * Drop an invalid type so the column default ('discussion') applies on
	 * create. Only ever runs on create (default_data() is create-only; see extend_update_rules()
	 * for why update has no type-related check of its own to make). Categories
	 * (category_id === null) are not spaces, so skip them.
	 *
	 * @param array    $data
	 * @param int|null $category_id
	 */
	public function normalize_type( array $data, $category_id ) : array {
		if ( null === $category_id ) {
			return $data; // this is a Collection/category, not a Space
		}

		if ( array_key_exists( 'type', $data ) && ! self::is_valid( $data['type'] ) ) {
			unset( $data['type'] );
		}

		return $data;
	}

	/**
	 * Direct fetch of a Space whose type is no longer registered (its
	 * extension was deactivated): treat it as missing. Listing rows are left
	 * to strip_unregistered_collection(), so one row can't abort a listing.
	 *
	 * @throws ZencommunityException
	 */
	public function reject_unregistered_single( array $group, bool $is_single ) : array {
		if ( $is_single && isset( $group['type'] ) && ! self::is_valid( $group['type'] ) ) {
			throw new ZencommunityException( esc_html__( 'Space not found.', 'zencommunity' ), 404 );
		}
		return $group;
	}

	public function strip_unregistered_collection( array $data ) : array {
		return array_values( array_filter( $data, function ( $group ) {
			return ! isset( $group['type'] ) || self::is_valid( $group['type'] );
		} ) );
	}
}
