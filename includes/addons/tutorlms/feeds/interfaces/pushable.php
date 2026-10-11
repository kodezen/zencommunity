<?php
namespace ZenCommunity\Addons\Tutorlms\Feeds\Interfaces;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
interface Pushable {
	public function push() : void;
}
