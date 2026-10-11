<?php
namespace ZenCommunity\Database\Models\Traits\Feed;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Database\Models\{ Profile, Attachment, Group, Feed, Group_Member_Action };
use ZenCommunity\Helper;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Database\Utils\QueryBuilder;
/**
 * Trait Comment
 * 
 * Handles comment-related operations on feeds, including querying, creating, editing,
 * deleting comments, and managing media attachments for comments.
 *
 * @package ZenCommunity\Database\Models\Traits\Feed
 */
trait Comment {
	 /**
     * Builds a query builder to fetch comments for a specific feed.
     *
     * @param int $feed_id Feed ID.
     * @return QueryBuilder|null Query builder instance for comments or null if error.
     */
	public static function comment_query( int $feed_id ) : ?QueryBuilder {
		return static::ins()->qb()
			->join( 'zenc_comments', 'cm', 'cm.feed_id = fd.id')
			->where( 'cm.feed_id', '=', $feed_id );
	}

    /**
     * Wraps a single comment data array by decoding metadata and formatting flags.
     *
     * @param array $comment Raw comment data.
     * @return array Wrapped comment data with decoded meta and boolean is_liked.
     */
	public static function comment_wrapper( array $comment ) : array {
		$comment['author_role'] =  isset( $comment['author_role'] ) ? ( json_decode( $comment['author_role'] ?? '{}', true ) ?? [] ) : [];
		$comment['meta'] =  isset( $comment['meta'] ) ? ( json_decode( $comment['meta'] ?? '{}', true ) ?? [] ) : [];
		$comment['is_liked'] = boolval( $comment['react_type'] ?? null );

		if ( empty( $comment['meta']['reaction_count'] ) )
			$comment['meta']['reaction_count']['like'] = intval( $comment['like_count'] ?? 0 );

		return apply_filters( 'zencommunity/comment/wrapper/single', $comment );
	}

    /**
     * Wraps a collection of comments by applying comment_wrapper to each.
     *
     * @param array $comments Array of raw comment data.
     * @return array Array of wrapped comments.
     */
	public static function comment_collection_wrapper( array $comments ) : array {
		$data = [];
		foreach ( $comments as $comment ) {
			$data[] = static::comment_wrapper( $comment );
		}
		return apply_filters( 'zencommunity/comment/wrapper/collection', $data );
	}

    /**
     * Checks if a comment exists within a given feed.
     *
     * @param int $feed_id Feed ID.
     * @param int $comment_id Comment ID.
     * @return int Count of comments matching feed and comment ID (0 or 1).
     */
	public static function comment_exists( int $feed_id, int $comment_id ) : int {
		return static::comment_query( $feed_id )->where( 'cm.id', '=', $comment_id )->count() ?? 0;
	}

    /**
     * Counts total comments for a feed, optionally filtering by parent comment ID.
     *
     * @param int $feed_id Feed ID.
     * @param int|null $comment_id Parent comment ID for nested comments (optional).
     * @return int Number of comments.
     */
	public static function comment_count( int $feed_id, ?int $comment_id = null ) : int {
		$qb = QueryBuilder::ins()
				->from( 'zenc_comments', 'cm' )
				->join( 'zenc_feeds', 'fd', 'cm.feed_id = fd.id')
				->where( 'cm.feed_id', '=', $feed_id );
				
		if ( ! empty( $comment_id ) ) {
			$qb->where( 'cm.parent_id', '=', $comment_id );
		}

		return $qb->group_by( [ 'cm.id' ] )->count( 'cm.id', true ) ?? 0;
	}

    /**
     * Verify comment Edit/delete access
     *
     * @param int $user_id Feed ID.
     * @param int $comment_id  comment ID for nested comments (optional).
     * @return bool
     */
	public static function user_can_manage_comment( int $user_id, int $comment_id  ) : bool {
		$qb = QueryBuilder::ins()
				->from( 'zenc_comments', 'cm' )
				->join( 'zenc_feeds', 'fd', 'cm.feed_id = fd.id')
				->where( 'cm.user_id', '=', $user_id )
				->where( 'cm.id', '=', $comment_id );
		return boolval( $qb->count() ?? 0 );
	}

    /**
     * Retrieves a single comment by its ID.
     *
     * @param int $comment_id Comment ID.
     * @param array $select Columns to select, default is all from 'cm'.
     * @param int $user_id Context User ID.
     * @return array|null Comment data wrapped, or empty array if not found.
     */
	public static function get_comment( int $comment_id, array $select = [ 'cm.*' ], ?int $user_id = null ) : ?array {
		$qb = QueryBuilder::ins()->select( $select )
			->from( 'zenc_comments', 'cm' )
			->where( 'cm.id', '=', $comment_id );
		static::add_user_info_query_for_comment( $qb, $user_id );
		$comment = $qb->first();
		return empty( $comment ) ? [] : static::comment_wrapper( $comment );
	}

	 /**
     * Updates cached comment count on the feed and optionally on a comment.
     *
     * @param int $feed_id Feed ID.
     * @param string|null $comment_id Comment ID (optional).
     * @return bool True if cache updated successfully, false otherwise.
     */
	public static function cache_comment_count( int $feed_id, string $comment_id = null ) : bool {
		
		$is_updated =  static::ins()->qb()->where( 'fd.id', '=', $feed_id )->update( [
			'comment_count' => static::comment_count( $feed_id )
		] );
		if( $is_updated && ! empty( $comment_id ) ) {
			return QueryBuilder::ins()
				->from( 'zenc_comments', 'cm' )
				->where( 'cm.id', '=', $comment_id )
				->where( 'cm.feed_id', '=', $feed_id )
				->update( [
					'comment_count' => static::comment_count( $feed_id, $comment_id )
				] );
		}
		return $is_updated;
	}

	/**
     * Creates a new comment or reply on a feed.
     *
     * @param int $feed_id Feed ID.
     * @param int $user_id User ID creating the comment.
     * @param array $data Comment data including 'content', 'add_media_ids', 'remove_media_ids'.
     * @param int|null $comment_id Parent comment ID if this is a reply (optional).
     * @return array Created comment data after applying edits.
     *
     * @throws ZencommunityException When validation or authorization fails.
     */
	public static function comment( int $feed_id, int $user_id, array $data, int $comment_id = null ) : array {
		$data = Sanitizer::sanitize( $data, apply_filters( 'zencommunity/comment/create/sanitaization/rules', [
			'content'            => Sanitizer::HTML,
			'add_media_ids.*'    => Sanitizer::INT,
			'remove_media_ids.*' => Sanitizer::INT,
		], $data, null ) );

		// Validate content length
		Helper::verify_char_limit( $data['content'] ?? null , 'comment' );

		// Validate reaction type
		if ( empty( $data['add_media_ids'] ?? null ) && empty( $data['content'] ?? null ) ) {
			throw new ZencommunityException( esc_html__( 'Comment should not be empty.', 'zencommunity' ), 400 );
		}
		
		// authenticate 
		$feed_data = static::user_can_react( $feed_id, $user_id );

		// if actor user id is provided then check actor user has permission to perform this action
		if ( 
			! Group::can_user_post_interact( $user_id, $feed_data['group_id'], [], 'active', [
				[ 'comment_post' ]
			] )
		) {
			throw new ZencommunityException( esc_html( __( 'Unauthorized.', 'zencommunity' ) ) );
		}

		if ( Group_Member_Action::is_muted( $user_id, $feed_data['group_id'] ) ) {
			throw new ZencommunityException( esc_html( __( 'Unauthorized.', 'zencommunity' ) ) );
		}

		if ( $feed_data['meta']['disable_comment'] ?? false )
			throw new ZencommunityException( esc_html__( 'Comment is disabled', 'zencommunity' ), 401 );

		$data = apply_filters( 'zencommunity/comment/create/data', $data, $feed_data['group_id'], $user_id );

		// if comment_id is present, that means reply of this comment, so we need to check this comment exists or not
		if ( ! empty( $comment_id ) && ! static::comment_exists( $feed_id, $comment_id ) )
			throw new ZencommunityException( esc_html__( 'Comment is not exists', 'zencommunity' ), 400 );

		if ( empty( $data['meta'] ) ) {
			$data['meta'] = [ '_mentions' => [] ];
		}

		$data['meta'] = wp_json_encode( $data['meta'] );
		$media_ids = $data['add_media_ids'] ?? [];
		
		// add new reaction
		$new_comment_id = QueryBuilder::ins()->create( 'zenc_comments', [
			'user_id' 	 => $user_id,
			'feed_id' 	 => $feed_id,
			'parent_id'  => $comment_id,
			'meta' 	     => $data['meta'],
			'ip'   		 => Helper::user_ip(),
			'created_at' => current_time( 'mysql' , true ),
			'updated_at' => current_time( 'mysql', true  ),
		] );

		if ( empty( $new_comment_id ) )
			throw new ZencommunityException( esc_html__( 'Unknown error is occured, please try again later.', 'zencommunity' ), 400 );
		// fire hook 
		//cache comment count
		static::cache_comment_count( $feed_id, $comment_id );
		// add media, generate rendered content
		$cmnt = static::edit_comment( $feed_id, $user_id, $new_comment_id, [
			'add_media_ids' => $media_ids,
			'content'    	=> $data['content'],
		] );
		do_action( "zencommunity/feed/comment_created", $new_comment_id, $feed_id, $user_id, $comment_id, $feed_data, $cmnt );
		return $cmnt;
	}

    /**
     * Adds media attachments to a comment.
     *
     * @param int $feed_id Feed ID.
     * @param int $comment_id Comment ID.
     * @param array $media_ids Array of media IDs to attach.
     * @return array|null Updated media attachments for the comment.
     */
	public static function add_media_to_comment( int $feed_id, int $comment_id, array $media_ids ) : ?array {
		Attachment::set_object_id( 
			$comment_id, 'comment', $media_ids, [ 'comment_image' ],
			$feed_id, 'feed'
		);
		return Attachment::get_all_media_by_object_id( $comment_id, 'comment', [], true );
	}

    /**
     * Removes media attachments from a comment.
     *
     * @param int $comment_id Comment ID.
     * @param array $media_ids Array of media IDs to remove.
     * @return array|null Updated media attachments after removal.
     */
	public static function remove_media_from_comment( int $comment_id, array $media_ids ) : ?array {
		Attachment::delete_media_by_object_id( $comment_id, 'comment', $media_ids );
		return Attachment::get_all_media_by_object_id( $comment_id, 'comment', [], true );
	}

	 /**
     * Edits an existing comment's content and media attachments.
     *
     * @param int $feed_id Feed ID.
     * @param int $user_id User ID editing the comment.
     * @param int $comment_id Comment ID to edit.
     * @param array $data Comment data with keys: 'content', 'add_media_ids', 'remove_media_ids'.
     * @return array Edited comment data.
     *
     * @throws ZencommunityException When validation or authorization fails.
     */
	public static function edit_comment( int $feed_id, int $user_id, int $comment_id, array $data ) : array {
		$data = Sanitizer::sanitize( $data, apply_filters( 'zencommunity/comment/update/sanitaization/rules', [
			'content'            => Sanitizer::HTML,
			'add_media_ids.*'    => Sanitizer::INT,
			'remove_media_ids.*' => Sanitizer::INT,
		], $data, null ) );

		// Validate content length
		Helper::verify_char_limit( $data['content'] ?? null , 'comment' );

		// Validate reaction type
		if ( empty( $data['add_media_ids'] ?? null ) && empty( $data['content'] ?? null ) ) {
			throw new ZencommunityException( esc_html__( 'Comment should not be empty.', 'zencommunity' ), 400 );
		}

		// authenticate
		$feed_data = static::user_can_update_delete_comment( $comment_id, $feed_id, $user_id );
		// check comment exists or not
		if ( empty( $comment = static::get_comment( $comment_id ) ) )
			throw new ZencommunityException( esc_html__( 'Comment is not exists', 'zencommunity' ), 404 );

		$data = apply_filters( 'zencommunity/comment/update/data', $data, $feed_data['group_id'], $user_id );

		if ( ! empty( $data['add_media_ids'] ?? null ) ) {
			$data['meta']['attachments'] = static::add_media_to_comment( 
				$feed_id, $comment_id, $data['add_media_ids']
			);
		}
		
		if ( ! empty( $data['remove_media_ids'] ?? null ) ) {
			$data['meta']['attachments'] = static::remove_media_from_comment( $comment_id, $data['remove_media_ids'] );
		}
		
		if ( empty( $data['meta'] ) ) {
			$data['meta'] = [ '_mentions' => [] ];
		}

		
		unset( $data['add_media_ids'], $data['remove_media_ids'] );
		
		// rendered content
		if( isset( $data['content'] ) ) {
			$mention = Profile::rendered_content( 
				$data['content'], $comment_id, 'comment', $comment['meta']['_mentions'] ?? []
			);
			$data['rendered'] = $mention['rendered'];
			$data['meta']['_mentions'] = $mention['mentioned'];
		}

		$data['meta'] = wp_json_encode( array_merge( $comment['meta'] ?? [], $data['meta'] ) );
		// update comment
		$is_updated = QueryBuilder::ins()
				->from( 'zenc_comments', 'cm' )
				->where( 'cm.id', '=', $comment_id )
				->update( [
					'user_id' 	 => $user_id,
					'content'    => $data['content'],
					'rendered'   => $data['rendered'],
					'meta' 	     => $data['meta'],
					'ip'   		 => Helper::user_ip(),
					'updated_at' => current_time( 'mysql', true  ),
				] );
		// check updated or not
		if ( empty( $is_updated ) )
			throw new ZencommunityException( esc_html__( 'Unknown error is occured, please try again later.', 'zencommunity' ), 500 );

		// fire hook
		do_action( "zencommunity/feed/comment_updated", $feed_id, $user_id, $comment_id );
		


		// return comment
		return static::get_comment( (int) $comment_id );
	}

    /**
     * Deletes a comment and associated media.
     *
     * @param int $feed_id Feed ID.
     * @param int $user_id User ID requesting deletion.
     * @param int $comment_id Comment ID to delete.
     * @return bool True on successful deletion.
     *
     * @throws ZencommunityException When authorization or deletion fails.
     */
	public static function delete_comment( int $feed_id, int $user_id, int $comment_id ) : bool {
		// authenticate 
		$feed_data = static::user_can_update_delete_comment( $comment_id, $feed_id, $user_id );

		// check comment exists or not
		if ( ! static::comment_exists( $feed_id, $comment_id ) )
			throw new ZencommunityException( esc_html__( 'Comment is not exists', 'zencommunity' ), 404 );

		// delete comment media
		Attachment::delete_media_by_object_id( $comment_id, 'comment' );
		// all child comment ids
		$ids = QueryBuilder::ins()
				->from( 'zenc_comments' )
				->where( 'parent_id', '=', $comment_id)
				->values('id');

		// delete all child comments
		QueryBuilder::ins()
				->from( 'zenc_comments', 'cm' )
				->where( 'cm.parent_id', '=', $comment_id )
				->delete();
		// update comment
		$is_deleted = QueryBuilder::ins()
				->from( 'zenc_comments', 'cm' )
				->where( 'cm.id', '=', $comment_id )
				->delete();
		// check deleted or not
		if ( empty( $is_deleted ) )
			throw new ZencommunityException( esc_html__( 'Unknown error is occured, please try again later.', 'zencommunity' ), 500 );

		//cache comment count
		static::cache_comment_count( $feed_id, $comment_id );

		// fire hook
		do_action( "zencommunity/feed/comment_deleted", $comment_id, $feed_id, $user_id, $ids );
		
		
		return true;
	}

    /**
     * Adds user profile and reaction info to a comment query.
     *
     * @param QueryBuilder $qb QueryBuilder instance to modify.
     * @param int|null $user_id User ID to check if user liked the comment (optional).
     * @return void
     */
	public static function add_user_info_query_for_comment( QueryBuilder $qb, ?int $user_id ) : void {
		$selects = [ 
			'cm.*', 
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
				 ->where_subquery( 'agr.group_id', '=', fn( QueryBuilder $q1 ) : QueryBuilder => (
					$q1->select( [
						'fd.group_id'
						])
					->from(
					'zenc_feeds', 'fd' 
					)
				 	->where_column( 'fd.id', '=', 'cm.feed_id' )
				 )
				)
				->where_column( 'agr.user_id', '=', 'cm.user_id' )
			, 
		];

		if ( ! empty( $user_id ) ) {
			$selects['rcl.type'] = 'react_type';
		}

		$qb->select( $selects )
			->join( 'zenc_profiles', 'pf', 'pf.user_id = cm.user_id');

		if ( empty( $user_id ) ) return;
		$qb->join( 'zenc_reactions', 'rcl', [
			[ 'rcl.comment_id', '=', 'cm.id' ],
			[ 'rcl.user_id', '=', [ 'value' => $user_id ] ],
		], 'LEFT' );
	}

	/**
     * Retrieves comments for a feed, optionally filtered by parent comment, with sorting and user context.
     *
     * @param int $feed_id Feed ID.
     * @param int $user_id User ID requesting the comments.
     * @param int|null $comment_id Parent comment ID to fetch replies for (optional).
     * @param string $order_by Field to order by, one of: 'created_at', 'updated_at', 'like_count', 'comment_count', 'id'.
     * @param string $order Order direction, 'ASC' or 'DESC'.
     * @return array Paginated comments including wrapped comment records.
     *
     * @throws ZencommunityException On invalid order parameters or authorization failure.
     */
	public static function get_comments( 
		int $feed_id,
		int $user_id, 
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
		$allowed_order_by = [ 'created_at', 'updated_at', 'like_count', 'comment_count', 'id' ];
		$allowed_order = [ 'ASC', 'DESC' ];
	
		if ( ! in_array( $order_by, $allowed_order_by, true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid comment order_by field.', 'zencommunity' ), 400 );
		}
		if ( ! in_array( strtoupper( $order ), $allowed_order, true ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid comment order direction.', 'zencommunity' ), 400 );
		}
	
		//  Fetch comments
		$qb = QueryBuilder::ins()
			->from( 'zenc_comments', 'cm' );

		static::add_user_info_query_for_comment( $qb, $user_id );

		$qb->where( 'cm.feed_id', '=', $feed_id );
		if ( ! empty( $comment_id ) ) {
			$qb->where( 'cm.parent_id', '=', $comment_id );
		}
		else {
			$qb->where_null( 'cm.parent_id' );
		}
		
		$qb->group_by( [ 'cm.id' ] );
		$qb->order_by( 'cm.' . $order_by, strtoupper( $order ) );
		//  Wrap & return
		$comments = $qb->paginate();
		$comments['records'] = static::comment_collection_wrapper( $comments['records'] ?? [] );
		return $comments;
	}
}