<?php
namespace ZenCommunity\Addons\LearnPress\Api\Schema;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use stdClass;
trait EventsSchema {

	public function schema( bool $msg_required = false ): array {
		return apply_filters( 'zencommunity/integration/learnpress/events/schema', [
            'events' => [
                'required' => false,
                'type'     => 'array',
                'items'    => [
                    'type' => [ 'string' ],
                ],
                'description' => __( 'Allowed events".', 'zencommunity' ),
                'validate_callback' => 'sanitize_text_field',
            ],
		] );
	}
	
}
