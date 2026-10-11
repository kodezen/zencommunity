<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Database\Utils\QueryBuilder;
use ZenCommunity\Exceptions\ZencommunityException;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Database\Models\Feed as FeedModel;
use ZenCommunity\Database\Models\Group as GroupModel;
use ZenCommunity\Database\Models\Poll as PollModel;
use ZenCommunity\Database\Models\Group_Member_Action;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
class Feed extends Common\Base {
    use Schema\FeedSchema;
    public function init() : void {
        register_rest_route( $this->namespace, '/feeds', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'index' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
                'args'                => $this->index_schema(),
            ],
        ] );

        register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/feeds', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'group_feed_index' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
                'args'                => $this->index_schema(),
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'create' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
                'args'                => $this->schema()
            ],
        ] );

        register_rest_route( $this->namespace, '/member/(?P<member_id>\d+)/feeds', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'member_feed_index' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
                'args'                => $this->index_schema(),
            ],
        ] );

        register_rest_route( $this->namespace, '/feed/(?P<feed_id>\d+)', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
                'args'                => $this->schema()
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'delete' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ]
        ] );

        register_rest_route( $this->namespace, '/feed/(?P<feed_id>\d+)/feature', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'toggle_feature' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/feed/(?P<feed_id>\d+)/comments', [
            [   
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'comments' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
                'args'                => $this->index_schema()
            ],
            [   
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'new_comment' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
                'args'                => $this->comment_schema()
            ],
        ] );

        register_rest_route( $this->namespace, '/feed/(?P<feed_id>\d+)/comment/(?P<comment_id>\d+)', [
            [   
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'comment_replys' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
            [   
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'new_reply' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
                'args'                => $this->comment_schema()
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update_comment' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
                'args'                => $this->comment_schema()
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'delete_comment' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ]
        ] );
        
        
        register_rest_route( $this->namespace, '/feed/(?P<feed_id>\d+)/react/(?P<type>\w+)', [
            [   
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'reacted_members' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
            ],
            [   
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'react_on_feed' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/feed/(?P<feed_id>\d+)/comment/(?P<comment_id>\d+)/react/(?P<type>\w+)', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'reacted_members_on_comment' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
            ],
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'react_on_comment' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/feed/(?P<feed_id>\d+)/approve', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'approve_post' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/feed/(?P<feed_id>\d+)/reject', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'reject_post' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/pending-posts', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'pending_posts' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
                'args'                => $this->index_schema(),
            ],
        ] );

        register_rest_route( $this->namespace, '/feed/(?P<feed_id>\d+)/poll/vote', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'poll_vote' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'poll_remove_vote' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
        ] );

        register_rest_route( $this->namespace, '/feed/(?P<feed_id>\d+)/poll/results', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'poll_results' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
        ] );
    }

    public function index( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $data = $this->get_params_by_schema( $request, $this->index_schema() );
            return new WP_REST_Response(  FeedModel::index( $data ?? [], get_current_user_id() ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function member_feed_index( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $data = $this->get_params_by_schema( $request, $this->index_schema(), [ 'member_id' ] );
            $data['member_id'] = absint( $data['member_id'] ?? 0 );
            return new WP_REST_Response(  FeedModel::index( $data ?? [], get_current_user_id() ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function group_feed_index( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $data = $this->get_params_by_schema( $request, $this->index_schema(), [ 'group_id' ] );
            $data['group_id'] = absint( $data['group_id'] ?? 0 );
            return new WP_REST_Response(  FeedModel::index( $data ?? [], get_current_user_id() ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function create( WP_REST_Request $request ) : WP_REST_Response {
        $data = $this->get_params_by_schema( $request, $this->schema(), [ 'group_id' ] );

        $group_id = absint( $data['group_id'] ?? 0 );
        $user_id = get_current_user_id();

        try {
            if ( $id = FeedModel::create( $group_id, $data, $user_id ) ) {
                //return created record
                return new WP_REST_Response( FeedModel::by_id( $id ) );
            }
            
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
            $user_id = get_current_user_id();
            $cb = null;
            if( ! current_user_can( 'manage_options' ) ) {
                if ( is_user_logged_in() ) {
                    $cb = fn( QueryBuilder $qb ) : QueryBuilder => $qb->join( 'zenc_group_members', 'spm', 'spm.group_id = fd.group_id' )->where( 'spm.user_id', '=', $user_id )->where( 'spm.status', '=', 'active' );
                } else {
                    // Guests can only read feeds from public groups; g alias is provided by add_user_info_query
                    $cb = fn( QueryBuilder $qb ) : QueryBuilder => $qb->where( 'g.privacy', '=', 'public' );
                }
            }

            $data = FeedModel::by_id( absint( $params['feed_id'] ), null, $cb, $user_id );
            if (  empty( $data ) ) {
                return new WP_REST_Response( [
                    'success' => false,
                    'message' => __( 'Unauthorized.', 'zencommunity' )
                ], 401 );
            }
            // if feed status is draft, then check current user is creator or not
            if ( 'draft' === $data['status'] && absint( $data['user_id'] ) !== $user_id ) {
                return new WP_REST_Response( [
                    'success' => false,
                    'message' => __( 'Unauthorized.', 'zencommunity' )
                ], 401 );
            }

            return new WP_REST_Response( $data );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function update( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $data = $this->get_params_by_schema( $request, $this->schema(), [ 'feed_id' ]  );

            $feed_id = absint( $data['feed_id'] ?? 0 );
            $user_id = get_current_user_id();

            if ( FeedModel::update( $feed_id, $data, $user_id ) ) {
                return new WP_REST_Response( FeedModel::by_id( $feed_id ) );
            }
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'Record not updated.', 'zencommunity' )
            ], 400 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function delete( WP_REST_Request $request ) : WP_REST_Response {
        try { 
            $params = $request->get_params();
            $feed_id = absint( $params['feed_id'] ?? 0 );
            $user_id = get_current_user_id();
            if ( FeedModel::delete( $feed_id, $user_id ) ) {
                return new WP_REST_Response( [
                    'object_id' => $feed_id,
                    'success' => true,
                    'message' =>  __( 'Record is deleted.', 'zencommunity' ) 
                ] );
            }
            return new WP_REST_Response( [
                'object_id' => $feed_id,
                'success' => true,
                'message' => __( 'Record is not deleted.', 'zencommunity' )
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    
    public function comments( WP_REST_Request $request ) : WP_REST_Response {
        try { 
            $params = $request->get_params();
            $user_id = get_current_user_id();
            $feed_id = absint( $params['feed_id'] ?? 0 );
            $order_by = sanitize_text_field( $params['order_by'] ?? 'created_at' );
            $order = sanitize_text_field( $params['order'] ?? 'ASC' );

            $data = [];
            $data['add_media_ids'] = $params['add_media_ids'] ?? [];
            $data['content'] = wp_kses_post( $params['content'] ?? '' );
            return new WP_REST_Response( FeedModel::get_comments(
                $feed_id,
                $user_id, 
                null, 
                $order_by,
                $order 
            ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }
    
    public function comment_replys( WP_REST_Request $request ) : WP_REST_Response {
        try { 
            $params = $request->get_params();
            $user_id = get_current_user_id();
            $feed_id = absint( $params['feed_id'] ?? 0 );
            $comment_id = absint( $params['comment_id'] ?? 0 );
            $order_by = sanitize_text_field( $params['order_by'] ?? 'created_at' );
            $order = sanitize_text_field( $params['order'] ?? 'ASC' );

            $data = [];
            $data['add_media_ids'] = $params['add_media_ids'] ?? [];
            $data['content'] = wp_kses_post( $params['content'] ?? '' );
            return new WP_REST_Response( FeedModel::get_comments(
                $feed_id,
                $user_id, 
                $comment_id, 
                $order_by,
                $order 
            ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function new_comment( WP_REST_Request $request ) : WP_REST_Response {
        try { 
            $params = $request->get_params();
            $feed_id = absint( $params['feed_id'] ?? 0 );
            $user_id = get_current_user_id();

            $data = [];
            $data['add_media_ids'] = $params['add_media_ids'] ?? [];
            $data['content'] = wp_kses_post( $params['content'] ?? '' );
            $data['meta'] = $params['meta'] ?? [];

            if ( $data = FeedModel::comment( $feed_id, $user_id, $data ) ) {
                return new WP_REST_Response( $data );
            }
            return new WP_REST_Response( [ 'success' => false, 'message' => __( 'Operation failed.', 'zencommunity' ) ], 422 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function new_reply( WP_REST_Request $request ) : WP_REST_Response {
        try { 
            $params = $request->get_params();
            $feed_id = absint( $params['feed_id'] ?? 0 );
            $comment_id = absint( $params['comment_id'] ?? 0 );
            $user_id = get_current_user_id();

            $data = [];
            $data['add_media_ids'] = $params['add_media_ids'] ?? [];
            $data['content'] = wp_kses_post( $params['content'] ?? '' );
            $data['meta'] = $params['meta'] ?? [];

            if ( $data = FeedModel::comment( $feed_id, $user_id, $data, $comment_id ) ) {
                return new WP_REST_Response( $data );
            }
            return new WP_REST_Response( [ 'success' => false, 'message' => __( 'Operation failed.', 'zencommunity' ) ], 422 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function update_comment( WP_REST_Request $request ) : WP_REST_Response {
        try { 
            $params = $request->get_params();
            $feed_id = absint( $params['feed_id'] ?? 0 );
            $comment_id = absint( $params['comment_id'] ?? 0 );
            $user_id = get_current_user_id();

            $data = [];
            $data['add_media_ids'] = $params['add_media_ids'] ?? [];
            $data['remove_media_ids'] = $params['remove_media_ids'] ?? [];
            $data['content'] = wp_kses_post( $params['content'] ?? '' );
            $data['meta'] = $params['meta'] ?? [];

            if ( $data = FeedModel::edit_comment( $feed_id, $user_id, $comment_id, $data ) ) {
                return new WP_REST_Response( $data );
            }
            return new WP_REST_Response( [ 'success' => false, 'message' => __( 'Operation failed.', 'zencommunity' ) ], 422 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function delete_comment( WP_REST_Request $request ) : WP_REST_Response {
        try { 
            $params = $request->get_params();
            $feed_id = absint( $params['feed_id'] ?? 0 );
            $comment_id = absint( $params['comment_id'] ?? 0 );
            $user_id = get_current_user_id();

            if ( $data = FeedModel::delete_comment( $feed_id, $user_id, $comment_id ) ) {
                return new WP_REST_Response( $data );
            }
            return new WP_REST_Response( [ 'success' => false, 'message' => __( 'Operation failed.', 'zencommunity' ) ], 422 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function react_on_feed( WP_REST_Request $request ) : WP_REST_Response {
        try { 
            $params = $request->get_params();
            $feed_id = absint( $params['feed_id'] ?? 0 );
            $type = sanitize_text_field( $params['type'] ?? '' );
            $user_id = get_current_user_id();

            if ( $data = FeedModel::react( $feed_id, $type, $user_id ) ) {
                return new WP_REST_Response( $data );
            }
            return new WP_REST_Response( [ 'success' => false, 'message' => __( 'Operation failed.', 'zencommunity' ) ], 422 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function react_on_comment( WP_REST_Request $request ) : WP_REST_Response {
        try { 
            $params = $request->get_params();
            $feed_id = absint( $params['feed_id'] ?? 0 );
            $type = sanitize_text_field( $params['type'] ?? '' );
            $comment_id = absint( $params['comment_id'] ?? 0 );
            $user_id = get_current_user_id();

            if ( $data = FeedModel::react( $feed_id, $type, $user_id, $comment_id ) ) {
                return new WP_REST_Response( $data );
            }
            return new WP_REST_Response( [ 'success' => false, 'message' => __( 'Operation failed.', 'zencommunity' ) ], 422 );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function reacted_members( WP_REST_Request $request ) : WP_REST_Response {
        try { 
            $params = $request->get_params();
            $feed_id = absint( $params['feed_id'] ?? 0 );
            $type = sanitize_text_field( $params['type'] ?? 'like' );
            $user_id = get_current_user_id();
            $data = FeedModel::get_reacted_members( 
                $feed_id, $user_id, $type 
            );
            return new WP_REST_Response( $data );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function reacted_members_on_comment( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $request->get_params();
            $feed_id = absint( $params['feed_id'] ?? 0 );
            $comment_id = absint( $params['comment_id'] ?? 0 );
            $type = sanitize_text_field( $params['type'] ?? 'like' );
            $user_id = get_current_user_id();
            $data = FeedModel::get_reacted_members(
                $feed_id, $user_id, $type, $comment_id
            );
            return new WP_REST_Response( $data );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function toggle_feature( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params  = $request->get_params();
            $feed_id = absint( $params['feed_id'] ?? 0 );
            $user_id = get_current_user_id();

            $feed = FeedModel::by_id( $feed_id );
            if ( empty( $feed ) ) {
                throw new ZencommunityException( esc_html__( 'Post not found.', 'zencommunity' ), 404 );
            }

            $group_id       = absint( $feed['group_id'] ?? 0 );
            $is_group_admin = current_user_can( 'manage_options' );

            if ( ! $is_group_admin && $group_id ) {
                global $wpdb;
                $role = $wpdb->get_var( $wpdb->prepare(
                    "SELECT role FROM {$wpdb->prefix}zenc_group_members WHERE group_id = %d AND user_id = %d AND status = 'active'",
                    $group_id, $user_id
                ) );
                $is_group_admin = ( $role === 'admin' );
            }

            if ( ! $is_group_admin ) {
                throw new ZencommunityException( esc_html__( 'You do not have permission to feature posts.', 'zencommunity' ), 403 );
            }

            $new_value = empty( $feed['is_featured'] ) ? 1 : 0;
            global $wpdb;
            $wpdb->update(
                $wpdb->prefix . 'zenc_feeds',
                [ 'is_featured' => $new_value ],
                [ 'id'          => $feed_id ],
                [ '%d' ],
                [ '%d' ]
            );

            return new WP_REST_Response( FeedModel::by_id( $feed_id ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    private function get_post_approval_actor( int $feed_id ) : array {
        $feed = FeedModel::by_id( $feed_id );
        if ( empty( $feed ) ) {
            throw new ZencommunityException( esc_html__( 'Post not found.', 'zencommunity' ), 404 );
        }
        $user_id  = get_current_user_id();
        $group_id = absint( $feed['group_id'] ?? 0 );
        $is_admin = user_can( $user_id, 'manage_options' )
            || GroupModel::is_member_of( $user_id, $group_id, [ 'admin', 'moderator' ] );
        if ( ! $is_admin ) {
            throw new ZencommunityException( esc_html__( 'You do not have permission to moderate posts.', 'zencommunity' ), 403 );
        }
        return $feed;
    }

    public function approve_post( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $feed_id = absint( $request->get_param( 'feed_id' ) );
            $feed    = $this->get_post_approval_actor( $feed_id );

            if ( $feed['status'] !== 'pending' ) {
                return new WP_REST_Response( [ 'success' => false, 'message' => __( 'Post is not pending approval.', 'zencommunity' ) ], 422 );
            }

            global $wpdb;
            $wpdb->update(
                $wpdb->prefix . 'zenc_feeds',
                [ 'status' => 'published', 'updated_at' => current_time( 'mysql', true ) ],
                [ 'id' => $feed_id ],
                [ '%s', '%s' ],
                [ '%d' ]
            );

            do_action( 'zencommunity/feed/approved', $feed_id, $feed );

            return new WP_REST_Response( FeedModel::by_id( $feed_id ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function reject_post( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $feed_id = absint( $request->get_param( 'feed_id' ) );
            $feed    = $this->get_post_approval_actor( $feed_id );

            if ( $feed['status'] !== 'pending' ) {
                return new WP_REST_Response( [ 'success' => false, 'message' => __( 'Post is not pending approval.', 'zencommunity' ) ], 422 );
            }

            global $wpdb;
            $wpdb->update(
                $wpdb->prefix . 'zenc_feeds',
                [ 'status' => 'rejected', 'updated_at' => current_time( 'mysql', true ) ],
                [ 'id' => $feed_id ],
                [ '%s', '%s' ],
                [ '%d' ]
            );

            do_action( 'zencommunity/feed/rejected', $feed_id, $feed );

            return new WP_REST_Response( [ 'success' => true ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function pending_posts( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $group_id = absint( $request->get_param( 'group_id' ) );
            $user_id  = get_current_user_id();
            $is_admin = user_can( $user_id, 'manage_options' )
                || GroupModel::is_member_of( $user_id, $group_id, [ 'admin', 'moderator' ] );
            if ( ! $is_admin ) {
                throw new ZencommunityException( esc_html__( 'You do not have permission to view pending posts.', 'zencommunity' ), 403 );
            }
            $data             = $this->get_params_by_schema( $request, $this->index_schema() );
            $data['group_id'] = $group_id;
            $data['status']   = 'pending';
            return new WP_REST_Response( FeedModel::index( $data, $user_id ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function poll_vote( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $user_id    = get_current_user_id();
            $feed_id    = absint( $request->get_param( 'feed_id' ) );
            $option_ids = array_map( 'intval', (array) $request->get_param( 'option_ids' ) );

            if ( empty( $option_ids ) ) {
                throw new ZencommunityException( esc_html__( 'No options provided.', 'zencommunity' ), 400 );
            }

            $feed = FeedModel::by_id( $feed_id, null, null, $user_id );
            if ( ! empty( $feed['group_id'] ) ) {
                $group_id = intval( $feed['group_id'] );
                if ( ! GroupModel::is_member_of( $user_id, $group_id ) ) {
                    throw new ZencommunityException( esc_html__( 'You must be a group member to vote.', 'zencommunity' ), 403 );
                }
                if ( Group_Member_Action::is_muted( $user_id, $group_id ) ) {
                    throw new ZencommunityException( esc_html__( 'Unauthorized.', 'zencommunity' ), 401 );
                }
            }

            PollModel::vote( $feed_id, $user_id, $option_ids );
            $results = PollModel::get_results( $feed_id, $user_id );

            return new WP_REST_Response( [ 'success' => true, 'poll' => $results ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function poll_remove_vote( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $user_id = get_current_user_id();
            $feed_id = absint( $request->get_param( 'feed_id' ) );

            $feed = FeedModel::by_id( $feed_id, null, null, $user_id );
            if ( ! empty( $feed['group_id'] ) ) {
                $group_id = intval( $feed['group_id'] );
                if ( ! GroupModel::is_member_of( $user_id, $group_id ) ) {
                    throw new ZencommunityException( esc_html__( 'You must be a group member to remove your vote.', 'zencommunity' ), 403 );
                }
                if ( Group_Member_Action::is_muted( $user_id, $group_id ) ) {
                    throw new ZencommunityException( esc_html__( 'Unauthorized.', 'zencommunity' ), 401 );
                }
            }

            PollModel::remove_vote( $feed_id, $user_id );
            $results = PollModel::get_results( $feed_id, $user_id );

            return new WP_REST_Response( [ 'success' => true, 'poll' => $results ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function poll_results( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $user_id = get_current_user_id();
            $feed_id = absint( $request->get_param( 'feed_id' ) );
            $results = PollModel::get_results( $feed_id, $user_id );

            return new WP_REST_Response( $results );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }
}