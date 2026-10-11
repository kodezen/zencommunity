<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Helper;
use ZenCommunity\Traits\Scheduler;
use ZenCommunity\Classes\{ Sanitizer, RoleManager };
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Database\Utils\Model;
use ZenCommunity\Database\Utils\QueryBuilder;
class Group extends Model {
	use Scheduler;
	protected string $table = 'zenc_groups';
	protected ?string $alias = 's';
	
	public static function exists( int $group_id, bool $is_category = false ) : ?bool {
		$qb = static::ins()->qb()->where( 's.id', '=', $group_id );
		if ( $is_category ) {
            $qb->where_null( 's.category_id' );
        }
        else {
            $qb->where_not_null( 's.category_id' );
        }
		return $qb->count() > 0;
	}

	public static function slug_exists( string $slug, bool $is_category = false ) : ?bool {
		$qb = static::ins()->qb()->where( 's.slug', '=', $slug );
		if ( $is_category ) {
            $qb->where_null( 's.category_id' );
        }
        else {
            $qb->where_not_null( 's.category_id' );
        }
		return $qb->count() > 0;
	}

    public static function user_groups(int $user_id = null ) : array {
        $qb = static::ins()->qb()
		->select( [ 
			's.*', 
			'curr_user_membership' => fn( QueryBuilder $q ) : QueryBuilder => $q->select( [
				"JSON_OBJECT( 'member_status', spm_s.status, 'member_role', spm_s.role )"
				])
				->from( 'zenc_group_members', 'spm_s' )
				->where_column( 'spm_s.group_id', '=', 's.id' )
				->where( 'spm_s.user_id', '=', $user_id )
				->limit( 1 ),
		])
		->where_not_null( 's.category_id' );
		
		$qb->where_exists( function( QueryBuilder $q ) use( $user_id ) : void {
			$q->from( 'zenc_group_members', 'spm_a' )
			->where_column( 'spm_a.group_id', '=', 's.id' )
			->where( 'spm_a.user_id', '=', $user_id );
		} );
		// print_r($qb->dump());
		return static::collection_wrapper( $qb->get(), false );

	}
	
    public static function index( array $params, bool $only_category = true, ?int $logged_user_id = null ) : array {
        $qb = static::ins()->qb();
		$object_type = $only_category ? 'category' : 'group';
		$rules = apply_filters( "zencommunity/{$object_type}/index/sanitization_rules",  [
			'page' 	   => Sanitizer::INT,
			'per_page' => Sanitizer::INT,
			'search'   => Sanitizer::STRING,
			'status'   => Sanitizer::STRING,
			'order'    => Sanitizer::STRING,
			'order_by' => Sanitizer::STRING,
			'category_id' => Sanitizer::INT,
			'type'        => Sanitizer::STRING,
			'privacy'     => Sanitizer::STRING,
			'user_id'     => Sanitizer::INT,
			'is_guest'    => Sanitizer::BOOL,
			'current_user_can_post'    => Sanitizer::BOOL,
			'is_annonymous_enabled'    => Sanitizer::BOOL,
		] );

		$params = Sanitizer::sanitize( $params, $rules );
		$params = apply_filters( "zencommunity/{$object_type}/index/query", $params );

		// if  only_category === false: return only groups
		if ( ! $only_category ) {
			$category_id = $params['category_id'] ?? NULL;
			$user_id     = $params['user_id'] ?? '';
			$is_guest    = $params['is_guest'] ?? false;
			$current_user_can_post = $params['current_user_can_post'] ?? false;
			$is_annonymous_enabled = $params['is_annonymous_enabled'] ?? false;
			if ( $is_annonymous_enabled ) {
				$qb->where( 's.meta', 'LIKE', '%"allow_anonymous_feed":true%' );
			}

			// set current user scope
			static::user_access_query( $qb, $is_guest, $logged_user_id, $current_user_can_post );

			// get user membership groups

			// groups by category
			if ( ! is_null( $category_id ) ) {
				$qb->where( 's.category_id', '=', $category_id );
			}

			// Space types hidden from listings (filterable by extensions).
			// Excluded in the query itself — not just dropped from the
			// page afterwards — so `total`/`pages` match the rows returned.
			$excluded_types = (array) apply_filters( 'zencommunity/group/index/excluded_types', [] );
			if ( ! empty( $excluded_types ) ) {
				$qb->where_not_in( 's.type', array_values( $excluded_types ) );
			}
			// Spaces of an unregistered type are stripped from the listing
			// (SpaceType::strip_unregistered_collection()); leave them out of
			// the query too so pagination totals match.
			$qb->where_in( 's.type', \ZenCommunity\Classes\SpaceType::keys() );

			// groups by space type (discussion, event, …)
			if ( ! empty( $params['type'] ) ) {
				$qb->where( 's.type', '=', $params['type'] );
			}

			// groups by privacy
			if ( ! empty( $params['privacy'] ) ) {
				if ( ! in_array( $params['privacy'], [ 'public', 'private', 'hidden' ], true ) ) {
					throw new ZencommunityException( esc_html( __( 'Invalid privacy.', 'zencommunity' ) ) );
				}
				$qb->where( 's.privacy', '=', $params['privacy'] );
			}

			// groups by category
			if ( ! empty( $user_id ) ) {
				$qb->where_exists( 
					fn( QueryBuilder $q ) : QueryBuilder => $q->from( 'zenc_group_members', 'spmu' )
						->where_column( 'spmu.group_id', '=', 's.id' )
						->where( 'spmu.user_id', '=', $user_id )
						->limit( 1 )
				);
			}

			// ensure only group will return
            $qb->where_not_null( 's.category_id' );
		}

		// if only_category === true: return only categories [default]
		else  {
            $qb->where_null( 's.category_id' );
		} 

        $page 	  = $params['page'] ?? 0;
        $per_page = $params['per_page'] ?? 15;
        $search   = $params['search'] ?? '';
        $status   = $params['status'] ?? '';
        $order    = $params['order'] ?? 'desc';
        $order_by = $params['order_by'] ?? 'id';
        
        if ( ! empty( $per_page ) && $per_page > 100 ) {
			throw new ZencommunityException( esc_html( __( 'The maximum value of  per_page is 100.', 'zencommunity' ) ) );
        }
        
        if ( ! empty( $search ) ) {
            $qb->where( 's.name', 'LIKE', "%{$search}%" );
        }

		if ( $status && ! in_array( $status, [ 'published', 'draft' ], true ) ) {
			throw new ZencommunityException( esc_html( __( 'Invalid status.', 'zencommunity' ) ) );
		}

        if ( ! empty( $status ) ) {
            $qb->where( 's.status', '=', $status );
        }

        if ( ! in_array( $order = strtoupper( $order ), [ 'ASC', 'DESC' ] ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order.', 'zencommunity' ) ) );
		}

        if ( ! in_array( $order_by, [ 'serial_number', 'name', 'created_at', 'updated_at', 'id' ], true ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order column.', 'zencommunity' ) ) );
        }

		$order_by = 's.' . $order_by;
		$qb->order_by( $order_by, $order );
		$qb->group_by( [ 's.id' ] );

		$data = $qb->paginate( $page, $per_page, 's.id', true );
		$data['records'] = static::collection_wrapper( $data['records'] ?? [], $only_category );
		return $data;
    }

	public static function wrapper( array $group, bool $is_category = false, bool $is_single = false ) : array {
		$type = 'category';
		// only for groups
		if ( ! $is_category ) {
			$type = 'group';
			$curr_user_membership = json_decode( 
				$group['curr_user_membership'] ?? '{}', true 
			);

			if ( ! empty( $curr_user_membership ) ) {
				unset( $group['curr_user_membership'] );
				$group['member_role'] = $curr_user_membership['member_role'] ?? null;
				$group['member_status'] = $curr_user_membership['member_status'] ?? null;
			}

			$group['meta'] = json_decode( $group['meta'] ?? '{}', true );
			$group['icon'] = json_decode( $group['icon'] ?? '{}', true );
		}
		return apply_filters( "zencommunity/{$type}/wrapper/single", $group, $is_single );
	}

	public static function collection_wrapper( array $groups, bool $is_category = false ) : array {
		$data = [];
		foreach ( $groups as $group ) {
			$data[] = static::wrapper( $group, $is_category );
		}
		$type = $is_category ? 'category' : 'group';
		return apply_filters( "zencommunity/{$type}/wrapper/collection", $data );
	}

	public static function by_id( int $group_id, bool $is_category = false, ?string $status = null, ?int $logged_user_id = null ) : ?array {
		$qb = static::ins()->qb()->where( 's.id', '=', $group_id );

		if ( $is_category ) {
			$qb->where_null( 's.category_id' );
		}
		else{
			$qb->where_not_null( 's.category_id' );
		}
		
		if ( $status ) {
			$qb->where( 's.status', '=', $status );
		}

		if ( ! is_null( $logged_user_id ) ) {
			$is_guest = 0 === intval( $logged_user_id );
			// set current user scope
			static::user_access_query( $qb, $is_guest, $logged_user_id);
		}
		
		if ( empty( $data = $qb->first() ) ) {
			throw new ZencommunityException( esc_html( __( 'Record not found.', 'zencommunity' ) ), 404 );
		}
		
		return  static::wrapper( $data, $is_category, true );
	}

	public static function by_slug( int $slug, bool $is_category = false, ?string $status = null, ?int $logged_user_id = null ) : ?array {
		$qb = static::ins()->qb()->where( 's.slug', '=', $slug );

		if ( $is_category ) {
			$qb->where_null( 's.category_id' );
		}
		else{
			$qb->where_not_null( 's.category_id' );
		}
		
		if ( $status ) {
			$qb->where( 's.status', '=', $status );
		}

		if ( ! is_null( $logged_user_id ) ) {
			$is_guest = 0 === intval( $logged_user_id );
			// set current user scope
			static::user_access_query( $qb, $is_guest, $logged_user_id);
		}

		if ( empty( $data = $qb->first() ) ) {
			throw new ZencommunityException( esc_html( __( 'Record not found.', 'zencommunity' ) ), 404 );
		}

		return  static::wrapper( $data, $is_category, true );
	}

	public static function user_access_query( QueryBuilder $qb, bool $is_guest, ?int $logged_user_id = null, bool $only_postable_groups =false ) : void {
			// set current user scope
			// if user is logged in: only membership group & public, private group will be returned
			if ( ! $is_guest && ! is_null( $logged_user_id ) ) {
				$qb->select( [ 
					's.*', 
					'curr_user_membership'       => fn( QueryBuilder $q ) : QueryBuilder => $q->select( [
						"JSON_OBJECT( 'member_status', spm_s.status, 'member_role', spm_s.role )"
						])
						->from( 'zenc_group_members', 'spm_s' )
						->where_column( 'spm_s.group_id', '=', 's.id' )
						->where( 'spm_s.user_id', '=', $logged_user_id )
						->limit( 1 ),
				]);

				// if user is  site admin, then user can see all available group
				if ( ! user_can( $logged_user_id, 'manage_options' ) ) {
					$qb->where_exists( function( QueryBuilder $q ) use( 
						$logged_user_id, $only_postable_groups
					) : void {
						$q->from( 'zenc_group_members', 'spm_a' )
						->where_column( 'spm_a.group_id', '=', 's.id' )
						->where_group( function( QueryBuilder $q ) use (
							$logged_user_id,
							$only_postable_groups 
						) : void {
							$q->where( 'spm_a.user_id', '=', $logged_user_id );
							if ( $only_postable_groups ) {
								$q->or_where( 's.privacy', '=', 'public' );
							}
							else {
								$q->or_where( 's.privacy', '!=', 'hidden' );
							}
							
						} );
					} );

				}
			}
			// if user is not logged in, then show only public & private groups
			if ( $is_guest ) {
				$qb->where( 's.privacy', '!=', 'hidden' );
			}
	}

	/**
	 * Use this method to check whether a user has permission to perform 
	 * basic actions such as posting a feed, liking, commenting, etc.
	 *
	 * Note: This method should NOT be used to check permissions for managing,
	 * creating, updating, or deleting a category.
	 */
	public static function can_user_post_interact( int $user_id, int $group_id, array $roles = [], ?string $status = 'active', array $cap_groups = [] ) : bool {
		return (
			user_can( $user_id, 'manage_options' ) || 
			static::is_member_of( $user_id, $group_id, $roles, $status, $cap_groups )
		);
	}
	
	public static function create( array $data, ?int $category_id = null ) : ?int {
		
		$data = Sanitizer::sanitize( $data, 
			apply_filters( 'zencommunity/group/create/sanitaization/rules',
			[
				'name'   => Sanitizer::STRING,
				'slug'   => Sanitizer::STRING,
				'description'   => Sanitizer::HTML,
				'status'    => Sanitizer::STRING,
				'privacy' => Sanitizer::STRING,

				'created_at' => Sanitizer::STRING,
				'updated_at' => Sanitizer::STRING,
				'serial_number' => Sanitizer::INT,
				'media_ids.*'   => Sanitizer::INT,
				'icon.type' => Sanitizer::STRING,
				'icon.src'  => Sanitizer::STRING,

				'meta.anyone_can_send_join_request'  => Sanitizer::BOOL,
				'meta.members_visibility'  => Sanitizer::STRING,
				'meta.approval_required'  => Sanitizer::BOOL,
				'meta.post_approval_required'  => Sanitizer::BOOL,
				'meta.post_approval_first_post_only'  => Sanitizer::BOOL,
			] )
		);

		// Validate content length
		Helper::verify_char_limit( $data['name'] ?? null , 'title' );
		Helper::verify_char_limit( $data['slug'] ?? null , 'slug', 250 );
		Helper::verify_char_limit( $data['description'] ?? null , 'description' );
		
		// validate members_visibility field
		if ( 
			array_key_exists( 'members_visibility', $data['meta'] ?? [] ) && 
			! in_array(
				$data['meta']['members_visibility'], 
				[ 'members_only', 'admin-mod', 'logged', 'guest' ],
				true
			)
		) {
			throw new ZencommunityException( esc_html( __( 'Invalid value of members_visibility.', 'zencommunity' ) ), 500 );
		}

		$data = static::default_data( $data, $category_id );
		if ( ! is_null( $category_id ) && 0 !== $category_id && ! static::exists( $category_id, true ) ) 
			throw new ZencommunityException( esc_html( __( 'Invalid category id', 'zencommunity' ) ), 404 );

		if ( ! isset( $data['name'] ) )
			throw new ZencommunityException( esc_html( __( 'name field is required.', 'zencommunity' ) ) );

		if ( ! isset( $data['slug'] ) )
			throw new ZencommunityException( esc_html( __( 'slug field is required.', 'zencommunity' ) ) );

		$data['slug'] = sanitize_title( $data['slug'] );
		if ( static::slug_exists( $data['slug'], is_null( $category_id ) ) ) 
			throw new ZencommunityException( esc_html( __( 'Slug already exists', 'zencommunity' ) ) );

		if ( isset( $data['status'] ) && ! in_array( $data['status'], [ 'published', 'draft' ] ) ) 
			throw new ZencommunityException( esc_html( __( 'Invalid status.', 'zencommunity' ) ) );

		if ( isset( $data['privacy'] ) && ! in_array( $data['privacy'], [ 'public', 'private', 'hidden' ] ) ) 
			throw new ZencommunityException( esc_html( __( 'Invalid privacy.', 'zencommunity' ) ) );

		if ( ! empty( $data['media_ids'] ?? [] ) && Attachment::is_media_available( $data['media_ids'] ) ) 
			throw new ZencommunityException( esc_html( __( 'Media is is already used.', 'zencommunity' ) ) );


		// category_id : null == group category; category_id : int == group; 
		$data['category_id'] = $category_id;

		$data['created_by'] = get_current_user_id();

		if ( ! isset( $data['created_at'] ) ) {
			$data['created_at'] = current_time( 'mysql', true  );
		}
		if ( ! isset( $data['updated_at'] ) ) {
			$data['updated_at'] = current_time( 'mysql', true  );
		}

		if ( ! isset( $data['status'] ) ) {
			$data['status'] = 'published';
		}

		if ( isset( $data['icon'] ) ) {
			$data['icon'] = wp_json_encode( $data['icon'] );
		}

		if ( isset( $data['meta'] ) ) {
			$data['meta'] = wp_json_encode( $data['meta'] );
		}
		
		if ( ! isset( $data['serial_number'] ) ) {
			// get last id
			$data['serial_number'] = static::ins()->qb()->order_by( 's.id', 'desc' )->value( 's.id' );
			$data['serial_number'] = empty( $data['serial_number'] ) ? 1 : intval( $data['serial_number'] ) + 1;
		}
		
		$media_ids = $data['media_ids'] ?? [];
		unset( $data['media_ids'] );

		$id = empty( $id = static::ins()->insert( $data ) ) ? null : intval( $id );
		
		if ( empty( $id ) ) {
			throw new ZencommunityException( esc_html( __( 'An error is occured.', 'zencommunity' ) ) );
		}

		// update media if exists
		static::update( $id, [
			'media_ids' => $media_ids,
		],  is_null( $category_id ), true );

		return $id;
	}
	
    public static function update( int $group_id, array $data, bool $is_category = false, bool $is_created = false, ?int $actor_user_id = null ) : bool {
		// if actor user id is provided then check actor user has permission to perform this action
		if ( 
			! $is_category && 
			is_int( $actor_user_id ) &&  
			! static::can_user_post_interact( $actor_user_id, $group_id, [ 'admin' ], 'active', [
				[ 'update_group' ]
			] ) 
		)
			throw new ZencommunityException( esc_html( __( 'Unauthorized.', 'zencommunity' ) ) );

		$data = Sanitizer::sanitize( $data, 
			apply_filters( 'zencommunity/group/update/sanitaization/rules',
			[
				'name'   => Sanitizer::STRING,
				'slug'   => Sanitizer::STRING,
				'description'   => Sanitizer::HTML,
				'status'    => Sanitizer::STRING,
				'privacy' => Sanitizer::STRING,

				'created_at' => Sanitizer::STRING,
				'updated_at' => Sanitizer::STRING,
				'category_id'   => Sanitizer::INT,
				'serial_number' => Sanitizer::INT,
				'media_ids.*'   => Sanitizer::INT,
				'icon.type' => Sanitizer::STRING,
				'icon.src'  => Sanitizer::STRING,
				'remove_media' => Sanitizer::STRING,

				'meta.anyone_can_send_join_request'  => Sanitizer::BOOL,
				'meta.members_visibility'  => Sanitizer::STRING,
				'meta.approval_required'  => Sanitizer::BOOL,
				'meta.post_approval_required'  => Sanitizer::BOOL,
				'meta.post_approval_first_post_only'  => Sanitizer::BOOL,
			]
			)
		);

		// Validate content length
		Helper::verify_char_limit( $data['name'] ?? null , 'title' );
		Helper::verify_char_limit( $data['slug'] ?? null , 'slug', 250 );
		Helper::verify_char_limit( $data['description'] ?? null , 'description' );

        $qb = static::ins()->qb()
            ->where( 's.id', '=', $group_id );

		if ( $is_category ) {
			$qb->where_null( 's.category_id' );
		}
		else {
			$qb->where_not_null( 's.category_id' );
		}


        if ( empty( $old_data = static::by_id( $group_id, $is_category ) ) ) {
			throw new ZencommunityException( esc_html( __( 'Record not found.', 'zencommunity' ) ), 404 );
        }
        
		

		// validate members_visibility field
		if ( 
			array_key_exists( 'members_visibility', $data['meta'] ?? [] ) && 
			! in_array(
				$data['meta']['members_visibility'], 
				[ 'members_only', 'admin-mod', 'logged', 'guest' ],
				true
			)
		) {
			throw new ZencommunityException( esc_html( __( 'Invalid value of members_visibility.', 'zencommunity' ) ), 500 );
		}

		if ( isset( $data['status'] ) && ! in_array( $data['status'], [ 'published', 'draft' ] ) ) 
			throw new ZencommunityException( esc_html( __( 'Invalid status.', 'zencommunity' ) ) );

		if ( isset( $data['slug'] ) && $old_data['slug'] !== $data['slug'] && static::slug_exists( $data['slug'] = sanitize_title( $data['slug'] ), $is_category ) ) 
			throw new ZencommunityException( esc_html( __( 'Slug already exists', 'zencommunity' ) ) );
		
		if ( isset( $data['privacy'] ) && ! in_array( $data['privacy'], [ 'public', 'private', 'hidden' ] ) ) 
			throw new ZencommunityException( esc_html( __( 'Invalid privacy.', 'zencommunity' ) ) );

		if ( ! empty( $data['media_ids'] ?? [] ) && Attachment::is_media_available( $data['media_ids'] ) ) 
			throw new ZencommunityException( esc_html( __( 'Media is is already used.', 'zencommunity' ) ) );

		if ( ! isset( $data['updated_at'] ) ) {
			$data['updated_at'] = current_time( 'mysql', true  );
		}

		if ( 
			! empty( $data['category_id'] ?? '' ) && 
			static::exists( $category_id = absint( $data['category_id'] ), true ) 
		) {
			$data['category_id'] = $category_id;
		}

        $data = Attachment::attach_media( 
            $group_id, 'group', $data, [ static::class, 'handle_media']
        );


		if ( isset( $data['icon'] ) && ! empty( $data['icon'] ) ) {
			$data['icon'] = wp_json_encode( $data['icon'] );
		}
		else {
			unset( $data['icon'] );
		}

		if ( 'group_featured' === ( $data['remove_media'] ?? '' ) ) {
			Attachment::delete_media_by_media_type( 'group_featured', 'group', $group_id );
			$data['featured_img'] = null;
		}

		if ( 'group_cover' === ( $data['remove_media'] ?? '' ) ) {
			Attachment::delete_media_by_media_type( 'group_cover', 'group', $group_id );
			$data['meta']['cover_img_url'] = null;
		}

		if ( isset( $data['meta'] ) ) {
			$data['meta'] = wp_json_encode( Helper::recursive_merge( $old_data['meta'], $data['meta'] ) );
		}
		
		unset( $data['media_ids'], $data['attached'], $data['remove_media'] );
		$is_updated = $qb->update( $data );

		if ( $is_updated ) {
			// Post-update hook
			$type = $is_category ? 'category' : 'group';
			$action = $is_created ? 'created' : 'updated';

			if ( 
				'group' === $type &&
				'created' === $action  && 
				boolval( $admin_id =  $actor_user_id ?? get_current_user_id() ) && 
				user_can( $admin_id, 'manage_options' )
			) {
				static::add_member( $admin_id, $group_id, 'admin', 'active' );
			}

			do_action( "zencommunity/{$type}/{$action}", $group_id, $old_data );
			
		}
        return $is_updated;
    }

    public static function default_data( array $data, ?int $category_id = null  ) : array {
		if ( ! is_null( $category_id ) ) {
			// group default data
			$data['meta']['anyone_can_send_join_request'] = $data['meta']['anyone_can_send_join_request'] ?? true;
			$data['meta']['members_visibility'] = $data['meta']['members_visibility'] ?? 'members_only';
			$data['meta']['approval_required'] = $data['meta']['approval_required'] ?? false;
			$data['meta']['post_approval_required'] = $data['meta']['post_approval_required'] ?? false;
			$data['meta']['post_approval_first_post_only'] = $data['meta']['post_approval_first_post_only'] ?? false;
			$data['meta']['cover_img_url'] = null;
		}
        return apply_filters( 'zencommunity/group/default_data', $data, $category_id );
    }

	/**
	 * Helper method for manage media in create & update group
	 */
	public static function handle_media( array $data, array $media, int $id ) : array {
		if ( ! empty( $group_featured = $media['group_featured'][0] ?? [] ) ) {
			$data['featured_img'] = $group_featured['path'] ?? null;
            $data['attached']['group_featured'] = $group_featured['id'] ?? null;
			
		}

		if ( ! empty( $group_cover = $media['group_cover'][0] ?? [] ) ) {
			$data['meta']['cover_img_url'] = $group_cover['path'] ?? null;
            $data['attached']['group_cover'] = $group_cover['id'] ?? null;
		}

		if ( ! empty( $group_icon = $media['group_icon'][0] ?? [] ) ) {
			$data['icon']['type'] = 'img';
			$data['icon']['src'] = $group_icon['path'] ?? null;
            $data['attached']['group_icon'] = $group_icon['id'] ?? null;
		}

		// apply filters
		$data = apply_filters( 
			'zencommunity/group/handle_media_fields', 
			$data, $media, $id 
		);
		return $data;
	}

    public static function delete(  int $group_id, bool $is_category = false  ) : bool {
        $qb = static::ins()->qb()
            ->where( 's.id', '=', $group_id );

		if ( $is_category ) {
			$qb->where_null( 's.category_id' );
		}
		else {
			$qb->where_not_null( 's.category_id' );
		}

        if ( 0 === $qb->count() ) {
			throw new ZencommunityException( esc_html( __( 'Record not found.', 'zencommunity' ) ), 404 );
        }

		if ( ! $is_category ) {
			$args = [
				'group_id' => $group_id
			];
			
			static::schedule( 'zenc_delete_group_files', $args );
		}

		if ( $is_category ) {
			static::ins()->qb()
				->where( 's.category_id', '=', $group_id )
				->update( [
					'category_id' => 0 // move all groups of this category to 0(Uncategorized)
				] );
		}

		$type = $is_category ? 'category' : 'group';
		do_action( "zencommunity/{$type}/deleted", $group_id  );
		
        return $qb->delete();
    }

    public static function reorder(  array $ids, ?int $category_id = null  ) : void {
		foreach ( array_unique( $ids ) as $serial_number => $id ) {
			$qb = static::ins()->qb()
				->where( 's.id', '=', $id );
			if ( is_null( $category_id ) ) {
				$qb->where_null( 's.category_id' );
			}
			else {
				$qb->where( 's.category_id', '=', $category_id );
			}
			$qb->update( [
				'serial_number' => $serial_number + 1
			]);
			
		}
    }

	public static function get_user_membership_group_ids( int $user_id ) : array {
		static $member_group_ids_map = null;
		if ( ! is_null( $member_group_ids_map ) ) {
			return $member_group_ids_map;
		}
		

		// Preload all group IDs of this user if not admin
		$member_groups = ! empty( $user_id ) ? QueryBuilder::ins()
			->select( [ 'group_id', 'status', 'role' ] )
			->from( 'zenc_group_members' )
			->where( 'user_id', '=', $user_id )
			// ->where( 'status', '=', 'active' )
			->get() : [];

		$member_group_ids_map = [];
		foreach ( $member_groups as $group ) {
			$member_group_ids_map[ $group['group_id'] ] = [
				'status' => $group['status'],
				'role'   => $group['role']
			];
		}
		return $member_group_ids_map;
	}

	public static function get_categories_with_its_groups( int $user_id ) : array {
		// Get all categories
		$is_not_admin = ! user_can( $user_id, 'manage_options' );
		$qb = QueryBuilder::ins()
			->select( [ '*' ] )
			->from( 'zenc_groups' )
			->where_null( 'category_id' );
		if ( $is_not_admin ) {
			$qb->where( 'status', '=', 'published' );
		}

		$categories = $qb->order_by( 'serial_number', 'ASC' )
			->get();

		array_push( $categories, [
			'id' => 0,
			'name' => __( 'Unsorted Groups', 'zencommunity' ),
			'meta' => '{}',
			'icon' => '{}',
		] );

		$member_group_ids_map = static::get_user_membership_group_ids( $user_id );

		$result = [];
		foreach ( $categories as $category ) {
			$category_id = $category['id'];
	
			$qb = QueryBuilder::ins()
				->select( [ '*' ] )
				->from( 'zenc_groups' )
				->where( 'category_id', '=', $category_id );

			if ( $is_not_admin ) {
				$qb->where( 'status', '=', 'published' )
				->where_group( function ( QueryBuilder $q ) use ( $member_group_ids_map ) : void {
					$q->where_in( 'privacy', [ 'public', 'private' ] );
					if ( ! empty( $member_group_ids_map ) ) {
					  $q->or_where_group( function ( QueryBuilder $q2 ) use ( $member_group_ids_map ) : void {
						  $q2->where( 'privacy', '=', 'hidden' )
							 ->where_in( 'id', array_keys( $member_group_ids_map ) );
					  } );
					}
				});
			}

			$groups = $qb->order_by( 'serial_number', 'ASC' )
				->get();
	
			// Attach user info to each group
			foreach ( $groups as &$group ) {
				$group = static::wrapper( $group );
			}
	
			$result[] = [
				'category'	=> static::wrapper( $category ),
				'groups' 	=> $groups,
			];
		}
	
		$output = [];
		$output['result'] = $result;
		$output['member_group_ids_map'] = $member_group_ids_map;
		return $output;
	}
	
	public static function member_query( int $group_id ) : ?QueryBuilder {
		return Profile::ins()->qb()
			->join( 'zenc_group_members', 'spm', 'spm.user_id = pf.user_id')
			->where( 'spm.group_id', '=', $group_id );
	}

	public static function member_count( int $group_id ) : int {
		return Profile::ins()->qb()
			->join( 'zenc_group_members', 'spm', 'spm.user_id = pf.user_id')
			->where( 'spm.group_id', '=', $group_id )->count();
	}

	public static function top_members( int $group_id, int $limit = 5 ) : array {
		return Profile::ins()->qb()
			->select( [
				'pf.id',
				'pf.avatar_url',
				'pf.first_name',
				'pf.last_name',
				'pf.username',
				'COUNT(DISTINCT f.id)' => 'feed_count',
				'COUNT(DISTINCT c.id)' => 'comment_count',
				'COUNT(DISTINCT r.id)' => 'reaction_count',
				'(COUNT(DISTINCT f.id) + COUNT(DISTINCT c.id) + COUNT(DISTINCT r.id))' => 'total_activity',
			] )
			->from( 'zenc_profiles', 'pf' )
			->join( 'zenc_group_members', 'spm', [
				[ 'spm.user_id', '=', 'pf.user_id' ]
			])
			->join( 'zenc_feeds', 'f', [
				[ 'f.user_id', '=', 'pf.user_id' ],
				[ 'f.group_id', '=', 'spm.group_id' ]
			], 'LEFT' )
			->join( 'zenc_comments', 'c', [
				[ 'c.user_id', '=', 'pf.user_id' ]
			], 'LEFT' )
			->join( 'zenc_reactions', 'r', [
				[ 'r.user_id', '=', 'pf.user_id' ]
			], 'LEFT' )
			->where( 'spm.group_id', '=', $group_id )
			->group_by( [ 'pf.id' ] )
			->order_by( 'total_activity', 'DESC' )
			->limit( $limit )
			->get();
	}
	
	public static function cache_member_count( int $group_id ) : void {
        $qb = static::ins()->qb()
			->select( [ 'meta' ] )
            ->where( 's.id', '=', $group_id )
			->where_not_null( 's.category_id' );

		$meta = $qb->first();
		
		if ( ! empty( $meta ) ) {
			$meta = json_decode( $meta['meta'] ?? '', true ) ?? [];
			$meta['top_members'] = static::top_members( $group_id );
			
			$qb->update( [
				'meta'         => wp_json_encode( $meta ),
				'member_count' => static::member_count( $group_id ),
			] );
		}
	}
	public static function members( int $group_id, array $params = [], ?int $user_id = null ) : array {
		// we need some group data
		$category_data = static::ins()->qb()
			->select( [ 'privacy', 'status', 'meta' ] )
			->where( 's.id', '=', $group_id )
			->where_not_null( 's.category_id' )
			->first();

		// check group exists or not
		if ( empty( $meta = json_decode( $category_data['meta'] ?? '[]', true ) ) )
			throw new ZencommunityException( esc_html( __( 'Group not found.', 'zencommunity' ) ), 404 );


		// A group whose meta predates this field (or was written outside the
		// normal create/update path, e.g. an import) won't have
		// members_visibility set — default it the same way Group::create()
		// does rather than treating a missing optional field as a hard error.
		if (
			! in_array(
				$meta['members_visibility'] ?? false,
				[ 'members_only', 'admin-mod', 'logged', 'guest' ],
				true
			)
		) {
			$meta['members_visibility'] = 'members_only';
		}

		// authorization: check members_visibility if user id is provided &
		// user is not admin
		if ( is_numeric( $user_id ) && ! user_can( $user_id, 'manage_options' ) ) {
			$user_id = absint( $user_id );
			$member_has_any_roles = static::is_member_of( $user_id, $group_id );
			// check if  user is not admin|member & group is hidden
			if ( 
				'hidden' === ( $category_data['privacy'] ?? false ) && 
				! $member_has_any_roles
			) {
				throw new ZencommunityException( esc_html( __( 'Unauthorized.', 'zencommunity' ) ), 401 );
			}

			// check if  user is not admin & group is not published yet
			if ( 'published' !== ( $category_data['status'] ?? false ) ) {
				throw new ZencommunityException( esc_html( __( 'Unauthorized.', 'zencommunity' ) ), 401 );
			}

			if ( 
				'members_only' === $meta['members_visibility'] && 
				! $member_has_any_roles
			) {
				throw new ZencommunityException( esc_html( __( 'Only group members can see member list.', 'zencommunity' ) ), 401 );
			}

			if ( 
				'admin-mod' === $meta['members_visibility'] && 
				! static::is_member_of( $user_id, $group_id, [ 'admin', 'moderator' ] )
			) {
				throw new ZencommunityException( esc_html( __( 'Only group members can see member list.', 'zencommunity' ) ), 401 );
			}
			
			if ( 
				'logged' === $meta['members_visibility'] && 
				0 === $user_id // 0 means user is not logged in
			) {
				throw new ZencommunityException( esc_html( __( 'Only logged user can see member list.', 'zencommunity' ) ), 401 );
			}
		}
		
		if ( $params['invitable_members'] ?? false ) {
			$qb = Profile::ins()->qb()
			->where_not_in_subquery( 
				'pf.user_id',
				fn( QueryBuilder $q ) : QueryBuilder => $q->select( [ 'spm1.user_id' ] )
					->from( 'zenc_group_members', 'spm1' )
					->where( 'spm1.group_id', '=', $group_id )
			);
		}
		else {
			// make a instance of profile, has a join with group members table
			$qb = Profile::ins()->qb()
			->select( [ 'pf.*', 'spm.status' => 'membership_status', 'spm.role' ] )
			->join( 'zenc_group_members', 'spm', 'spm.user_id = pf.user_id')
			->where_in_subquery( 
				'pf.user_id',
				fn( QueryBuilder $q ) : QueryBuilder => $q->select( [ 'spm1.user_id' ] )
					->from( 'zenc_group_members', 'spm1' )
					->where( 'spm1.group_id', '=', $group_id )
			);
		}

		$params = Sanitizer::sanitize( $params, [
			'page' 	   => Sanitizer::INT,
			'per_page' => Sanitizer::INT,
			'search'   => Sanitizer::STRING,
			'status'   => Sanitizer::STRING,
			'order'    => Sanitizer::STRING,
			'order_by' => Sanitizer::STRING,
		] );
		
        $page = $params['page'] ?? 0;
        $per_page = $params['per_page'] ?? 15;
        $search = $params['search'] ?? '';
        $status = $params['status'] ?? '';
        $order = $params['order'] ?? 'desc';
        $order_by = $params['order_by'] ?? 'last_activity';
        
        if ( ! empty( $per_page ) && $per_page > 100 ) {
			throw new ZencommunityException( esc_html( __( 'The maximum value of  per_page is 100.', 'zencommunity' ) ) );
        }

        // perform search on profile.username,first_name,last_name column
        if ( ! empty( $search ) ) {    
			$qb->where_group( function( QueryBuilder $q ) use( $search ) : void {
				$q->where( 'pf.username', 'LIKE', "%{$search}%" );
            	$q->or_where( 'pf.first_name', 'LIKE', "%{$search}%" );
            	$q->or_where( 'pf.last_name', 'LIKE', "%{$search}%" );
			} );

        }

		// Site admins and group admins can filter by any status; regular members see only active
		$is_group_admin = is_numeric( $user_id ) && static::is_member_of( absint( $user_id ), $group_id, [ 'admin' ] );
		if(
			is_numeric( $user_id ) &&
			! user_can( $user_id, 'manage_options' ) &&
			! $is_group_admin
		){
			$qb->where( 'pf.status', '=', 'active' );
            $qb->where( 'spm.status', '=',  'active' );
		}
		else if(
			! empty( $status ) &&
			in_array( $status, [ 'active', 'inactive', 'pending', 'banned', 'suspended' ], true )
		) {
            $qb->where( 'spm.status', '=', $status );
        }


        if ( ! in_array( $order = strtoupper( $order ), [ 'ASC', 'DESC' ] ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order.', 'zencommunity' ) ) );
		}

        if ( ! in_array( $order_by, [ 'last_activity', 'created_at', 'updated_at', 'id' ], true ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order column.', 'zencommunity' ) ) );
        }
		
		$order_by = 'pf.' . $order_by;
        $qb->order_by( $order_by, $order );
        $qb->group_by( [ 'pf.id' ] );

		$data = $qb->paginate( $page, $per_page );

        $data = $qb->paginate( $page, $per_page );
		$data['records'] = Profile::collection_wrapper( $data['records'] ?? [] );
		return $data;
	}

    public static function is_member_of(  int $user_id, int $group_id, array $roles = [], ?string $status = 'active', array $cap_groups = [] ) : bool {
		$qb = QueryBuilder::ins()
			->select( [ 'meta', 'role' ] )
			->from( 'zenc_group_members' )
			->where( 'user_id', '=', $user_id )
			->where( 'group_id', '=', $group_id );

		if ( ! empty( $roles ) ) {
			$qb->where_in( 'role', $roles );
		}

		if ( ! empty( $status ) ) {
			$qb->where( 'status', '=', $status );
		}

		$role_data = $qb->first();

		if ( empty( $role_data ) ) {
			return false;
		}

		if ( ! empty( $cap_groups ) ) {
			$meta = json_decode( $role_data['meta'] ?? '{}', true );
			$meta = is_array( $meta ) ? $meta : [];
			$role = $role_data['role'];
			$disabled_permissions = $meta['disabled_permissions'] ?? [];
			
			$roles = RoleManager::roles();
			if ( ! isset( $roles[$role] ) ) {
				return false;
			}
	
			$user_permissions = $roles[$role];
	
			foreach ( $disabled_permissions[$role] ?? [] as $cap => $status ) {
				$user_permissions['capabilities'][$cap]['disabled'] = true;
			}

			$user_permissions = array_keys( // extract all caps slug
				array_filter( // exclude all disabled caps
					$user_permissions['capabilities'], 
					fn( array $cap ) : bool => ! ( $cap['disabled'] ?? false ) 
				)
			);
			
			foreach ( $cap_groups as $caps ) {
				$caps = array_map( 'strval', $caps );
				if ( empty( array_diff( $caps, $user_permissions ) ) ) {
					// if any cap group fulfilled the condions then return true
					return true;
				}
			}
			// if no cap group fullfilled the condition then return false
			return false;
		}
		// group member relation is found & cap_groups is empty, so return true
		return true;
	}

    public static function add_member(  int $user_id, int $group_id, ?string $role = null, ?string $status = null, ?int $actor_user_id = null ) : bool {

		if ( ! Profile::exists( $user_id ) ) {
			// if user hasnt any profile, attempt to create 
			if ( empty( Profile::create_profile_if_not_exists( $user_id ) ) ) {
				throw new ZencommunityException( esc_html( __( 'invalid member id.', 'zencommunity' ) ), 404 );
			}
		}

		
		// if actor user id is provided then check actor user has permission to perform this action
		if ( 
			is_int( $actor_user_id ) &&  
			! static::can_user_post_interact( $actor_user_id, $group_id, [ 'admin' ], 'active', [
				[ 'add_group_member' ]
			] ) 
		)
			throw new ZencommunityException( esc_html( __( 'Unauthorized.', 'zencommunity' ) ) );

		// check if already member or not
		if ( static::is_member_of( $user_id, $group_id, [], null ) )
			throw new ZencommunityException( esc_html( __( 'Member already exists.', 'zencommunity' ) ) );
		// validate role - built-in or custom, but group-scoped only (a
		// global-only role like support_agent isn't a valid group role)
		if ( ! empty( $role ) && ! in_array( $role, RoleManager::group_role_keys(), true ) )
			throw new ZencommunityException( esc_html( __( 'Invalid Role.', 'zencommunity' ) ) );
		// validate status
		if ( ! empty( $status ) && ! in_array( $status, [ 'active', 'inactive', 'pending' ], true ) )
			throw new ZencommunityException( esc_html( __( 'invalid status.', 'zencommunity' ) ) );
		// get group metadata
		$meta = static::ins()->qb()
			->select( [ 'meta' ] )
			->where( 's.id', '=', $group_id )
			->where_not_null( 's.category_id' )
			->first();
		// check group exists or not
		if ( empty( $meta ) ) {
			throw new ZencommunityException( esc_html( __( 'Group not found.', 'zencommunity' ) ), 404 );
		}

		$meta = json_decode( $meta['meta'] ?? '{}', true );
		
		if ( false === ( $meta['anyone_can_send_join_request'] ?? true ) )
			throw new ZencommunityException( esc_html( __( 'You are not allowed to send a join request to this group.', 'zencommunity' ) ), 401 );

		$data = [
			'group_id' => $group_id,
			'user_id' => $user_id,
			'role' => $role ?? 'member',
			'status' =>  $meta['approval_required'] ? 'pending' : ( $status ?? 'active' ),
			'joined_at' => current_time( 'mysql', true  ),
		];

		if ( user_can( $user_id, 'manage_options' ) ) {
			$data['role'] = 'admin';
			$data['status'] ='active';
		}

		$is_added = ! empty( QueryBuilder::ins()->create( 'zenc_group_members', $data ) );

		if ( ! $is_added ) {
			throw new ZencommunityException( esc_html( __( 'An error is occured.', 'zencommunity' ) ), 401 );
		}
		
		
		static::cache_member_count( $group_id );
		do_action( "zencommunity/group/user_added", $group_id, $data );
		return $is_added;
	}

    public static function change_member_role(  int $user_id, int $group_id, string $role, ?int $actor_user_id = null ) : bool {
		
		// if actor user id is provided then check actor user has permission to perform this action
		if ( 
			is_int( $actor_user_id ) &&  
			! static::can_user_post_interact( $actor_user_id, $group_id, [ 'admin' ], 'active', [
				[ 'change_member_role' ]
			] ) 
		)
			throw new ZencommunityException( esc_html( __( 'Unauthorized.', 'zencommunity' ) ) );

		if ( ! static::is_member_of( $user_id, $group_id, [], null ) )
			throw new ZencommunityException( esc_html( __( 'Member is not exists.', 'zencommunity' ) ), 404 );

		if ( ! in_array( $role, RoleManager::group_role_keys(), true ) )
			throw new ZencommunityException( esc_html( __( 'Invalid Role.', 'zencommunity' ) ) );

		$is_chaned = QueryBuilder::ins()->from( 'zenc_group_members', 'spm' )
			->where( 'spm.user_id', '=', $user_id )
			->where( 'spm.group_id', '=', $group_id )
			->update( [ 'role' => $role ] );
			
		if ( ! $is_chaned ) {
			throw new ZencommunityException( esc_html( __( 'An error is occured.', 'zencommunity' ) ), 401 );
		}

		
		do_action( "zencommunity/group/user_role_changed", $group_id, $user_id, $role );
		return $is_chaned;
	}

    public static function change_member_status(  int $user_id, int $group_id, string $status, ?int $actor_user_id = null ) : bool {
		
		// if actor user id is provided then check actor user has permission to perform this action
		if ( 
			is_int( $actor_user_id ) &&  
			! static::can_user_post_interact( $actor_user_id, $group_id, [ 'admin' ], 'active', [
				[ 'update_membership_status' ]
			] ) 
		)
			throw new ZencommunityException( esc_html( __( 'Unauthorized.', 'zencommunity' ) ) );

		if ( ! static::is_member_of( $user_id, $group_id, [], null ) )
			throw new ZencommunityException( esc_html( __( 'Member is not exists.', 'zencommunity' ) ), 404 );

		if ( ! in_array( $status, [ 'active', 'inactive', 'pending', 'banned', 'suspended' ], true ) )
			throw new ZencommunityException( esc_html( __( 'invalid status.', 'zencommunity' ) ) );

		$is_chaned = QueryBuilder::ins()->from( 'zenc_group_members', 'spm' )
			->where( 'spm.user_id', '=', $user_id )
			->where( 'spm.group_id', '=', $group_id )
			->update( [ 'status' => $status ] );

		if ( ! $is_chaned ) {
			throw new ZencommunityException( esc_html( __( 'An error is occured.', 'zencommunity' ) ), 401 );
		}
	
		
		do_action( "zencommunity/group/user_role_status", $group_id, $user_id, $status );
		return $is_chaned;
	}

	public static function remove_member( int $user_id, int $group_id, ?int $actor_user_id = null ) : bool {
		
		// if actor user id is provided then check actor user has permission to perform this action
		if ( 
			is_int( $actor_user_id ) &&  
			! static::can_user_post_interact( $actor_user_id, $group_id, [ 'admin' ], 'active', [
				[ 'remove_group_member' ]
			] ) 
		)
			throw new ZencommunityException( esc_html( __( 'Unauthorized.', 'zencommunity' ) ) );

		$is_removed = QueryBuilder::ins()->from( 'zenc_group_members', 'spm' )
			->where( 'spm.user_id', '=', $user_id )
			->where( 'spm.group_id', '=', $group_id )
			->delete();
		
		if ( ! $is_removed ) {
			throw new ZencommunityException( esc_html( __( 'An error is occured.', 'zencommunity' ) ), 401 );
		}
		
		
		static::cache_member_count( $group_id );
		do_action( "zencommunity/group/remove_member", $group_id, $user_id );
		return $is_removed;
	}

	public static function user_can_join( int $user_id, int $group_id ) : bool {
		return static::ins()->qb()
			->where( 's.id', '=', $group_id )
			->where( 's.privacy', '=', 'hidden' )
			->count() === 0;
	}
}