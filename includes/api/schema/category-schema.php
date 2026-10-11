<?php
namespace ZenCommunity\Api\Schema;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
trait CategorySchema  {

    public function schema() : array {
        return apply_filters( 'zencommunity/category/schema', [
            'name' => [
                'description'       => __( 'Name of the item', 'zencommunity' ),
                'type'              => 'string',
                'context'           => [ 'view', 'edit', 'embed' ],
                'maxLength'         => 255,
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'slug' => [
                'description'       => __( 'Slug identifier', 'zencommunity' ),
                'type'              => 'string',
                'context'           => [ 'view', 'edit', 'embed' ],
                'maxLength'         => 255,
                'required'          => false,
                'sanitize_callback' => 'sanitize_title',
            ],
            'description' => [
                'description'       => __( 'Description of the item', 'zencommunity' ),
                'type'              => 'string',
                'context'           => [ 'view', 'edit', 'embed' ],
                'required'          => false,
                'sanitize_callback' => 'wp_kses_post',
            ],
            'status' => [
                'description'       => __( 'Status of the item', 'zencommunity' ),
                'type'              => 'string',
                'enum'              => [ 'published', 'draft' ],
                'default'           => 'published',
                'context'           => [ 'view', 'edit' ],
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ] );
    }
}