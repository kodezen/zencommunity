<?php

namespace ZenCommunity\Addons\Email;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\RestApiInit as BaseRestApiInit;
class RestApiInit extends BaseRestApiInit {
	/** register rest api */
	protected static array $api_classes = [
		Api\TemplateController::class,
	];
}