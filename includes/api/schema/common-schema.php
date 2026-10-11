<?php
namespace ZenCommunity\Api\Schema;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
trait CommonSchema {
    public function index_schema() : array {
        return [
            'page' => [
                'required' => false,
                'type' => 'integer',
                'description' => __( 'Current page', 'zencommunity' ),
            ],
            'per_page' => [
                'required' => false,
                'type' => 'integer',
                'description' => __( 'Records per page', 'zencommunity' ),
            ],
            'search' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'Search query string.', 'zencommunity' ),
            ],
            'status' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'Record status.', 'zencommunity' ),
            ],
            'order' => [
                'description' => __( 'Sort order (ascending or descending).', 'zencommunity' ),
                'type'        => 'string',
                'enum'        => [ 'asc', 'desc' ],
                'default'     => 'desc',
                'required'    => false,
            ],
            'order_by' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'Order by.', 'zencommunity' ),
            ],
        ];
    }
    
    public function media_index_schema() : array {
        return [
            'page' => [
                'required' => false,
                'type' => 'integer',
                'description' => __( 'Current page', 'zencommunity' ),
            ],
            'per_page' => [
                'required' => false,
                'type' => 'integer',
                'description' => __( 'Records per page', 'zencommunity' ),
            ],
            'type' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'Object type of a media.', 'zencommunity' ),
            ],
            'order' => [
                'description' => __( 'Sort order (ascending or descending).', 'zencommunity' ),
                'type'        => 'string',
                'enum'        => [ 'asc', 'desc' ],
                'default'     => 'desc',
                'required'    => false,
            ],
            'order_by' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'Order by.', 'zencommunity' ),
            ],
        ];
    }
    public function ids_schema() : array {
        return [
            'ids' => [
                'required' => true,
                'type'     => 'array',
                'items'    => [
                    'type' => [ 'integer', 'string' ],
                ],
                'description' => __( 'An array of item IDs', 'zencommunity' ),
                'validate_callback' => fn( $ids, $request, $key) : bool => is_array( $ids ) && count( array_filter( $ids, 'is_numeric' ) ) === count( $ids ),
                'sanitize_callback' => fn( $ids, $request, $key ) : array => array_map( 'absint', $ids ),
            ],
        ];
    }
}