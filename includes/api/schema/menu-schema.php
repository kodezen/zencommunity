<?php
namespace ZenCommunity\Api\Schema;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

trait MenuSchema {

    public function schema() : array {
        return [
            'key' => [
                'type'              => 'string',
                'required'          => true,
                'description'       => __( 'Unique identifier for the menu.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'label' => [
                'type'              => 'string',
                'required'          => true,
                'description'       => __( 'Human-readable label for the menu.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ]
        ];
    }

    public function item_schema() : array {
        return [
            'id' => [
                'type'              => 'string',
                'required'          => false,
                'description'       => __( 'Optional unique identifier for the menu item.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'type' => [
                'type'        => 'string',
                'enum'        => [ 'default', 'link' ],
                'required'    => true,
                'description' => __( 'Type of the menu item (default or link).', 'zencommunity' ),
            ],
            'label' => [
                'type'        => 'string',
                'required'    => true,
                'description' => __( 'Display label for the menu item.', 'zencommunity' ),
            ],
            'url' => [
                'type'        => 'string',
                'required'    => false,
                'description' => __( 'URL for link-type menu items.', 'zencommunity' ),
            ],
            'icon' => [
                'type'        => 'object',
                'required'    => true,
                'description' => __( 'Icon associated with the menu item.', 'zencommunity' ),
                'properties'  => [
                    'type' => [
                        'type'        => 'string',
                        'enum'        => [ 'emoji', 'svg', 'img' ],
                        'required'    => true,
                        'description' => __( 'Type of the icon: emoji, SVG, or base64 image.', 'zencommunity' ),
                    ],
                    'src' => [
                        'type'        => 'string',
                        'required'    => true,
                        'description' => __( 'Source content of the icon (emoji character, SVG markup, or base64 image).', 'zencommunity' ),
                    ]
                ],
                'additionalProperties' => false,
            ],
            'roles' => [
                // Stored items may already have `roles: null` (add_link_item()/
                // update_item_roles() persist an empty selection as null), and
                // callers like the Enable/Disable toggle spread the fetched item
                // straight back into the update payload — so this must accept
                // null, not just array, or WP_REST rejects the whole request
                // with "Invalid parameter(s): roles".
                'type'        => [ 'array', 'null' ],
                'required'    => false,
                'description' => __( 'Visibility roles.', 'zencommunity' ),
                'items'    => [
                    'type' => 'string'
                ],
            ],


        ];
    }

    public function item_roles_schema() : array {
        return [
            'roles' => [
                'type'        => [ 'array', 'null' ],
                'required'    => false,
                'description' => __( 'Visibility roles.', 'zencommunity' ),
                'items'       => [
                    'type' => 'string',
                ],
            ],
        ];
    }

    public function reorder_schema() : array {
        return [
            'ordered_ids' => [
                'type'        => 'array',
                'required'    => true,
                'description' => __( 'List of menu item IDs in the desired order.', 'zencommunity' ),
                'items'       => [
                    'type' => 'string',
                ]
            ]
        ];
    }
}
