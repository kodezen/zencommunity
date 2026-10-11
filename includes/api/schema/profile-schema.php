<?php
namespace ZenCommunity\Api\Schema;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
trait ProfileSchema  {
    public function member_index_schema() : array {
        return apply_filters( 'zencommunity/members/index/schema', [
            'page' => [
                'required' => false,
                'type' => 'integer',
                'description' => __( 'Current page', 'zencommunity' ),
            ],
            'per_page' => [
                'required' => false,
                'type' => 'integer',
                'description' => __( 'Records per page', 'zencommunity' ),
            ],
            'search' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'Search query string.', 'zencommunity' ),
            ],
            'status' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'Record status.', 'zencommunity' ),
            ],
            'group_id' => [
                'required' => false,
                'type' => 'integer',
                'description' => __( 'Group ID', 'zencommunity' ),
            ],
            'role' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'Groum member role.', 'zencommunity' ),
            ],
            'global_role' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'global role.', 'zencommunity' ),
            ],
            'order' => [
                'description' => __( 'Sort order (ascending or descending).', 'zencommunity' ),
                'type'        => 'string',
                'enum'        => [ 'asc', 'desc' ],
                'default'     => 'desc',
                'required'    => false,
            ],
            'order_by' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'Order by.', 'zencommunity' ),
            ],
        ] );
    }

    public function schema() : array {
        return apply_filters( 'zencommunity/schema/member/update_profile', [
            'first_name' => [
                'type'              => 'string',
                'maxLength'         => 255,
                'description'       => __( 'The user\'s first name.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'last_name' => [
                'type'              => 'string',
                'maxLength'         => 255,
                'description'       => __( 'The user\'s last name.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'username' => [
                'type'              => 'string',
                'maxLength'         => 90,
                'description'       => __( 'The user\'s username (login name).', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_user',
            ],
            'bio' => [
                'type'              => 'string',
                'description'       => __( 'A short biography or about section.', 'zencommunity' ),
                'sanitize_callback' => 'wp_kses_post',
            ],
            'media_ids' => [
                'required' => false,
                'type'     => 'array',
                'items'    => [
                    'type' => [ 'integer', 'string' ],
                ],
                'description' => __( 'An array of media IDs, media type must be group_featured, 
                    group_cover, group_icon', 'zencommunity' ),
                'validate_callback' => fn( $ids, $request, $key) : bool => is_array( $ids ) && count( array_filter( $ids, 'is_numeric' ) ) === count( $ids ),
                'sanitize_callback' => fn( $ids, $request, $key ) : array => array_map( 'absint', $ids ),
            ],
            'remove_media' => [
                'description'       => __( 'Remove media', 'zencommunity' ),
                'type'              => 'string',
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'status' => [
                'type'              => 'string',
                'description'       => __( 'The current status of the user or item.', 'zencommunity' ),
                'enum'              => [ 'active', 'inactive', 'pending' ],
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'meta' => [
                'type'        => 'object',
                'description' => __( 'Custom user metadata including social usernames and notification settings.', 'zencommunity' ),
                'properties'  => [

                    'display_name' => [
                        'type'              => 'string',
                        'description'       => __( 'A custom display name shown instead of the first/last name.', 'zencommunity' ),
                        'sanitize_callback' => 'sanitize_text_field',
                        'maxLength'         => 60,
                    ],
                    'pronouns' => [
                        'type'              => 'string',
                        'description'       => __( 'The user\'s pronouns, shown on the profile and in hover cards.', 'zencommunity' ),
                        'sanitize_callback' => 'sanitize_text_field',
                        'maxLength'         => 40,
                    ],

                    'social_links' => [
                        'type'        => 'object',
                        'description' => __( 'Usernames for social media accounts.', 'zencommunity' ),
                        'properties'  => [
                            'facebook' => [
                                'type'              => 'string',
                                'description'       => __( 'Facebook username (no URL).', 'zencommunity' ),
                                'sanitize_callback' => 'sanitize_text_field',
                                'maxLength'         => 50,
                            ],
                            'x'         => [
                                'type'              => 'string',
                                'description'       => __( 'X (formerly Twitter) username.', 'zencommunity' ),
                                'sanitize_callback' => 'sanitize_text_field',
                                'maxLength'         => 50,
                            ],
                            'instagram' => [
                                'type'              => 'string',
                                'description'       => __( 'Instagram username.', 'zencommunity' ),
                                'sanitize_callback' => 'sanitize_text_field',
                                'maxLength'         => 50,
                            ],
                            'youtube'   => [
                                'type'              => 'string',
                                'description'       => __( 'YouTube channel username.', 'zencommunity' ),
                                'sanitize_callback' => 'sanitize_text_field',
                                'maxLength'         => 50,
                            ],
                            'linkedin'  => [
                                'type'              => 'string',
                                'description'       => __( 'LinkedIn username (e.g. profile ID).', 'zencommunity' ),
                                'sanitize_callback' => 'sanitize_text_field',
                                'maxLength'         => 50,
                            ],
                        ],
                        'additionalProperties' => false,
                    ],
                    'website_url' => [
                        'type'              => 'string',
                        'description'       => __( 'Website URL.', 'zencommunity' ),
                        'sanitize_callback' => 'sanitize_text_field',
                    ],

                    'follow_privacy' => [
                        'type'        => 'object',
                        'description' => __( 'Who can view this member\'s followers / following lists.', 'zencommunity' ),
                        'properties'  => [
                            'followers' => [
                                'type'              => 'string',
                                'description'       => __( 'Who can view this member\'s followers list.', 'zencommunity' ),
                                'enum'              => [ 'everyone', 'logged_user', 'profile_owner' ],
                                'sanitize_callback' => 'sanitize_text_field',
                            ],
                            'following' => [
                                'type'              => 'string',
                                'description'       => __( 'Who can view who this member follows.', 'zencommunity' ),
                                'enum'              => [ 'everyone', 'logged_user', 'profile_owner' ],
                                'sanitize_callback' => 'sanitize_text_field',
                            ],
                        ],
                        'additionalProperties' => false,
                    ],

                    // 'notification' => [
                    //     'type'        => 'object',
                    //     'description' => __( 'User notification preferences.', 'zencommunity' ),
                    //     'properties'  => [
                    //         'comment_on_post' => [
                    //             'type'              => 'boolean',
                    //             'description'       => __( 'Notify when someone comments on post.', 'zencommunity' ),
                    //             'default'           => true,
                    //             'sanitize_callback' => 'rest_sanitize_boolean',
                    //         ],
                    //         'reply_on_comment' => [
                    //             'type'              => 'boolean',
                    //             'description'       => __( 'Notify when someone replies to comment.', 'zencommunity' ),
                    //             'default'           => true,
                    //             'sanitize_callback' => 'rest_sanitize_boolean',
                    //         ],
                    //         'mention' => [
                    //             'type'              => 'boolean',
                    //             'description'       => __( 'Notify when user is mentioned.', 'zencommunity' ),
                    //             'default'           => true,
                    //             'sanitize_callback' => 'rest_sanitize_boolean',
                    //         ],
                    //     ],
                    //     'additionalProperties' => false,
                    // ],
                ],
            ],

        ] );
    }

    public function notification_schema() : array {
        return apply_filters( 'zencommunity/schema/notification/index', [
            'page' => [
                'required' => false,
                'type' => 'integer',
                'description' => __( 'Current page', 'zencommunity' ),
            ],
            'per_page' => [
                'required' => false,
                'type' => 'integer',
                'description' => __( 'Notification per page', 'zencommunity' ),
            ],
            'status' => [
                'required' => false,
                'type' => 'integer',
                'description' => __( 'if status is: 0 => unread, 1 => read, if ignore => all ', 'zencommunity' ),
            ],
            'type' => [
                'required' => false,
                'type' => 'string',
                'description' => __( ' Type of a notification.', 'zencommunity' ),
            ],
        ] );
    }

    public function notification_mark_schema() : array {
        return apply_filters( 'zencommunity/schema/notification/mark_as_read', [
            'notification_id' => [
                'required' => false,
                'type' => 'integer',
                'description' => __( 'Notification per page', 'zencommunity' ),
            ],
            'is_read' => [
                'required'    => true,
                'type'        => 'integer',
                'enum'        => [ 0, 1 ],  // Only accept 0 or 1
                'description' => __( 'If status is: 0 => unread, 1 => read', 'zencommunity' ),
            ],
        ] );
    }

    /**
     * Schema for WP REST API query parameters.
     *
     * @return array
     */
    public function get_stuff_query_schema() {
        return apply_filters( 'zencommunity/schema/stuff_index', [
            'page'     => [
                'type'        => 'integer',
                'description' => __( 'Current page number.', 'zencommunity' ),
                'sanitize_callback' => 'absint',
            ],
            'per_page' => [
                'type'        => 'integer',
                'description' => __( 'Number of items per page.', 'zencommunity' ),
                'sanitize_callback' => 'absint',
            ],
            'search'   => [
                'type'        => 'string',
                'description' => __( 'Search term.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'usertype' => [
                'type'        => 'string',
                'description' => __( 'User type filter.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'status'   => [
                'type'        => 'string',
                'description' => __( 'User status filter.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'role'     => [
                'type'        => 'string',
                'description' => __( 'User role filter.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'group_id' => [
                'type'        => 'integer',
                'description' => __( 'Group ID filter.', 'zencommunity' ),
                'sanitize_callback' => 'absint',
            ],
            'order'    => [
                'type'        => 'string',
                'description' => __( 'Sort order.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'order_by' => [
                'type'        => 'string',
                'description' => __( 'Sort by which field.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ] );
    }

}