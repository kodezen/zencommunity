<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Exceptions\ZencommunityException;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Database\Models\Group as GroupModel;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
class Category extends Common\Base {
    use Schema\CommonSchema, 
        Schema\CategorySchema;
    public function init() : void {
        register_rest_route( $this->namespace, '/categories', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'index' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->index_schema(),
            ],
            [   // for create group category
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'create' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->schema()
            ],
        ] );

        register_rest_route( $this->namespace, '/categories/reorder', [
            [   // for resorting group category
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'reorder' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->ids_schema()
            ],
        ] );

        register_rest_route( $this->namespace, '/category/(?P<id>\d+)', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ],
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->schema()
            ],
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'delete' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
            ]
        ] );

        register_rest_route( $this->namespace, '/category/group-tree', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'group_tree' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
            ],
        ] );
    }

    public function index( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $schema = apply_filters( 'zencommunity/schema/category_index', $this->index_schema() );
            $data = $this->get_params_by_schema( $request,  $schema );
            return new WP_REST_Response(  GroupModel::index( $data ?? [], true ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function create( WP_REST_Request $request ) : WP_REST_Response {
        $data = $this->get_params_by_schema( $request, $this->schema() );

        try {
            if ( $id = GroupModel::create( $data ) ) {
                //return created record
                return new WP_REST_Response( GroupModel::by_id( $id, true ) );
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
            $data = GroupModel::by_id( absint( $params['id'] ), true );

            return new WP_REST_Response( $data );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function update( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $data = $this->get_params_by_schema( $request, $this->schema(), [ 'id' ] );
            $id = absint( $data['id'] ?? 0 );
            if ( GroupModel::update( $id, $data, true ) ) {
                return new WP_REST_Response( GroupModel::by_id( $id, true ) );
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
            $id = absint( $params['id'] ?? 0 );
            if ( GroupModel::delete( $id, true ) ) {
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
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function reorder( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params = $request->get_params();
            $ids = $params['ids'] ?? [];
            if ( empty( $ids ) || ! is_array( $ids ) ) {
                return new WP_REST_Response( [
                    'success' => true,
                    'message' =>  __( 'ids field is required & should be an array.', 'zencommunity' ) 
                ] );
            }
            GroupModel::reorder( $ids, null );
            return new WP_REST_Response( [
                'success' => true,
                'message' =>  __( 'Records are reordered.', 'zencommunity' ) 
            ] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function group_tree( WP_REST_Request $request ) : WP_REST_Response {
        try {
            return new WP_REST_Response( GroupModel::get_categories_with_its_groups( get_current_user_id() ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }
}