<?php
namespace ZenCommunity\Classes;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use Throwable;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Database\Models\CustomRole;
class RoleManager {

    const ROLE_SUPPORT_AGENT        = 'support_agent';
    const ROLE_DEVELOPER            = 'developer';

    /** Built-in group-scoped role keys - fixed in code, can't be renamed or deleted via the custom-role UI. */
    const BUILT_IN_ROLES = [ 'admin', 'moderator', 'member' ];

    /**
     * Built-in global role keys. Kept as an explicit constant rather than
     * relying solely on each role's `is_global` flag at runtime: addons can
     * (and at least one does - zencommunity-pro's ticketing Hooks::add_role())
     * replace a default role's whole entry via the 'zencommunity/roles'
     * filter instead of merging into it, which silently drops `is_global`
     * along with everything else. group_role_keys() below treats this list
     * as global regardless of what the filtered data claims.
     */
    const BUILT_IN_GLOBAL_ROLES = [ 'support_agent', 'developer' ];

    /**
     * Every group-level capability a role (built-in or custom) can be
     * granted, keyed the same way default_roles() keys its `capabilities`
     * arrays. Single source of truth for the custom-role builder UI
     * (Settings > Role and Permission) so an admin can only ever pick from
     * capabilities the codebase actually checks - not an arbitrary free-text
     * list. Custom roles are group-scoped only (see shape_custom_role()), so
     * this deliberately excludes support_agent's ticket-only capabilities
     * (view_ticket, change_ticket_status, reply_ticket), which only ever
     * apply to global roles.
     */
    public static function capability_catalog() : array {
        return apply_filters( 'zencommunity/roles/capabilities', [
            'create_post'              => __( 'Create post', 'zencommunity' ),
            'delete_post'              => __( 'Delete any post', 'zencommunity' ),
            'delete_own_post'          => __( 'Delete own post', 'zencommunity' ),
            'manage_post'              => __( 'Manage any post', 'zencommunity' ),
            'manage_own_post'          => __( 'Manage own post', 'zencommunity' ),
            'comment_post'             => __( 'Comment on post', 'zencommunity' ),
            'update_group'             => __( 'Update group settings', 'zencommunity' ),
            'add_group_member'         => __( 'Add member to group', 'zencommunity' ),
            'remove_group_member'      => __( 'Remove member from group', 'zencommunity' ),
            'change_member_role'       => __( 'Change member role', 'zencommunity' ),
            'update_membership_status' => __( 'Update member status', 'zencommunity' ),
        ] );
    }

    public static function update( array $role_action ) : bool {
        $rules = apply_filters( 'zencommunity/roles/sanitization_rules', [
            'role'       => Sanitizer::STRING,
            'permission' => Sanitizer::STRING,
            'action'     => Sanitizer::STRING,
        ] );
    
        // sanitize data
        $role_action               = Sanitizer::sanitize( $role_action, $rules );
        $role                      = $role_action['role'];
        $permission                = $role_action['permission'];
        $action                    = $role_action['action'];
        $disabled_role_permissions = json_decode( get_option( ZENCOMMUNITY_ROLES_OPTION_NAME, '{}' ), true );
        $already_exists            = array_key_exists( $permission, $disabled_role_permissions[$role] ?? [] );

		if ( ! in_array( $action, [ 'disable', 'enable' ] ) ) {
            throw new ZencommunityException( esc_html( __( "Action is invalid", 'zencommunity' ), $permission ), 422 );
		}

        // Validated against the merged (built-in + custom) set, not just
        // default_roles(), so toggling a custom role's capabilities works
        // through this same enable/disable endpoint.
        $roles = static::roles();
        if ( ! isset( $roles[$role]['capabilities'][$permission] ) ) {
            throw new ZencommunityException( esc_html( __( "Role or permission is invalid", 'zencommunity' ), $permission ), 500 );
        }

        if ( 'disable' === $action ) {
            if ( ! $already_exists ) {
                $disabled_role_permissions[$role][$permission] = true;
            }
            else {
                // translators: %s is permission
                throw new ZencommunityException( esc_html( sprintf( __( "%s is already disabled", 'zencommunity' ), $permission ) ), 500 );
            }
        }
        
        if ( 'enable' === $action ) {
            if (  $already_exists ) {
                unset( $disabled_role_permissions[$role][$permission] );
            }
            else {
                // translators: %s is permission
                throw new ZencommunityException( esc_html( sprintf( __( "%s is not exists", 'zencommunity' ), $permission ) ), 500 );
            }
        }
        
        return update_option( ZENCOMMUNITY_ROLES_OPTION_NAME, json_encode( $disabled_role_permissions ) );
    }

    public static function default_roles() : array {
        return apply_filters( 'zencommunity/roles', [
            'admin' => [
                'is_global'   => false,
                'label' => 'Admin',
                'capabilities' => [
                    'create_post' => [ 'label' => __( 'CREATE POST', 'zencommunity' ), 'disabled' => false ],
                    'delete_post' => [ 'label' => __( 'DELETE POST', 'zencommunity' ), 'disabled' => false ],
                    'manage_post' => [ 'label' => __( 'MANAGE POST', 'zencommunity' ), 'disabled' => false ],
                    'comment_post' => [ 'label' => __( 'COMMENT POST', 'zencommunity' ), 'disabled' => false ],
                    'update_group' => [ 'label' => __( 'UPDATE GROUP', 'zencommunity' ), 'disabled' => false ],
                    'add_group_member' => [ 'label' => __( 'ADD NEW MEMBER TO GROUP', 'zencommunity' ), 'disabled' => false ],
                    'remove_group_member' => [ 'label' => __( 'REMOVE MEMBER FROM GROUP', 'zencommunity' ), 'disabled' => false ],
                    'change_member_role' => [ 'label' => __( 'CHANGE MEMBER GROUP', 'zencommunity' ), 'disabled' => false ],
                    'update_membership_status' => [ 'label' => __( 'UPDATE MEMBER STATUS', 'zencommunity' ), 'disabled' => false ],
                    // 'set_featured_post' => [ 'label' => __( 'SET FEATURED', 'zencommunity' ), 'disabled' => false ],
                ],
            ],
            'moderator' => [
                'is_global'   => false,
                'label' => 'Moderator',
                'capabilities' => [
                    'create_post' => [ 'label' => __( 'CREATE POST', 'zencommunity' ), 'disabled' => false ],
                    'delete_post' => [ 'label' => __( 'DELETE POST', 'zencommunity' ), 'disabled' => false ],
                    'manage_post' => [ 'label' => __( 'MANAGE POST', 'zencommunity' ), 'disabled' => false ],
                    'comment_post' => [ 'label' => __( 'COMMENT POST', 'zencommunity' ), 'disabled' => false ],
                    // 'set_featured_post' => [ 'label' => __( 'SET FEATURED', 'zencommunity' ), 'disabled' => false ],
                ],
            ],
            'member' => [
                'is_global'   => false,
                'label' => 'Member',
                'capabilities' => [
                    'create_post' => [ 'label' => __( 'CREATE POST', 'zencommunity' ), 'disabled' => false ],
                    'delete_own_post' => [ 'label' => __( 'DELETE POST', 'zencommunity' ), 'disabled' => false ],
                    'manage_own_post' => [ 'label' => __( 'MANAGE POST', 'zencommunity' ), 'disabled' => false ],
                    'comment_post' => [ 'label' => __( 'COMMENT POST', 'zencommunity' ), 'disabled' => false ],
                ],
            ],
            // Global roles: unlike admin/moderator/member above, these aren't
            // scoped to a group — they're attached directly to a user (see
            // user_has_global_roles()/zenc_user_role meta) via
            // update_global_roles_by_user_id(), which requires is_global => true
            // to accept a role. Assigned from Settings > User Management >
            // Community access; usable to restrict menu items ("global:" source
            // in user_matches_menu_roles()).
            'support_agent' => [
                'is_global'   => true,
                'label' => 'Support agent',
                'capabilities' => [
                    'create_post' => [ 'label' => __( 'CREATE POST', 'zencommunity' ), 'disabled' => false ],
                    'delete_own_post' => [ 'label' => __( 'DELETE POST', 'zencommunity' ), 'disabled' => false ],
                    'manage_own_post' => [ 'label' => __( 'MANAGE POST', 'zencommunity' ), 'disabled' => false ],
                    'comment_post' => [ 'label' => __( 'COMMENT POST', 'zencommunity' ), 'disabled' => false ],
                    'view_ticket' => [ 'label' => __( 'VIEW TICKET', 'zencommunity' ), 'disabled' => false ],
                    'change_ticket_status' => [ 'label' => __( 'CHANGE TICKET STATUS', 'zencommunity' ), 'disabled' => false ],
                    'reply_ticket' => [ 'label' => __( 'REPLY TICKET', 'zencommunity' ), 'disabled' => false ],
                ],
            ],
            'developer' => [
                'is_global'   => true,
                'label' => 'Developer',
                'capabilities' => [],
            ],
        ] );

    }

    /**
     * Shapes a custom role record ({id, slug, label, capabilities: [keys...]})
     * into the same {is_global, label, capabilities: {cap => {label, disabled}}}
     * form default_roles() uses, so callers never need to know whether a role
     * key is built-in or admin-created.
     */
    protected static function shape_custom_role( array $role ) : array {
        $enabled = array_flip( $role['capabilities'] ?? [] );
        $catalog = static::capability_catalog();

        $capabilities = [];
        foreach ( $catalog as $cap => $label ) {
            if ( isset( $enabled[ $cap ] ) ) {
                $capabilities[ $cap ] = [ 'label' => $label, 'disabled' => false ];
            }
        }

        return [
            'is_global'   => false,
            'label'       => $role['label'],
            'capabilities' => $capabilities,
        ];
    }

    public static function roles() : array {
        static $disabled_role_permissions = null;
        static $roles = null;

        if ( is_null( $roles ) ) {
            $roles = static::default_roles();
            foreach ( CustomRole::all() as $custom_role ) {
                $roles[ $custom_role['slug'] ] = static::shape_custom_role( $custom_role );
            }
        }

        if ( is_null( $disabled_role_permissions ) ) {
            $disabled_role_permissions = json_decode( get_option( ZENCOMMUNITY_ROLES_OPTION_NAME, '{}' ), true );
            if ( ! empty( $disabled_role_permissions ) && is_array( $disabled_role_permissions ) ) {
                foreach ( $disabled_role_permissions as $role => $caps ) {
                    foreach ( $caps as $cap => $status ) {
                        if ( is_bool( $status ) ) {
                            $roles[$role]['capabilities'][$cap]['disabled'] = $status;
                        }
                    }
                }
            }
        }
        return $roles;
    }


    /**
     * Slugs of every group-scoped role (built-in admin/moderator/member plus
     * any custom role) - roles() with the global ones filtered out. The
     * valid `role` values for zenc_group_members.role; used to validate a
     * group role assignment without also accepting a global-only role like
     * support_agent, which is assigned through a separate mechanism.
     * Excludes BUILT_IN_GLOBAL_ROLES explicitly, not just whatever
     * roles()[$slug]['is_global'] currently says - see that constant's docblock.
     */
    public static function group_role_keys() : array {
        return array_values( array_diff(
            array_keys( array_filter( static::roles(), fn( $role ) => empty( $role['is_global'] ) ) ),
            self::BUILT_IN_GLOBAL_ROLES
        ) );
    }

    /**
     * The community's global roles (is_global => true entries in roles(),
     * plus BUILT_IN_GLOBAL_ROLES regardless of what that flag currently says
     * - see its docblock) — e.g. Support agent, Developer, or any
     * addon-registered role via the 'zencommunity/roles' filter — as a flat,
     * UI-friendly list. Unlike admin/moderator/member, these aren't scoped to
     * a group; they're attached directly to a user via
     * update_global_roles_by_user_id()/zenc_user_role.
     */
    public static function global_roles() : array {
        $global = [];
        foreach ( static::roles() as $slug => $role ) {
            $is_global = true === ( $role['is_global'] ?? false ) || in_array( $slug, self::BUILT_IN_GLOBAL_ROLES, true );
            if ( $is_global ) {
                $global[] = [ 'slug' => $slug, 'label' => $role['label'] ?? $slug ];
            }
        }
        return $global;
    }

    /**
     * Checks whether a user matches any of a menu item's restriction entries.
     * Entries are prefixed by source: wp:{wp_role_slug}, global:{role_slug},
     * community:{admin|moderator|member}. Matching is OR across all entries.
     */
    public static function user_matches_menu_roles( ?int $user_id, array $roles ) : bool {
        if ( empty( $user_id ) ) {
            return false;
        }

        foreach ( $roles as $entry ) {
            if ( ! is_string( $entry ) || strpos( $entry, ':' ) === false ) {
                continue;
            }
            [ $source, $slug ] = explode( ':', $entry, 2 );

            switch ( $source ) {
                case 'wp':
                    $userdata = get_userdata( $user_id );
                    if ( $userdata && in_array( $slug, (array) $userdata->roles, true ) ) {
                        return true;
                    }
                    break;

                case 'global':
                    if ( static::user_has_global_roles( $user_id, [ $slug ] ) ) {
                        return true;
                    }
                    break;

                case 'community':
                    if ( \ZenCommunity\Database\Models\Profile::user_has_community_role_in_any_group( $user_id, [ $slug ] ) ) {
                        return true;
                    }
                    break;
            }
        }

        return false;
    }

    /**
     * Global role management methods, group based role management methods is in ZenCommunity\Database\Models\Profile class
     */
	public static function user_has_global_perm( int $user_id, string $perm ) : bool {
        try {
            $roles = static::get_global_roles_by_user_id( $user_id );
            $all_perms = [];
            foreach ( $roles as $role ) {
                if ( false === ( $role['capabilities'][$perm]['disabled'] ?? true ) ) {
                    return true;
                }
            }
        }
        catch ( Throwable $e ) {
            return false;
        }
		return false;
	}

	public static function user_has_global_roles( ?int $user_id, array $roles ) : bool {
		$attacthed_roles = (array) get_user_meta( $user_id, 'zenc_user_role', true );
		return count( 
            array_intersect(
                array_unique( array_values( $roles ) ),
                array_keys( array_filter( $attacthed_roles ) )
            )
        ) > 0;
	}

	public static function get_global_roles_by_user_id( int $user_id ) : array {
		$attacthed_roles = (array) get_user_meta( $user_id, 'zenc_user_role', true );
		if ( empty( $attacthed_roles ) ) {
			throw new ZencommunityException( esc_html__( "This user has not any role,", 'zencommunity' ), 401 );
		}
		$role_data 			  = get_user_meta( $user_id, 'zenc_user_role_disabled_caps', true );
		$disabled_permissions = is_array( $role_data ) ? $role_data : [];
		$roles 				  = static::roles();

        $user_roles = [];
        foreach ( $attacthed_roles as $role => $status ) {
            if ( is_array( $roles[ $role ] ?? false ) ) {
                $user_roles[ $role ] = $roles[ $role ];
                foreach ( $disabled_permissions[ $role ] ?? [] as $cap => $status ) {
                    $user_roles[ $role ]['capabilities'][ $cap ]['disabled'] = true;
                }
            }
        }

		return $user_roles;
	}


	public static function update_global_roles_by_user_id( int $user_id, array $data ) : bool {
		$rules = apply_filters( "zencommunity/member/role/validation/rules", [
			'role' 		 => Sanitizer::STRING,
			'action'     => Sanitizer::STRING,
		], $user_id, $data );

		$role_action   = Sanitizer::sanitize( $data, $rules );
		if ( ! isset( $role_action['role'] ) ) {
			throw new ZencommunityException( esc_html__( "role field is required", 'zencommunity' ), 422 );
		}

		$attached_roles = (array) get_user_meta( $user_id, 'zenc_user_role', true );
		$action        = $role_action['action'];
		$role          = $role_action['role'];
    
		if ( ! in_array( $action, [ 'add', 'remove' ], true ) ) {
			throw new ZencommunityException( esc_html__( "Action is invalid", 'zencommunity' ), 422 );
		}

		$roles = static::roles();
		if ( ! isset( $roles[ $role ] ) ) {
			throw new ZencommunityException( esc_html__( "Role is invalid", 'zencommunity' ), 422 );
		}
        
		if ( true !== ( $roles[ $role ]['is_global'] ?? true ) ) {
			throw new ZencommunityException( esc_html__( "Role is not a global role", 'zencommunity' ), 422 );
		}
		
		switch ( $action ) {
			case 'add':
				$attached_roles[ $role ] = true;
				break;
			
			case 'remove':
				unset( $attached_roles[ $role ] );
		}
        update_user_meta( $user_id, 'zenc_user_role', array_unique( array_filter( $attached_roles ) ) );
        return true;
	}

	public static function update_global_roles_perm_by_user_id( int $user_id, array $data ) : bool {
		$rules = apply_filters( "zencommunity/member/permission/validation/rules", [
			'role' 		 => Sanitizer::STRING,
			'permission' => Sanitizer::STRING,
			'action'     => Sanitizer::STRING,
		], $user_id, $data );

		$role_action   = Sanitizer::sanitize( $data, $rules );
		$attached_roles = get_user_meta( $user_id, 'zenc_user_role', true );
		$permission    = $role_action['permission'];
		$action        = $role_action['action'];
		$role          = $role_action['role'] ?? '';
        
		if ( empty( $attached_roles ) ) {
			throw new ZencommunityException( esc_html__( "This user has not any role,", 'zencommunity' ), 401 );
		}

		if ( ! in_array( $role, array_keys( $attached_roles ), true ) ) {
			throw new ZencommunityException( esc_html__( "This user has not any role,", 'zencommunity' ), 401 );
		}

		$roles = static::roles();
		if ( ! isset( $roles[ $role ]['capabilities'][ $permission ] ) ) {
			throw new ZencommunityException( esc_html__( "Role or permission is invalid", 'zencommunity' ), 422 );
		}
	
		if ( ! in_array( $action, [ 'disable', 'enable' ], true ) ) {
			throw new ZencommunityException( esc_html__( "Action is invalid", 'zencommunity' ), 422 );
		}
	
		$disabled_caps = get_user_meta( $user_id, 'zenc_user_role_disabled_caps', true );
		$disabled_caps = is_array( $disabled_caps ) ? $disabled_caps : [];
	
		$already_exists = isset( $disabled_caps[ $role ][ $permission ] );
	
		if ( 'disable' === $action ) {
			if ( ! $already_exists ) {
				$disabled_caps[ $role ][ $permission ] = true;
			} else {
                // translators: %s is permission
				throw new ZencommunityException( esc_html( sprintf( __( "%s is already disabled", 'zencommunity' ), $permission ) ), 500 );
			}
		}
	
		if ( 'enable' === $action ) {
			if ( $already_exists ) {
				unset( $disabled_caps[ $role ][ $permission ] );
			} else {
                // translators: %s is permission
				throw new ZencommunityException( esc_html( sprintf( __( "%s is not disabled", 'zencommunity' ), $permission ) ), 500 );
			}
		}
	
		$disabled_caps = apply_filters( "zencommunity/member/role/data_to_update", $disabled_caps, $user_id );
	
		$is_updated = update_user_meta( $user_id, 'zenc_user_role_disabled_caps', $disabled_caps );
	
		do_action( 'zencommunity/member/role/updated', $user_id, $disabled_caps, $role_action );
	
		return (bool) $is_updated;
	}
}
