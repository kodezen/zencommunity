<?php
namespace ZenCommunity\Api\Common;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_REST_Request;
abstract class Base {
    protected $namespace = 'zencommunity/v1';
    abstract public function init() : void;
    
	public function get_params_by_schema( WP_REST_Request $request, array $schema, array $extra_keys = [] ) : ?array {
        $params = $request->get_params();
        $schema_keys = array_merge( array_keys( $schema ), $extra_keys );
        return array_intersect_key( $params, array_flip( $schema_keys ) );
	}
}