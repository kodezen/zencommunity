<?php
namespace ZenCommunity\Api\Common;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_Error;
use WP_REST_Request;
use ZenCommunity\Database\Models\Group;
class Permissions {
    /**
     * Check if the current user has at least one of the allowed roles.
     */
    public static function user_has_role( array $roles_to_check, ?int $user_id = null) : bool {
        if ( ! is_user_logged_in() && $user_id === null) {
            return false;
        }
    
        $user = $user_id ? get_userdata( $user_id ) : wp_get_current_user();
    
        if ( ! $user || empty( $user->roles ) ) {
            return false;
        }
    
        $user_roles = (array) $user->roles;
    
        return (bool) array_intersect( $user_roles, (array) $roles_to_check );
    }
    
    /**
     * Middleware of all permission callback except setting
     */
    public static function authorization( bool $can_acces ) {
        global $zencommunity_settings, $zencommunity_current_user;

        // Site administrators are the ones configuring these restrictions
        // (community_visibility, the roles allow-list, ban/pending status) —
        // they must never be locked out by them. Without this, picking
        // "Only selected user role" in the Setup Wizard before adding their
        // own role to the list (the wizard's own default state) immediately
        // 401s the admin's own session, since the roles check below is a
        // literal array_intersect with no exception for the current user.
        // Mirrors can_view_all_members()'s own admin bypass further down.
        if ( current_user_can( 'manage_options' ) ) {
            return $can_acces;
        }

        if ( empty( $zencommunity_settings->community_visibility ?? null ) ) {
            return new WP_Error( 
                'zencommunity_is_not_configured', 
                __( 'Please check ZenCommunity settings in admin dashboard.', 'zencommunity' ),
                [ 'status' => 403 ] 
            );
        }

        if ( 
            ! empty( $zencommunity_settings->community_visibility ) && 
            ! in_array( $zencommunity_settings->community_visibility, [ 'guest', 'logged', 'roles' ] )
        ) {
            return new WP_Error( 
                'zencommunity_is_not_properly_configured', 
                __( 'ZenCommunity is not properly configured.', 'zencommunity' ),
                [ 'status' => 403 ] 
            );
        }
        
        if ( 
            in_array( $zencommunity_settings->community_visibility, [ 'logged', 'roles' ] ) && 
            ! is_user_logged_in()
        ) {
            return new WP_Error( 
                'zencommunity_forbidden', 
                __( 'Only logged in user can access ZenCommunity.', 'zencommunity' ),
                [ 'status' => 401 ] 
            );
            
        }

        if ( is_user_logged_in() ) {
            if ( 
                 empty( $zencommunity_current_user['status'] ) || 
                'inactive' === $zencommunity_current_user['status']
            ) {
                return new WP_Error( 
                    'zencommunity_user_banned', 
                    __( 'Sorry, you don\’t have access to this community right now.', 'zencommunity' ),
                    [ 'status' => 401 ] 
                );
            }
            
            if ( 'pending' === $zencommunity_current_user['status'] ) {
                return new WP_Error( 
                    'zencommunity_user_pending', 
                    __( 'Sorry, you haven\'t been approved yet, your status is still pending.', 'zencommunity' ),
                    [ 'status' => 401 ] 
                );
            }
        }
        
        

        if ( 
            'roles' === $zencommunity_settings->community_visibility && 
            ! static::user_has_role(
                $zencommunity_settings->community_visibility_roles
            )    
        ) {
            return new WP_Error( 
                'zencommunity_forbidden', 
                __( 'Only Specific user can access ZenCommunity.', 'zencommunity' ),
                [ 'status' => 401 ] 
            );
        }

        return $can_acces;
    }
    
   /**
     * Check if the current user is a site administrator.
     * @return bool True if the user is a site admin, false otherwise.
     */
    public static function admin_can() {
        return static::authorization( current_user_can( 'manage_options' ) );
    }

    /**
     * Check if the current user is a group|site administrator.
     *
     * @return bool True if the user is a group admin, false otherwise.
     */
    public static function group_admin_can( WP_REST_Request $request ) {
        $params = $request->get_params();
        $group_id = absint( $params['group_id'] ?? 0 );
        $current_user_id = get_current_user_id();

        return static::authorization( 
            current_user_can( 'manage_options' ) || Group::is_member_of( $current_user_id, $group_id, [ 'admin' ] ) 
        );
    }

    /**
     * Check if any user is currently logged in.
     *
     * Use this to allow access to features restricted to authenticated users,
     * regardless of their role.
     *
     * @return bool True if a user is logged in, false otherwise.
     */
    public static function any_logged_user_can() {
        global $zencommunity_current_user;
        return static::authorization( ! empty( $zencommunity_current_user ) );
    }
    
    /**
     * Check if the action is allowed for guests (unauthenticated users).
     *
     * Use this when certain actions or views are intended to be accessible
     * by both logged-in users and guests.
     *
     * @return bool Always true. Intended to represent open access.
     */
    public static function even_guest_user_can() {
        return static::authorization( true );
    }

    /**
     * Determine if the current user has permission to update settings.
     * @return bool True if the user can update settings, false otherwise.
     */
    public static function can_update_settings() : bool {
        return current_user_can( 'manage_options' );
    }

    /**
     * Determine if the current user can view all community members.
     * @return bool True if the user has permission to view all members, false otherwise.
     */
    public static function can_view_all_members() {
        global $zencommunity_settings;
        if (  current_user_can( 'manage_options' ) ) {
            return static::authorization( true );
        }

        if ( 
            ! empty( $zencommunity_settings->can_see_all_members ) && 
            ! in_array( $zencommunity_settings->can_see_all_members, [ 'guest', 'logged', 'admin-mod' ] )
        ) {
            return new WP_Error( 
                'zencommunity_is_not_properly_configured', 
                __( 'ZenCommunity is not properly configured.', 'zencommunity' ),
                [ 'status' => 403 ] 
            );
        }

        if ( 
            in_array( $zencommunity_settings->can_see_all_members, [ 'logged', 'admin-mod' ] ) && 
            ! is_user_logged_in()    
        ) {
            return new WP_Error( 
                'zencommunity_forbidden', 
                __( 'Only logged in user can access all members page.', 'zencommunity' ),
                [ 'status' => 401 ] 
            );
        }

        if ( 
            'admin-mod' === $zencommunity_settings->can_see_all_members && 
            ! static::user_has_role( [ 'administrator', 'editor' ] )    
        ) {
            return new WP_Error( 
                'zencommunity_forbidden', 
                __( 'Only admin/editor can access all members page.', 'zencommunity' ),
                [ 'status' => 401 ] 
            );
        }
        
        return static::authorization( true );
    }
}