<?php
namespace ZenCommunity\Classes;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
class MenuBuilder {
    protected array $menus = [];
    public static function init() : void {
        $ins = new static;
        $ins->menus = is_array( $menu = apply_filters( ZENCOMMUNITY_PLUGIN_SLUG . '/admin_menu', $ins->menus, $ins ) ) ? $menu : $ins->menus;
        $ins->register();
    }

    public function add_menu(
        string $page_title, 
        string $menu_title, 
        string $capability, 
        string $menu_slug, 
        callable $callback, 
        string $icon = '', 
        ?int $position = null
    ) : void  {
        $this->menus[$menu_slug] = [
            'page_title' => $page_title,
            'menu_title' => $menu_title,
            'capability' => $capability,
            'menu_slug' => $menu_slug,
            'callback' => $callback,
            'icon' => $icon,
            'position' => $position,
            'submenus' => [],
        ];
    }

    public function add_submenu(
        string $parent_slug, 
        string $page_title, 
        string $menu_title, 
        string $capability, 
        string $menu_slug, 
        callable $callback
    ) : void  {
        if ( ! isset( $this->menus[ $parent_slug ] ) ) {
            return;
        }
        $this->menus[ $parent_slug ]['submenus'][] = [
            'page_title' => $page_title,
            'menu_title' => $menu_title,
            'capability' => $capability,
            'menu_slug' => $menu_slug,
            'callback' => $callback,
        ];
    }

    public function register() : void {
            foreach ( $this->menus as $menu ) {
                add_menu_page(
                    $menu['page_title'],
                    $menu['menu_title'],
                    $menu['capability'],
                    $menu['menu_slug'],
                    $menu['callback'],
                    $menu['icon'],
                    $menu['position']
                );

                foreach ( $menu['submenus'] as $submenu ) {
                    add_submenu_page(
                        $menu['menu_slug'],
                        $submenu['page_title'],
                        $submenu['menu_title'],
                        $submenu['capability'],
                        $submenu['menu_slug'],
                        $submenu['callback']
                    );
                }
            }
    }
}
