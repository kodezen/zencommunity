<?php
namespace ZenCommunity;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
class Frontend { 
    public static function init(){
        $self = new self();
        add_filter( 'show_admin_bar', [ $self, 'hide_admin_bar' ] );
        Frontend\Template::init();
    }

    public function hide_admin_bar( $show ) {
        global $zencommunity_settings;
        $load_on_entire_site = $zencommunity_settings->load_on_entire_site ?? false;
        if ( is_admin() ) {
            return $show;
        }

		if ( $load_on_entire_site || 'community' === get_query_var( ZENCOMMUNITY_APP_ROUTE_QUERY_VAR ) ) { 
			return false;
		}
        return $show;
    }
}