<?php
namespace ZenCommunity\Frontend;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Template { 
    public static function init(){
        $self = new self();
        add_filter( 'template_include', [ $self, 'template_include' ] );
    } 

    public function template_include( ?string $template ) : ?string {
        global $zencommunity_settings;
        $slug = get_query_var( ZENCOMMUNITY_APP_ROUTE_QUERY_VAR );
        $load_on_entire_site = $zencommunity_settings->load_on_entire_site ?? false;
        if ( $load_on_entire_site || 'community' === $slug ) {
            // In Gutenberg (FSE) render mode, render the community block template
            // through WordPress's own block-template canvas — the real FSE
            // pipeline (template parts, global styles, block hooks), editable in
            // the Site Editor.
            if ( \ZenCommunity\Helper::is_fse_mode() ) {
                $block_template = \ZenCommunity\Fse\Manager::resolve_current_template();
                if ( $block_template ) {
                    $GLOBALS['_wp_current_template_id']      = $block_template->id;
                    $GLOBALS['_wp_current_template_content'] = $block_template->content;
                    return ABSPATH . WPINC . '/template-canvas.php';
                }
                // Block templates unavailable (e.g. ancient WP): fall back to SPA.
            }
            // The React SPA reads the current user from a snapshot localized into
            // this document (window.ZencommunityGlobal.is_logged_in /
            // current_logged_user) and never re-verifies it at runtime. If the
            // browser or a proxy serves a cached copy of this HTML on a soft
            // refresh, that snapshot goes stale and the app renders the guest
            // ("logged out") view for authenticated users — only a hard refresh,
            // which bypasses the cache, shows the correct state. Mark the SPA
            // document non-cacheable so every load carries a fresh auth snapshot.
            nocache_headers();
            header( 'Cache-Control: no-cache, no-store, must-revalidate, max-age=0', true );
            return ZENCOMMUNITY_TEMPLATES_DIR_PATH . 'app.php';
        }
        return $template;
    }
}