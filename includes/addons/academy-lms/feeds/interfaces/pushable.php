<?php
namespace ZenCommunity\Addons\AcademyLms\Feeds\Interfaces;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
interface Pushable {
	public function push() : void;
}
