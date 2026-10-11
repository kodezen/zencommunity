<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ActionScheduler;
use ActionScheduler_Store;
use DateTime;
use DateTimeZone;
use DateInterval;
use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Database\Utils\QueryBuilder;
use ZenCommunity\Database\Utils\Model;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Helper;
use ZenCommunity\Classes\ColorCodeValidator;
/**
 * Class Feed
 *
 * Handles feed operations: CRUD, queries, permissions, media, etc.
 */
class Feed extends Model {
	use Traits\Feed\Authenticate,
		Traits\Feed\Comment,
		Traits\Feed\Reaction;

	protected string $table = 'zenc_feeds';
	protected ?string $alias = 'fd';

	/**
	 * Check if a feed exists by ID.
	 *
	 * @param int $id
	 * @return bool
	 */
	public static function exists( int $id ) : bool {
		return $qb = static::ins()->qb()->where( 'fd.id', '=', $id )->count() > 0;
	}

	/**
	 * Check if a slug already exists.
	 *
	 * @param string $slug
	 * @return bool
	 */
	public static function slug_exists( string $slug ) : bool {
		return static::ins()->qb()->where( 'fd.slug', '=', $slug )->count() > 0;
	}

	/**
	 * Whether a user has at least one published post in a given group — used
	 * to gate first-post-only approval (meta.post_approval_first_post_only).
	 * Deliberately `status = 'published'` only: a rejected or still-pending
	 * post must not exempt the user's next submission.
	 *
	 * @param int $user_id
	 * @param int $group_id
	 * @return bool
	 */
	public static function has_published_post( int $user_id, int $group_id ) : bool {
		return static::ins()->qb()
			->where( 'fd.user_id', '=', $user_id )
			->where( 'fd.group_id', '=', $group_id )
			->where( 'fd.status', '=', 'published' )
			->count() > 0;
	}
		
	/**
	 * Format and sanitize feed data.
	 *
	 * @param array $feed
	 * @param bool  $is_single Direct fetch (by_id()/by_slug()) vs. one row inside
	 *                         a listing pass (collection_wrapper()). An Audio/Video
	 *                         post is rejected outright on a direct fetch when Pro
	 *                         is inactive — for a listing row, collection_wrapper()
	 *                         strips it instead, so one ineligible row doesn't abort
	 *                         the whole listing.
	 * @return array
	 *
	 * @throws ZencommunityException When Pro is inactive and this is a direct fetch of an Audio/Video post.
	 */
	public static function wrapper( array $feed, bool $is_single = true ) : array {
		$feed['meta']          = json_decode( $feed['meta'] ?? '{}', true );
		$feed['author_role']   = json_decode( $feed['author_role'] ?? '{}', true );
		$feed['is_liked']      = boolval( $feed['react_type'] ?? null );

		if ( empty( $feed['meta']['reaction_count'] ) )
			$feed['meta']['reaction_count']['like'] = intval( $feed['like_count'] ?? 0 );

		$feed['is_bookmarked'] = 'bookmark' === ( $feed['is_bookmarked'] ?? null );

		if ( ( $feed['type'] ?? 'post' ) === 'poll' ) {
			$user_id = get_current_user_id() ?: null;
			$poll    = Poll::get_results( intval( $feed['id'] ), $user_id );
			$feed['meta']['poll'] = array_merge( $feed['meta']['poll'] ?? [], $poll );
		}

		if ( ( $feed['type'] ?? 'post' ) === 'event' ) {
			$event_id = intval( $feed['meta']['event_id'] ?? 0 );
			if ( $event_id ) {
				$user_id = get_current_user_id() ?: null;
				try {
					$feed['meta']['event'] = Event::by_id( $event_id, $user_id );
				} catch ( ZencommunityException $e ) {
					$feed['meta']['event'] = null;
				}
			}
		}

		// A post whose type was registered by an extension that is no longer
		// active can't be rendered — treat it as missing.
		if ( $is_single && ! in_array( $feed['type'] ?? 'post', static::types(), true ) ) {
			throw new ZencommunityException( esc_html__( 'Post not found.', 'zencommunity' ), 404 );
		}

		return apply_filters( 'zencommunity/feed/wrapper/single', $feed, $is_single );
	}

	/**
	 * Registered feed post types. Extensions add their own via the
	 * `zencommunity/feed/types` filter.
	 *
	 * @return string[]
	 */
	public static function types() : array {
		return array_values( array_unique( (array) apply_filters( 'zencommunity/feed/types', [ 'post', 'poll', 'event', 'idea' ] ) ) );
	}

	/**
	 * Apply wrapper to a list of feeds.
	 *
	 * @param array $feeds
	 * @return array
	 */
	public static function collection_wrapper( array $feeds ) : array {
		$data = [];
		foreach ( $feeds as $feed ) {
			$data[] = static::wrapper( $feed, false );
		}

		// Listing-side counterpart of wrapper()'s unregistered-type check.
		$types = static::types();
		$data  = array_values( array_filter( $data, function ( $feed ) use ( $types ) {
			return in_array( $feed['type'] ?? 'post', $types, true );
		} ) );

		return apply_filters( 'zencommunity/feed/wrapper/collection', $data );
	}

	/**
	 * Join user-related info to feed query.
	 *
	 * @param QueryBuilder $qb
	 * @param int|null $user_id
	 * @return void
	 */
	public static function add_user_info_query( QueryBuilder $qb, ?int $user_id ) : void {
		$selects = [ 
			'fd.*', 
			'g.name' 	 	=> 'group_name', 
			'g.slug' 	 	=> 'group_slug', 
			'pf.first_name' => 'user_first_name', 
			'pf.last_name'  => 'user_last_name', 
			'pf.username'   => 'user_username', 
			'pf.avatar_url' => 'user_avatar_url', 
			'pf.status'     => 'user_status', 
			'author_role'   => fn( QueryBuilder $q ) : QueryBuilder => $q->select( [
					'JSON_OBJECT("role", agr.role, "status", agr.status)'
				])
				 ->from(
				 'zenc_group_members', 'agr' 
				 )
				 ->where_column( 'fd.group_id', '=', 'agr.group_id' )
				 ->where_column( 'fd.user_id', '=', 'agr.user_id' )
			, 
		];

		if ( ! empty( $user_id ) ) {
			$selects['rcl.type'] = 'react_type';
			$selects['rcb.type'] = 'is_bookmarked';
			$selects['rg.role']  = 'user_role';
			$selects['rg.status'] = 'user_role_status';
		}

		$selects = apply_filters( 'zencommunity/feed/select', $selects );
		
		$qb->select( $selects )
			->join( 'zenc_profiles', 'pf', 'pf.user_id = fd.user_id');

		$qb->join( 'zenc_groups', 'g', 'g.id = fd.group_id');

		if ( empty( $user_id ) ) return;
		$qb->join( 'zenc_reactions', 'rcl', [
			[ 'rcl.feed_id', '=', 'fd.id' ],
			[ 'rcl.type', '!=', [ 'value' => 'bookmark' ] ],
			[ 'rcl.user_id', '=', [ 'value' => $user_id ] ],
		], 'LEFT' )
		->join( 'zenc_reactions', 'rcb', [
			[ 'rcb.feed_id', '=', 'fd.id' ],
			[ 'rcb.type', '=', [ 'value' => 'bookmark' ] ],
			[ 'rcb.user_id', '=', [ 'value' => $user_id ] ],
		], 'LEFT' )
		->join( 'zenc_group_members', 'rg', [
			[ 'fd.group_id', '=', 'rg.group_id' ],
			[ 'rg.user_id', '=', [ 'value' => $user_id ] ],
		], 'LEFT' );
	}

	/**
	 * Get feed by ID.
	 *
	 * @param int $feed_id
	 * @param string|null $status
	 * @param callable|null $cb
	 * @param int|null $user_id
	 * @return array|null
	 *
	 * @throws ZencommunityException
	 */
	public static function by_id( int $feed_id, ?string $status = null, ?callable $cb = null, ?int $user_id = null ) : ?array {
		$qb = static::ins()->qb();

		static::add_user_info_query( $qb, $user_id );

		$qb->where( 'fd.id', '=', $feed_id );

		if( is_callable( $cb ) ) {
			$cb( $qb ); // this callback can modify query
		}
	
		if ( $status ) {
			$qb->where( 'fd.status', '=', $status );
		}
		do_action( 'zencommunity/feed/single/qb', $qb );
		if ( empty( $data = $qb->first() ) ) {
			throw new ZencommunityException( esc_html( __( 'Record not found.', 'zencommunity' ) ), 404 );
		}
		return static::wrapper( $data );
	}

	/**
	 * Get feed by slug.
	 *
	 * @param string $slug
	 * @param string|null $status
	 * @param callable|null $cb
	 * @param int|null $user_id
	 * @return array|null
	 *
	 * @throws ZencommunityException
	 */
	public static function by_slug( string $slug, ?string $status = null, ?callable $cb = null, ?int $user_id = null ) : ?array {
		$qb = static::ins()->qb();

		static::add_user_info_query( $qb, $user_id );

		$qb->where( 'fd.slug', '=', $slug );
		
		if ( $status ) {
			$qb->where( 'fd.status', '=', $status );
		}

		if( is_callable( $cb ) ) {
			$cb( $qb ); // this callback can modify query
		}

		do_action( 'zencommunity/feed/single/qb', $qb );
		if ( empty( $data = $qb->first() ) ) {
			throw new ZencommunityException( esc_html( __( 'Record not found.', 'zencommunity' ) ), 404 );
		}
		return static::wrapper( $data );
	}

	/**
	 * Generate a unique slug based on content or title.
	 *
	 * @param array $data
	 * @return string|null
	 */
	public static function make_unique_slug( array $data ) : ?string {
		$base = $data['title'] ?? null;
		if ( empty( $base ) ) {
			if ( empty( $data['content'] ?? null ) ) {
				return null;
			}
			$base = wp_strip_all_tags( html_entity_decode( $data['content'] ) );
		}
		// take only first 100 chars
		$base = mb_substr( trim( $base ), 0, 100 );
		
		$slug = sanitize_title( $base );
		$original_slug = $slug;
		$suffix = 1;

		while ( static::slug_exists( $slug ) ) {
			$slug = $original_slug . '-' . $suffix;
			$suffix++;
		}

    	return $slug;
	}

	/**
	 * Feed index query with filters, ordering, pagination.
	 *
	 * @param array $params
	 * @param int|null $logged_user_id
	 * @return array
	 *
	 * @throws ZencommunityException
	 */
    public static function index( array $params, ?int $logged_user_id ) : array {
		global $zencommunity_settings;
		$qb = static::ins()->qb()
			->join( 'zenc_groups', 'sp', 'sp.id = fd.group_id' );
	
		static::add_user_info_query( $qb, $logged_user_id );

		$rules = apply_filters( "zencommunity/feed/index/sanitization_rules", [
			'page'         => Sanitizer::INT,
			'per_page'     => Sanitizer::INT,
			'group'        => Sanitizer::INT,
			'search'       => Sanitizer::STRING,
			'search_col'   => Sanitizer::STRING,
			'order'        => Sanitizer::STRING,
			'status'        => Sanitizer::STRING,
			'order_by'     => Sanitizer::STRING,
			'show_featured' => Sanitizer::STRING,
			'bookmarked'   => Sanitizer::STRING,
			'member_id'    => Sanitizer::INT,
			'group_id'     => Sanitizer::INT,
		] );

		$params = Sanitizer::sanitize( $params, $rules );
		$params = apply_filters( "zencommunity/feed/index/query", $params );
	
		$page =  $params['page'] ?? 0;
		$per_page =  $params['per_page'] ?? 15;
		$search =  $params['search'] ?? '';
		$status =  $params['status'] ?? '';
		$order =  $params['order'] ?? 'desc';
		$order_by =  $params['order_by'] ?? $zencommunity_settings->feed->default_sort_by ?? 'created_at';
		$search_col = $params['search_col'] ?? 'content';
	
		// Optional: Filter by group
		$show_featured = $params['show_featured'] ?? null;
		if ( 'yes' === $show_featured ) {
			$qb->where( 'fd.is_featured', '=', 1 );
		}
		if ( 'no' === $show_featured ) {
			$qb->where( 'fd.is_featured', '=', 0 );
		}

		// Validate pagination and search columns
		if ( $per_page > 100 ) {
			throw new ZencommunityException( esc_html__( 'The maximum value of per_page is 100.', 'zencommunity' ) );
		}
		if ( ! in_array( $search_col, [ 'title', 'slug', 'content' ], true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid search column.', 'zencommunity' ) );
		}
		if ( $status && ! in_array( $status, [ 'published', 'draft', 'scheduled', 'pending', 'rejected' ], true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid feed status.', 'zencommunity' ) );
		}
		if ( ! in_array( strtoupper( $order ), [ 'ASC', 'DESC' ], true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid order direction.', 'zencommunity' ) );
		}
		$allowed_order_by = apply_filters( 'zencommunity/feed/index/allowed_order_by', [ 'created_at', 'updated_at', 'title', 'like_count', 'comment_count', 'id', 'trending' ] );
		if ( ! in_array( $order_by, $allowed_order_by, true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid order column.', 'zencommunity' ) );
		}

		$is_guest = 0 === $logged_user_id;

		//  Feed visibility based on login
		if ( 
			! $is_guest && 
			is_int( $logged_user_id ) && 
			! user_can( $logged_user_id, 'manage_options' )
		) {
			// logged-in users: public OR member of private category
			$qb->where_group( function ( $q ) use ( $logged_user_id ) {
				$q->where( 'sp.privacy', '=', 'public' );
				$q->or_where_exists( function ( $sub ) use ( $logged_user_id ) {
					$sub->from( 'zenc_group_members', 'spm' )
						->where_column( 'spm.group_id', '=', 'fd.group_id' )
						->where( 'spm.user_id', '=', $logged_user_id )
						->where( 'spm.status', '=', 'active' );
				});
			});
		} 
		
		if ( $is_guest ) {
			// guests: only public
			$qb->where( 'sp.privacy', '=', 'public' );
		}
	
		// Optional: Filter by user
		$member_id = $params['member_id'] ?? null;
		if ( $member_id ) {
			$qb->where( 'fd.user_id', '=', $member_id );
		}
	
		// Optional: Filter by group
		$group_id = $params['group_id'] ?? null;
		if ( $group_id ) {
			$qb->where( 'fd.group_id', '=', $group_id );
		}

		// Optional: only posts the current user has bookmarked. The rcb join
		// (current user's bookmark reaction) only exists for logged-in users.
		if ( ! $is_guest && 'yes' === ( $params['bookmarked'] ?? null ) ) {
			$qb->where( 'rcb.type', '=', 'bookmark' );
		}

		// Optional: Status
		if ( $status ) {
			$qb->where( 'fd.status', '=', $status );
		}
		else {
			$qb->where( 'fd.status', '!=', 'scheduled' );
			// Hide pending/rejected from everyone except:
			// - super admins (see everything)
			// - authors can see their own pending posts
			if ( $is_guest ) {
				$qb->where_not_in( 'fd.status', [ 'pending', 'rejected' ] );
			} elseif ( is_int( $logged_user_id ) && ! user_can( $logged_user_id, 'manage_options' ) ) {
				$qb->where_group( function ( $q ) use ( $logged_user_id ) {
					$q->where_not_in( 'fd.status', [ 'pending', 'rejected' ] );
					$q->or_where_group( function ( $q2 ) use ( $logged_user_id ) {
						$q2->where( 'fd.status', '=', 'pending' );
						$q2->where( 'fd.user_id', '=', $logged_user_id );
					} );
				} );
			}
		}
	
		// Optional: Search. With no explicit column it matches the title or
		// the body, so a post can be found by either.
		if ( $search ) {
			global $wpdb;
			$search = $wpdb->esc_like( $search );
			if ( empty( $params['search_col'] ) ) {
				$qb->where_group( function ( $q ) use ( $search ) {
					$q->where( 'fd.title', 'LIKE', "%{$search}%" );
					$q->or_where( 'fd.content', 'LIKE', "%{$search}%" );
				} );
			} else {
				$qb->where( 'fd.' . $search_col, 'LIKE', "%{$search}%" );
			}
		}

		// Posts of an unregistered type are dropped from listings
		// (collection_wrapper()). Leave them out of the query too, so `total`
		// and `pages` match the rows actually returned.
		$qb->where_in( 'fd.type', static::types() );

		if ( 'trending' === $order_by ) {
			$order_by = '(like_count+(comment_count*2))';
			$rq = clone $qb;
			$date_range = $rq->select( [ 
				'MIN(fd.created_at)' => '_from',
				'MAX(fd.created_at)' => '_to',
			] )->first();
			// wp_send_json($date_range);

			if ( 
				! empty ( $date_range )  && 
				! empty( $date_range['_from'] ) &&  
				! empty( $date_range['_to'] ) 
			) {
				$qb->where_between( 'fd.created_at', [ 
					$date_range['_from'], $date_range['_to']
				] );
			}
		}
		else {
			$order_by = 'fd.' . $order_by;
		}

		do_action( 'zencommunity/feed/index/qb', $qb, $params );
		$qb->order_by( $order_by, strtoupper( $order ) );
        $qb->group_by( [ 'fd.id' ] );
		// wp_send_json($qb->dump());
		// Pagination
		$data = $qb->paginate( $page, $per_page, 'fd.id', true );
	
		// Wrapping results
		$data['records'] = static::collection_wrapper( $data['records'] ?? [] );
	
		return $data;
	}

	public static function validate_feeling( string $feeling ) : void {
		if( empty( $feeling ) )  return;

		$feelings = [
			"happy",
			"loved",
			"cool",
			"excited",
			"blessed",
			"grateful",

			"silly",
			"playful",
			"hungry",
			"mind-blown",
			"nervous",
			"celebratory",
			"huggy",

			"okay",
			"confused",
			"speechless",
			"awkward",
			"relaxed",

			"sleepy",
			"tired",
			"exhausted",
			"down",

			"sad",
			"heartbroken",
			"angry",
			"frustrated",
			"shocked",
			"upset"
		];

		if ( ! in_array( $feeling, $feelings ) )
			throw new ZencommunityException( esc_html__( 'Invalid felling.', 'zencommunity' ), 422 );
	}

	public static function update_schedule(
		int $id, 
		DateTime $new_date_time
	) : void {
		$hook = 'zencommunity/queue/scheduled_post';
		$args = [
			'post_id' => $id,
		];
		$new_date_time->setTimezone( new DateTimeZone( 'UTC' ) );
		$actions = as_get_scheduled_actions( [
			'hook'     => $hook,
			'args'     => $args,
			'status'   => ActionScheduler_Store::STATUS_PENDING,
			'per_page' => 1,
		] );
		
		if ( empty( $actions ) ) {
			as_schedule_single_action( 
				$new_date_time->getTimestamp(), 
				$hook, 
				$args 
			);
			return;
		}

		$action = reset( $actions );
		$schedule = $action->get_schedule();
		
		if ( ! $schedule )
			return;

		$old_timestamp = $schedule->next()->getTimestamp();
		// var_dump( $old_timestamp );
		$new_timestamp = $new_date_time->getTimestamp();
		
		if ( $old_timestamp !== $new_timestamp ) {
			as_unschedule_action( $hook, $args );
			as_schedule_single_action( 
				$new_date_time->getTimestamp(), 
				$hook, 
				$args 
			);
		}
	}

	/**
	 * Create a new feed record.
	 *
	 * @param int $group_id
	 * @param array $data
	 * @param int|null $actor_user_id
	 * @return int|null
	 *
	 * @throws ZencommunityException
	 */
	public static function create( int $group_id, array $data, ?int $actor_user_id = null ) : ?int {
		global $zencommunity_settings;
		$data = Sanitizer::sanitize( $data,
			apply_filters( 'zencommunity/feed/create/sanitaization/rules', [
				'title'               => Sanitizer::STRING,
				'content'             => Sanitizer::HTML,
				'status'              => Sanitizer::STRING,
				'type'                => Sanitizer::STRING,
				'scheduled_at'        => Sanitizer::STRING,
				'add_media_ids.*'     => Sanitizer::INT,
				'remove_media_ids.*'  => Sanitizer::INT,
				'meta.disable_comment'     => Sanitizer::BOOL,
				'meta.background_color'    => Sanitizer::STRING,
				'meta.feeling'             => Sanitizer::STRING,
				'meta.poll.options.*.id'   => Sanitizer::STRING,
				'meta.poll.options.*.text' => Sanitizer::STRING,
				'meta.poll.expires_at'     => Sanitizer::STRING,
				'meta.poll.allow_multiple' => Sanitizer::BOOL,
				'meta.event_id'            => Sanitizer::INT,
			], $data, $group_id )
		);

		$data['type'] = sanitize_text_field( $data['type'] ?? 'post' );
		if ( ! in_array( $data['type'], static::types(), true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid post type.', 'zencommunity' ), 400 );
		}

		static::validate_feeling( $data['meta']['feeling'] ?? '' );

		if( 
			! empty( $data['meta']['background_color'] ?? '' ) &&
			false === stripos( 
				$data['meta']['background_color'],
				'gradient'
			) && 
			false === (
				new ColorCodeValidator( 
					$data['meta']['background_color']
				)
			)->validate()
		)
			throw new ZencommunityException( esc_html__( 'Invalid color code', 'zencommunity' ), 422 );

		// Verify group exists
		if ( ! Group::exists( $group_id, false ) ) {
			throw new ZencommunityException( esc_html__( 'Group not found.', 'zencommunity' ), 404 );
		}
		// If user is provided, check permission
		// if actor user id is provided then check actor user has permission to perform this action
		if ( 
			is_int( $actor_user_id ) &&  
			! Group::can_user_post_interact( $actor_user_id, $group_id, [], 'active', [
				[ 'create_post' ]
			] )
		) {
			throw new ZencommunityException( esc_html__( 'Unauthorized.', 'zencommunity' ), 401 );
		}
		// A muted member stays 'active' (so they can still view the group) but is
		// blocked from posting specifically — checked separately from the status gate above.
		if ( is_int( $actor_user_id ) && Group_Member_Action::is_muted( $actor_user_id, $group_id ) ) {
			throw new ZencommunityException( esc_html__( 'Unauthorized.', 'zencommunity' ), 401 );
		}

		// Runs after every authorization check above, so an extension that
		// creates side records for a post (e.g. a media item) never does so
		// for a post that is then rejected.
		$data = apply_filters( 'zencommunity/feed/create/authorized_data', $data, $group_id, $actor_user_id );

		// Sanitize and validate status
		$data['status'] = sanitize_text_field( $data['status'] ?? 'published' );
		if ( ! in_array( $data['status'], [ 'published', 'draft', 'scheduled', 'pending', 'rejected' ], true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid status.', 'zencommunity' ), 400 );
		}

		// If post approval is required for this group, override 'published' to 'pending'
		// for non-admin, non-moderator, non-super-admin authors. Two independent modes:
		// post_approval_required (every post) takes precedence over
		// post_approval_first_post_only (only until the author has a published post),
		// so an inconsistent stored state (both true) has a defined outcome rather
		// than undefined behavior.
		if ( $data['status'] === 'published' ) {
			$author_id   = is_int( $actor_user_id ) ? $actor_user_id : get_current_user_id();
			$group_meta  = static::ins()->qb()
				->from( 'zenc_groups', 's' )
				->select( [ 'meta' ] )
				->where( 's.id', '=', $group_id )
				->first();
			$group_meta  = json_decode( $group_meta['meta'] ?? '{}', true ) ?? [];

			$is_exempt_author = user_can( $author_id, 'manage_options' )
				|| Group::is_member_of( $author_id, $group_id, [ 'admin', 'moderator' ] );

			if ( ! $is_exempt_author && ! empty( $group_meta['post_approval_required'] ) ) {
				$data['status'] = 'pending';
			} elseif (
				! $is_exempt_author &&
				! empty( $group_meta['post_approval_first_post_only'] ) &&
				! static::has_published_post( $author_id, $group_id )
			) {
				$data['status'] = 'pending';
			}
		}

		// Validate content length
		Helper::verify_char_limit( $data['title'] ?? null , 'title' );
		Helper::verify_char_limit( $data['content'] ?? null , 'description' );

		// Validate content — allow empty only for drafts and types whose
		// content lives elsewhere (polls, events, extension types).
		$contentless_types = apply_filters( 'zencommunity/feed/contentless_types', [ 'poll', 'event' ] );
		if (
			empty( $data['content'] ?? null ) && $data['status'] !== 'draft' &&
			! in_array( $data['type'] ?? 'post', $contentless_types, true )
		) {
			throw new ZencommunityException( esc_html__( 'Please provide some content.', 'zencommunity' ), 422 );
		}

		// Auto-generate a title for polls that have no body text
		if ( ( $data['type'] ?? 'post' ) === 'poll' && empty( $data['title'] ?? '' ) ) {
			$data['title'] = __( 'Poll', 'zencommunity' );
		}

		if ( ( $data['type'] ?? 'post' ) === 'event' && empty( $data['title'] ?? '' ) ) {
			$data['title'] = __( 'Event', 'zencommunity' );
		}

		if  (
			( $zencommunity_settings->feed->is_title_required ?? false ) &&
			empty( $data['title'] ?? null ) &&
			! in_array( $data['type'] ?? 'post', $contentless_types, true )
		) {
			throw new ZencommunityException( esc_html__( 'Title is required.', 'zencommunity' ), 422 );
		}

		$data = static::default_data( $data );
		$data['slug']   	= static::make_unique_slug( $data );
		$data['user_id']    = empty( $actor_user_id ) ? get_current_user_id() : $actor_user_id;
		$data['group_id']   = $group_id;
		$data['created_at'] = current_time( 'mysql', true  );
		$data['updated_at'] = current_time( 'mysql', true  );
	

		if ( isset( $data['title'] ) ) {
			$data['title'] = sanitize_text_field( $data['title'] );
		}
		$data = apply_filters( 'zencommunity/feed/create/data', $data, $group_id, $data['user_id'] );
		
		if( ! empty( $scheduled_at = ( $data['scheduled_at'] ?? '' ) ) ) {
			$data['status'] = 'scheduled';
		}
			

		if ( isset( $data['meta'] ) ) {
			if ( ! is_array( $data['meta'] ) ) {
				throw new ZencommunityException( esc_html__( 'Invalid meta format.', 'zencommunity' ), 400 );
			}
			$data['meta'] = wp_json_encode( $data['meta'] );
		}
		// validate media ids
		$media_ids = array_filter(
			$data['add_media_ids'] ?? [],
			fn( $id ) => is_int( $id ) || ctype_digit( $id )
		);

		// remove unnecessary data
		unset( 
			$data['add_media_ids'], 
			$data['remove_media_ids'], 
			$data['scheduled_at'] 
		);
	
		// Insert feed
		$id = static::ins()->insert( $data );
		if ( empty( $id ) ) {
			throw new ZencommunityException( esc_html__( 'Could not create feed.', 'zencommunity' ), 500 );
		}
		$id = intval( $id );

		// Insert poll options if this is a poll post
		if ( $data['type'] === 'poll' ) {
			$meta_array   = is_string( $data['meta'] ) ? json_decode( $data['meta'], true ) : $data['meta'];
			$poll_options = $meta_array['poll']['options'] ?? [];
			$expires_at   = $meta_array['poll']['expires_at'] ?? '';
			if ( count( $poll_options ) < 2 ) {
				static::ins()->qb()->where( 'fd.id', '=', $id )->delete();
				throw new ZencommunityException( esc_html__( 'A poll requires at least 2 options.', 'zencommunity' ), 400 );
			}
			if ( empty( $expires_at ) ) {
				static::ins()->qb()->where( 'fd.id', '=', $id )->delete();
				throw new ZencommunityException( esc_html__( 'A poll requires an expiry date.', 'zencommunity' ), 400 );
			}
			global $wpdb;
			$opts_table = $wpdb->prefix . 'zenc_poll_options';
			$now        = current_time( 'mysql', true );
			foreach ( array_values( $poll_options ) as $sort => $opt ) {
				$wpdb->insert( $opts_table, [
					'feed_id'    => $id,
					'text'       => sanitize_text_field( $opt['text'] ?? '' ),
					'sort_order' => $sort,
					'created_at' => $now,
				] );
			}
		}

		//  Update feed with rendered content/media
		static::update( $id, [
			'add_media_ids' => $media_ids,
			'content'       => $data['content'],
			'scheduled_at'  => $scheduled_at
		], null, true );

		if ( $data['status'] === 'pending' ) {
			do_action( 'zencommunity/feed/pending', $id, array_merge( $data, [ 'id' => $id ] ) );
		}

		return $id;
	}
	
	/**
	 * Update an existing feed.
	 *
	 * @param int $feed_id
	 * @param array $data
	 * @param int|null $user_id
	 * @param bool $is_created
	 * @return int|null
	 *
	 * @throws ZencommunityException
	 */
	public static function update( int $feed_id, array $data, ?int $user_id = null, bool $is_created = false ) : ?int {
		// Check permission and get existing data
		$old_data = static::user_can_update_or_delete_feed( $feed_id, $user_id, 'manage' );
		$group_id = absint( $old_data['group_id'] ?? 0 );
		$data = Sanitizer::sanitize( $data, 
			apply_filters( 'zencommunity/feed/update/sanitaization/rules', [
				'title'               => Sanitizer::STRING,
				'content'             => Sanitizer::HTML,
				'status'              => Sanitizer::STRING,
				'scheduled_at'        => Sanitizer::STRING,
				'add_media_ids.*'     => Sanitizer::INT,
				'remove_media_ids.*'  => Sanitizer::INT,
				'meta.disable_comment'      => Sanitizer::BOOL,
				'meta.background_color'     => Sanitizer::STRING,
				'meta.feeling'              => Sanitizer::STRING,
				'meta.poll.options.*.id'    => Sanitizer::STRING,
				'meta.poll.options.*.text'  => Sanitizer::STRING,
			], $data, $group_id )
		);
		
		// Block poll option edits after votes have been cast; sync options table when no votes exist
		if ( ( $old_data['type'] ?? 'post' ) === 'poll' && isset( $data['meta']['poll']['options'] ) && ! $is_created ) {
			global $wpdb;
			$votes_table = $wpdb->prefix . 'zenc_poll_votes';
			$opts_table  = $wpdb->prefix . 'zenc_poll_options';
			$has_votes   = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM `{$votes_table}` WHERE feed_id = %d", $feed_id ) );
			if ( $has_votes > 0 ) {
				throw new ZencommunityException( esc_html__( 'Cannot edit poll options after votes have been cast.', 'zencommunity' ), 403 );
			}
			$new_options = $data['meta']['poll']['options'];
			if ( count( $new_options ) < 2 ) {
				throw new ZencommunityException( esc_html__( 'A poll requires at least 2 options.', 'zencommunity' ), 400 );
			}
			$wpdb->delete( $opts_table, [ 'feed_id' => $feed_id ] );
			$now = current_time( 'mysql', true );
			foreach ( array_values( $new_options ) as $sort => $opt ) {
				$wpdb->insert( $opts_table, [
					'feed_id'    => $feed_id,
					'text'       => sanitize_text_field( $opt['text'] ?? '' ),
					'sort_order' => $sort,
					'created_at' => $now,
				] );
			}
		}

		// Sanitize and validate data
		$data['status'] = sanitize_text_field( $data['status'] ?? $old_data['status'] );
		if ( ! in_array( $data['status'], [ 'published', 'draft', 'scheduled', 'pending', 'rejected' ], true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid status.', 'zencommunity' ), 400 );
		}
		// validate meta data type
		if (  isset( $data['meta'] ) && ! is_array( $data['meta'] ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid meta format.', 'zencommunity' ), 400 );
		}
		// validate title
		if( isset( $data['title'] ) ) {
			$data['title']      = sanitize_text_field( $data['title'] );
		}

		// Validate content length
		Helper::verify_char_limit( $data['title'] ?? null , 'title' );
		Helper::verify_char_limit( $data['content'] ?? null , 'description' );

		// rendered content
		if( isset( $data['content'] ) ) {
			$mention = Profile::rendered_content( 
				$data['content'], $feed_id, 'feed', $old_data['meta']['_mentions'] ?? []
			);
			$data['rendered'] = $mention['rendered'];
			$data['meta']['_mentions'] = $mention['mentioned'];
		}

		$data['updated_at'] = current_time( 'mysql', true  );
	
		// validate media ids
		$add_media  = array_filter(
			$data['add_media_ids'] ?? [], 
			fn( $id ) => is_int( $id ) || ctype_digit( $id ) 
		);

		$remove_media = array_filter( 
			$data['remove_media_ids'] ?? [], 
			fn( $id ) => is_int( $id ) || ctype_digit( $id ) 
		);

		// handle media
		if ( ! empty( $add_media ) ) {
			$data['meta']['attachments'] = static::add_media( 
				$feed_id, $add_media, [ 'feed_image' ]
			);
		}

		if ( ! empty( $remove_media ) ) {
			$data['meta']['attachments'] = static::remove_media( $feed_id, $remove_media );
		}
		$data = apply_filters( 'zencommunity/feed/update/data', $data, $group_id, $user_id );

		if( ! empty( $data['scheduled_at'] ?? '' ) ) {
			$data['status'] = 'scheduled';
			$data['meta']['scheduled_at'] = $data['scheduled_at'];
			static::update_schedule( 
				$feed_id, 
				new DateTime( $data['scheduled_at'] ) 
			);
		}
			
		// json encode meta data
		if ( isset( $data['meta'] ) ) {
			$data['meta'] = wp_json_encode( array_merge( $old_data['meta'], $data['meta'] ) );
		}
		// remove media releted data from array
		unset( 
			$data['add_media_ids'], 
			$data['remove_media_ids'], 
			$data['scheduled_at'] 
		);

		$is_updated =  static::ins()->qb()->where( 'fd.id', '=', $feed_id )->update( $data );

		if ( $is_updated ) {
			// Post-update hook
			$action = $is_created ? 'created' : 'updated';
			do_action( "zencommunity/feed/{$action}", $feed_id, $old_data );
			
		}

		return $is_updated;

	}

	/**
	 * Add media attachments to a feed.
	 *
	 * @param int $feed_id
	 * @param array $media_ids
	 * @param array $allowed_media_types
	 * @return array|null
	 */
	public static function add_media( int $feed_id, array $media_ids, array $allowed_media_types ) : ?array {
		Attachment::set_object_id( $feed_id, 'feed', $media_ids, $allowed_media_types );
		return Attachment::get_all_media_by_object_id( $feed_id, 'feed', [], true );
	}

	/**
	 * Remove media attachments from a feed.
	 *
	 * @param int $feed_id
	 * @param array $media_ids
	 * @return array|null
	 */
	public static function remove_media( int $feed_id, array $media_ids ) : ?array {
		Attachment::delete_media_by_object_id( $feed_id, 'feed', $media_ids );
		return Attachment::get_all_media_by_object_id( $feed_id, 'feed', [], true );
	}

	/**
	 * Delete a feed and related media.
	 *
	 * @param int $feed_id
	 * @param int|null $user_id
	 * @return bool
	 *
	 * @throws ZencommunityException
	 */
    public static function delete( int $feed_id, ?int $user_id = null ) : bool {
		// authorize user
		// this called method also return feed data, but here we dont need, only id column is selected
		$old_data = static::user_can_update_or_delete_feed( $feed_id, $user_id, 'delete', [ 'fd.id' ] );

		// 1st: delete media 
		Attachment::delete_media_by_object_id( $feed_id, 'feed' );
		Attachment::delete_media_by_parent_object_id( $feed_id, 'feed' );

		// 2nd: delete 
        $deleted = static::ins()->qb()
            ->where( 'fd.id', '=', $feed_id )
			->delete();
		if ( ! $deleted ) {
			throw new ZencommunityException( esc_html__( 'Data can\'t be deleted.', 'zencommunity' ), 400 );
		}
		// Post-delete hook
		do_action( 'zencommunity/feed/deleted', $feed_id, $old_data );
		
		return $deleted;
    }

	/**
	 * Return default feed data with fallback meta values.
	 *
	 * @param array $data
	 * @param int|null $category_id
	 * @return array
	 */
    public static function default_data( array $data, ?int $category_id = null  ) : array {
		$data['meta']['disable_comment'] = $data['meta']['disable_comment'] ?? false;
        return apply_filters( 'zencommunity/group/default_data', $data, $category_id );
    }
}