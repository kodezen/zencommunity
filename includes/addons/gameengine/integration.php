<?php

namespace ZenCommunity\Addons\Gameengine;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers ZenCommunity as a GameEngine integration so community actions can
 * award points, badges and ranks through GameEngine's rule builder.
 *
 * Extends GameEngine's BaseIntegration — only ever loaded when GameEngine is
 * active (referenced solely through the `gameengine_integrations` filter, which
 * runs inside GameEngine's TriggerRegistry).
 */
class Integration extends \GameEngine\Integrations\BaseIntegration {

	const SLUG = 'zencommunity';

	/**
	 * Hook the integration into GameEngine. Call only when GameEngine is active.
	 */
	public static function register() : void {
		add_filter( 'gameengine_integrations', static function ( array $integrations ) : array {
			$integrations[ self::SLUG ] = self::class;
			return $integrations;
		} );
	}

	public static function get_slug(): string {
		return self::SLUG;
	}

	public static function get_name(): string {
		return __( 'ZenCommunity', 'zencommunity' );
	}

	public static function get_icon(): string {
		return 'dashicons-groups';
	}

	/**
	 * Community triggers. Keys must match the seeded requirement trigger_keys.
	 */
	public static function get_triggers(): array {
		return [
			'zc_post_created' => [
				'label'       => __( 'Create a post', 'zencommunity' ),
				'hook'        => 'zencommunity/feed/created',
				'args_count'  => 2,
				'description' => __( 'A member publishes a post in the community.', 'zencommunity' ),
				'get_user_id' => static function ( $feed_id, $data = null ) {
					if ( is_array( $data ) && ! empty( $data['user_id'] ) ) {
						return (int) $data['user_id'];
					}
					if ( is_object( $data ) && ! empty( $data->user_id ) ) {
						return (int) $data->user_id;
					}
					return get_current_user_id();
				},
				'supports'    => [ 'point_type', 'achievement', 'level' ],
				'schema'      => self::merge_schema( [] ),
			],
			'zc_comment_created' => [
				'label'       => __( 'Write a comment', 'zencommunity' ),
				'hook'        => 'zencommunity/feed/comment_created',
				'args_count'  => 6,
				'description' => __( 'A member comments on a post.', 'zencommunity' ),
				'get_user_id' => static function ( ...$args ) {
					return (int) ( $args[2] ?? get_current_user_id() );
				},
				'supports'    => [ 'point_type', 'achievement', 'level' ],
				'schema'      => self::merge_schema( [] ),
			],
			'zc_reaction_received' => [
				'label'       => __( 'Receive a reaction', 'zencommunity' ),
				'hook'        => 'zencommunity/feed/react',
				'args_count'  => 6,
				'description' => __( 'A member’s post or comment receives a reaction (rewards the author).', 'zencommunity' ),
				'get_user_id' => static function ( ...$args ) {
					$feed = $args[5] ?? null; // feed_data
					if ( is_array( $feed ) && ! empty( $feed['user_id'] ) ) {
						return (int) $feed['user_id'];
					}
					if ( is_object( $feed ) && ! empty( $feed->user_id ) ) {
						return (int) $feed->user_id;
					}
					return 0;
				},
				'supports'    => [ 'point_type', 'achievement', 'level' ],
				'schema'      => self::merge_schema( [] ),
			],
			'zc_group_joined' => [
				'label'       => __( 'Join a space', 'zencommunity' ),
				'hook'        => 'zencommunity/group/user_added',
				'args_count'  => 2,
				'description' => __( 'A member joins a community space.', 'zencommunity' ),
				'get_user_id' => static function ( $group_id, $data = null ) {
					if ( is_array( $data ) && ! empty( $data['user_id'] ) ) {
						return (int) $data['user_id'];
					}
					return 0;
				},
				'supports'    => [ 'point_type', 'achievement', 'level' ],
				'schema'      => self::merge_schema( [] ),
			],
		];
	}
}
