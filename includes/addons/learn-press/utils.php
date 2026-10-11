<?php

namespace ZenCommunity\Addons\LearnPress;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Database\Utils\QueryBuilder;
class Utils {
	public static function lesson_to_course( int $lesson_id ) : ?int {
		return absint( QueryBuilder::ins()
			->from( 'learnpress_sections', 's' )
			->join( 'learnpress_section_items', 'sl', 's.section_id = sl.section_id' )
			->where( 'sl.item_type', '=', 'lp_lesson' )
			->where( 'sl.item_id', '=', $lesson_id )
			->value( 's.section_course_id' ) );
	}
}