<?php
namespace ZenCommunity\Api\Schema;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
trait MediaSchema  {
    public function schema() : array {
        return apply_filters( 'zencommunity/media_upload/schema', [
            'media_type' => [
                'required' => true,
                'type'     => 'string',
                'description' => __( 'Type of the media', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'file' => [
                'description' => __( 'File to upload', 'zencommunity' ),
            ],
        ] );
    }
}