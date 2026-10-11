<?php
namespace ZenCommunity\Api\Schema;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
trait ActivitySchema  {
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
                'description' => __( 'Activity per page', 'zencommunity' ),
            ],
            'type' => [
                'required' => false,
                'type' => 'string',
                'description' => __( ' Type of a Activity.', 'zencommunity' ),
            ],
        ];
    }

}