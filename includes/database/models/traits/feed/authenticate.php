<?php
namespace ZenCommunity\Database\Models\Traits\Feed;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Database\Utils\QueryBuilder;

use ZenCommunity\Database\Models\{ Profile, Group, Feed };
/**
 * Trait Authenticate
 *
 * Provides authorization logic for user actions on feeds such as updating, deleting, and reacting.
 * 
 * @package ZenCommunity\Database\Models\Traits\Feed
 */
trait Authenticate {
    
	/**
	 * Determine if a user can update or delete a feed.
	 *
	 * Authorization rules:
	 * - User must be a member of the feed's group.
	 * - User must be either the owner of the feed or an admin/moderator of the feed's group.
	 *
	 * @param int      $feed_id Feed ID to check authorization against.
	 * @param int|null $user_id User ID performing the action. Null indicates unauthenticated.
	 * @param string   $action   Action: manage, delete.
	 * @param array    $cols    Columns to select when retrieving feed data. Default: ['fd.*'].
	 *
	 * @return array Feed data.
	 *
	 * @throws ZencommunityException Throws when unauthorized or feed not found.
	 */
	public static function user_can_update_or_delete_feed( 
        int $feed_id,  
        ?int $user_id, 
        string $action, 
        array $cols = [ 'fd.*' ] 
    ) : array {
		return static::authorize_user_action(
			$feed_id, $user_id,
			function ( int $feed_id, int $owner_id, int $user_id, int $group_id ) use( $action ) : void {
				// Check if user is a valid member of the group & has proper permission
				$is_member = Group::is_member_of( $user_id, $group_id, [], 'active',  [ // caps group
					[ "{$action}_post" ], // OR
					[ "{$action}_own_post" ],
				] );

				// If user is not a member at all
				if ( ! $is_member ) {
					throw new ZencommunityException( esc_html__( 'You are not authorized to perform this action.', 'zencommunity' ), 401 );
				}

				// check if user is not admin|mnod & not owner of this feed :  thorow an exception
				$has_access  = Group::is_member_of( 
					$user_id, $group_id, [ 'admin', 'moderator' ], 'active',  [ // caps group
						[ "{$action}_post" ],
					] 
				);
				if ( ! $has_access ) {
					if ( $owner_id !== $user_id ) {
						throw new ZencommunityException( esc_html__( 'Unauthorized.', 'zencommunity' ), 401 );
					}
				}				
			},
			$cols
		);
	}

	/**
	 * Determine if a user can react to a feed or its comments.
	 *
	 * Authorization rules:
	 * - Any logged-in user can react if feed privacy is 'public'.
	 * - Otherwise, user must be a member of the feed's group.
	 * - If the feed status is 'draft', only the owner or group admins/moderators can react.
	 *
	 * @param int      $feed_id Feed ID to check authorization against.
	 * @param int|null $user_id User ID performing the action. Null indicates unauthenticated.
	 * @param array    $cols    Columns to select when retrieving feed data. Default: ['fd.*'].
	 *
	 * @return array Feed data.
	 *
	 * @throws ZencommunityException Throws when unauthorized or feed not found.
	 */
	public static function user_can_react( int $feed_id,  ?int $user_id, array $cols = [ 'fd.*' ], ?callable $cb = null ) : array {
		return static::authorize_user_action(
			$feed_id, $user_id,
			function ( int $feed_id, int $owner_id, int $user_id, int $group_id, array $feed_data ) use( $cb ) : void {
				$group = QueryBuilder::ins()
					->select( [ 'privacy' ] )
					->from( 'zenc_groups' )
					->where( 'id', '=',  $group_id )
					->first();
				$privacy = $group['privacy'] ?? 'hidden'; // default if not set
				
				// if privacy is public a logged user can see feeds & react without being a member of this group 
				if ( 'public' !== $privacy ) {
					// Check if user is a valid member of the group
					$is_member = Group::is_member_of( $user_id, $group_id );

					// If user is not a member at all
					if ( ! $is_member ) {
						throw new ZencommunityException( esc_html__( 'You are not authorized to perform this action.', 'zencommunity' ), 401 );
					}
				}
				
				// If feed is draft, only owner or group admin can react
				$is_owner  = $owner_id === $user_id;
				$is_admin  = Group::is_member_of( $user_id, $group_id, [ 'admin', 'moderator' ] );
				$feed_status = $feed_data['status'] ?? 'draft'; // default if not set
				$can_react_to_draft = $is_owner || $is_admin;
				if ( $feed_status === 'draft' && ! $can_react_to_draft ) {
					throw new ZencommunityException( esc_html__( 'Only the feed owner or a group admin can react to drafts.', 'zencommunity' ), 403 );
				}

				if ( is_callable( $cb ) ) {
					$cb( $is_admin, $user_id, $feed_data );
				}
			},
			$cols
		);
	}
	
	public static function user_can_update_delete_comment( int $comment_id, int $feed_id,  ?int $user_id, array $cols = [ 'fd.*' ] ) : array {
		// authenticate 
		return static::user_can_react( $feed_id, $user_id, $cols, function( bool $is_admin, int $user_id, array $feed ) use( $comment_id ) : void {
			if ( ! $is_admin && ! static::user_can_manage_comment( $user_id, $comment_id  ) ) {
				throw new ZencommunityException( esc_html__( 'Unauthorized [401].', 'zencommunity' ), 401 );
			}
		} );

	}
	/**
	 * Authorize a user action on a feed with a custom authorization callback.
	 *
	 * This method:
	 * - Retrieves feed data by ID.
	 * - Throws if feed not found.
	 * - Checks if the user is an administrator (capability 'manage_options'), and if not,
	 *   calls the provided authorization callback for additional checks.
	 *
	 * @param int        $feed_id            Feed ID.
	 * @param int|null   $user_id            User ID performing the action, or null if unauthenticated.
	 * @param callable   $extra_auth_check_cb Callback with signature:
	 *                                        `function(int $feed_id, int $owner_id, int $user_id, int $group_id, array $feed_data): void`
	 *                                        Should throw ZencommunityException on unauthorized.
	 * @param array      $cols               Columns to select when retrieving feed data. Default: ['fd.*'].
	 *
	 * @return array Feed data.
	 *
	 * @throws ZencommunityException Throws if feed not found or authorization fails.
	 */
	public static function authorize_user_action( 
		int $feed_id, 
		?int $user_id,
		callable $extra_auth_check_cb,
		array $cols = [ 'fd.*' ]
	) : array {
		if ( ! in_array( 'fd.*', $cols, true ) ) {
			$cols = array_merge(
				$cols,
				[	// if this columns is not present in selects, then add
					'fd.id', 'fd.group_id', 'fd.user_id', 'fd.status'
				]
			);
		}
		
		// Check if feed exists
		$feed_data = static::by_id( 
			$feed_id, null, fn ( QueryBuilder $qb ) : QueryBuilder => $qb->select( $cols )
		);
		if ( empty( $feed_data ) ) {
			throw new ZencommunityException( esc_html__( 'Feed not found.', 'zencommunity' ), 404 );
		}
		
		$group_id  = absint( $feed_data['group_id'] );
		$owner_id  = absint( $feed_data['user_id'] );

		// Check if user ID is provided and the user is not an admin
		if ( ! is_null( $user_id ) && ! user_can( $user_id, 'manage_options' ) ) {

			// perform extra logic
			$extra_auth_check_cb( $feed_id, $owner_id, $user_id, $group_id, $feed_data );
		}
		return $feed_data;
	}
}