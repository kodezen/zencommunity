<?php

namespace ZenCommunity\Addons\Gameengine;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\RestApiInit as BaseRestApiInit;

class RestApiInit extends BaseRestApiInit {
	/** register rest api */
	protected static array $api_classes = [
		Api\GamificationController::class,
	];
}
