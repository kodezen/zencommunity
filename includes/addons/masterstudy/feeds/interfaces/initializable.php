<?php
namespace ZenCommunity\Addons\Masterstudy\Feeds\Interfaces;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
interface Initializable {
	public function init() : void;
}
