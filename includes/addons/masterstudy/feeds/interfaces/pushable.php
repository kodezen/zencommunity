<?php
namespace ZenCommunity\Addons\Masterstudy\Feeds\Interfaces;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
interface Pushable {
	public function push() : void;
}
