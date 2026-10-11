<?php
namespace ZenCommunity\Api\Schema;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
trait SettingSchema  {
    public function schema() : array {
        return apply_filters( 'zencommunity/settings/schema', [
            'name' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'Community Name', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'load_on_entire_site' => [
                'type'        => 'boolean',
                'description' => __( 'Load the Community app across the entire frontend, overriding the active theme.', 'zencommunity' ),
            ],
            'render_mode' => [
                'required'    => false,
                'type'        => 'string',
                'enum'        => [ 'spa', 'fse' ],
                'description' => __( 'How the community frontend is rendered: the built-in React SPA interface, or Gutenberg Full Site Editing where the layout is composed from ZenCommunity blocks.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'path' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'Community url path', 'zencommunity' ),
                'sanitize_callback' => [ $this, 'sanitize_path' ],
            ],
            'media_ids' => [
                'required' => false,
                'type'     => 'array',
                'items'    => [
                    'type' => [ 'integer', 'string' ],
                ],
                'description' => __( 'An array of media IDs, media type must be site_logo', 'zencommunity' ),
                'validate_callback' => fn( $ids, $request, $key) : bool => is_array( $ids ) && count( array_filter( $ids, 'is_numeric' ) ) === count( $ids ),
                'sanitize_callback' => fn( $ids, $request, $key ) : array => array_map( 'absint', $ids ),
            ],
            'remove_media' => [
                'required' => false,
                'type'     => 'array',
                'items'    => [
                    'type' => 'string',
                ],
                'description' => __( 'Logo types to clear (delete the attachment and null the setting) without uploading a replacement.', 'zencommunity' ),
                'sanitize_callback' => fn( $types, $request, $key ) : array => array_values( array_intersect(
                    array_map( 'sanitize_text_field', (array) $types ),
                    [ 'site_logo', 'site_logo_dark' ]
                ) ),
            ],
            'community_visibility' => [
                'required' => false,
                'type' => 'string',
                'enum'        => [ 'guest', 'logged', 'roles' ],
                'description' => __( 'Who can see & join this community.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'guest_redirect_url' => [
                'required' => false,
                'type' => 'string',
                'description' => __( 'Redirect url for guset user. It will be used when community visibility is not set to logged user.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'community_visibility_roles' => [
                'description' => __( 'List of user roles.', 'zencommunity' ),
                'type'        => 'array',
                'items'       => [
                    'type' => 'string',
                ],
                'required'    => false,
                'sanitize_callback' => [ $this, 'sanitize_roles' ],
            ],
            'can_see_all_members' => [
                'required' => false,
                'type' => 'string',
                'enum'        => [ 'guest', 'logged', 'admin-mod' ],
                'description' => __( 'Who can see all community members page?.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'can_see_others_groups_membership' => [
                'required' => false,
                'type' => 'string',
                'enum'        => [ 'guest', 'logged', 'admin-mod' ],
                'description' => __( 'Who can see membership groups of others profile page.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'allow_member_registration' => [
                'type'        => 'boolean',
                'description' => __( 'Allow member registrationt', 'zencommunity' ),
            ],
            'enable_date_of_birth_field' => [
                'type'        => 'boolean',
                'description' => __( 'Show a Date of Birth field on member profiles and enable messaging safety rules that block adults from starting conversations with members flagged as minors.', 'zencommunity' ),
            ],
            'allow_messaging_minors' => [
                'type'        => 'boolean',
                'description' => __( 'When off (default), adults cannot start a private message or group chat with a member flagged as a minor. Turning this on disables that restriction.', 'zencommunity' ),
            ],
            'override_wp_registration' => [
                'type'        => 'boolean',
                'description' => __( 'Allow member registration through ZenCommunity even when WordPress\'s core "Anyone can register" setting is disabled.', 'zencommunity' ),
            ],
            'login_page' => [
                'type'              => [ 'string', 'integer' ],
                'description'       => __( 'Which page handles login: "zencommunity" (built-in), "wordpress" (native wp-login.php), or a WP Page ID to use a custom page.', 'zencommunity' ),
                'sanitize_callback' => [ $this, 'sanitize_page_selector' ],
            ],
            'register_page' => [
                'type'              => [ 'string', 'integer' ],
                'description'       => __( 'Which page handles registration: "zencommunity" (built-in), "wordpress" (native wp-login.php?action=register), or a WP Page ID to use a custom page.', 'zencommunity' ),
                'sanitize_callback' => [ $this, 'sanitize_page_selector' ],
            ],
            'registered_member_status' => [
                'type'        => 'string',
                'enum'        => [ 'active', 'pending' ],
                'description' => __( 'Indicates the onboarding status of a newly registered member (e.g: active, pending ).', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],

            'feed' => [
                'description' => __( 'Feed settings', 'zencommunity' ),
                'type'        => 'object',
                'required'    => false,
                'properties'  => [
                    'is_title_required' => [
                        'type'        => 'boolean',
                        'description' => __( 'Whether the title is required.', 'zencommunity' ),
                    ],
                    'show_cover_placeholder' => [
                        'type'        => 'boolean',
                        'description' => __( 'Whether a blurred placeholder image is shown for groups/profiles that have no cover image set. When disabled, no placeholder is shown at all.', 'zencommunity' ),
                    ],
                    'default_sort_by' => [
                        'type'        => 'string',
                        'description' => __( 'Default sorting option.', 'zencommunity' ),
                        'enum'        => apply_filters(
                            'zencommunity/feed/default_sort_cols',
                            [ 'created_at', 'updated_at', 'title', 'like_count', 'comment_count', 'id', 'trending' ]
                        ),
                    ],
                ],
            ],
            'title_char_limit' => [
                'type'        => 'integer',
                'description' => __( 'Character limit of a  title.', 'zencommunity' ),
            ],
            'description_char_limit' => [
                'type'        => 'integer',
                'description' => __( 'Character limit of a description.', 'zencommunity' ),
            ],
            'comment_char_limit' => [
                'type'        => 'integer',
                'description' => __( 'Character limit of a comment.', 'zencommunity' ),
            ],
            'message_char_limit' => [
                'type'        => 'integer',
                'description' => __( 'Character limit of a message.', 'zencommunity' ),
            ],
            'notification_position' => [
                'description' => __( 'Position where notifications should appear on screen.', 'zencommunity' ),
                'type'        => 'string',
                'enum'        => [
                    'top-left',
                    'top-center',
                    'top-right',
                    'bottom-left',
                    'bottom-center',
                    'bottom-right',
                ],
            ],
            'notification' => [
                'type'        => 'object',
                'description' => __( 'Site-wide master toggles per notification category (mirrors zencommunity_notification_pref_categories()). When off, that category is never dispatched to anyone, regardless of per-user preference.', 'zencommunity' ),
                'properties'  => [
                    'posts' => [
                        'type'              => 'boolean',
                        'description'       => __( 'New posts in groups.', 'zencommunity' ),
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
                    'comments' => [
                        'type'              => 'boolean',
                        'description'       => __( 'Comments & replies on content.', 'zencommunity' ),
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
                    'mentions' => [
                        'type'              => 'boolean',
                        'description'       => __( 'Mentions.', 'zencommunity' ),
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
                    'reactions' => [
                        'type'              => 'boolean',
                        'description'       => __( 'Reactions to posts & comments.', 'zencommunity' ),
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
                    'groups' => [
                        'type'              => 'boolean',
                        'description'       => __( 'Group activity (invites, role changes).', 'zencommunity' ),
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
                    'tickets' => [
                        'type'              => 'boolean',
                        'description'       => __( 'Support ticket updates.', 'zencommunity' ),
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
                    'messages' => [
                        'type'              => 'boolean',
                        'description'       => __( 'Direct & group messages.', 'zencommunity' ),
                        'sanitize_callback' => 'rest_sanitize_boolean',
                    ],
                ],
                'additionalProperties' => false,
            ],
            'theme' => [
                'description' => __( 'Theme settings', 'zencommunity' ),
                'type'        => 'object',
                'required'    => false,
                'properties'  => [
                    'light' => [
                        'type'       => 'object',
                        'description' => __( 'Light theme settings', 'zencommunity' ),
                        'properties' => [
                            'primary_color' => [
                                'type'        => 'string',
                                'description' => __( 'Primary color of the light theme.', 'zencommunity' ),
                            ],
                            'secondary_color' => [
                                'type'        => 'string',
                                'description' => __( 'Secondary color of the light theme.', 'zencommunity' ),
                            ],
                            'text_color' => [
                                'type'        => 'string',
                                'description' => __( 'Text color of the light theme.', 'zencommunity' ),
                            ],
                            'content_body_color' => [
                                'type'        => 'string',
                                'description' => __( 'Content body color of the light theme.', 'zencommunity' ),
                            ],
                            'content_background_color' => [
                                'type'        => 'string',
                                'description' => __( 'Content background color of the light theme.', 'zencommunity' ),
                            ],
                            'border_color' => [
                                'type'        => 'string',
                                'description' => __( 'Border color of the light theme.', 'zencommunity' ),
                            ],
                        ],
                    ],
                    'dark' => [
                        'type'       => 'object',
                        'description' => __( 'Dark theme settings', 'zencommunity' ),
                        'properties' => [
                            'primary_color' => [
                                'type'        => 'string',
                                'description' => __( 'Primary color of the dark theme.', 'zencommunity' ),
                            ],
                            'secondary_color' => [
                                'type'        => 'string',
                                'description' => __( 'Secondary color of the dark theme.', 'zencommunity' ),
                            ],
                            'text_color' => [
                                'type'        => 'string',
                                'description' => __( 'Text color of the dark theme.', 'zencommunity' ),
                                'example'     => '#f7f7f7',
                            ],
                            'content_body_color' => [
                                'type'        => 'string',
                                'description' => __( 'Content body color of the dark theme.', 'zencommunity' ),
                            ],
                            'content_background_color' => [
                                'type'        => 'string',
                                'description' => __( 'Content background color of the dark theme.', 'zencommunity' ),
                                'example'     => '#222',
                            ],
                            'border_color' => [
                                'type'        => 'string',
                                'description' => __( 'Border color of the dark theme.', 'zencommunity' ),
                            ],
                        ],
                    ],
                ],
            ],
            'permitted_social_sites_for_link_sharing' => [
                'required'          => false,
                'type'              => 'array',
                'items'             => [
                    'type' => 'string',
                ],
                'description'       => __( 'An array of social site names that are permitted for link sharing', 'zencommunity' ),
                'sanitize_callback' => function( $ids, $request, $key ) : array {
                    $valid_sites = [
                        'facebook',
                        'x',
                        'instagram',
                        'linkedin',
                        'email',
                    ];

                    return array_filter( $ids, function( $site ) use ( $valid_sites ) {
                        return in_array( $site, $valid_sites, true );
                    });
                },
            ],


        ] );
    }

    public function sanitize_roles( $value, $request, $param ) {
        if ( ! is_array( $value ) ) {
            return [];
        }
        global $wp_roles;
        $valid_roles = array_keys( $wp_roles->roles ?? [] );
        return array_values( 
            array_filter(
                array_map( 'sanitize_text_field', $value ), 
                fn ( $role ) => in_array( $role, $valid_roles, true ) 
            )
        );
    }

    public function sanitize_page_selector( $value ) {
        if ( in_array( $value, [ 'zencommunity', 'wordpress' ], true ) ) {
            return $value;
        }
        return absint( $value );
    }

    public function sanitize_path( $value ) {
        $value = wp_parse_url( $value, PHP_URL_PATH );
        $value = sanitize_text_field( $value );
        return '/' . ltrim( $value, '/' );
    }
}