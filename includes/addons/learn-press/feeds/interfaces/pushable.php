<?php
namespace ZenCommunity\Addons\LearnPress\Feeds\Interfaces;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
interface Pushable {
	public function push() : void;
}
