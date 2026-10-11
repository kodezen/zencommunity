<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
use ZenCommunity\Database\Models\{ Profile, Group, Notification };
class Member extends Common\Base {
    use Schema\CommonSchema,
        Schema\ProfileSchema;
    public function init() : void {
        register_rest_route( $this->namespace, '/members', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [ $this, 'index' ],
            'permission_callback' => [ Permissions::class, 'can_view_all_members' ],
            'args'                => $this->member_index_schema(),
        ] );

        register_rest_route( $this->namespace, '/members/groups-permissions', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_groups_caps' ],
            'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
        ] );


        // update logged member
        register_rest_route( $this->namespace, '/member/profile', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_current' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can'  ],
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update_current' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
                'args'                => $this->schema( true )
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'delete_current' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ]
    
        ] );

        // manage members
        register_rest_route( $this->namespace, '/member/(?P<id>\d+)', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can'  ],
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->schema( true )
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'delete' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ]
    
        ] );


        // register_rest_route( $this->namespace, '/member/(?P<id>\d+)/attachments', [
        //     [
        //         'methods'             => WP_REST_Server::READABLE,
        //         'callback'            => [ $this, 'attachments' ],
        //         'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
        //         'args'                => $this->media_index_schema(),
        //     ],
        // ] );
        
        register_rest_route( $this->namespace, '/member/notifications', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'notifications' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
                'args'                => $this->notification_schema(),
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'notification_mark_as' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
                'args'                => $this->notification_mark_schema(),
            ],
        ] );

        register_rest_route( $this->namespace, '/member/notification-preferences', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_notification_preferences' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update_notification_preferences' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/settings/users', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [ $this, 'stuff_index' ],
            'permission_callback' => [ Permissions::class, 'admin_can' ],
            'args'                => $this->get_stuff_query_schema(),
        ] );

        register_rest_route( $this->namespace, '/settings/user/(?P<user_id>\d+)/groups', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [ $this, 'user_groups' ],
            'permission_callback' => [ Permissions::class, 'admin_can' ],
            'args'                => $this->member_index_schema(),
        ] );
        
        register_rest_route( $this->namespace, '/settings/user/(?P<user_id>\d+)/(?P<status>(active|inactive|pending))', [
            'methods'             => WP_REST_Server::EDITABLE,
            'callback'            => [ $this, 'change_user_status' ],
            'permission_callback' => [ Permissions::class, 'admin_can' ]
        ] );

        register_rest_route( $this->namespace, '/settings/users/sync', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'sync_users' ],
            'permission_callback' => [ Permissions::class, 'admin_can' ],
        ] );
    }

    public function get_groups_caps( WP_REST_Request $request ) : WP_REST_Response {
        try {
            return new WP_REST_Response(  Profile::get_groups_caps( get_current_user_id() ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function get_notification_preferences( WP_REST_Request $request ) : WP_REST_Response {
        $user_id = get_current_user_id();
        return new WP_REST_Response( [
            'categories'         => zencommunity_notification_pref_categories(),
            'preferences'        => zencommunity_get_user_notification_prefs( $user_id ),
            'digest_frequencies' => zencommunity_email_digest_frequencies(),
            'digest_frequency'   => zencommunity_get_user_email_digest_frequency( $user_id ),
        ] );
    }

    public function update_notification_preferences( WP_REST_Request $request ) : WP_REST_Response {
        $user_id  = get_current_user_id();
        $incoming = $request->get_param( 'preferences' );
        $incoming = is_array( $incoming ) ? $incoming : [];

        // Only persist known categories, coerced to booleans.
        $allowed = array_keys( zencommunity_notification_pref_categories() );
        $prefs   = [];
        foreach ( $allowed as $key ) {
            if ( array_key_exists( $key, $incoming ) ) {
                $prefs[ $key ] = rest_sanitize_boolean( $incoming[ $key ] );
            }
        }

        $merged = array_merge( zencommunity_get_user_notification_prefs( $user_id ), $prefs );
        update_user_meta( $user_id, 'zenc_notification_prefs', $merged );

        $frequency = $request->get_param( 'digest_frequency' );
        if ( is_string( $frequency ) && array_key_exists( $frequency, zencommunity_email_digest_frequencies() ) ) {
            update_user_meta( $user_id, 'zenc_email_digest_frequency', $frequency );
        }

        return new WP_REST_Response( [
            'categories'         => zencommunity_notification_pref_categories(),
            'preferences'        => $merged,
            'digest_frequencies' => zencommunity_email_digest_frequencies(),
            'digest_frequency'   => zencommunity_get_user_email_digest_frequency( $user_id ),
        ] );
    }

    public function index( WP_REST_Request $request ) : WP_REST_Response {
        
        $schema = apply_filters( 'zencommunity/schema/member_index', $this->member_index_schema() );
        $data = $this->get_params_by_schema( $request,  $schema );

        // if current user is not admin, it can see only active members
        if ( ! current_user_can( 'manage_options' ) ) {
            $data['status'] = 'active';
        }

        try {
            return new WP_REST_Response( Profile::index( $data ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function get_current( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $current_user  = wp_get_current_user();
            $data          = Profile::by_id( $current_user->ID, null );
            $data['email'] = esc_html( $current_user->user_email );
            return new WP_REST_Response( $data );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function update_current( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $data = $this->get_params_by_schema( $request, $this->schema() );
            
            // user can not update its status
            if( isset( $data['status'] ) ) {
                unset( $data['status'] );
            }

            $id = get_current_user_id();
            if ( Profile::update( $id, $data ) ) {
                return new WP_REST_Response( Profile::by_id( $id ) );
            }
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'Member not updated.', 'zencommunity' )
            ], 400 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function delete_current( WP_REST_Request $request ) : WP_REST_Response {
        try { 
            $params = $request->get_params();
            $id = get_current_user_id();
            if ( Profile::delete( $id ) ) {
                return new WP_REST_Response( [
                    'object_id' => $id,
                    'success' => true,
                    'message' =>  __( 'Member is deleted.', 'zencommunity' ) 
                ] );
            }
            return new WP_REST_Response( [
                'object_id' => $id,
                'success' => true,
                'message' => __( 'Member is not deleted.', 'zencommunity' )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function get( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $request->get_params();
            // if current user is not admin, it can see only active members
            $status = null; //current_user_can( 'manage_options' ) ? null : 'active';
            $data = Profile::by_id( absint( $params['id'] ), $status );
            return new WP_REST_Response( $data );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function update( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $data = $this->get_params_by_schema( $request, $this->schema() );
            $id = absint( $data['id'] ?? 0 );
            if ( Profile::update( $id, $data ) ) {
                return new WP_REST_Response( Profile::by_id( $id ) );
            }
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'Member not updated.', 'zencommunity' )
            ], 400 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function delete( WP_REST_Request $request ) : WP_REST_Response {
        try { 
            $params = $request->get_params();
            $id = absint( $params['id'] ?? 0 );
            if ( Profile::delete( $id ) ) {
                return new WP_REST_Response( [
                    'object_id' => $id,
                    'success' => true,
                    'message' =>  __( 'Member is deleted.', 'zencommunity' ) 
                ] );
            }
            return new WP_REST_Response( [
                'object_id' => $id,
                'success' => true,
                'message' => __( 'Member is not deleted.', 'zencommunity' )
            ], 422 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function notifications( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $request->get_params();
            $user_id = get_current_user_id();
            $types = explode( ',' ,sanitize_text_field( $params['type'] ?? null ) );
            $page = absint( $params['page'] ?? 0 );
            $per_page = absint( $params['per_page'] ?? 20 );
            $status = $params['status'] ?? null;
            $status = is_null( $status ) ? null : absint( $status );

            $data = Notification::index( $user_id, $status, $types, $page, $per_page );
            return new WP_REST_Response(  $data );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function notification_mark_as( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $request->get_params();
            $user_id = get_current_user_id();
            $notification_id = $params['notification_id'] ?? null;
            $notification_id = is_null( $notification_id ) ? null : absint( $notification_id );
            $is_read = $params['is_read'] ?? null;
            $is_read = is_null( $is_read ) ? 0 : absint( $is_read );

            $data = Notification::mark_as( $user_id, $is_read, $notification_id );
            return new WP_REST_Response(  $data );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function stuff_index( WP_REST_Request $request ) : WP_REST_Response {
        
        $schema = $this->member_index_schema();
        $data = $this->get_params_by_schema( $request,  $schema );

        try {
            return new WP_REST_Response( Profile::stuff_index( $data ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function user_groups( WP_REST_Request $request ) : WP_REST_Response {
        
        $schema = apply_filters( 'zencommunity/schema/user_group_index', $this->member_index_schema() );
        $data = $this->get_params_by_schema( $request,  $schema );
        $params = $request->get_params();
        $data['user_id'] = $params['user_id'];

        try {
            return new WP_REST_Response( Group::user_groups( absint( $params['user_id'] ) ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    /**
     * Backfills a `zenc_profiles` row for WordPress users that don't have one
     * yet (see Profile::sync_missing_profiles()) — one bounded batch per
     * call; the admin UI calls this once per click and reports `remaining`
     * rather than auto-looping (see Profile::sync_missing_profiles()'s own
     * doc-comment for why).
     */
    public function sync_users( WP_REST_Request $request ) : WP_REST_Response {
        try {
            return new WP_REST_Response( Profile::sync_missing_profiles() );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function change_user_status( WP_REST_Request $request ) : WP_REST_Response {
        
        $params  = $request->get_params();
        $user_id = absint( $params['user_id'] );
        $status  = sanitize_text_field( $params['status'] );

        if ( get_current_user_id() === $user_id )
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'You can\’t change your status!', 'zencommunity' )
            ], 422 );

        try {
            return new WP_REST_Response( [ 
                'success' => Profile::change_user_status( $user_id, $status ) 
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }
}