<?php
namespace ZenCommunity\Api\Schema;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use stdClass;
trait GroupSchema  {
    public function schema( bool $is_name_optional = false) : array {
        return apply_filters( 'zencommunity/group/schema', [
            'id' => [
                'description'       => __( 'ID of the item', 'zencommunity' ),
                'type'              => 'integer',
                'context'           => [ 'view' ],
                'readonly'          => true,
                'format'            => 'int64',
                'required'          => false,
                'sanitize_callback' => 'absint',
            ],
            'category_id' => [
                'description'       => __( 'category_id of the item', 'zencommunity' ),
                'type'              => 'integer',
                'required'          => false,
                'sanitize_callback' => 'absint',
            ],
            'name' => [
                'description'       => __( 'Name of the item', 'zencommunity' ),
                'type'              => 'string',
                'context'           => [ 'view', 'edit', 'embed' ],
                'maxLength'         => 255,
                'required'          => ! $is_name_optional,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'slug' => [
                'description'       => __( 'Slug identifier', 'zencommunity' ),
                'type'              => 'string',
                'context'           => [ 'view', 'edit', 'embed' ],
                'maxLength'         => 255,
                'required'          => false,
                'sanitize_callback' => 'sanitize_title',
            ],
            'description' => [
                'description'       => __( 'Description of the item', 'zencommunity' ),
                'type'              => 'string',
                'context'           => [ 'view', 'edit', 'embed' ],
                'required'          => false,
                'sanitize_callback' => 'wp_kses_post',
            ],
            'media_ids' => [
                'required' => false,
                'type'     => 'array',
                'items'    => [
                    'type' => [ 'integer', 'string' ],
                ],
                'description' => __( 'An array of media IDs, media type must be profile_avatar, profile_cover', 'zencommunity' ),
                'validate_callback' => fn( $ids, $request, $key) : bool => is_array( $ids ) && count( array_filter( $ids, 'is_numeric' ) ) === count( $ids ),
                'sanitize_callback' => fn( $ids, $request, $key ) : array => array_map( 'absint', $ids ),
            ],
            'privacy' => [
                'description'       => __( 'Privacy setting', 'zencommunity' ),
                'type'              => 'string',
                'enum'              => [ 'public', 'private', 'hidden' ],
                'default'           => 'public',
                'context'           => [ 'view', 'edit' ],
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'status' => [
                'description'       => __( 'Status of the item', 'zencommunity' ),
                'type'              => 'string',
                'enum'              => [ 'published', 'draft' ],
                'default'           => 'published',
                'context'           => [ 'view', 'edit' ],
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'remove_media' => [
                'description'       => __( 'Remove media', 'zencommunity' ),
                'type'              => 'string',
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'icon' => [
                'type'       => 'object',
                'required'   => [ 'type', 'src' ],
                'properties' => [
                    'type' => [
                        'type'    => 'string',
                        'enum'    => [ 'imogi', 'shape', 'img' ],
                        // 'required'    => true,
                        'description' => __( 'Type of icon: imogi, shape, or image URL.', 'zencommunity' )
                    ],
                    'src' => [
                        'type'        => 'string',
                        // 'required'    => true,
                        'description' => __( 'Source of the icon (emoji character, shape ID, or image URL).', 'zencommunity' )
                    ],
                ],
                'default' => new stdClass(),
                'required'=> false,
            ],
            'meta' => [
                'type'       => 'object',
                'required'    => false,
                'description' => __( 'Settings data', 'zencommunity' ),
                'properties' => [
                    'anyone_can_send_join_request' => [
                        'type'        => 'boolean',
                        'default'     => true,
                        'description' => __( 'Allow anyone to send a join request', 'zencommunity' ),
                    ],
                    'members_visibility' => [
                        'type'        => 'string',
                        'enum'        => [ 'members_only', 'admin-mod', 'logged', 'guest' ],
                        'default'     => 'members_only',
                        'description' => __( 'Who can view the members list', 'zencommunity' ),
                    ],
                    'approval_required' => [
                        'type'        => 'boolean',
                        'default'     => false,
                        'description' => __( 'Approval required', 'zencommunity' ),
                    ],
                ],
            ],
        ] );
    }
    
    public function id_schema() : array {
        return [
            'id' => [
                'description' => __( 'id of the user', 'zencommunity' ),
                'type'        => [ 'integer', 'string' ],
                'required'    => true,
                'validate_callback' => fn( $id, $request, $key) : bool => is_numeric( $id ),
                'sanitize_callback' => fn( $id, $request, $key ) : int => absint( $id ),
            ],
        ];
    }

    public function role_schema() : array {
        return array_merge( $this->id_schema(), [
            'role' => [
                'description'       => __( 'Role of the user', 'zencommunity' ),
                'type'              => 'string',
                'enum'              => [ 'admin', 'moderator', 'member' ],
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ] );
    }

    public function status_schema() : array {
        return array_merge( $this->id_schema(), [
            'status' => [
                'description'       => __( 'Status of the user', 'zencommunity' ),
                'type'              => 'string',
                'enum'              => [ 'active', 'inactive', 'pending', 'banned', 'suspended' ],
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ] );
    }

    public function member_action_schema() : array {
        return array_merge( $this->id_schema(), [
            'reason' => [
                'description'       => __( 'Reason for the moderation action', 'zencommunity' ),
                'type'              => 'string',
                'required'          => false,
                'default'           => '',
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'note' => [
                'description'       => __( 'Additional note for the moderation action', 'zencommunity' ),
                'type'              => 'string',
                'required'          => false,
                'default'           => '',
                'sanitize_callback' => 'sanitize_textarea_field',
            ],
        ] );
    }

    public function suspend_member_schema() : array {
        return array_merge( $this->member_action_schema(), [
            'duration' => [
                'description'       => __( 'Suspension duration', 'zencommunity' ),
                'type'              => 'string',
                'enum'              => array_keys( \ZenCommunity\Database\Models\Group_Member_Action::DURATIONS ),
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ] );
    }
    public function add_member_schema() : array {
        return array_merge( 
            $this->id_schema(),
            $this->role_schema(),
            $this->status_schema(),
        );
    }
}