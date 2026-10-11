<?php
namespace ZenCommunity\Addons\LearnPress\Feeds\Interfaces;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
interface Initializable {
	public function init() : void;
}
