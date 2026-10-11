<?php
namespace ZenCommunity\Api\Schema;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
trait RoleSchema  {

    public function schema() : array {
        return apply_filters( 'zencommunity/role/schema', [
            'role' => [
                'description'       => __( 'Role slug', 'zencommunity' ),
                'type'              => 'string',
                'context'           => [ 'view', 'edit', 'embed' ],
                'maxLength'         => 255,
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'permission' => [
                'description'       => __( 'Permission slug', 'zencommunity' ),
                'type'              => 'string',
                'context'           => [ 'view', 'edit', 'embed' ],
                'maxLength'         => 255,
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'action' => [
                'description'       => __( 'Action : enable, disable', 'zencommunity' ),
                'type'              => 'string',
                'enum'              => [ 'disable', 'enable' ],
                'default'           => 'published',
                'context'           => [ 'view', 'edit' ],
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ] );
    }

    public function group_role_update_schema() : array {
        return apply_filters( 'zencommunity/role/update/schema', [
            'permission' => [
                'description'       => __( 'Permission slug', 'zencommunity' ),
                'type'              => 'string',
                'context'           => [ 'view', 'edit', 'embed' ],
                'maxLength'         => 255,
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'action' => [
                'description'       => __( 'Action : enable, disable', 'zencommunity' ),
                'type'              => 'string',
                'enum'              => [ 'disable', 'enable' ],
                'default'           => 'published',
                'context'           => [ 'view', 'edit' ],
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ] );
    }

    public function global_role_update_schema() : array {
        return apply_filters( 'zencommunity/global_role/edit_perms/schema', [
            'role' => [
                'description'       => __( 'Role slug', 'zencommunity' ),
                'type'              => 'string',
                'context'           => [ 'view', 'edit', 'embed' ],
                'maxLength'         => 255,
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'permission' => [
                'description'       => __( 'Permission slug', 'zencommunity' ),
                'type'              => 'string',
                'context'           => [ 'view', 'edit', 'embed' ],
                'maxLength'         => 255,
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'action' => [
                'description'       => __( 'Action : enable, disable', 'zencommunity' ),
                'type'              => 'string',
                'enum'              => [ 'disable', 'enable' ],
                'default'           => 'published',
                'context'           => [ 'view', 'edit' ],
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ] );
    }

    public function global_role_add_remove_schema() : array {
        return apply_filters( 'zencommunity/global_role/schema', [
            'role' => [
                'description'       => __( 'Role slug', 'zencommunity' ),
                'type'              => 'string',
                'context'           => [ 'view', 'edit', 'embed' ],
                'maxLength'         => 255,
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'action' => [
                'description'       => __( 'Action : add, remove', 'zencommunity' ),
                'type'              => 'string',
                'enum'              => [ 'add', 'remove' ],
                'default'           => 'published',
                'context'           => [ 'view', 'edit' ],
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ] );
    }
}