<?php
namespace ZenCommunity\Api\Schema;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
trait FeedSchema  {

    public function schema() : array {
        return apply_filters( 'zencommunity/schema/feed', [
            'title' => [
                'type' => 'string',
                'required' => false,
                'description' => __( 'Feed title', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'type' => [
                'type'              => 'string',
                'required'          => false,
                'description'       => __( 'Feed type', 'zencommunity' ),
                'enum'              => \ZenCommunity\Database\Models\Feed::types(),
                'default'           => 'post',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'content' => [
                'type' => 'string', 
                'required' => true, 
                'description' => __( 'Feed content', 'zencommunity' ),
                'sanitize_callback' => 'wp_kses_post',
            ],
            'status' => [
                'description'       => __( 'Status of the feed', 'zencommunity' ),
                'type'              => 'string',
                'enum'              => [ 'published', 'draft', 'scheduled', 'pending' ],
                'default'           => 'published',
                'context'           => [ 'view', 'edit' ],
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'add_media_ids' => [
                'required' => false,
                'type'     => 'array',
                'items'    => [
                    'type' => [ 'integer', 'string' ],
                ],
                'description' => __( 'An array of media IDs. Each media item must be of the type "feed_image".', 'zencommunity' ),
                'validate_callback' => fn( $ids, $request, $key) : bool => is_array( $ids ) && count( array_filter( $ids, 'is_numeric' ) ) === count( $ids ),
                'sanitize_callback' => fn( $ids, $request, $key ) : array => array_map( 'absint', $ids ),
            ],
            'remove_media_ids' => [
                'required' => false,
                'type'     => 'array',
                'items'    => [
                    'type' => [ 'integer', 'string' ],
                ],
                'description' => __( 'An array of media IDs. Each media item must be of type "feed_image" and associated with the specified feed ID', 'zencommunity' ),
                'validate_callback' => fn( $ids, $request, $key) : bool => is_array( $ids ) && count( array_filter( $ids, 'is_numeric' ) ) === count( $ids ),
                'sanitize_callback' => fn( $ids, $request, $key ) : array => array_map( 'absint', $ids ),
            ],
            'scheduled_at' => [
                'type' => 'string', 
                'required' => false, 
                'description' => __( 'Scheduled date', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'meta' => [
                'type'        => 'object',
                'description' => __( 'Custom user metadata including social usernames and notification settings.', 'zencommunity' ),
                'properties'  => [
                    'disable_comment' => [
                        'required'          => false,
                        'type'              => 'boolean',
                        'description'       => __( 'Whether comments are disabled on this feed item. Set to false to enable comments, or true to disable.', 'zencommunity' ),
                        'default'           => false,
                        'sanitize_callback' => 'rest_sanitize_boolean',
                        'validate_callback' => 'rest_validate_request_arg',
                    ],
                    'feeling' => [
                        'type' => 'string', 
                        'description' => __( 'Feed feeling', 'zencommunity' ),
                        'sanitize_callback' => 'wp_kses_post',
                    ],
                    'background_color' => [
                        'type' => 'string',
                        'required' => true,
                        'description' => __( 'Feed bg color', 'zencommunity' ),
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'poll' => [
                        'type'        => 'object',
                        'required'    => false,
                        'description' => __( 'Poll configuration', 'zencommunity' ),
                    ],
                ],
            ],
        ] );
    }

    public function index_schema() : array {
        return apply_filters( 'zencommunity/schema/feed_index', [
            'page' => [
                'type'              => 'integer',
                'default'           => 1,
                'description'       => __( 'Current page of the feed result set.', 'zencommunity' ),
                'sanitize_callback' => 'absint',
                'validate_callback' => 'rest_validate_request_arg',
            ],
            'per_page' => [
                'type'              => 'integer',
                'default'           => 10,
                'description'       => __( 'Number of feeds per page.', 'zencommunity' ),
                'sanitize_callback' => 'absint',
                'validate_callback' => 'rest_validate_request_arg',
            ],
            'group' => [
                'type'              => 'integer',
                'description'       => __( 'Filter feeds by group ID.', 'zencommunity' ),
                'sanitize_callback' => 'absint',
                'validate_callback' => 'rest_validate_request_arg',
                'required'          => false,
            ],
            // What FeedModel::index() actually filters on (`group` above is
            // accepted but never read there).
            'group_id' => [
                'type'              => 'integer',
                'description'       => __( 'Only posts in this Space.', 'zencommunity' ),
                'sanitize_callback' => 'absint',
                'validate_callback' => 'rest_validate_request_arg',
                'required'          => false,
            ],
            'search' => [
                'type'              => 'string',
                'description'       => __( 'Search keyword in feeds.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
                'required'          => false,
            ],
            'search_col' => [
                'type'        => 'array',
                'items'       => [
                    'type' => 'string',
                    'enum' => [ 'title', 'slug', 'content' ],
                ],
                'description' => __( 'Fields to search within (e.g., content, title).', 'zencommunity' ),
                'required'    => false,
            ],
            'status' => [
                'description'       => __( 'Status of the feed', 'zencommunity' ),
                'type'              => 'string',
                'enum'              => [ 'published', 'draft', 'scheduled' ],
                'default'           => 'published',
                'context'           => [ 'view', 'edit' ],
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'order' => [
                'description' => __( 'Sort order (ascending or descending).', 'zencommunity' ),
                'type'        => 'string',
                'enum'        => [ 'asc', 'desc' ],
                'default'     => 'desc',
                'required'    => false,
            ],
            'order_by' => [
                'type'        => 'string',
                'enum'        => [ 'created_at', 'updated_at', 'title', 'like_count', 'comment_count', 'id', 'trending' ],
                'default'     => 'updated_at',
                'required'    => false,
                'description' => __( 'Order by.', 'zencommunity' ),
            ],
            'show_featured' => [
                'type'              => 'string',
                'enum'              => [ 'yes', 'no' ],
                'required'          => false,
                'description'       => __( 'Filter by featured status.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'bookmarked' => [
                'type'              => 'string',
                'enum'              => [ 'yes', 'no' ],
                'required'          => false,
                'description'       => __( 'Filter to only posts bookmarked by the current user.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ] );
    }

    
    public function comment_schema() : array {
        return apply_filters( 'zencommunity/group/comment', [
            'content' => [
                'description' => 'Text content of the comment',
                'type'        => 'string',
                'required'    => true,
                'sanitize_callback' => 'wp_kses_post',
                'context'     => ['view', 'edit'],
            ],
            'add_media_ids' => [
                'required' => false,
                'type'     => 'array',
                'items'    => [
                    'type' => [ 'integer', 'string' ],
                ],
                'description' => __( 'An array of media IDs. Each media item must be of the type "comment_image".', 'zencommunity' ),
                'validate_callback' => fn( $ids, $request, $key) : bool => is_array( $ids ) && count( array_filter( $ids, 'is_numeric' ) ) === count( $ids ),
                'sanitize_callback' => fn( $ids, $request, $key ) : array => array_map( 'absint', $ids ),
            ],
            'remove_media_ids' => [
                'required' => false,
                'type'     => 'array',
                'items'    => [
                    'type' => [ 'integer', 'string' ],
                ],
                'description' => __( 'An array of media IDs. Each media item must be of type "comment_image" and associated with the specified feed ID', 'zencommunity' ),
                'validate_callback' => fn( $ids, $request, $key) : bool => is_array( $ids ) && count( array_filter( $ids, 'is_numeric' ) ) === count( $ids ),
                'sanitize_callback' => fn( $ids, $request, $key ) : array => array_map( 'absint', $ids ),
            ],
        ] );
    }
}