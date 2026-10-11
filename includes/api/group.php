<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Database\Models\Group as GroupModel;
use ZenCommunity\Database\Models\Group_Member_Action;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
class Group extends Common\Base {
    use Schema\CommonSchema, 
        Schema\GroupSchema;
    public function init() : void {
        // to get all groups
        register_rest_route( $this->namespace, '/groups', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'groups' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can'  ],
                'args'                => $this->groups_index_schema(),
            ],
            [   // for create group category
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'create' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->schema()
            ],
        ] );
        register_rest_route( $this->namespace, '/current-user-postable-groups', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'current_user_postable_groups' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can'  ],
                'args'                => $this->index_schema(),
            ],
        ] );
        // to get all groups of a user
        register_rest_route( $this->namespace, '/member/(?P<user_id>\d+)/groups', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'groups_by_user_id' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can'  ],
                'args'                => $this->index_schema(),
            ],
        ] );
        // to get all groups in a category
        register_rest_route( $this->namespace, '/category/(?P<category_id>\d+)/groups', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'groups_by_category_id' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can'  ],
                'args'                => $this->index_schema(),
            ],
            [   // for create group category
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'create' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->schema()
            ],
        ] );

        // manage groups
        register_rest_route( $this->namespace, '/group/(?P<id>\d+)', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can'  ],
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
                'args'                => $this->schema( true )
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'delete' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ]
    
        ] );

        // Reorder
         register_rest_route( $this->namespace, '/category/(?P<category_id>\d+)/groups/reorder', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'reorder' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->ids_schema()
            ]
        ] );

        // get group members with pagination
        register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/members', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'members' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can'  ],
                'args'                => $this->index_schema(),
            ]
        ] );

        // add members to group
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/add-member', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'add_member' ],
                'permission_callback' => [ Permissions::class, 'group_admin_can' ],
                'args'                => $this->add_member_schema()
            ]
        ] );

        // remove members from group
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/remove-member', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'remove_member' ],
                'permission_callback' => [ Permissions::class, 'group_admin_can' ],
                'args'                => $this->id_schema()
            ]
        ] );

        // change members role 
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/change-member-role', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'change_member_role' ],
                'permission_callback' => [ Permissions::class, 'group_admin_can' ],
                'args'                => $this->role_schema()
            ]
        ] );

        // change members status
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/change-member-status', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'change_member_status' ],
                'permission_callback' => [ Permissions::class, 'group_admin_can' ],
                'args'                => $this->status_schema()
            ]
        ] );

        // warn a member
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/warn-member', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'warn_member' ],
                'permission_callback' => [ Permissions::class, 'group_admin_can' ],
                'args'                => $this->member_action_schema()
            ]
        ] );

        // mute a member
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/mute-member', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'mute_member' ],
                'permission_callback' => [ Permissions::class, 'group_admin_can' ],
                'args'                => $this->member_action_schema()
            ]
        ] );

        // unmute a member
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/unmute-member', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'unmute_member' ],
                'permission_callback' => [ Permissions::class, 'group_admin_can' ],
                'args'                => $this->id_schema()
            ]
        ] );

        // suspend a member
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/suspend-member', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'suspend_member' ],
                'permission_callback' => [ Permissions::class, 'group_admin_can' ],
                'args'                => $this->suspend_member_schema()
            ]
        ] );

        // unsuspend a member
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/unsuspend-member', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'unsuspend_member' ],
                'permission_callback' => [ Permissions::class, 'group_admin_can' ],
                'args'                => $this->id_schema()
            ]
        ] );

        // a member's moderation action history
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/member-actions', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'member_actions' ],
                'permission_callback' => [ Permissions::class, 'group_admin_can' ],
                'args'                => $this->id_schema()
            ]
        ] );

        // list of currently-muted members (mute has no zenc_group_members.status value to filter by, unlike banned/suspended)
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/muted-members', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'muted_members' ],
                'permission_callback' => [ Permissions::class, 'group_admin_can' ],
            ]
        ] );

        // send join req to a group
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/join', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'join' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ]
        ] );

        // leave from a category
         register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/leave', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'leave' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ]
        ] );
    }
    
    /**
     * GET /groups args: the common index params plus the list filters used by
     * the admin Spaces table (type, privacy, collection).
     */
    public function groups_index_schema() : array {
        return array_merge( $this->index_schema(), [
            'type' => [
                'required'    => false,
                'type'        => 'string',
                'description' => __( 'Only Spaces of this type (e.g. discussion, event).', 'zencommunity' ),
            ],
            'privacy' => [
                'required'    => false,
                'type'        => 'string',
                'enum'        => [ 'public', 'private', 'hidden' ],
                'description' => __( 'Only Spaces with this privacy.', 'zencommunity' ),
            ],
            'category_id' => [
                'required'    => false,
                'type'        => 'integer',
                'description' => __( 'Only Spaces in this collection (0 = uncategorised).', 'zencommunity' ),
            ],
        ] );
    }

    public function groups( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $schema = apply_filters( 'zencommunity/schema/group_index', $this->groups_index_schema() );
            $data = $this->get_params_by_schema( $request,  $schema );

            // show only published groups if user is not admin
            if( ! current_user_can( 'manage_options' ) ) {
                $data['status'] = 'published';
            }

            if ( ! is_user_logged_in() ) {
                $data['is_guest'] = true;
            }

            $logged_user_id = get_current_user_id();
            return new WP_REST_Response(  GroupModel::index( $data ?? [], false, $logged_user_id ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function current_user_postable_groups( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $schema = apply_filters( 'zencommunity/schema/group_index', $this->index_schema() );
            $data = $this->get_params_by_schema( $request,  $schema );

            $data['current_user_can_post'] = true;
            $data['is_annonymous_enabled'] = boolval( 
                $request['is_annonymous_enabled'] ?? false 
            );
            // show only published groups if user is not admin
            if( ! current_user_can( 'manage_options' ) ) {
                $data['status'] = 'published';
            }

            if ( ! is_user_logged_in() ) {
                throw new ZencommunityException( esc_html__( 'Unauthorized', 'zencommunity' ), 400 );
            }

            $logged_user_id = get_current_user_id();
            return new WP_REST_Response(  GroupModel::index( $data ?? [], false, $logged_user_id ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function groups_by_user_id( WP_REST_Request $request ) : WP_REST_Response {
        try {
            
            $schema = apply_filters( 'zencommunity/schema/group_index', $this->index_schema() );
            $data = $this->get_params_by_schema( $request,  $schema );

            // show user membership groups 
            $data['user_id'] = absint( $request['user_id'] ?? 0 );

            // show only published groups if user is not admin
            if( ! current_user_can( 'manage_options' ) ) {
                $data['status'] = 'published';
            }

            if ( ! is_user_logged_in() ) {
                $data['is_guest'] = true;
            }

            $logged_user_id = get_current_user_id();
            return new WP_REST_Response(  GroupModel::index( $data ?? [], false, $logged_user_id ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function groups_by_category_id( WP_REST_Request $request ) : WP_REST_Response {
        try {
            
            $schema = apply_filters( 'zencommunity/schema/group_index', $this->index_schema() );
            $data = $this->get_params_by_schema( $request,  $schema, [ 'category_id' ] );

            // show groups by category id
            $data['category_id'] = absint( $data['category_id'] ?? 0 );

            // show only published groups if user is not admin
            if( ! current_user_can( 'manage_options' ) ) {
                $data['status'] = 'published';
            }

            if ( ! is_user_logged_in() ) {
                $data['is_guest'] = true;
            }
            
            $logged_user_id = get_current_user_id();
            return new WP_REST_Response(  GroupModel::index( $data ?? [], false, $logged_user_id ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function create( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $data = $this->get_params_by_schema( $request, $this->schema(), [ 'category_id' ] );
            
            $category_id = isset( $data['category_id']) ? absint( $data['category_id'] ) : 0;

            $id = GroupModel::create( $data, $category_id );
            //return created record
            return new WP_REST_Response( GroupModel::by_id( $id, FALSE ) );
            
            return new WP_REST_Response( [
                'success' => $id,
                'message' => __( 'An unknwon error is occured, please try again later.', 'zencommunity' )
            ], 422 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function get( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $request->get_params();

            // only admin can access group which is not published yet
            $status = current_user_can( 'manage_options' ) ? null : 'published';
            $user_id = get_current_user_id();
            
            $data = GroupModel::by_id( absint( $params['id'] ), FALSE, $status, $user_id );
            if ( empty( $data ) ) {
                return new WP_REST_Response( [
                    'success' => false,
                    'message' => __( 'Record not found.', 'zencommunity' )
                ], 404 );
            }
            
            return new WP_REST_Response( $data );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function update( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $data = $this->get_params_by_schema( $request, $this->schema(), [ 'id'] );
            $id = absint( $data['id'] ?? 0 );
            $actor_user_id = get_current_user_id();

            if ( GroupModel::update( $id, $data, false, false, $actor_user_id ) ) {
                return new WP_REST_Response( GroupModel::by_id( $id, false ) );
            }
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'Record not updated.', 'zencommunity' )
            ], 422 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function delete( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $request->get_params();
            $id = absint( $params['id'] ?? 0 );
            if ( GroupModel::delete( $id, false ) ) {
                return new WP_REST_Response( [
                    'object_id' => $id,
                    'success' => true,
                    'message' =>  __( 'Record is deleted.', 'zencommunity' ) 
                ] );
            }
            return new WP_REST_Response( [
                'object_id' => $id,
                'success' => true,
                'message' => __( 'Record is not deleted.', 'zencommunity' )
            ], 422 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function reorder( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $request->get_params();
            $category_id = absint( $params['category_id'] ?? 0 );
            $ids = $params['ids'] ?? [];
            if ( empty( $ids ) || ! is_array( $ids ) ) {
                return new WP_REST_Response( [
                    'success' => true,
                    'message' =>  __( 'ids field is required & should be an array.', 'zencommunity' ) 
                ] );
            }
            GroupModel::reorder( $ids, $category_id );
            return new WP_REST_Response( [
                'success' => true,
                'message' =>  __( 'Records are reordered.', 'zencommunity' ) 
            ], 200 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    
    public function members( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $request->get_params();
            $group_id = absint( $params['group_id'] ?? 0 );
            $logged_user_id = get_current_user_id();
            return new WP_REST_Response( GroupModel::members( $group_id, $params, $logged_user_id ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function add_member( WP_REST_Request $request ) : WP_REST_Response {
        $params = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $user_id = absint( $params['id'] ?? 0 );
        $role = $params['role'] ?? null;
        $status = $params['status'] ?? null;
        $actor_user_id = get_current_user_id();

        try {
            return new WP_REST_Response( [
                'success' => GroupModel::add_member( $user_id, $group_id, $role, $status, $actor_user_id )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function remove_member( WP_REST_Request $request ) : WP_REST_Response {
        $params = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $user_id = absint( $params['id'] ?? 0 );
        $actor_user_id = get_current_user_id();

        if ( get_current_user_id() === $user_id )
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'You can\’t remove yourself from this group.', 'zencommunity' )
            ], 422 );

        try {
            return new WP_REST_Response( [
                'success' => GroupModel::remove_member( $user_id, $group_id, $actor_user_id )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function change_member_role( WP_REST_Request $request ) : WP_REST_Response {
        $params = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $user_id = absint( $params['id'] ?? 0 );
        $role =  $params['role'] ?? null;
        $actor_user_id = get_current_user_id();

        if ( get_current_user_id() === $user_id )
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'You can\’t change your role!', 'zencommunity' )
            ], 422 );

        try {
            return new WP_REST_Response( [
                'success' => GroupModel::change_member_role( $user_id, $group_id, $role, $actor_user_id )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function change_member_status( WP_REST_Request $request ) : WP_REST_Response {
        $params = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $user_id = absint( $params['id'] ?? 0 );
        $status =  $params['status'] ?? null;
        $actor_user_id = get_current_user_id();

        if ( get_current_user_id() === $user_id )
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'You can\’t change your status!', 'zencommunity' )
            ], 422 );

        try {
            return new WP_REST_Response( [
                'success' => GroupModel::change_member_status( $user_id, $group_id, $status, $actor_user_id )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function warn_member( WP_REST_Request $request ) : WP_REST_Response {
        $params   = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $user_id  = absint( $params['id'] ?? 0 );
        $actor_id = get_current_user_id();

        if ( $actor_id === $user_id )
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'You can\’t warn yourself!', 'zencommunity' )
            ], 422 );

        try {
            return new WP_REST_Response( [
                'success' => (bool) Group_Member_Action::warn( $group_id, $user_id, $actor_id, $params['reason'] ?? '', $params['note'] ?? '' )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function mute_member( WP_REST_Request $request ) : WP_REST_Response {
        $params   = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $user_id  = absint( $params['id'] ?? 0 );
        $actor_id = get_current_user_id();

        if ( $actor_id === $user_id )
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'You can\’t mute yourself!', 'zencommunity' )
            ], 422 );

        try {
            return new WP_REST_Response( [
                'success' => (bool) Group_Member_Action::mute( $group_id, $user_id, $actor_id, $params['reason'] ?? '', $params['note'] ?? '' )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function unmute_member( WP_REST_Request $request ) : WP_REST_Response {
        $params   = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $user_id  = absint( $params['id'] ?? 0 );

        try {
            return new WP_REST_Response( [
                'success' => Group_Member_Action::unmute( $group_id, $user_id )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function suspend_member( WP_REST_Request $request ) : WP_REST_Response {
        $params   = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $user_id  = absint( $params['id'] ?? 0 );
        $actor_id = get_current_user_id();
        $duration = $params['duration'] ?? '';

        if ( $actor_id === $user_id )
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'You can\’t suspend yourself!', 'zencommunity' )
            ], 422 );

        try {
            return new WP_REST_Response( [
                'success' => (bool) Group_Member_Action::suspend( $group_id, $user_id, $actor_id, $params['reason'] ?? '', $params['note'] ?? '', $duration )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function unsuspend_member( WP_REST_Request $request ) : WP_REST_Response {
        $params   = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $user_id  = absint( $params['id'] ?? 0 );
        $actor_id = get_current_user_id();

        try {
            return new WP_REST_Response( [
                'success' => Group_Member_Action::unsuspend( $group_id, $user_id, $actor_id )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function member_actions( WP_REST_Request $request ) : WP_REST_Response {
        $params   = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $user_id  = absint( $params['id'] ?? 0 );

        try {
            return new WP_REST_Response( [
                'success' => true,
                'actions' => Group_Member_Action::list_for_member( $group_id, $user_id )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function muted_members( WP_REST_Request $request ) : WP_REST_Response {
        $params   = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );

        try {
            return new WP_REST_Response( [
                'success' => true,
                'records' => Group_Member_Action::list_active_members( $group_id, 'mute' )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }



    public function join( WP_REST_Request $request ) : WP_REST_Response {
        $params = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $user_id = get_current_user_id();

        if ( ! GroupModel::user_can_join( $user_id, $group_id  ) ) {
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'Unauthorized.', 'zencommunity' )
            ], 401 );
        }

        try {
            return new WP_REST_Response( [
                'success' => GroupModel::add_member( $user_id, $group_id )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function leave( WP_REST_Request $request ) : WP_REST_Response {
        $params = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $user_id = get_current_user_id();

        try {
            return new WP_REST_Response( [
                'success' => GroupModel::remove_member( $user_id, $group_id )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }
}