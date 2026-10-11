<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_User;
use ZenCommunity\Helper;
use ZenCommunity\Database\Utils\QueryBuilder;
use ZenCommunity\Classes\{ Sanitizer, RoleManager };
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Database\Utils\Model;
class Profile extends Model {
	protected string $table = 'zenc_profiles';
	protected ?string $alias = 'pf';
	protected array   $selects = [
		'*'
	];

	public static function current() : ?array {
		return static::create_profile_if_not_exists();
	}

	public static function update_last_activity( ?int $user_id = null ) : void {
		$user_id = is_null( $user_id ) ? get_current_user_id() : $user_id;
		if ( ! empty( $user_id ) ) {
			static::ins()->qb()->where( 'user_id', '=', $user_id )->update( [
				'last_activity' => current_time( 'mysql', true  )
			] );
		}
	}

	/**
	 * Create profile by user id if not exists, if exists: return profile data
	 *
	 * @param ?int $user User ID, if null: current logged user
	 *
	 * @return array
	 */
	public static function create_profile_if_not_exists( ?int $user_id = null, array $profile_data = [] ) : ?array {
		$user = empty( $user_id ) ? wp_get_current_user() : get_userdata( $user_id );
		if (
			! $user || 
			0 === $user->ID  || 
			! ( $user instanceof WP_User )
		) {
			return null;
		}

		$first_name = trim( $user->first_name );
		$last_name  = trim( $user->last_name );
		$username   = trim( $user->user_login );

		if ( empty( $first_name ) || empty( $last_name ) ) {
			$parts = preg_split( '/\s+/', trim( $user->display_name ), 2 );
			if ( empty( $first_name ) && isset( $parts[0] ) ) {
				$first_name = $parts[0];
			}
			if ( empty( $last_name ) && isset( $parts[1] ) ) {
				$last_name = $parts[1];
			}
		}

		$profile = null;
		try {
			// check if user profile exists or not
			$profile = static::by_id( $user->ID );
		}
		catch ( ZencommunityException $e ) {
			// if not exists, then attempt to create
			try {
				$data = array_merge( [
					'first_name' => $first_name,
					'last_name'  => $last_name
				], $profile_data );

				$data['username'] = static::generate_unique_username( $username );

				static::create( $user->ID, $data );
				// Fall through to the common finalization below (sets
				// is_site_admin, guarantees user_id/id) instead of returning
				// early here — an early return skipped that and produced a
				// profile with no is_site_admin key, which the frontend reads
				// as falsy and hides every admin-only Settings tab.
				$profile = static::by_id( $user->ID );
			}
			catch ( ZencommunityException $e ) {
				// Don't fail silently: a logged-in user must never be rendered as a guest.
				error_log( 'ZenCommunity: failed to create profile for user ' . $user->ID . ': ' . $e->getMessage() );
			}
		}

		// Guarantee a valid identity for any logged-in WP user, even if the profile
		// row could not be loaded or created. Otherwise the frontend receives a
		// truthy-but-incomplete object (no user_id) and shows the guest/login header.
		if ( ! is_array( $profile ) ) {
			$profile = [];
		}
		$profile['user_id'] = $profile['user_id'] ?? $user->ID;
		$profile['id']      = $profile['id'] ?? $user->ID;
		$profile['is_site_admin'] = user_can( $user->ID, 'manage_options' );
		return $profile;
	}

	public static function generate_unique_username( string $input ) : string {
		$sanitized_username = sanitize_user( strtolower( preg_replace( '/\s+/', '', $input ) ), true );
		if ( empty( $sanitized_username ) ) {
			$sanitized_username = 'user';
		}
		$username = $sanitized_username;
		$suffix = 1;
		while ( static::username_exists( $username ) ) {
			$username = $sanitized_username . $suffix;
			$suffix++;
		}
		return $username;
	}

	public static function change_user_status( int $user_id, string $status ) : bool {
		return static::ins()->qb()->where( 'user_id', '=', $user_id )->update( [
			'status' => $status
		] );
	}

	/**
	 * Backfill a `zenc_profiles` row for every WordPress user that doesn't
	 * have one yet — accounts created directly in wp-admin/Users, imported by
	 * another plugin, or migrated from elsewhere never visited the community
	 * frontend to get one lazily created by create_profile_if_not_exists(),
	 * so they're invisible to Profile::index()/stuff_index() (both FROM
	 * zenc_profiles) and can't be assigned a group or community role.
	 *
	 * Processed in one bounded batch (default cap covers realistic sites in a
	 * single admin click; `remaining` tells the caller to click again for a
	 * site with more missing users than the cap). Deliberately NOT looped
	 * automatically across multiple requests here or by the caller: a user
	 * create() permanently rejects (e.g. member registration disabled in
	 * Settings, a validation rule in Profile::create()) would be re-selected
	 * at the front of every subsequent batch forever, since the anti-join
	 * below has no memory of a prior failed attempt — that would turn an
	 * auto-looping caller into an infinite request loop. One bounded attempt
	 * per click, with failures reported honestly, avoids that.
	 *
	 * create_profile_if_not_exists() always returns a non-empty array even
	 * when the underlying insert failed (it guarantees an identity for any
	 * logged-in user — see its own doc-comment), so its return value can't be
	 * used as a success signal; Profile::exists() is checked afterward
	 * instead to confirm the row actually landed. A failed attempt is logged
	 * by create_profile_if_not_exists() itself (error_log), with the real
	 * validation reason (e.g. "Member registration is currently disabled.").
	 */
	public static function sync_missing_profiles( int $batch_size = 1000 ) : array {
		$batch_size = max( 1, min( 2000, $batch_size ) );

		$qb = static::ins()->qb()
			->select( [ 'u.ID' => 'user_id' ] )
			->from( 'users', 'u' )
			->where_not_exists( function( QueryBuilder $q ) : void {
				$q->select( [ 1 ] )
					->from( 'zenc_profiles', 'pf' )
					->where_column( 'pf.user_id', '=', 'u.ID' );
			} );

		$total_missing = $qb->count( 'u.ID', true );
		if ( 0 === $total_missing ) {
			return [ 'synced' => 0, 'failed' => 0, 'remaining' => 0, 'total_missing' => 0 ];
		}

		$batch = $qb->order_by( 'u.ID', 'ASC' )->limit( $batch_size )->get();

		$synced = 0;
		$failed = 0;
		foreach ( $batch as $row ) {
			$user_id = absint( $row['user_id'] ?? 0 );
			if ( ! $user_id ) {
				continue;
			}

			static::create_profile_if_not_exists( $user_id );
			if ( static::exists( $user_id ) ) {
				$synced++;
			} else {
				$failed++;
			}
		}

		return [
			'synced'        => $synced,
			'failed'        => $failed,
			'remaining'     => max( 0, $total_missing - $synced - $failed ),
			'total_missing' => $total_missing,
		];
	}

	/**
	 * Global (unfiltered) member counts by status, for the admin Users
	 * screen's summary row — independent of whatever search/role/group
	 * filters stuff_index() is currently applying to the table below it.
	 */
	public static function status_counts() : array {
		$rows = static::ins()->qb()
			->select( [ 'pf.status', 'COUNT(*)' => 'total' ] )
			->group_by( [ 'pf.status' ] )
			->get();

		$counts = [ 'total' => 0, 'active' => 0, 'pending' => 0, 'inactive' => 0 ];
		foreach ( $rows as $row ) {
			$status = $row['status'] ?? '';
			$count  = absint( $row['total'] ?? 0 );
			if ( array_key_exists( $status, $counts ) ) {
				$counts[ $status ] = $count;
			}
			$counts['total'] += $count;
		}
		return $counts;
	}

    public static function stuff_index( array $params ) : array {
        $qb = static::ins()->qb()
		->select([
			'pf.*',
			'g.id' => 'group_id',
			'g.name' => 'group_name',
			'gm.role' => 'group_role',
			'gm.joined_at' => 'date_added',
			'total_membership_groups' => function( QueryBuilder $q ) : void {
						$q->from('zenc_group_members', 'mc')
							->select( [
								'COUNT( DISTINCT mc.group_id )'
							] )
							->where_column( 'pf.user_id', '=', 'mc.user_id' );
			},
			'roles' => function( QueryBuilder $q ) : void {
						$q->from('zenc_group_members', 'gm_')
							->select( [
								'GROUP_CONCAT( DISTINCT gm_.role )'
							] )
							->where_column( 'pf.user_id', '=', 'gm_.user_id' );
			},
			'global_roles' => function( QueryBuilder $q ) : void {
				$q->select( [ 'u.meta_value' ] )
				->from( 'usermeta', 'u' )
				->where_column( 'u.user_id ', '=', 'pf.user_id' )
				->where( 'u.meta_key ', '=', 'zenc_user_role' );
			},
			'email' => function( QueryBuilder $q ) : void {
						$q->from('users', 'u')
							->select( [
								'u.user_email'
							] )
							->where_column( 'pf.user_id', '=', 'u.ID' );
			},
		]);

		$rules = apply_filters( 'zencommunity/stuff/index/sanitization_rules', [
			'page' 	   => Sanitizer::INT,
			'per_page' => Sanitizer::INT,
			'search'   => Sanitizer::STRING,
			'usertype' => Sanitizer::STRING,
			'status'   => Sanitizer::STRING,
			'role'     => Sanitizer::STRING,
			'group_id' => Sanitizer::INT,
			'global_role' => Sanitizer::STRING,
			'order'    => Sanitizer::STRING,
			'order_by' => Sanitizer::STRING,
		] );
		$params = Sanitizer::sanitize( $params, $rules );
		$params = apply_filters( 'zencommunity/stuff/index/params', $params );

        $page 		=  $params['page'] ?? 0;
        $per_page 	=  $params['per_page'] ?? 15;
        $search 	=  $params['search'] ?? '';
        $status 	=  $params['status'] ?? '';
        $order 		=  $params['order'] ?? 'desc';
        $usertype	=  $params['usertype'] ?? null;
        $role 		=  $params['role'] ?? null;
        $group_id 	=  $params['group_id'] ?? null;
        $global_role =  $params['global_role'] ?? null;
        $order_by 	=  $params['order_by'] ?? 'last_activity';
        
		$join_type = boolval( $params['group_id'] ?? false ) ? 'INNER' : 'LEFT';
		$qb->join( 'zenc_group_members', 'gm', 'gm.user_id = pf.user_id', $join_type );
		$qb->join( 'zenc_groups', 'g', 'gm.group_id = g.id', $join_type );
		
        if ( ! empty( $per_page ) && $per_page > 100 ) {
            throw new ZencommunityException( esc_html( __( 'The maximum value of  per_page is 100.', 'zencommunity' ) ) );
        }
        
        if ( ! empty( $search ) ) {
            $qb->where_group( function( QueryBuilder $q ) use( $search ) : void {
				$q->where( 'pf.username', 'LIKE', "%{$search}%" )
					->or_where_exists(  function( QueryBuilder $q ) use( $search ) : void {
						$q->select( [ 1 ] )
							->from( 'users', 'u' )
							->where( 'u.user_email', 'LIKE', "%{$search}%" )
							->where_column( 'pf.user_id', '=', "u.ID" );
					}  )
					->or_where( 'pf.first_name', 'LIKE', "%{$search}%" )
					->or_where( 'pf.last_name', 'LIKE', "%{$search}%" );
			} );
        }

        if ( ! empty( $global_role ) ) {
			$qb->where_exists( function( QueryBuilder $q ) use( $global_role ) : void {
				$q->select( [ 'u.user_id' ] )
				->from( 'usermeta', 'u' )
				->where_column( 'u.user_id ', '=', 'pf.user_id' )
				->where( 'u.meta_key ', '=', 'zenc_user_role' )
				->where( 'u.meta_value  ', 'LIKE', "%{$global_role}%" );
			} );
		}
		
        if ( ! empty( $role ) || ! empty( $group_id ) ) {
			
			if( $role ) {
				$qb->where( 'gm.role', '=', $role );
			}

			if( $group_id ) {
				$qb->where( 'gm.group_id', '=', $group_id );
			}
        }

        if ( ! empty( $status ) ) {
            $qb->where( 'pf.status', '=', $status );
        }

        if ( ! empty( $usertype ) ) {
            $qb->where( 'pf.usertype', '=', $usertype );
        }

        if ( ! in_array( $order = strtoupper( $order ), [ 'ASC', 'DESC' ] ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order.', 'zencommunity' ) ) );
		}

        if ( ! in_array( $order_by, [ 'created_at', 'updated_at', 'username', 'last_activity', 'id' ], true ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order column.', 'zencommunity' ) ) );
        }

        $order_by = 'pf.' . $order_by;
        $qb->order_by( $order_by, $order );
        // Tie-break on the id: many users share a last_activity (or have none),
        // and without a unique final key MySQL may order those rows differently
        // per LIMIT/OFFSET query, so the same user showed up on two pages.
        if ( 'pf.id' !== $order_by ) {
            $qb->order_by( 'pf.id', $order );
        }
        $qb->group_by( [ 'pf.id' ] );
		// wp_send_json($qb->dump());
        // Count distinct users, not joined rows: the group-membership LEFT JOIN
        // yields one row per membership, which inflated `total` / `pages`.
        $data = $qb->paginate( $page, $per_page, 'pf.id', true );
		$data['records'] = static::collection_wrapper( $data['records'] ?? [] );
		$data['counts']  = static::status_counts();
		return $data;
    }

    public static function index( array $params ) : array {
        $qb = static::ins()->qb();
		$qb->select( apply_filters( 'zencommunity/user/select', [
			'pf.*',
			'global_roles' => function( QueryBuilder $q ) : void {
				$q->select( [ 'u.meta_value' ] )
				->from( 'usermeta', 'u' )
				->where_column( 'u.user_id ', '=', 'pf.user_id' )
				->where( 'u.meta_key ', '=', 'zenc_user_role' );
			}
		] ) );
		$rules = apply_filters( 'zencommunity/member/index/sanitization_rules', [
			'page' 	   => Sanitizer::INT,
			'per_page' => Sanitizer::INT,
			'search'   => Sanitizer::STRING,
			'usertype' => Sanitizer::STRING,
			'status'   => Sanitizer::STRING,
			'order'    => Sanitizer::STRING,
			'order_by' => Sanitizer::STRING,
			'role' 	   => Sanitizer::STRING,
		] );
		$params = Sanitizer::sanitize( $params, $rules );
		$params = apply_filters( 'zencommunity/member/index/params', $params );

        $page =  $params['page'] ?? 0;
        $per_page =  $params['per_page'] ?? 15;
        $search =  $params['search'] ?? '';
        $status =  $params['status'] ?? '';
        $order =  $params['order'] ?? 'desc';
        $usertype =  $params['usertype'] ?? null;
        $order_by =  $params['order_by'] ?? 'last_activity';
        $role 	  =  $params['role'] ?? null;
        
        if ( ! empty( $per_page ) && $per_page > 100 ) {
            throw new ZencommunityException( esc_html( __( 'The maximum value of  per_page is 100.', 'zencommunity' ) ) );
        }
        
        if ( ! empty( $role ) ) {
			$qb->where_exists( function( QueryBuilder $q ) use( $role ) : void {
				$q->select( [ 'u.user_id' ] )
				->from( 'usermeta', 'u' )
				->where_column( 'u.user_id ', '=', 'pf.user_id' )
				->where( 'u.meta_key ', '=', 'zenc_user_role' )
				->where( 'u.meta_value  ', 'LIKE', "%{$role}%" );
			} );
		}

        if ( ! empty( $search ) ) {
            $qb->where_group( function( QueryBuilder $q ) use( $search ) : void {
				$q->where( 'pf.username', 'LIKE', "%{$search}%" )
					->or_where_exists(  function( QueryBuilder $q ) use( $search ) : void {
						$q->select( [ 1 ] )
							->from( 'users', 'u' )
							->where( 'u.user_email', 'LIKE', "%{$search}%" )
							->where_column( 'pf.user_id', '=', "u.ID" );
					}  )
					->or_where( 'pf.first_name', 'LIKE', "%{$search}%" )
					->or_where( 'pf.last_name', 'LIKE', "%{$search}%" );
			} );
        }

        if ( ! empty( $status ) ) {
            $qb->where( 'pf.status', '=', $status );
        }

        if ( ! empty( $usertype ) ) {
            $qb->where( 'pf.usertype', '=', $usertype );
        }

        if ( ! in_array( $order = strtoupper( $order ), [ 'ASC', 'DESC' ] ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order.', 'zencommunity' ) ) );
		}

        if ( ! in_array( $order_by, [ 'created_at', 'updated_at', 'username', 'last_activity', 'id' ], true ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order column.', 'zencommunity' ) ) );
        }

        $order_by = 'pf.' . $order_by;
        $qb->order_by( $order_by, $order );
		do_action( 'zencommunity/user/index/qb', $qb, $params );
        $data = $qb->paginate( $page, $per_page );
		$data['records'] = static::collection_wrapper( $data['records'] ?? [] );
		return $data;
    }

	public static function is_user_online( array $profile ) : bool {
		$last_active = strtotime( (string) $profile['last_activity'] );
		$threshold   = 5 * MINUTE_IN_SECONDS;
		$diff        = time() - $last_active;
		return ( $last_active && $diff < $threshold);
	}

	public static function wrapper( array $profile ) : array {
		$profile['id'] = $profile['user_id'];
		$profile['global_roles'] = maybe_unserialize( $profile['global_roles'] ?? '' );
		$profile['meta'] = json_decode( $profile['meta'] ?? '{}', true );
		if ( isset( $profile['roles'] ) && is_string( $profile['roles']  ) ) {
			$profile['roles'] = explode( ',', $profile['roles'] );
		}
		$profile['is_online'] = static::is_user_online( $profile );
		$profile['profile_completion'] = static::completion_percentage( $profile );
		return apply_filters( 'zencommunity/members/wrapper/single', $profile );
	}

	/**
	 * How complete a member's profile is, as a 0-100 percentage, based on a
	 * fixed checklist of fields that are meaningful but not required at
	 * registration time.
	 */
	public static function completion_percentage( array $profile ) : int {
		$meta = $profile['meta'] ?? [];
		$social_links = array_filter( (array) ( $meta['social_links'] ?? [] ) );

		$checklist = apply_filters( 'zencommunity/profile/completion_checklist', [
			'avatar'       => ! empty( $profile['avatar_url'] ?? '' ),
			'bio'          => ! empty( $profile['bio'] ?? '' ),
			'last_name'    => ! empty( $profile['last_name'] ?? '' ),
			'display_name' => ! empty( $meta['display_name'] ?? '' ),
			'pronouns'     => ! empty( $meta['pronouns'] ?? '' ),
			'website_url'  => ! empty( $meta['website_url'] ?? '' ),
			'social_link'  => ! empty( $social_links ),
		], $profile );

		$total = count( $checklist );
		if ( 0 === $total ) {
			return 100;
		}

		$done = count( array_filter( $checklist ) );

		return (int) round( ( $done / $total ) * 100 );
	}

	public static function collection_wrapper( array $profiles ) : array {
		$data = [];
		foreach ( $profiles as $profile ) {
			$data[] = static::wrapper( $profile );
		}
		return apply_filters( 'zencommunity/members/wrapper/collection', $data );
	}

	public static function by_id( int $user_id, ?string $status = null ) : ?array {
		$qb = static::ins()->qb()
		->select( apply_filters( 'zencommunity/user/select', [
			'pf.*',
			'email' => function( QueryBuilder $q ) : void {
				$q->from('users', 'u')
					->select( [
						'u.user_email'
					] )
					->where_column( 'pf.user_id', '=', 'u.ID' );
			},
		] ) )
		->where( 'user_id', '=', $user_id );
		if ( $status ) {
			$qb->where( 'status', '=', $status );
		}

		do_action( 'zencommunity/user/single/qb', $qb );
		if ( empty( $data = $qb->first() ) ) {
			throw new ZencommunityException( esc_html( __( 'Record not found.', 'zencommunity' ) ), 400 );
		}

		return  static::wrapper( $data );
	}
	
	public static function by_username( string $username, ?string $status = null ) : ?array {
		$qb = static::ins()->qb()
		->select( apply_filters( 'zencommunity/user/select', [
			'pf.*',
			'email' => function( QueryBuilder $q ) : void {
				$q->from('users', 'u')
					->select( [
						'u.user_email'
					] )
					->where_column( 'pf.user_id', '=', 'u.ID' );
			},
		] ) )
		->where( 'username', '=', $username );
		if ( $status ) {
			$qb->where( 'status', '=', $status );
		}

		do_action( 'zencommunity/user/single/qb', $qb );
		if ( empty( $data = $qb->first() ) ) {
			throw new ZencommunityException( esc_html( __( 'Record not found.', 'zencommunity' ) ), 400 );
		}

		return  static::wrapper( $data );
	}

	public static function exists( int $user_id ) : bool {
		return static::ins()->qb()->where( 'user_id', '=', $user_id )->count() > 0;
	}

	public static function is_active( int $user_id ) : bool {
		return static::ins()->qb()
			->where( 'user_id', '=', $user_id )
			->where( 'status', '=', 'active' )
			->count() > 0;
	}

	public static function username_exists( string $username ) : bool {
		return static::ins()->qb()->where( 'username', '=', $username )->count() > 0;
	}

	/**
	 * Full, absolute URL for a member's community-uploaded avatar, or null
	 * when they have not uploaded one (falls back to WP/Gravatar).
	 */
	public static function get_avatar_url_for_user( int $user_id ) : ?string {
		$row = static::ins()->qb()
			->select( [ 'avatar_url' ] )
			->where( 'user_id', '=', $user_id )
			->first();

		if ( empty( $row['avatar_url'] ?? '' ) ) {
			return null;
		}

		return site_url( $row['avatar_url'] );
	}

	/**
	 * Makes the community avatar the site-wide WordPress avatar (comments,
	 * wp-admin, core widgets, etc.) whenever a member has uploaded one, so
	 * the two pictures never drift out of sync.
	 *
	 * @param array $args        get_avatar_data() args, keyed by 'url' once resolved.
	 * @param mixed $id_or_email A user ID, WP_User, WP_Post, WP_Comment or email address.
	 */
	public static function sync_avatar_data( array $args, $id_or_email ) : array {
		$user_id = static::resolve_avatar_user_id( $id_or_email );

		if ( ! $user_id ) {
			return $args;
		}

		$avatar_url = static::get_avatar_url_for_user( $user_id );

		if ( ! $avatar_url ) {
			return $args;
		}

		$args['url']          = $avatar_url;
		$args['found_avatar'] = true;

		return $args;
	}

	private static function resolve_avatar_user_id( $id_or_email ) : int {
		if ( is_numeric( $id_or_email ) ) {
			return absint( $id_or_email );
		}

		if ( $id_or_email instanceof WP_User ) {
			return (int) $id_or_email->ID;
		}

		if ( $id_or_email instanceof \WP_Post ) {
			return (int) $id_or_email->post_author;
		}

		if ( $id_or_email instanceof \WP_Comment ) {
			if ( ! empty( $id_or_email->user_id ) ) {
				return (int) $id_or_email->user_id;
			}
			$user = get_user_by( 'email', $id_or_email->comment_author_email );
			return $user ? (int) $user->ID : 0;
		}

		if ( is_string( $id_or_email ) && is_email( $id_or_email ) ) {
			$user = get_user_by( 'email', $id_or_email );
			return $user ? (int) $user->ID : 0;
		}

		return 0;
	}

	public static function create( int $user_id, array $data ) : ?int {
        global $zencommunity_settings;

		$data = static::default_data( $data );

		$rules = apply_filters( 'zencommunity/profile/create/validation/rules', [
			'media_ids.*' => Sanitizer::INT,
			'username'   => Sanitizer::USERNAME,
			'first_name'   => Sanitizer::STRING,
			'last_name'    => Sanitizer::STRING,
			'status'     => Sanitizer::STRING,
			'bio'        => Sanitizer::HTML,
			'usertype' => Sanitizer::STRING,
			'created_at' => Sanitizer::STRING,
			'updated_at' => Sanitizer::STRING,

			// Identity
			'meta.display_name' => Sanitizer::STRING,
			'meta.pronouns'      => Sanitizer::STRING,
			'meta.date_of_birth' => Sanitizer::STRING,

			// Follow list privacy
			'meta.follow_privacy.followers' => Sanitizer::STRING,
			'meta.follow_privacy.following' => Sanitizer::STRING,

			// Social links
			'meta.social_links.facebook'  => Sanitizer::STRING,
			'meta.social_links.x'         => Sanitizer::STRING,
			'meta.social_links.instagram' => Sanitizer::STRING,
			'meta.social_links.youtube'   => Sanitizer::STRING,
			'meta.social_links.linkedin'  => Sanitizer::STRING,
			'meta.website_url'  => Sanitizer::URL,

			// Notification preferences (booleans)
			// 'meta.notification.comment_on_post' => Sanitizer::BOOL,
			// 'meta.notification.reply_on_comment' => Sanitizer::BOOL,
			// 'meta.notification.mention'         => Sanitizer::BOOL,
		] );

		// Validate content length
		Helper::verify_char_limit( $data['username'] ?? null , 'username', 100 );
		Helper::verify_char_limit( $data['first_name'] ?? null , 'first_name', 150 );
		Helper::verify_char_limit( $data['last_name'] ?? null , 'last_name', 150 );
		Helper::verify_char_limit( $data['status'] ?? null , 'status', 30 );
		Helper::verify_char_limit( $data['bio'] ?? null , 'bio', 3000 );
		Helper::verify_char_limit( $data['usertype'] ?? null , 'usertype', 20 );
		Helper::verify_char_limit( $data['meta']['display_name'] ?? null , 'display_name', 60 );
		Helper::verify_char_limit( $data['meta']['pronouns'] ?? null , 'pronouns', 40 );
		Helper::verify_char_limit( $data['meta']['social_links']['facebook'] ?? null , 'facebook_link', 250 );
		Helper::verify_char_limit( $data['meta']['social_links']['x'] ?? null , 'x_link', 250 );
		Helper::verify_char_limit( $data['meta']['social_links']['instagram'] ?? null , 'instagram_link', 250 );
		Helper::verify_char_limit( $data['meta']['social_links']['youtube'] ?? null , 'youtube_link', 250 );
		Helper::verify_char_limit( $data['meta']['social_links']['linkedin'] ?? null , 'linkedin_link', 250 );
		Helper::verify_char_limit( $data['meta']['website_url'] ?? null , 'website_url', 250 );
		static::verify_date_of_birth( $data['meta']['date_of_birth'] ?? null );

		if ( isset( $data['meta']['follow_privacy'] ) && is_array( $data['meta']['follow_privacy'] ) ) {
			$allowed = [ 'everyone', 'logged_user', 'profile_owner' ];
			foreach ( [ 'followers', 'following' ] as $key ) {
				if ( isset( $data['meta']['follow_privacy'][ $key ] ) && ! in_array( $data['meta']['follow_privacy'][ $key ], $allowed, true ) ) {
					unset( $data['meta']['follow_privacy'][ $key ] );
				}
			}
		}

		$data = Sanitizer::sanitize( $data, $rules );

		$data = apply_filters( "zencommunity/profile/data_to_create", $data, $user_id );

		// check user registration is enabled or not, if user is site admin, it can 
        if ( 
			! $zencommunity_settings->allow_member_registration && 
			! user_can( $user_id, 'manage_options' ) 
		) {
			throw new ZencommunityException( esc_html( __( 'Member registration is currently disabled.', 'zencommunity' ) ), 400 );
		}
			
	
		if ( static::exists( $user_id ) )
			throw new ZencommunityException( esc_html( __( 'User already exists.', 'zencommunity' ) ), 400 );

		if ( ! isset( $data['username'] ) )
			throw new ZencommunityException( esc_html( __( 'username is required.', 'zencommunity' ) ) );
		
		$data['username'] = sanitize_user( $data['username'] );

		if ( static::username_exists( $data['username'] ) )
			throw new ZencommunityException( esc_html( __( 'username is already exists.', 'zencommunity' ) ) );

		if ( empty( $data['first_name'] ?? '' ) && empty( $data['last_name'] || '' ) )
			throw new ZencommunityException( esc_html( __( 'At least a first name or last name is required.', 'zencommunity' ) ) );
		
		if ( ! empty( $data['media_ids'] ?? [] ) && Attachment::is_media_available( $data['media_ids'] ) ) 
			throw new ZencommunityException( esc_html( __( 'Media is is already used.', 'zencommunity' ) ) );

		if ( ! isset( $data['created_at'] ) ) {
			$data['created_at'] = current_time( 'mysql', true  );
		}

		if ( ! isset( $data['updated_at'] ) ) {
			$data['updated_at'] = current_time( 'mysql', true  );
		}

		if ( ! isset( $data['status'] ) ) {
			$status = $zencommunity_settings->registered_member_status;
			$data['status'] = empty( $status ) ? 'pending' : $status;
		}

		if ( user_can( $user_id, 'manage_options' ) ) {
			$data['status'] = 'active';
		}

		$data['user_id'] = $user_id;
		
		if ( isset( $data['meta'] )  ) {
			$data['meta'] = wp_json_encode( $data['meta'] );
		}

		$media_ids = $data['media_ids'] ?? [];
		unset( $data['media_ids'] );

		$id = empty( $id = static::ins()->insert( $data ) ) ? null : intval( $id );
		
		if ( empty( $id ) ) {
			throw new ZencommunityException( esc_html( __( 'User profile is not created.', 'zencommunity' ) ) );
		}
		
		// Post-update hook
		do_action( 'zencommunity/profile/created', $id, $data );
		// update media if exists
		static::update( $user_id, [
			'media_ids' => $media_ids,
		], true );
		return $id;
	}

	public static function update( int $user_id, array $data, bool $is_created = false ) : bool {
		// apply sanitization only for update 
		// if $is_created is true: that means a record is just created & need to complete some extra task
		// such as media management 
		// if ( false === $is_created ) {
			$rules = apply_filters( "zencommunity/profile/updated/validation/rules", [
				'media_ids.*' => Sanitizer::INT,
				'username'   => Sanitizer::USERNAME,
				'first_name'   => Sanitizer::STRING,
				'last_name'    => Sanitizer::STRING,
				'status'     => Sanitizer::STRING,
				'bio'        => Sanitizer::HTML,
				'usertype' => Sanitizer::STRING,
				'created_at' => Sanitizer::STRING,
				'updated_at' => Sanitizer::STRING,
				'remove_media' => Sanitizer::STRING,

				// Identity
				'meta.display_name' => Sanitizer::STRING,
				'meta.pronouns'      => Sanitizer::STRING,
				'meta.date_of_birth' => Sanitizer::STRING,

				// Follow list privacy
				'meta.follow_privacy.followers' => Sanitizer::STRING,
				'meta.follow_privacy.following' => Sanitizer::STRING,

				// Social links
				'meta.social_links.facebook'  => Sanitizer::STRING,
				'meta.social_links.x'         => Sanitizer::STRING,
				'meta.social_links.instagram' => Sanitizer::STRING,
				'meta.social_links.youtube'   => Sanitizer::STRING,
				'meta.social_links.linkedin'  => Sanitizer::STRING,
				'meta.website_url'  => Sanitizer::URL,

				// Notification preferences (booleans)
				// 'meta.notification.comment_on_post' => Sanitizer::BOOL,
				// 'meta.notification.reply_on_comment' => Sanitizer::BOOL,
				// 'meta.notification.mention'         => Sanitizer::BOOL,
			], $user_id, $data );

			if ( isset( $data['meta']['follow_privacy'] ) && is_array( $data['meta']['follow_privacy'] ) ) {
				$allowed = [ 'everyone', 'logged_user', 'profile_owner' ];
				foreach ( [ 'followers', 'following' ] as $key ) {
					if ( isset( $data['meta']['follow_privacy'][ $key ] ) && ! in_array( $data['meta']['follow_privacy'][ $key ], $allowed, true ) ) {
						unset( $data['meta']['follow_privacy'][ $key ] );
					}
				}
			}

			$data = Sanitizer::sanitize( $data, $rules );
			$data = apply_filters( "zencommunity/profile/data_to_update", $data, $user_id );

		// }

		// Validate content length
		Helper::verify_char_limit( $data['username'] ?? null , 'username', 100 );
		Helper::verify_char_limit( $data['first_name'] ?? null , 'first_name', 150 );
		Helper::verify_char_limit( $data['last_name'] ?? null , 'last_name', 150 );
		Helper::verify_char_limit( $data['status'] ?? null , 'status', 30 );
		Helper::verify_char_limit( $data['bio'] ?? null , 'bio', 3000 );
		Helper::verify_char_limit( $data['usertype'] ?? null , 'usertype', 20 );
		Helper::verify_char_limit( $data['meta']['display_name'] ?? null , 'display_name', 60 );
		Helper::verify_char_limit( $data['meta']['pronouns'] ?? null , 'pronouns', 40 );
		Helper::verify_char_limit( $data['meta']['social_links']['facebook'] ?? null , 'facebook_link', 250 );
		Helper::verify_char_limit( $data['meta']['social_links']['x'] ?? null , 'x_link', 250 );
		Helper::verify_char_limit( $data['meta']['social_links']['instagram'] ?? null , 'instagram_link', 250 );
		Helper::verify_char_limit( $data['meta']['social_links']['youtube'] ?? null , 'youtube_link', 250 );
		Helper::verify_char_limit( $data['meta']['social_links']['linkedin'] ?? null , 'linkedin_link', 250 );
		Helper::verify_char_limit( $data['meta']['website_url'] ?? null , 'website_url', 250 );
		static::verify_date_of_birth( $data['meta']['date_of_birth'] ?? null );

		if ( empty( $old_data = static::by_id( $user_id ) ) )
			throw new ZencommunityException( esc_html( __( 'User is not exists.', 'zencommunity' ) ), 404 );

		if ( ! empty( $data['media_ids'] ?? [] ) && Attachment::is_media_available( $data['media_ids'] ) ) 
			throw new ZencommunityException( esc_html( __( 'Media is is already used.', 'zencommunity' ) ) );

		if ( isset( $data['username'] ) ) {
			$data['username'] = sanitize_user( $data['username'] );

			if ( 
				$data['username'] !== $old_data['username'] && 
				static::username_exists( $data['username'] ) 
			) {
				throw new ZencommunityException( esc_html( __( 'username is already exists.', 'zencommunity' ) ) );
			}
		}
		
		if ( ! isset( $data['updated_at'] ) ) {
			$data['updated_at'] = current_time( 'mysql', true  );
		}

        $data = Attachment::attach_media(
			$user_id, 'profile', $data, [ static::class, 'handle_media']
        );

		if ( 'profile_avatar' === ( $data['remove_media'] ?? '' ) ) {
			Attachment::delete_media_by_media_type( 'profile_avatar', 'profile', $user_id );
			$data['avatar_url'] = null;
		}

		if ( 'profile_cover' === ( $data['remove_media'] ?? '' ) ) {
			Attachment::delete_media_by_media_type( 'profile_cover', 'profile', $user_id );
			$data['meta']['cover_img_url'] = null;
			unset( $data['meta']['_media_attachments']['profile_cover'] );
		}
		
		if ( isset( $data['meta'] ) ) {
			$data['meta'] = wp_json_encode( Helper::recursive_merge( $old_data['meta'], $data['meta'] ) );
		}

		$data['last_activity'] = current_time( 'mysql', true  );

		unset( $data['media_ids'], $data['remove_media'] );
		$is_updated = static::ins()->qb()->where( 'user_id', '=', $user_id )->update( $data );

		if ( $is_updated && false === $is_created ) {
			// Post-update hook
			do_action( 'zencommunity/profile/updated', $user_id, $data, $old_data );
		}
		return $is_updated;
	}
	
    public static function default_data( array $data ) : array {
        $data['meta']['cover_img_url'] =  null;
        $data['meta']['social_links']  = $data['meta']['social_links'] ?? [];
        // $data['meta']['notification']['comment_on_post']  = $data['meta']['notification']['comment_on_post'] ?? true;
        // $data['meta']['notification']['reply_on_comment']  = $data['meta']['notification']['reply_on_comment'] ?? true;
        // $data['meta']['notification']['mention']  = $data['meta']['notification']['mention'] ?? true;
        return apply_filters( 'zencommunity/profile/default_data', $data );
    }

	/**
	 * Validates an (already sanitize_text_field'd) Date of Birth string. Rejects
	 * anything that isn't a real YYYY-MM-DD calendar date, is in the future, or
	 * implies an age over 150 years. A null/empty value is always valid (the
	 * field is optional).
	 */
	public static function verify_date_of_birth( ?string $date_of_birth ) : void {
		if ( empty( $date_of_birth ) ) {
			return;
		}

		$dob = \DateTime::createFromFormat( 'Y-m-d', $date_of_birth );
		$errors = \DateTime::getLastErrors();

		if ( ! $dob || ! empty( $errors['warning_count'] ) || ! empty( $errors['error_count'] ) ) {
			throw new ZencommunityException( esc_html__( 'Date of birth must be a valid date in YYYY-MM-DD format.', 'zencommunity' ), 400 );
		}

		$now = new \DateTime( 'now', new \DateTimeZone( 'UTC' ) );

		if ( $dob > $now ) {
			throw new ZencommunityException( esc_html__( 'Date of birth cannot be in the future.', 'zencommunity' ), 400 );
		}

		if ( $dob->diff( $now )->y > 150 ) {
			throw new ZencommunityException( esc_html__( 'Date of birth is not valid.', 'zencommunity' ), 400 );
		}
	}

	/**
	 * Whether a member counts as a minor (age < 18) for age-gated features
	 * such as messaging safety rules. Fails open (returns false, i.e. "treat
	 * as adult") whenever the site hasn't opted into DOB collection, or the
	 * member has no stored Date of Birth — enabling the setting must never
	 * retroactively block existing users who haven't filled the field in.
	 */
	public static function is_minor( int $user_id ) : bool {
		global $zencommunity_settings;

		if ( empty( $zencommunity_settings->enable_date_of_birth_field ?? false ) ) {
			return false;
		}

		$date_of_birth = null;
		try {
			$profile = static::by_id( $user_id );
			$date_of_birth = $profile['meta']['date_of_birth'] ?? null;
		} catch ( ZencommunityException $e ) {
			return false;
		}

		if ( empty( $date_of_birth ) ) {
			return false;
		}

		$dob = \DateTime::createFromFormat( 'Y-m-d', $date_of_birth );
		if ( ! $dob ) {
			return false;
		}

		$age = $dob->diff( new \DateTime( 'now', new \DateTimeZone( 'UTC' ) ) )->y;
		return $age < 18;
	}

	/**
	 * Helper method for manage media in profile
	 */
	public static function handle_media( array $data, array $media, int $id ) : array {
		// user profile img
		if ( ! empty( $profile_avatar = $media['profile_avatar'][0] ?? [] ) ) {
			$data['avatar_url'] = $profile_avatar['path'] ?? null;
            $data['attached']['profile_avatar'] = $profile_avatar['id'] ?? null;
		}

		// user profile cover img
		if ( ! empty( $profile_cover = $media['profile_cover'][0] ?? [] ) ) {
			$data['meta']['cover_img_url'] = $profile_cover['path'] ?? null;
			$data['meta']['_media_attachments']['profile_cover'][] = $profile_cover['id'] ?? null;
            $data['attached']['profile_cover'] = $profile_cover['id'] ?? null;
		}

		// apply filters
		$data = apply_filters( 
			'zencommunity/profile/handle_media_fields', 
			$data, $media, $id 
		);
		return $data;
	}

	public static function delete( int $user_id ) : bool {
		// 1st: delete media
		Attachment::delete_media_by_object_id( $user_id, 'profile' );
		$is_deleted = static::ins()->qb()->where( 'user_id', '=', $user_id )->delete();
		if (  $is_deleted ) {
			do_action( 'zencommunity/profile/deleted', $user_id );
		}
		return $is_deleted;
	}
	
	public static function get_groups_caps( int $user_id ) : array {


		
		$roles_data = QueryBuilder::ins()
			->select( [ 'group_id', 'meta', 'role' ] )
			->from( 'zenc_group_members' )
			->where( 'user_id', '=', $user_id )
			->get();
		
		$roles = RoleManager::roles();
		
		$user_roles = [];
		if ( user_can( $user_id, 'manage_options' ) ) {
			$user_roles['manage_everything'] = true;
		}

		foreach ( $roles_data as $role_data ) {
			$meta = json_decode( $role_data['meta'] ?? '{}', true );
			$meta = is_array( $meta ) ? $meta : [];
			$role = $role_data['role'];
			$group_id = $role_data['group_id'];
			$disabled_permissions = $meta['disabled_permissions'] ?? [];
			
			if ( ! isset( $roles[$role] ) ) {
				throw new ZencommunityException( esc_html__( "Role is invalid", 'zencommunity' ), 500 );
			}

			$user_roles[$group_id]['role'] = $role;
			$user_roles[$group_id]['caps'] = $roles[$role]['capabilities'];

			foreach ( $disabled_permissions[$role] ?? [] as $cap => $status ) {
				$user_roles[$group_id]['caps'][$cap]['disabled'] = true;
			}

			foreach ( $user_roles[$group_id]['caps'] ?? [] as $cap => $status ) {
				$user_roles[$group_id]['caps'][$cap] = ! $status['disabled'];
			}
		}
		return $user_roles;
	}

	/**
	 * Whether a user holds any of the given community roles (admin/moderator/member)
	 * in at least one group they belong to. Used for the "community:{role}" source
	 * of menu-item role restriction — unlike is_member_of(), this isn't scoped to a
	 * single group.
	 */
	public static function user_has_community_role_in_any_group( int $user_id, array $roles ) : bool {
		if ( empty( $roles ) ) {
			return false;
		}

		$match = QueryBuilder::ins()
			->select( [ 'id' ] )
			->from( 'zenc_group_members' )
			->where( 'user_id', '=', $user_id )
			->where( 'status', '=', 'active' )
			->where_in( 'role', $roles )
			->first();

		return ! empty( $match );
	}

	public static function get_user_group_caps( int $user_id, int $group_id ) : array {

		$role_data = QueryBuilder::ins()
			->select( [ 'meta', 'role' ] )
			->from( 'zenc_group_members' )
			->where( 'user_id', '=', $user_id )
			->where( 'group_id', '=', $group_id )
			->first();

		if ( empty( $role_data ) )
			throw new ZencommunityException( esc_html( __( 'User is not exists in this group.', 'zencommunity' ) ), 404 );
		
		
		$meta = json_decode( $role_data['meta'] ?? '{}', true );
		$meta = is_array( $meta ) ? $meta : [];
		$role = $role_data['role'];
		$disabled_permissions = $meta['disabled_permissions'] ?? [];
		
        $roles = RoleManager::roles();
        if ( ! isset( $roles[$role] ) ) {
            throw new ZencommunityException( esc_html__( "Role is invalid", 'zencommunity' ), 500 );
        }

		$role_caps = $roles[$role];

		foreach ( $disabled_permissions[$role] ?? [] as $cap => $status ) {
			$role_caps['capabilities'][$cap]['disabled'] = true;
		}
		return $role_caps;
	}

	public static function group_role_update( int $user_id, int $group_id, array $data ) : bool {
		$rules = apply_filters( "zencommunity/member/role/validation/rules", [
			'permission' => Sanitizer::STRING,
			'action'     => Sanitizer::STRING,
		], $user_id, $data );

		$role_data = QueryBuilder::ins()
			->select( [ 'meta', 'role' ] )
			->from( 'zenc_group_members', 'gm' )
			->where( 'gm.user_id', '=', $user_id )
			->where( 'gm.group_id', '=', $group_id )
			->first();

		if ( empty( $role_data ) )
			throw new ZencommunityException( esc_html( __( 'User is not exists in this group.', 'zencommunity' ) ), 404 );

		$meta 				   = json_decode( $role_data['meta'] ?? '{}', true );
		$meta 				   = is_array( $meta ) ? $meta : [];
        $role_action           = Sanitizer::sanitize( $data, $rules );
        $role                  = $role_data['role'];
        $permission            = $role_action['permission'];
        $action                = $role_action['action'];
		$disabled_permissions  = $meta['disabled_permissions'] ?? [];
        $already_exists        = array_key_exists( $permission, $disabled_permissions[$role] );

		
        $roles = RoleManager::roles();
        if ( ! isset( $roles[$role]['capabilities'][$permission] ) ) {
            throw new ZencommunityException( esc_html( __( "Role or permission is invalid", 'zencommunity' ), $permission ), 500 );
        }

		if ( ! in_array( $action, [ 'disable', 'enable' ] ) ) {
            throw new ZencommunityException( esc_html( __( "Action is invalid", 'zencommunity' ), $permission ), 422 );
		}

        if ( 'disable' === $action ) {
            if ( ! $already_exists ) {
                $disabled_permissions[$role][$permission] = true;
            }
            else {
                // translators: %s is permission
                throw new ZencommunityException( esc_html( sprintf( __( "%s is already disabled", 'zencommunity' ), $permission ) ), 500 );
            }
        }
        
        if ( 'enable' === $action ) {
            if (  $already_exists ) {
                unset( $disabled_permissions[$role][$permission] );
            }
            else {
                // translators: %s is permission
                throw new ZencommunityException( esc_html( sprintf( __( "%s is not exists", 'zencommunity' ), $permission ) ), 500 );
            }
        }
		
		$data = [];
		$data['meta'] 						  = $meta;
		$data['meta']['disabled_permissions'] = $disabled_permissions;
		$data['meta'] 						  = wp_json_encode( $data['meta'] );
		

		$data = apply_filters( "zencommunity/member/role/data_to_update", $data, $user_id );

		$is_updated = QueryBuilder::ins()
			->from( 'zenc_group_members' )
			->where( 'user_id', '=', $user_id )
			->where( 'group_id', '=', $group_id )
			->update( $data );

		do_action( 'zencommunity/member/role/updated', $user_id, $data, $meta );
		return $is_updated;
	}

	public static function get_usernames_as_link( array $usernames ) : ?array {
		if ( empty( $usernames ) ) return [];
		$users = static::ins()->qb()
			->select( [ 'id', 'username' ] )
			->where_in( 'username', $usernames )
			->get();

		$data = [];
		foreach( $users ?? [] as $user ) {
			$data[$user['username']] = sprintf( 
				'<Mention id=%d username="%s" />',
				$user['id'], 
				$user['username'] 
			) ;
		}
		return $data;
	}

	public static function rendered_content( string $content, ?int $id, string $type, array $mentioned ) : array {
		$mentions = Helper::extract_mentions( $content );
	
		$links = static::get_usernames_as_link( $mentions );
		$usernames = array_keys( $links );
	
	
		// Sort usernames by length (descending) to avoid partial matches
		usort( $usernames, fn( $a, $b ) => strlen( $b ) - strlen( $a ) );
	
		// Create regex pattern dynamically
		$pattern = '/@(' . implode( '|', array_map( 'preg_quote', $usernames ) ) . ')\b/';
	
		$rendered_content = preg_replace_callback( $pattern, function( $matches ) use ( $links ) {
			$username = $matches[1];
			return $links[$username] ?? $matches[0];
		}, $content );
	
		$newly_mentioned = array_diff( $usernames, $mentioned );
		// fire this action when new  username is available, which is not mentioned yet
		if ( ! empty( $newly_mentioned ) ) {
			do_action( "zencommunity/{$type}/mentioned", $id, $newly_mentioned, $content, $rendered_content );
		}

		$removed = array_diff( $mentioned, $usernames );
		// fire this action when remove user[s] fropm mention on edit
		if ( ! empty( $removed ) ) {
			do_action( "zencommunity/{$type}/mention/remove", $id, $removed, $content, $rendered_content );
		}

		return [
			'mentioned' => $usernames,
			'rendered'  => make_clickable( $rendered_content ),
		];
	}
	
}