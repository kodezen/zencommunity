<?php

namespace ZenCommunity\Addons\Masterstudy;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Database\Utils\QueryBuilder;
class Utils {
	public static function object_id_to_course_id( int $item_id /*, string $item_type */ ) : ?int {
		return absint( QueryBuilder::ins()
			->from( 'stm_lms_curriculum_sections', 's' )
			->join( 'stm_lms_curriculum_materials', 'sl', 's.id = sl.section_id' )
			// ->where( 'sl.post_type', '=', $item_type )
			->where( 'sl.post_id', '=', $item_id )
			->value( 's.course_id' ) );
	}
}