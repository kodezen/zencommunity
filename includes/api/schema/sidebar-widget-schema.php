<?php
namespace ZenCommunity\Api\Schema;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

trait SidebarWidgetSchema {

    public function widget_schema() : array {
        return [
            'type' => [
                'type'        => 'string',
                'enum'        => [ 'content_list', 'recent_activities', 'info_box', 'key_people' ],
                // Not marked required at the REST arg level: this same schema
                // backs both add (POST /sidebar-widgets, where SidebarWidgetManager::
                // add_widget() already throws a clear error if type is missing/
                // invalid) and update (POST /sidebar-widgets/item/{id}, which only
                // ever sends settings/status - a required "type" here would 400
                // every update before it even reaches the callback).
                'required'    => false,
                'description' => __( 'Widget type.', 'zencommunity' ),
            ],
            'status' => [
                'type'        => 'boolean',
                'required'    => false,
                'description' => __( 'Whether the widget is shown on the frontend.', 'zencommunity' ),
            ],
            'settings' => [
                'type'        => 'object',
                'required'    => false,
                'description' => __( 'Per-type widget settings.', 'zencommunity' ),
                'properties'  => [
                    'title' => [
                        'type'              => 'string',
                        'description'       => __( 'Widget heading shown in the sidebar.', 'zencommunity' ),
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'sort_by' => [
                        'type'        => 'string',
                        'enum'        => [ 'trending', 'latest' ],
                        'description' => __( 'content_list: which posts to show.', 'zencommunity' ),
                    ],
                    'limit' => [
                        'type'        => 'integer',
                        'minimum'     => 1,
                        'maximum'     => 10,
                        'description' => __( 'content_list / recent_activities: how many items to show.', 'zencommunity' ),
                    ],
                    'content' => [
                        'type'              => 'string',
                        'description'       => __( 'info_box: rich text content.', 'zencommunity' ),
                        'sanitize_callback' => 'wp_kses_post',
                    ],
                    'member_ids' => [
                        'type'        => 'array',
                        'description' => __( 'key_people: member user IDs to feature, in display order.', 'zencommunity' ),
                        'items'       => [ 'type' => 'integer' ],
                    ],
                ],
                'additionalProperties' => false,
            ],
        ];
    }

    public function reorder_schema() : array {
        return [
            'ordered_ids' => [
                'type'        => 'array',
                'required'    => true,
                'description' => __( 'List of widget IDs in the desired order.', 'zencommunity' ),
                'items'       => [
                    'type' => 'string',
                ],
            ],
        ];
    }
}
