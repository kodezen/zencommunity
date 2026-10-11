<?php
namespace ZenCommunity\Database\Models\Traits\Feed;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Helper;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Database\Utils\QueryBuilder;
use ZenCommunity\Database\Models\{ Profile, Attachment, Group, Feed, Group_Member_Action };
/**
 * Trait Reaction
 *
 * Provides reaction-related functionality (like, bookmark) for feeds and comments.
 *
 * Supports adding/removing reactions, counting reactions,
 * retrieving reaction data, and caching reaction counts.
 *
 * @package ZenCommunity\Database\Models\Traits\Feed
 */
trait Reaction {
    /**
	 * Wrap a single comment reaction data.
	 *
	 * @param array $comment Single comment data array.
	 * @return array Wrapped comment data.
	 */
	public static function reaction_wrapper( array $comment ) : array {
		return $comment;
	}

	/**
	 * Wrap a collection of comment reactions.
	 *
	 * @param array $comments List of comment data arrays.
	 * @return array List of wrapped comment data.
	 */
	public static function reaction_collection_wrapper( array $comments ) : array {
		$data = [];
		foreach ( $comments as $comment ) {
			$data[] = static::reaction_wrapper( $comment );
		}
		return $data;
	}

	/**
	 * Get a QueryBuilder instance for reactions on a specific feed.
	 *
	 * @param int $feed_id The ID of the feed.
	 * @return QueryBuilder|null QueryBuilder instance or null if not found.
	 */
	public static function reaction_query( int $feed_id ) : ?QueryBuilder {
		return static::ins()->qb()
			->join( 'zenc_reactions', 'rc', 'rc.user_id = fd.user_id')
			->where( 'rc.feed_id', '=', $feed_id );
	}

	/**
	 * Get the reaction types a user gave on a feed or comment.
	 *
	 * @param int $user_id User ID.
	 * @param int $feed_id Feed ID.
	 * @param int|null $comment_id Optional comment ID.
	 * @return array|null List of reaction types or null.
	 */
	public static function get_reaction( int $user_id, int $feed_id, ?int $comment_id = null ) : ?array {
		$qb = QueryBuilder::ins()
			->select( [ 'type', 'id', 'user_id', 'feed_id' ] )
			->from( 'zenc_reactions', 'rc' )
			->where( 'rc.user_id', '=', $user_id )
			->where( 'rc.feed_id', '=', $feed_id );
		
		if ( ! empty( $comment_id ) ) {
			$qb->where( 'rc.comment_id', '=', $comment_id );
		}
		else {
			$qb->where_null( 'rc.comment_id' );
		}
		return array_column( $qb->get() ?? [], 'type' );
	}

	/**
	 * Get the count of reactions of a specific type on a feed or comment.
	 *
	 * @param int $feed_id Feed ID.
	 * @param string $type Reaction type (default 'like').
	 * @param int|null $comment_id Optional comment ID.
	 * @return int Number of reactions.
	 */
	public static function reaction_count( 
		int $feed_id, 
		string $type = 'like',
		?int $comment_id = null,
		bool $exact = false 
	) : int {
		$qb = QueryBuilder::ins()
				->from( 'zenc_reactions', 'rc' )
				->where( 'rc.feed_id', '=', $feed_id );

		if ( $exact ) {
			$qb->where( 'rc.type', '=', $type );
		}
		else {
			if ( 'bookmark' === $type ) {
				$qb->where( 'rc.type', '=', 'bookmark' );
			}
			else {
				$qb->where( 'rc.type', '!=', 'bookmark' );
			}
		}

		if ( ! empty( $comment_id ) ) {
			$qb->where( 'rc.comment_id', '=', $comment_id );
		}
		return $qb->count() ?? 0;
	}

	public static function reaction_counts( 
		int $feed_id, 
		?int $comment_id = null
	) : array {
		$qb = QueryBuilder::ins()
				->select( [ 'rc.type', 'COUNT(rc.id)'=> 'total' ] )
				->from( 'zenc_reactions', 'rc' )
				->where( 'rc.feed_id', '=', $feed_id )
				->where( 'rc.type', '!=', 'bookmark' );

		if ( ! empty( $comment_id ) ) {
			$qb->where( 'rc.comment_id', '=', $comment_id );
		}
		$qb->group_by( [ 'rc.type' ] );
		return array_column( $qb->get(), 'total', 'type' );
	}

	/**
	 * Check if a user has already reacted with a given type on feed/comment.
	 *
	 * @param int $user_id User ID.
	 * @param int $feed_id Feed ID.
	 * @param string $type Reaction type (default 'like').
	 * @param int|null $comment_id Optional comment ID.
	 * @return bool True if reacted, false otherwise.
	 */
	public static function is_already_reacted( 
		int $user_id, 
		int $feed_id, 
		string $type = 'like',
		?int $comment_id = null 
	) : bool {
		$qb = QueryBuilder::ins()
			->select( [ 'rc.id' ] )
			->from( 'zenc_reactions', 'rc' )
			->where( 'rc.feed_id', '=', $feed_id )
			->where( 'rc.user_id', '=', $user_id )
			->where( 'rc.type', '=', $type );
		if ( ! empty( $comment_id ) ) {
			$qb->where( 'rc.comment_id', '=', $comment_id );
		}
		return $qb->count() > 0;
	}

	/**
	 * Get the reaction ID of a user's reaction on feed/comment.
	 *
	 * @param int $user_id User ID.
	 * @param int $feed_id Feed ID.
	 * @param string $type Reaction type (default 'like').
	 * @param int|null $comment_id Optional comment ID.
	 * @return int|null Reaction ID or null if none.
	 */
	public static function get_reaction_id( 
		int $user_id, 
		int $feed_id, 
		string $type = 'like',
		?int $comment_id = null 
	) : ?int {
		$qb = QueryBuilder::ins()
			->select( [ 'rc.id' ] )
			->from( 'zenc_reactions', 'rc' )
			->where( 'rc.feed_id', '=', $feed_id )
			->where( 'rc.user_id', '=', $user_id )
			->where( 'rc.type', '=', $type );
		if ( ! empty( $comment_id ) ) {
			$qb->where( 'rc.comment_id', '=', $comment_id );
		}
		return $qb->first()['id'] ?? null;
	}

	/**
	 * Add or remove a reaction on a feed or comment (toggle).
	 *
	 * @param int $feed_id Feed ID.
	 * @param string $type Reaction type ('like' or 'bookmark').
	 * @param int $user_id User ID.
	 * @param string|null $comment_id Optional comment ID (null for feed reaction).
	 * @return bool|null True if successful, false or null on failure.
	 * @throws ZencommunityException For invalid types or errors.
	 */
	public static function react( int $feed_id, string $type, int $user_id, string $comment_id = null ) : ?bool {
		// Validate reaction type
		if ( ! in_array( $type, [ "like", "love", "haha", "wow", "sad", "angry", 'bookmark', 'upvote', 'downvote' ], true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid react type.', 'zencommunity' ), 400 );
		}

		if ( 'bookmark' === $type && ! empty( $comment_id ) ) {
			throw new ZencommunityException( esc_html__( 'Comment is not bookmarkable.', 'zencommunity' ), 400 );
		}

		if ( in_array( $type, [ 'upvote', 'downvote' ], true ) && ! empty( $comment_id ) ) {
			throw new ZencommunityException( esc_html__( 'Comment cannot be upvoted or downvoted.', 'zencommunity' ), 400 );
		}

		// authenticate
		$feed_data = static::user_can_react(
			$feed_id, $user_id
		);

		$is_idea_post = 'idea' === ( $feed_data['type'] ?? 'post' );

		if ( in_array( $type, [ 'upvote', 'downvote' ], true ) && ! $is_idea_post ) {
			throw new ZencommunityException( esc_html__( 'This post does not support upvote/downvote.', 'zencommunity' ), 400 );
		}

		if ( $is_idea_post && ! in_array( $type, [ 'upvote', 'downvote', 'bookmark' ], true ) ) {
			throw new ZencommunityException( esc_html__( 'This post only supports upvote/downvote.', 'zencommunity' ), 400 );
		}

		if ( Group_Member_Action::is_muted( $user_id, $feed_data['group_id'] ) ) {
			throw new ZencommunityException( esc_html__( 'Unauthorized.', 'zencommunity' ), 401 );
		}

		if ( ! empty( $comment_id ) && ! static::comment_exists( $feed_id, $comment_id ) )
			throw new ZencommunityException( esc_html__( 'Comment not exists', 'zencommunity' ), 400 );

		$reaction_id = static::get_reaction_id( $user_id, $feed_id, $type, $comment_id );
		
		// if ( static::is_already_reacted( $user_id, $feed_id, $type, $comment_id ) ) {
		if ( ! empty( $reaction_id ) ) {
			
			// reaction already exists means action is remove reaction
			$qb = QueryBuilder::ins()
					->from( 'zenc_reactions', 'rc' )
					->where( 'rc.user_id', '=', $user_id )
					->where( 'rc.feed_id', '=', $feed_id )
					->where( 'rc.type', '=', $type );
			if ( ! empty( $comment_id ) ) {
				$qb->where( 'rc.comment_id', '=', $comment_id );
			}
			
			$qb->delete();
			
			//  hook
			do_action( "zencommunity/feed/react/withdraw", $type, $reaction_id, $feed_id, $user_id, $comment_id, $feed_data );
			do_action( "zencommunity/feed/react/withdraw/{$type}", $reaction_id, $feed_id, $user_id, $comment_id, $feed_data );
			
			return static::cache_reaction_count( $feed_id, $type, $comment_id );
		}
		
		$qb = QueryBuilder::ins()
				->from( 'zenc_reactions', 'rc' )
				->where( 'rc.user_id', '=', $user_id )
				->where( 'rc.feed_id', '=', $feed_id );
		if ( ! empty( $comment_id ) ) {
			$qb->where( 'rc.comment_id', '=', $comment_id );
		}
		else {
			$qb->where( 'rc.type', '!=', 'bookmark' );
		}
		
		$qb->delete();
		
		// add new reaction
		$reaction_id = QueryBuilder::ins()->create( 'zenc_reactions', [
			'user_id' 	 => $user_id,
			'feed_id' 	 => $feed_id,
			'comment_id' => $comment_id,
			'type' 		 => $type,
			'ip'   		 => Helper::user_ip(),
			'created_at' => current_time( 'mysql', true  ),
		] );

		if ( empty( $reaction_id ) )
			throw new ZencommunityException( esc_html__( 'Unknown error is occured, please try again later.', 'zencommunity' ), 400 );

		//  hook
		do_action( "zencommunity/feed/react", $type, $reaction_id, $feed_id, $user_id, $comment_id, $feed_data );
		do_action( "zencommunity/feed/react/{$type}", $reaction_id, $feed_id, $user_id, $comment_id, $feed_data );
		
		return static::cache_reaction_count( $feed_id, $type, $comment_id );
	}

	/**
	 * Cache (update) the reaction count on feed or comment.
	 *
	 * @param int $feed_id Feed ID.
	 * @param string $type Reaction type (e.g. 'like').
	 * @param string|null $comment_id Optional comment ID.
	 * @return bool True on success, false on failure.
	 */
	public static function cache_reaction_count( int $feed_id, string $type, string $comment_id = null ) : bool {

		// save reaction count
		if ( empty( $comment_id ) ) {
			$data = [];

			$feed = Feed::ins()->qb()
				->select( [ 'fd.meta' ] )
				->where( 'fd.id', '=', $feed_id )
				->first();
			if( empty( $feed ) )
				return false;
			$meta = json_decode( $feed['meta'] ?? '{}', true );

			if( 'bookmark' === $type ) {
				$meta['bookmark_count'] = static::reaction_count(
					$feed_id, 'bookmark'
				);
			}
			elseif ( in_array( $type, [ 'upvote', 'downvote' ], true ) ) {
				$upvote_count = static::reaction_count( $feed_id, 'upvote', null, true );
				$downvote_count = static::reaction_count( $feed_id, 'downvote', null, true );
				$meta['upvote_count'] = $upvote_count;
				$meta['downvote_count'] = $downvote_count;
				$data['vote_score'] = $upvote_count - $downvote_count;
			}
			else {
				$meta['reaction_count'] = static::reaction_counts(
					$feed_id
				);
				$data['like_count'] = static::reaction_count(
					$feed_id, $type, $comment_id
				);
			}
			$data['meta'] = json_encode( $meta );

			return static::ins()->qb()
				->where( 'fd.id', '=', $feed_id )
				->update( $data );
		}
		else if ('bookmark' !== $type ) {
			$comment = QueryBuilder::ins()
				->select( [ 'cm.meta' ] )
				->from( 'zenc_comments', 'cm' )
				->where( 'cm.id', '=', $comment_id )
				->where( 'cm.feed_id', '=', $feed_id )
				->first();

			$data = [];
			$meta = json_decode( $comment['meta'] ?? '{}', true );

			$meta['reaction_count'] = static::reaction_counts(
				$feed_id, $comment_id
			);

			$data['like_count'] = static::reaction_count( 
				$feed_id, $type, $comment_id 
			);

			$data['meta'] = json_encode( $meta );

			return QueryBuilder::ins()
				->from( 'zenc_comments', 'cm' )
				->where( 'cm.id', '=', $comment_id )
				->where( 'cm.feed_id', '=', $feed_id )
				->update( $data );
		}
	}

	/**
	 * Get paginated list of members who reacted on a feed or comment.
	 *
	 * @param int $feed_id Feed ID.
	 * @param int $user_id Current user ID (for auth).
	 * @param string $type Reaction type ('like', 'bookmark').
	 * @param int|null $comment_id Optional comment ID.
	 * @param string $order_by Field to order by (created_at, updated_at, id).
	 * @param string $order Order direction ('ASC' or 'DESC').
	 * @return array Paginated array of reacted members with profile info.
	 * @throws ZencommunityException On invalid params or authorization failure.
	 */
	public static function get_reacted_members( 
		int $feed_id,
		int $user_id, 
		string $type = 'like', 
		?int $comment_id = null, 
		string $order_by = 'created_at', 
		string $order = 'ASC' 
	) : array {
		//  Authorization
		static::user_can_react(
			$feed_id,
			$user_id,
			[ 'fd.id', 'fd.group_id', 'fd.user_id', 'fd.status' ]
		);
	
		// Validate order inputs
		$allowed_order_by = [ 'created_at', 'updated_at', 'id' ];
		$allowed_order = [ 'ASC', 'DESC' ];
		$allowed_types = [ "like", "love", "haha", "wow", "sad", "angry", 'bookmark', 'upvote', 'downvote' ];
	
		if ( ! in_array( $order_by, $allowed_order_by, true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid order_by field.', 'zencommunity' ), 400 );
		}
		if ( ! in_array( $order = strtoupper( $order ), $allowed_order, true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid order direction.', 'zencommunity' ), 400 );
		}
		
		if ( 'all' !==  $type && ! in_array( $type = strtolower( $type ), $allowed_types, true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid reaction type.', 'zencommunity' ), 400 );
		}
	
		// Fetch comments
		$qb = QueryBuilder::ins()
			->select( [ 
				'rc.type', 
				'pf.first_name' => 'user_first_name', 
				'pf.last_name'  => 'user_last_name', 
				'pf.username'   => 'user_username', 
				'pf.avatar_url' => 'user_avatar_url', 
				'pf.status'     => 'user_status', 
			])
			->from( 'zenc_reactions', 'rc' )
			->join( 'zenc_profiles', 'pf', 'pf.user_id = rc.user_id')
			->where( 'rc.feed_id', '=', $feed_id );

		if ( 'all' !==  $type ) {
			$qb->where( 'rc.type', '=', $type );
		}

		if ( ! empty( $comment_id ) ) {
			$qb->where( 'rc.comment_id', '=', $comment_id );
		}
		else {
			$qb->where_null( 'rc.comment_id' );
		}
		
		$qb->group_by( [ 'rc.id' ] );
		$qb->order_by( 'rc.' . $order_by, strtoupper( $order ) );
		//  Wrap & return
		$comments = $qb->paginate();
		$comments['records'] = static::reaction_collection_wrapper( $comments['records'] ?? [] );
		return $comments;
	}
}