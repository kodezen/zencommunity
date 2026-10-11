<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use stdClass;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\RewriteRules;
use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Database\Models\Attachment;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
class Settings extends Common\Base {
    use Schema\SettingSchema;
    public function init() : void {
        register_rest_route( $this->namespace, '/settings', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'save' ],
                'permission_callback' => [ Permissions::class, 'can_update_settings' ],
                'args'                => $this->schema(),
            ],
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get' ],
                'permission_callback' => [ Permissions::class, 'can_update_settings' ]
            ]
        ] );
        
        register_rest_route( $this->namespace, '/theme/(?P<mode>\w+)', [
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'update_theme_mode' ],
                'permission_callback' => [ Permissions::class, 'any_logged_user_can' ],
            ],
        ] );
    }


    public function update_theme_mode( WP_REST_Request $request ) : WP_REST_Response {
        $theme = $request->get_param( 'mode' );
		$uid = get_current_user_id();

        if( ! $uid ) 
            return new WP_REST_Response( [
                'message' => __( 'error', 'zencommunity' )
            ], 401 );

        if( ! in_array( $theme, [ 'light', 'dark' ] ) ) 
            return new WP_REST_Response(  [
                'message' => __( 'Invalid mode', 'zencommunity' )
            ], 400 );

		update_user_meta(
			$uid,
			'zenc_theme_mode',
			$theme
		);

        return new WP_REST_Response( [
                'message' => __( 'Updated', 'zencommunity' )
            ] );
    }

    public function get() : WP_REST_Response {
        return new WP_REST_Response( $this->output( $GLOBALS['zencommunity_settings'] ?? [] ) );
    }

    public function save( WP_REST_Request $request ) : WP_REST_Response {
        // exclude all elements that is not present in schema
        $settings = $this->get_params_by_schema( $request, $this->schema() );
        // Logo types to clear — a transient instruction, not a persisted
        // settings field, so it's pulled out before Sanitizer::sanitize()
        // (which only keeps keys listed in $rules below) ever sees it.
        $remove_media = $settings['remove_media'] ?? [];
        unset( $settings['remove_media'] );
        $rules = apply_filters( 'zencommunity/settings/sanitization_rules', [
            'name'                              => Sanitizer::STRING,
            'path'                              => Sanitizer::STRING,
            'load_on_entire_site'               => Sanitizer::BOOL,
            'render_mode'                       => Sanitizer::STRING,
            'media_ids.*'                       => Sanitizer::INT,
            'community_visibility'              => Sanitizer::STRING,
            'guest_redirect_url'                => Sanitizer::STRING,
            'community_visibility_roles.*'      => Sanitizer::STRING,
            'can_see_all_members'               => Sanitizer::STRING,
            'can_see_others_groups_membership'  => Sanitizer::STRING,
            'allow_member_registration'         => Sanitizer::BOOL,
            'enable_date_of_birth_field'        => Sanitizer::BOOL,
            'allow_messaging_minors'            => Sanitizer::BOOL,
            'override_wp_registration'          => Sanitizer::BOOL,
            'login_page'                         => [ $this, 'sanitize_page_selector' ],
            'register_page'                      => [ $this, 'sanitize_page_selector' ],
            'registered_member_status'          => Sanitizer::STRING,
			// Notification preferences (booleans)
			'notification.posts'     => Sanitizer::BOOL,
			'notification.comments'  => Sanitizer::BOOL,
			'notification.mentions'  => Sanitizer::BOOL,
			'notification.reactions' => Sanitizer::BOOL,
			'notification.groups'    => Sanitizer::BOOL,
			'notification.tickets'   => Sanitizer::BOOL,
			'notification.messages'  => Sanitizer::BOOL,
			// Notification preferences (booleans)
			'feed.is_title_required'  => Sanitizer::BOOL,
			'feed.show_cover_placeholder' => Sanitizer::BOOL,
			'feed.default_sort_by'    => Sanitizer::STRING,
            'post_char_limit'         => Sanitizer::INT,
            'comment_char_limit'      => Sanitizer::INT,
            'message_char_limit'      => Sanitizer::INT,
            'notification_position'   => Sanitizer::STRING,
            'theme_mode'   => Sanitizer::STRING,

            'theme.light.primary_color'         => Sanitizer::STRING,   
            'theme.light.secondary_color'       => Sanitizer::STRING,
            'theme.light.text_color'            => Sanitizer::STRING,
            'theme.light.content_body_color'    => Sanitizer::STRING,
            'theme.light.content_background_color' => Sanitizer::STRING,
            'theme.light.border_color'          => Sanitizer::STRING,
            
            'theme.dark.primary_color'          => Sanitizer::STRING,
            'theme.dark.secondary_color'        => Sanitizer::STRING,
            'theme.dark.text_color'             => Sanitizer::STRING,
            'theme.dark.content_body_color'     => Sanitizer::STRING,
            'theme.dark.content_background_color' => Sanitizer::STRING,
            'theme.dark.border_color'           => Sanitizer::STRING,
            'permitted_social_sites_for_link_sharing.*' => Sanitizer::STRING,

        ] );

        // sanitize data
        $settings = Sanitizer::sanitize( $settings, $rules );
        $settings_as_array = json_decode( json_encode( $GLOBALS['zencommunity_settings'] ), true );
        // Deep merge: existing settings are the base; sanitized request data overrides recursively.
        // Nested associative keys (e.g. theme.light.*) merge in-place so a partial sub-set of
        // fields doesn't lose the rest. array_replace_recursive() alone would also apply that
        // same index-by-index merge to plain (sequential) arrays, e.g. wp_sync_post_types — since
        // it only overwrites matching indices, a shorter new list would silently leave the old,
        // longer list's trailing elements in place, "restoring" values the client just removed. Every
        // settings-writing screen in the app submits the complete object on every save (not a
        // partial patch), so a list-type field's incoming value is always the authoritative full
        // list — self::merge_settings() replaces those outright instead of index-merging them.
        $settings = self::merge_settings( $settings_as_array ?? [], $settings );
        $prev_path = $GLOBALS['zencommunity_settings']->path ?? '';
        // apply settings data filter before update
        $settings = apply_filters( 'zencommunity/settings/before_update/data', $settings );
        // apply media handler
        $settings = Attachment::attach_media(
            0, 'settings', $settings ?? [], [ $this, 'handle_media']
        );

        // Clear any logo types requested via remove_media: delete the
        // attachment file + DB record (same object_id/object_type an
        // upload attaches it under, see handle_media()/attach_media()
        // above) and null the corresponding settings field.
        foreach ( $remove_media as $media_type ) {
            Attachment::delete_media_by_media_type( $media_type, 'settings', 0 );
            $settings[ $media_type ] = null;
        }
        // wp_send_json($settings);

        // fire action just before update
        do_action( 'zencommunity/settings/before_update', $settings, $request );
        // update settings
        update_option( ZENCOMMUNITY_SETTINGS_NAME, json_encode( $settings ) );
        // update global settings with new data
		$GLOBALS['zencommunity_settings'] = json_decode( get_option( ZENCOMMUNITY_SETTINGS_NAME, '{}' ) );
        // fire action  after update
        do_action( 'zencommunity/settings/after_update', $GLOBALS['zencommunity_settings'], $request );

        $path = $GLOBALS['zencommunity_settings']->path ?? '';
        // compare community path before and after update: if it is changed then flush rewrite rules
        if ( $prev_path !== $path ) {
            // update new rewrite rule && flush
            RewriteRules::add_rewrite_rules();
            flush_rewrite_rules();
        }
        
        return new WP_REST_Response( array_merge( [
            'success' => true,
            'message' => __( 'Settings is saved.', 'zencommunity' )
        ], $this->output( $GLOBALS['zencommunity_settings'] ?? [] ) ) );
    }

    /**
     * Like array_replace_recursive(), except a plain (sequential/"list")
     * array in $new fully replaces its counterpart in $base rather than
     * being merged index-by-index — see the call site in save() for why.
     */
    protected static function merge_settings( array $base, array $new ) : array {
        foreach ( $new as $key => $value ) {
            if ( is_array( $value ) && ! self::is_list( $value ) && is_array( $base[ $key ] ?? null ) ) {
                $base[ $key ] = self::merge_settings( $base[ $key ], $value );
            } else {
                $base[ $key ] = $value;
            }
        }
        return $base;
    }

    /**
     * array_is_list() is PHP 8.1+; this plugin's minimum is PHP 7.4.
     */
    protected static function is_list( array $array ) : bool {
        if ( function_exists( 'array_is_list' ) ) {
            return array_is_list( $array );
        }
        return [] === $array || array_keys( $array ) === range( 0, count( $array ) - 1 );
    }

	public static function handle_media( array $data, array $media, int $id ) : array {

		if ( ! empty( $site_logo = $media['site_logo'][0] ?? [] ) ) {
            $data['attached']['site_logo'] = $site_logo['id'];
			$data['site_logo'] = $site_logo['path'] ?? null;
		}

		if ( ! empty( $site_logo_dark = $media['site_logo_dark'][0] ?? [] ) ) {
            $data['attached']['site_logo_dark'] = $site_logo_dark['id'];
			$data['site_logo_dark'] = $site_logo_dark['path'] ?? null;
		}

		// apply filters
		$data = apply_filters( 
			'zencommunity/settings/media_handler', 
			$data, $media, $id
		);
		return $data;
	}
    
    protected function output( $settings ) : array {
        global $wp_roles;
        $roles = $wp_roles->roles;
        $mapped_roles = [];
        foreach ($roles as $role_slug => $role_info) {
            $mapped_roles[$role_slug] = $role_info['name'];
        }

        $settings->load_on_entire_site = (bool) $settings->load_on_entire_site;
        $settings->allow_member_registration = (bool) $settings->allow_member_registration;
        // Defaults to false: sites saved before this option existed get no
        // behavior change (no DOB field shown, minor-safety checks stay inert).
        $settings->enable_date_of_birth_field = (bool) ( $settings->enable_date_of_birth_field ?? false );
        // Defaults to false: messaging stays safe-by-default (adults blocked
        // from messaging minors) unless an admin explicitly opts out.
        $settings->allow_messaging_minors = (bool) ( $settings->allow_messaging_minors ?? false );
        // Defaults to true so sites that saved settings before this option existed
        // keep their current (WP-core-setting-agnostic) registration behavior
        // instead of silently locking out registration on upgrade.
        $settings->override_wp_registration = isset( $settings->override_wp_registration )
            ? (bool) $settings->override_wp_registration
            : true;
        $settings->login_page = $settings->login_page ?? 'zencommunity';
        $settings->register_page = $settings->register_page ?? 'zencommunity';
        
		$settings->can_see_all_members = (
			'guest' === $settings->community_visibility ? 'guest' : $settings->can_see_all_members
		);
        
        if ( ! isset( $settings->feed ) )
            $settings->feed = new stdClass;
        if ( ! isset( $settings->feed->is_title_required ) )
            $settings->feed->is_title_required = false;
        // Defaults to true so a blurred placeholder keeps showing for sites that
        // saved settings before this option existed, matching current behavior.
        if ( ! isset( $settings->feed->show_cover_placeholder ) )
            $settings->feed->show_cover_placeholder = true;
        if ( ! isset( $settings->feed->default_sort_by ) )
            $settings->feed->default_sort_by = 'created_at';

        // Notification category master toggles default to enabled, matching the
        // `?? true` fallback used at dispatch time (Notification::send()) and the
        // per-user default in zencommunity_default_notification_prefs().
        if ( function_exists( 'zencommunity_notification_pref_categories' ) ) {
            $settings->notification = (object) wp_parse_args(
                (array) ( $settings->notification ?? [] ),
                array_fill_keys( array_keys( zencommunity_notification_pref_categories() ), true )
            );
        }

        if ( ! isset( $settings->theme ) )
            $settings->theme = new stdClass;

        if ( ! isset( $settings->theme->light ) )
            $settings->theme->light = new stdClass;

        if ( ! isset( $settings->theme->dark ) )
            $settings->theme->dark = new stdClass;

        $settings->theme->light = wp_parse_args(
            $settings->theme->light ?? [],
            zencommunity_default_theme_settings()['theme']['light']
        ); 

        $settings->theme->dark = wp_parse_args(
            $settings->theme->dark ?? [],
            zencommunity_default_theme_settings()['theme']['dark']
        ); 

        // Default for permitted_social_sites_for_link_sharing
        if (
            ! isset( $settings->permitted_social_sites_for_link_sharing ) ||
            ! is_array( $settings->permitted_social_sites_for_link_sharing )
        ) {
            $settings->permitted_social_sites_for_link_sharing = [
                'facebook',
                'x',
                'instagram',
                'linkedin',
            ];
        }

        return apply_filters( 
			'zencommunity/settings/output', 
            [
                'settings' => $settings,
                'roles' => $mapped_roles,
            ]
        );
    }
}