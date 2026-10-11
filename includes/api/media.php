<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Exceptions\ZencommunityException;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Database\Models\Attachment;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
class Media extends Common\Base {
    use Schema\CommonSchema, 
        Schema\MediaSchema;
    public function init() : void {
        register_rest_route( $this->namespace, '/media-upload', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'handle_file_upload' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
                'args'                => $this->schema()
            ],
        ] );

        register_rest_route( $this->namespace, '/attachments', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'index' ],
                'permission_callback' => [ Permissions::class, 'admin_can' ],
                'args'                => $this->media_index_schema(),
            ],
        ] );

        register_rest_route( $this->namespace, '/group/(?P<group_id>\d+)/attachments', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'group_media_index' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
                'args'                => $this->media_index_schema(),
            ],
        ] );

        register_rest_route( $this->namespace, '/member/(?P<user_id>\d+)/attachments', [
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'user_media_index' ],
                'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
                'args'                => $this->media_index_schema(),
            ],
        ] );
    }

    public function index( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $data = $this->get_params_by_schema( $request, $this->index_schema() );
            // admin can see all attachments, but formal user see only its attachments
            $user_id = current_user_can( 'manage_options' ) ? null : get_current_user_id();
            return new WP_REST_Response(  Attachment::index( $data ?? [], $user_id ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function group_media_index( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $data = $this->get_params_by_schema( $request, $this->index_schema(), [ 'group_id' ] );
            // admin can see all attachments, but formal user see only its attachments
            $user_id = get_current_user_id();
            return new WP_REST_Response(  Attachment::group_media_index( $data ?? [], $user_id ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function user_media_index( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $data = $this->get_params_by_schema( $request, $this->index_schema(), [ 'user_id' ] );
            // admin can see all attachments, but formal user see only its attachments
            $user_id = get_current_user_id();
            return new WP_REST_Response(  Attachment::user_media_index( $data ?? [], $user_id ) );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }

    public function handle_file_upload( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $params     = $request->get_params();
            $media_type = sanitize_text_field( $params['media_type'] ?? '' );
            $file_data = Attachment::handle_attachment_upload(
                // validation & sanitization will be taken place in attachment upload handler
                $_FILES['file'] ?? [], // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification.Missing 
                $media_type 
            );
            return new WP_REST_Response( $file_data ?? [] );
        }
        catch( ZencommunityException $e ) {
            return $e->as_rest_response();
        }
    }
}