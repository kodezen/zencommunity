<?php

namespace ZenCommunity\Addons\LifterLms;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Database\Utils\QueryBuilder;
class Utils {
	public static function lesson_to_course( int $lesson_id ) : ?int {
		return absint( 
			get_post_meta( $lesson_id, '_llms_parent_course', true ) 
		);
	}
}