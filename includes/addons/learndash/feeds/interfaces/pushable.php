<?php
namespace ZenCommunity\Addons\Learndash\Feeds\Interfaces;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
interface Pushable {
	public function push() : void;
}
