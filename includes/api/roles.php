<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Exceptions\ZencommunityException;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Database\Models\Profile;
use ZenCommunity\Database\Models\CustomRole;
use ZenCommunity\Classes\{ Sanitizer, RoleManager };
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
class Roles extends Common\Base {
    use Schema\CommonSchema, 
        Schema\RoleSchema;
    public function init() : void {
        register_rest_route( $this->namespace, '/roles', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'index' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'update' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->schema()
            ],
        ] );

        register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/member/(?P<user_id>\d+)/roles', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_user_group_caps' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'group_role_update' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->group_role_update_schema()
            ],
        ] );

        register_rest_route( $this->namespace, '/roles/capabilities', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'capabilities' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/roles/group', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'group_roles' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/roles/custom', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'custom_index' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'custom_create' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/roles/custom/item/(?P<id>\d+)', [
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'custom_update' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'custom_delete' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/global-roles', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_global_roles' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/wp-roles', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_wp_roles' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/ticket/support-stuff/(?P<user_id>[0-9]+)/roles',  [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_global_role_by_user' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'add_or_remove_global_role' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->global_role_add_remove_schema()
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'edit_global_role_perms_by_user' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->global_role_update_schema()
            ]
        ] );
    }

    protected function roles_wrapper( array $roles ) : array {
        $data = [];
        foreach ( $roles as $role => [ 'capabilities' => $capabilities ] ) {
            foreach ( $capabilities as $capability => [ 'disabled' => $disabled ] ) {
                $data[$role][$capability] = ! $disabled;
            }
        }
        return $data;
    }

    protected function user_roles_wrapper( array $role ) : array {
        $data = [];
        foreach ( $role['capabilities'] as $capability => [ 'disabled' => $disabled ] ) {
            $data[$capability] = ! $disabled;
        }
        return $data;
    }

    public function index( WP_REST_Request $request ) : WP_REST_Response {
        try {
            return new WP_REST_Response( $this->roles_wrapper( RoleManager::roles() ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }


    public function update( WP_REST_Request $request ) : WP_REST_Response {
        $role_action = $this->get_params_by_schema( $request, $this->schema() );

        try {
            return new WP_REST_Response( [
                'success' => RoleManager::update( $role_action ),
            ], 200 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    /**
     * Flat {slug, label, is_custom} list of every group-scoped role - what
     * the "change member's role" dropdown (Group members page) and the
     * Role and Permission settings screen both need, as opposed to index()'s
     * {role: {capability: bool}} shape built for the permission matrix.
     */
    public function group_roles( WP_REST_Request $request ) : WP_REST_Response {
        $roles = RoleManager::roles();
        $data  = [];
        foreach ( RoleManager::group_role_keys() as $slug ) {
            $data[] = [
                'slug'      => $slug,
                'label'     => $roles[ $slug ]['label'] ?? $slug,
                'is_custom' => ! in_array( $slug, RoleManager::BUILT_IN_ROLES, true ),
            ];
        }
        return new WP_REST_Response( $data, 200 );
    }

    public function capabilities( WP_REST_Request $request ) : WP_REST_Response {
        $data = [];
        foreach ( RoleManager::capability_catalog() as $key => $label ) {
            $data[] = [ 'key' => $key, 'label' => $label ];
        }
        return new WP_REST_Response( $data, 200 );
    }

    public function custom_index( WP_REST_Request $request ) : WP_REST_Response {
        return new WP_REST_Response( CustomRole::all(), 200 );
    }

    public function custom_create( WP_REST_Request $request ) : WP_REST_Response {
        try {
            return new WP_REST_Response( [
                'success' => true,
                'role'    => CustomRole::create( $request->get_params() ),
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function custom_update( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $id = absint( $request->get_param( 'id' ) );
            return new WP_REST_Response( [
                'success' => true,
                'role'    => CustomRole::update( $id, $request->get_params() ),
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function custom_delete( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $id = absint( $request->get_param( 'id' ) );
            return new WP_REST_Response( [ 'success' => CustomRole::delete( $id ), 'id' => $id ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function get_global_roles( WP_REST_Request $request ) : WP_REST_Response {
        return new WP_REST_Response( RoleManager::global_roles(), 200 );
    }

    public function get_wp_roles( WP_REST_Request $request ) : WP_REST_Response {
        $roles = [];
        foreach ( wp_roles()->get_names() as $slug => $label ) {
            $roles[] = [ 'slug' => $slug, 'label' => translate_user_role( $label ) ];
        }
        return new WP_REST_Response( $roles, 200 );
    }

    public function get_user_group_caps( WP_REST_Request $request ) : WP_REST_Response {

        $params = $request->get_params();
        $user_id  = absint( $params['user_id'] ?? 0 );
        $group_id = absint( $params['group_id'] ?? 0 );

        try {
            return new WP_REST_Response( 
                $this->user_roles_wrapper( Profile::get_user_group_caps( $user_id, $group_id ) ),
                200 
            );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function group_role_update( WP_REST_Request $request ) : WP_REST_Response {
        $role_action = $this->get_params_by_schema( $request, $this->group_role_update_schema() );

        $params = $request->get_params();
        $user_id  = absint( $params['user_id'] ?? 0 );
        $group_id = absint( $params['group_id'] ?? 0 );

        try {
            return new WP_REST_Response( [
                'success' => Profile::group_role_update( $user_id, $group_id, $role_action ),
            ], 200 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function get_global_role_by_user( WP_REST_Request $request ) : WP_REST_Response {

        $params = $request->get_params();
        $user_id  = absint( $params['user_id'] ?? 0 );

        try {
            return new WP_REST_Response( 
                $this->roles_wrapper( RoleManager::get_global_roles_by_user_id( $user_id ) ),
                200 
            );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function edit_global_role_perms_by_user( WP_REST_Request $request ) : WP_REST_Response {
        $role_action = $this->get_params_by_schema( $request, $this->global_role_update_schema() );

        $params = $request->get_params();
        $user_id  = absint( $params['user_id'] ?? 0 );
        try {
            return new WP_REST_Response( [
                'success' => RoleManager::update_global_roles_perm_by_user_id( $user_id, $role_action ),
            ], 200 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }
    
    public function add_or_remove_global_role( WP_REST_Request $request ) : WP_REST_Response {
        $role_action = $this->get_params_by_schema( $request, $this->global_role_add_remove_schema() );

        $params = $request->get_params();
        $user_id  = absint( $params['user_id'] ?? 0 );
        try {
            return new WP_REST_Response( [
                'success' => RoleManager::update_global_roles_by_user_id( $user_id, $role_action ),
            ], 200 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }
}