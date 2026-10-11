<?php
namespace ZenCommunity;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class RewriteRules { 
    public static function init(){
        add_filter('query_vars', [ __CLASS__, 'set_query_vars' ]);
        add_action('init', [ __CLASS__, 'add_rewrite_rules' ] );
    }

    public static function add_rewrite_rules(){
        $path = $GLOBALS['zencommunity_settings']->path ?? '';
        $path = trim( (string) $path, '/' );

        $target = 'index.php?' . ZENCOMMUNITY_APP_ROUTE_QUERY_VAR . '=community';

        if ( '' === $path ) {
            // Root-domain install: the community lives at the site root, so the
            // SPA's virtual routes (feed, members, live-chat, etc.) have no
            // parent path to match against. Register one rule per known SPA
            // slug so WordPress routes those URLs into the SPA template.
            /**
             * Known SPA route slugs for root-domain installs. Addons (e.g. the
             * Academy LMS integration) append their own slugs via this filter so
             * deep links / refreshes on their routes resolve to the SPA template.
             */
            $slugs = implode( '|', apply_filters( 'zencommunity/rewrite/app_slugs', [
                'signin', 'signup', 'reset-password',
                'feed',
                'groups', 'group',
                'members', 'member',
                'tickets', 'ticket',
                'chat', 'live-chat',
                'agent-activity',
                'settings',
            ] ) );

            add_rewrite_rule(
                '^(' . $slugs . ')(?:/[a-zA-Z0-9_-]+)*/?$',
                $target,
                'top'
            );

            // Make the SPA the homepage only when the user hasn't configured a
            // static front page — don't hijack a custom homepage.
            if ( 'page' !== get_option( 'show_on_front' ) ) {
                add_rewrite_rule( '^/?$', $target, 'top' );
            }
            return;
        }

        $path = str_replace( '.', '\.', $path );
        add_rewrite_rule(
            '^' . $path . '(?:/([a-zA-Z0-9_-]+))*/?$',
            $target,
            'top'
        );
    }

    public static function set_query_vars($vars){
        $vars[] = ZENCOMMUNITY_APP_ROUTE_QUERY_VAR;
        return $vars;
    }
}