<?php
namespace ZenCommunity\Addons\AcademyLms\Feeds\Interfaces;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
interface Initializable {
	public function init() : void;
}
