<?php
namespace ZenCommunity\Api;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Classes\MenuManager;
use ZenCommunity\Api\Common\Base;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
class Menu extends Base {
    use Schema\CommonSchema, 
        Schema\MenuSchema;

    public function init() : void {
        register_rest_route( $this->namespace, '/menus', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'all' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
            ]
        ] );

        register_rest_route( $this->namespace, '/menu/(?P<key>[a-zA-Z0-9_-]+)', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_menu' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ]
        ] );

        register_rest_route( $this->namespace, '/menu/(?P<key>[a-zA-Z0-9_-]+)/items', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'add_item' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->item_schema()
            ]
        ] );

        register_rest_route( $this->namespace, '/menu/(?P<key>[a-zA-Z0-9_-]+)/items/(?P<id>[a-zA-Z0-9_\-\.]+)', [
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update_item' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->item_schema()
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'delete_item' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ]
            ]
        ] );


        register_rest_route( $this->namespace, '/menu/(?P<key>[a-zA-Z0-9_-]+)/items/(?P<id>[a-zA-Z0-9_\-\.]+)/(?P<status>(active|deactive))', [
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update_item_status' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
        ] );

        // Works for both default and link items (unlike PUT .../items/{id},
        // which only accepts link items) — see MenuManager::update_item_roles().
        register_rest_route( $this->namespace, '/menu/(?P<key>[a-zA-Z0-9_-]+)/items/(?P<id>[a-zA-Z0-9_\-\.]+)/roles', [
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update_item_roles' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->item_roles_schema(),
            ],
        ] );

        register_rest_route( $this->namespace, '/menu/(?P<key>[a-zA-Z0-9_-]+)/reorder', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'reorder' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->reorder_schema()
            ]
        ] );
    }

    public function all( WP_REST_Request $request ) : WP_REST_Response {
        try {
            return new WP_REST_Response( static::with_shared_icons( MenuManager::get_all() ), 200 );
        } catch ( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    /**
     * Send each icon once, and point the items at it.
     *
     * A menu item's icon is a whole inline <svg>, around 1.7 KB of it, and the
     * same handful of icons repeat across the primary, top and profile menus:
     * measured on a stock install, eighteen icons of which ten were distinct —
     * 20.6 KB of markup to say ten things, on every page load, for a payload
     * that is otherwise a few hundred bytes of labels.
     *
     * Items now carry `icon.ref` into an `icons` map. The client puts `src`
     * back before anything renders (see the menus slice), so nothing that draws
     * a menu has to know this happened.
     */
    protected static function with_shared_icons( array $menus ) : array {
        $icons = [];

        foreach ( $menus as $key => $menu ) {
            if ( ! is_array( $menu['items'] ?? null ) ) {
                continue;
            }

            foreach ( $menu['items'] as $index => $item ) {
                $src = $item['icon']['src'] ?? '';

                // Nothing to share: no icon, or one small enough that a
                // reference would cost more than the value.
                if ( ! is_string( $src ) || strlen( $src ) < 64 ) {
                    continue;
                }

                $ref = substr( md5( $src ), 0, 12 );

                $icons[ $ref ] = $src;

                unset( $menus[ $key ]['items'][ $index ]['icon']['src'] );
                $menus[ $key ]['items'][ $index ]['icon']['ref'] = $ref;
            }
        }

        $menus['icons'] = (object) $icons;

        return $menus;
    }

    public function get_menu( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $key = $request['key'];
            $manager = new MenuManager( $key );
            return new WP_REST_Response( [
                'label' => MenuManager::registered_menus()[$key] ?? '',
                'items' => $manager->get_menu()
            ], 200 );
        } catch ( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function add_item( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $this->get_params_by_schema( $request, $this->item_schema() );
            $manager = new MenuManager( $request['key'] );
            // Return the created item (server-generated id included) rather than
            // just {success:true} — the client has no other way to learn the id
            // it needs for subsequent Enable/Disable/Edit/Remove calls.
            return new WP_REST_Response( $manager->add_link_item( $params ) );
        } catch ( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function update_item_status( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $this->get_params_by_schema( $request, $this->item_schema() );
            $manager = new MenuManager( $request['key'] );
            $manager->update_is_active( $request['id'], 'active' === $request['status'] ? true : false );
            return new WP_REST_Response( [ 'success' => true ] );
        } catch ( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function update_item( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $this->get_params_by_schema( $request, $this->item_schema() );
            $manager = new MenuManager( $request['key'] );
            // Return the updated item, not just {success:true} — otherwise the
            // client has nothing to replace its local copy with and the row
            // renders blank/"undefined" until the next full menu refetch.
            return new WP_REST_Response( $manager->update_link_item( $request['id'], $params ) );
        } catch ( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function update_item_roles( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $this->get_params_by_schema( $request, $this->item_roles_schema() );
            $manager = new MenuManager( $request['key'] );
            $manager->update_item_roles( $request['id'], $params['roles'] ?? null );
            return new WP_REST_Response( [ 'success' => true ] );
        } catch ( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function delete_item( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $manager = new MenuManager( $request['key'] );
            $manager->delete_link_item( $request['id'] );
            return new WP_REST_Response( [ 'success' => true ] );
        } catch ( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function reorder( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $this->get_params_by_schema( $request, $this->reorder_schema() );
            $manager = new MenuManager( $request['key'] );
            $manager->save_order( $params['ordered_ids'] );
            return new WP_REST_Response( [ 'success' => true ] );
        } catch ( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }
}
