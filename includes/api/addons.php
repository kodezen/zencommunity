<?php

namespace ZenCommunity\Api;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use WP_Error;
use ZenCommunity\Classes\Addon\{ Base as AddonBase, Manager as AddonManager };
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
class Addons extends Common\Base {

    public function schema() : array {
        return [
            'addon_key' => [
                'description'       => __( 'The key that uniquely identifies the addon.', 'zencommunity' ),
                'type'              => 'string',
                'required'          => true,
                'validate_callback' => function ( $param, $request, $key ) {
                    // Ensure addon key is a string and not empty
                    if ( empty( $param ) || ! is_string( $param ) ) {
                        return new WP_Error( 'invalid_addon_key', __( 'Addon key must be a non-empty string.', 'zencommunity' ), [ 'status' => 400 ] );
                    }

                    return true;
                },
            ],
        ];
    }
    
    

    public function init() : void {
        register_rest_route( $this->namespace, '/addons/activate', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'activate_addon' ],
            'permission_callback' => [ Permissions::class, 'admin_can' ], // Only admin can activate
            'args'                => $this->schema()
        ] );

        register_rest_route( $this->namespace, '/addons/deactivate', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'deactivate_addon' ],
            'permission_callback' => [ Permissions::class, 'admin_can' ], // Only admin can deactivate
            'args'                => $this->schema()
        ] );

        register_rest_route( $this->namespace, '/addons', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [ $this, 'get_addons' ],
            'permission_callback' => [ Permissions::class, 'admin_can' ], // Only admin can deactivatestatus
        ] );
    }

    /**
     * Activate an addon.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function activate_addon( WP_REST_Request $request ) : WP_REST_Response {
        $addon_key = sanitize_text_field( $request->get_param( 'addon_key' ) );

        try {
            $addon_manager = new AddonManager();
            // Attempt to activate the addon
            $addon_manager->activate_addon( $addon_key );
            return new WP_REST_Response( [
                'success' => true,
                'message' => __( 'Addon activated successfully.', 'zencommunity' ),
            ], 200 );
        } catch ( ZencommunityException $e ) {
            // Handle exception and return formatted response
            return $this->handle_exception( $e );
        }
    }

    /**
     * Deactivate an addon.
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function deactivate_addon( WP_REST_Request $request ) : WP_REST_Response {
        $addon_key = sanitize_text_field( $request->get_param( 'addon_key' ) );

        try {
            $addon_manager = new AddonManager();
            // Attempt to deactivate the addon
            $addon_manager->deactivate_addon( $addon_key );
            return new WP_REST_Response( [
                'success' => true,
                'message' => __( 'Addon deactivated successfully.', 'zencommunity' ),
            ], 200 );
        } catch ( ZencommunityException $e ) {
            // Handle exception and return formatted response
            return $this->handle_exception( $e );
        }
    }

    /**
     * Get  of all addons (activated or not).
     *
     * @param WP_REST_Request $request
     * @return WP_REST_Response
     */
    public function get_addons( WP_REST_Request $request ) : WP_REST_Response {
        try {
            $addon_manager     = new AddonManager();
            $registered_addons = $addon_manager->get_registered_addons();
            $activated_addons  = $addon_manager->get_active_addons();

            $addon_status = [];
            
            foreach ( $registered_addons as $key => $class ) {
		        if ( class_exists( $class ) && is_subclass_of( $class, AddonBase::class ) ) {
                    $obj = new $class;
                    $icon = '';
                    if ( ! empty( $icon_path = $obj->icon_src ?? null ) ) {
                        $icon = plugins_url( 
                            '/assets/images/addons/' . $icon_path, 
                            ZENCOMMUNITY_PLUGIN_FILE 
                        );
                    }
                    $addon_status[] = [
                        'key'           => $key ?? null,
                        'name'          => $obj->name ?? null,
                        'icon_src'      => $icon,
                        'version'       => $obj->version ?? null,
                        'description'   => $obj->description ?? null,
                        'is_activated'  => in_array( $key, $activated_addons, true ),
                        'settings_url'  => $obj->settings_url ?? null,
                    ];
                }
            }

            return new WP_REST_Response( self::promotion_addons( $addon_status ) );
        } catch ( ZencommunityException $e ) {
            return $this->handle_exception( $e );
        }
    }

    /**
     * Display metadata for every PRO addon, used to render locked "upgrade"
     * teaser cards when zencommunity-pro is not active.
     *
     * The free plugin can't read the pro addon classes (they aren't loaded
     * without pro active), so their metadata is declared here as the single
     * source of truth. Keep this list in sync with the addons the pro plugin
     * registers in zencommunity-pro/includes/functions.php.
     *
     * @return array<int, array<string, string>>
     */
    public static function pro_addon_teasers() : array {
        $icon = static function ( string $file ) : string {
            return plugins_url( '/assets/images/addons/' . $file, ZENCOMMUNITY_PLUGIN_FILE );
        };

        return [
            [
                'key'         => 'TicketingSystem',
                'name'        => 'Ticketing System',
                'icon_src'    => $icon( 'ticket.svg' ),
                'version'     => '1.0.0',
                'description' => 'A robust ticketing system for managing support requests.',
            ],
            [
                'key'         => 'Engineering',
                'name'        => 'Engineering',
                'icon_src'    => $icon( 'engineering.svg' ),
                'version'     => '1.0.0',
                'description' => 'Link support tickets to dev-side engineering issues directly from ticket conversations.',
            ],
            [
                'key'         => 'Messaging',
                'name'        => 'Messaging',
                'icon_src'    => $icon( 'messaging.svg' ),
                'version'     => '1.0.0',
                'description' => 'Enables sending and receiving messages between users.',
            ],
            [
                'key'         => 'LiveChat',
                'name'        => 'Live Chat',
                'icon_src'    => $icon( 'live-chat.svg' ),
                'version'     => '1.0.0',
                'description' => 'A robust live chat system for managing support requests.',
            ],
            [
                'key'         => 'FollowerAndBlocker',
                'name'        => 'Follower & Blocker',
                'icon_src'    => $icon( 'follower.svg' ),
                'version'     => '1.0.0',
                'description' => 'Manage followers, and block unwanted profiles for better privacy.',
            ],
            [
                'key'         => 'AiAgent',
                'name'        => 'AI Agent',
                'icon_src'    => $icon( 'ai-agent.svg' ),
                'version'     => '1.0.0',
                'description' => 'Automate support replies and community assistance with an AI agent.',
            ],
            [
                'key'         => 'WpComments',
                'name'        => 'ZenCommunity Comments',
                'icon_src'    => $icon( 'comments.svg' ),
                'version'     => '1.0.0',
                'description' => 'Replace WordPress comments with ZenCommunity discussions.',
            ],
        ];
    }

    /**
     * Append locked pro-addon teasers to the addon list when the pro plugin is
     * inactive. Any pro addon that is somehow already present (e.g. registered)
     * is skipped so it never appears twice.
     */
    public static function promotion_addons( array $addons ) : array {
        if ( is_plugin_active( 'zencommunity-pro/zencommunity-pro.php' ) ) {
            return $addons;
        }

        $existing_keys = array_column( $addons, 'key' );

        foreach ( self::pro_addon_teasers() as $teaser ) {
            if ( in_array( $teaser['key'], $existing_keys, true ) ) {
                continue;
            }
            $teaser['is_activated'] = false;
            $teaser['promotion']    = true;
            $addons[]               = $teaser;
        }

        return $addons;
    }

    /**
     * Handle ZencommunityException and return a standardized REST response.
     *
     * @param ZencommunityException $e
     * @return WP_REST_Response
     */
    private function handle_exception( ZencommunityException $e ) : WP_REST_Response {
        // Return a standardized REST response from the exception
        return $e->as_rest_response();
    }
}
