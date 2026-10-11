<?php
namespace ZenCommunity\Exceptions;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use Exception;
use WP_REST_Response;
class ZencommunityException extends Exception  {
    public int $http_status_code;

    public function __construct( string $message, int $http_status_code = 422 ) {
        parent::__construct( $message );
        $this->http_status_code = $http_status_code;
    }

    public function as_rest_response() : WP_REST_Response {
        return new WP_REST_Response( [
            'success' => $this->http_status_code < 300,
            'message' => $this->getMessage()
        ], $this->http_status_code );
    }

    public function as_json_response() : void {
        wp_send_json( [
            'success' => $this->http_status_code < 300,
            'message' => $this->getMessage()
        ], $this->http_status_code );
    }
}