<?php
namespace ZenCommunity\Addons\LifterLms\Feeds\Interfaces;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
interface Initializable {
	public function init() : void;
}
