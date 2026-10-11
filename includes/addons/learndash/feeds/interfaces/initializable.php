<?php
namespace ZenCommunity\Addons\Learndash\Feeds\Interfaces;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
interface Initializable {
	public function init() : void;
}
