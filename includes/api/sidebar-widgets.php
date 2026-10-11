<?php
namespace ZenCommunity\Api;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Classes\SidebarWidgetManager;
use ZenCommunity\Api\Common\Base;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;

/**
 * Settings > Appearance > Sidebar. A single GET route serves both the admin
 * UI (all widgets, including disabled ones, for manage_options users) and the
 * frontend RightSidebar (active widgets only) - same self-filtering approach
 * Menu::all() uses, so there's one source of truth instead of two routes that
 * could drift. Id-based routes are nested under /item/ rather than
 * /sidebar-widgets/{id} to avoid any ambiguity with the literal
 * /sidebar-widgets/reorder route.
 */
class SidebarWidgets extends Base {
    use Schema\SidebarWidgetSchema;

    public function init() : void {
        register_rest_route( $this->namespace, '/sidebar-widgets', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'all' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'add' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->widget_schema(),
            ],
        ] );

        register_rest_route( $this->namespace, '/sidebar-widgets/reorder', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'reorder' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->reorder_schema(),
            ],
        ] );

        register_rest_route( $this->namespace, '/sidebar-widgets/item/(?P<id>[a-zA-Z0-9_\-]+)', [
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->widget_schema(),
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'delete' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
        ] );
    }

    public function all( WP_REST_Request $request ) : WP_REST_Response {
        // ?all=1 is for the admin Sidebar settings screen only (so disabled
        // widgets are still listed to manage) - the frontend always gets
        // active-only, including for an admin browsing their own live site.
        $include_inactive = $request->get_param( 'all' ) && current_user_can( 'manage_options' );
        $widgets = $include_inactive
            ? SidebarWidgetManager::get_widgets()
            : SidebarWidgetManager::get_active_widgets();
        return new WP_REST_Response( $widgets, 200 );
    }

    public function add( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $this->get_params_by_schema( $request, $this->widget_schema() );
            $widget = SidebarWidgetManager::add_widget( $params );
            return new WP_REST_Response( [ 'success' => true, 'widget' => $widget ] );
        } catch ( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function update( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $this->get_params_by_schema( $request, $this->widget_schema() );
            $widget = SidebarWidgetManager::update_widget( $request['id'], $params );
            return new WP_REST_Response( [ 'success' => true, 'widget' => $widget ] );
        } catch ( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function delete( WP_REST_Request $request ) : WP_REST_Response {
        try {
            SidebarWidgetManager::delete_widget( $request['id'] );
            return new WP_REST_Response( [ 'success' => true ] );
        } catch ( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function reorder( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params  = $this->get_params_by_schema( $request, $this->reorder_schema() );
            $widgets = SidebarWidgetManager::reorder( $params['ordered_ids'] );
            return new WP_REST_Response( [ 'success' => true, 'widgets' => $widgets ] );
        } catch ( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }
}
