<?php
namespace ZenCommunity\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Exceptions\ZencommunityException;

/**
 * Settings > Appearance > Sidebar - an ordered list of widgets rendered in
 * the community's right sidebar (currently the Feed page only, matching
 * where RightSidebar.js already rendered its two hardcoded sections). Follows
 * the same "own option, own manager class" shape as MenuManager rather than
 * the generic zencommunity_settings blob, since items are a variable-length
 * array of typed objects rather than flat scalar settings.
 */
class SidebarWidgetManager {
	const OPTION_KEY = 'zencommunity_sidebar_widgets';

	/**
	 * Used only when the option has never been saved, so upgrading/new sites
	 * see the same "Trending posts" + "Recent activities" sidebar they always
	 * had, just now expressed as widgets instead of hardcoded markup.
	 */
	public static function default_widgets() : array {
		return [
			[
				'id'     => 'widget_content_list',
				'type'   => 'content_list',
				'status' => true,
				'settings' => [
					'title'   => __( 'Trending posts', 'zencommunity' ),
					'sort_by' => 'trending',
					'limit'   => 5,
				],
			],
			[
				'id'     => 'widget_recent_activities',
				'type'   => 'recent_activities',
				'status' => true,
				'settings' => [
					'title' => __( 'Recent activities', 'zencommunity' ),
					'limit' => 5,
				],
			],
		];
	}

	public static function valid_types() : array {
		return [ 'content_list', 'recent_activities', 'info_box', 'key_people' ];
	}

	public static function get_widgets() : array {
		$items = get_option( self::OPTION_KEY, null );
		if ( ! is_array( $items ) ) {
			return apply_filters( 'zencommunity/sidebar_widgets/default', static::default_widgets() );
		}
		return apply_filters( 'zencommunity/sidebar_widgets', array_values( $items ) );
	}

	public static function get_active_widgets() : array {
		return array_values( array_filter( static::get_widgets(), fn( $widget ) => ! empty( $widget['status'] ) ) );
	}

	public static function add_widget( array $widget ) : array {
		if ( empty( $widget['type'] ) || ! in_array( $widget['type'], static::valid_types(), true ) ) {
			throw new ZencommunityException( esc_html( __( 'Invalid widget type.', 'zencommunity' ) ), 422 );
		}

		$items = static::get_widgets();
		$widget['id']       = 'widget_' . uniqid();
		$widget['status']   = $widget['status'] ?? true;
		$widget['settings'] = $widget['settings'] ?? [];
		$items[] = $widget;

		update_option( self::OPTION_KEY, $items );
		return $widget;
	}

	public static function update_widget( string $id, array $data ) : array {
		$items = static::get_widgets();

		foreach ( $items as &$item ) {
			if ( $id !== ( $item['id'] ?? '' ) ) {
				continue;
			}

			if ( array_key_exists( 'status', $data ) ) {
				$item['status'] = (bool) $data['status'];
			}
			if ( ! empty( $data['settings'] ) && is_array( $data['settings'] ) ) {
				$item['settings'] = array_merge( $item['settings'] ?? [], $data['settings'] );
			}

			update_option( self::OPTION_KEY, $items );
			return $item;
		}

		throw new ZencommunityException( esc_html( __( 'Widget not found.', 'zencommunity' ) ), 404 );
	}

	public static function delete_widget( string $id ) : bool {
		$items    = static::get_widgets();
		$filtered = array_values( array_filter( $items, fn( $item ) => ( $item['id'] ?? '' ) !== $id ) );

		if ( count( $filtered ) === count( $items ) ) {
			throw new ZencommunityException( esc_html( __( 'Widget not found.', 'zencommunity' ) ), 404 );
		}

		return update_option( self::OPTION_KEY, $filtered );
	}

	public static function reorder( array $ordered_ids ) : array {
		$by_id = [];
		foreach ( static::get_widgets() as $item ) {
			$by_id[ $item['id'] ] = $item;
		}

		$new = [];
		foreach ( $ordered_ids as $id ) {
			if ( isset( $by_id[ $id ] ) ) {
				$new[] = $by_id[ $id ];
				unset( $by_id[ $id ] );
			}
		}
		// Anything not present in $ordered_ids (shouldn't normally happen) keeps
		// its relative order at the end, rather than silently disappearing.
		$new = array_merge( $new, array_values( $by_id ) );

		update_option( self::OPTION_KEY, $new );
		return $new;
	}
}
