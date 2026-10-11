<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Addons\Email\Email;
use ZenCommunity\Addons\Migration\Migration;
use ZenCommunity\Addons\AcademyLms\AcademyLms;
use ZenCommunity\Addons\Gameengine\Gameengine;
use ZenCommunity\Addons\Learndash\Learndash;
use ZenCommunity\Addons\Tutorlms\Bootstrap as TutorLMS;
use ZenCommunity\Addons\LearnPress\bootstrap as LearnPress;
use ZenCommunity\Addons\LifterLms\bootstrap as LifterLms;
use ZenCommunity\Addons\Masterstudy\bootstrap as Masterstudy;
use ZenCommunity\{ Helper, RewriteRules };
use ZenCommunity\Database\Utils\QueryBuilder;
use ZenCommunity\Database\Models\{ Notification, Activity, Profile, Group, Feed, Badge, Group_Member_Action };
// use Throwable;
use ZenCommunity\Classes\Addon\Manager as AddonManager;

if ( ! function_exists( 'zencommunity_default_theme_settings' ) ) {
	function zencommunity_default_theme_settings() : array {
		return [
			"theme" => [
				'light' => [
					'primary_color' => '#2A3BEE',
					'secondary_color' => '#EBEDFF',
					'text_color' => '#141A24',
					'content_body_color' => '#F6F7F8',
					'content_background_color' => '#ffffff',
					'border_color' => '#CBD1D7',
				],
				'dark' => [
					'primary_color' => '#fff',
					'secondary_color' => '#303030',
					'text_color' => '#F6F7F8',
					'content_body_color' => '#262626',
					'content_background_color' => '#1C1C1C',
					'border_color' => '#363636',
				]
			],
		];
	}
}

if ( ! function_exists( 'zencommunity_activate_addon_on_plugin_activation' ) ) {
	function zencommunity_activate_addon_on_plugin_activation() : void {
		if ( empty( get_option( ZENCOMMUNITY_SETTINGS_NAME ) ) ) {
			update_option( ZENCOMMUNITY_SETTINGS_NAME, 
				json_encode( 
					apply_filters( 
						'zencommunity/settings/default', 
						array_merge( 
							[
								"name" => __( 'My Community', 'zencommunity' ),
								"path" => "/community",
								"load_on_entire_site" => false,
								"render_mode" => "spa",
								"community_visibility" => "guest",
								"guest_redirect_url" => "",
								"community_visibility_roles" => [],
								"feed" => [
									'is_title_required' => false,
									'default_sort_by' => 'created_at',
								],
								"can_see_all_members" => "guest",
								"can_see_others_groups_membership" => "guest",
								"allow_member_registration" => true,
								"override_wp_registration" => true,
								"login_page" => "zencommunity",
								"register_page" => "zencommunity",
								"registered_member_status" => "active",
								"post_char_limit" => 5000,
								"comment_char_limit" => 3000,
								"message_char_limit" => 3000,
								"notification_position" => 'top-right',
								"permitted_social_sites_for_link_sharing" => [
									'facebook',
									'x',
									'instagram',
									'linkedin',
								],
							], 
							zencommunity_default_theme_settings() 
						) 
					)
				) 
			);

			$GLOBALS['zencommunity_settings'] = json_decode( get_option( ZENCOMMUNITY_SETTINGS_NAME, '{}' ) );
			
			RewriteRules::add_rewrite_rules();
			flush_rewrite_rules();
		}
		
        $addon_manager = new AddonManager();
		$addons_to_activate = $addon_manager->get_pre_activated();
		foreach( $addons_to_activate as $addon_key => $path ) {
        	try {
				$addon_manager->activate_addon( $addon_key );
        	} catch ( Throwable $e ) {}
		}
	}
} 

if ( ! function_exists( 'zencommunity_configuration_check' ) ) {
	function zencommunity_configuration_check() : void {
		if ( empty( get_option( 'permalink_structure' ) ) ) {
			echo '<div class="notice notice-error"><p><strong>' . sprintf(
				/* translators: %s: "Permalink Settings" link */
				esc_html__( 'ZenCommunity: Please select a permalink structure other than "Plain" in %s.', 'zencommunity' ),
				'<a href="' . esc_url( admin_url( 'options-permalink.php' ) ) . '">' . esc_html__( 'Permalink Settings', 'zencommunity' ) . '</a>'
			) . '</strong></p></div>';
		}

		if ( empty( get_option( ZENCOMMUNITY_SETTINGS_NAME ) ) ) {
			$settings_url = admin_url( 'admin.php?page=zencommunity-settings' );
			echo '<div class="notice notice-error"><p>';
			echo '<strong>' . esc_html__( 'ZenCommunity is not properly configured.', 'zencommunity' ) . '</strong> ';
			echo sprintf(
				/* translators: %s: "ZenCommunity Settings" link */
				esc_html__( 'Please configure it from here: %s.', 'zencommunity' ),
				'<a href="' . esc_url( $settings_url ) . '">' . esc_html__( 'ZenCommunity Settings', 'zencommunity' ) . '</a>'
			);
			echo '</p></div>';
		}
	}
}

if ( ! function_exists( 'zencommunity_cleanup_primary_menu_legacy_items' ) ) {
	function zencommunity_cleanup_primary_menu_legacy_items() : void {
		if ( get_option( 'zencommunity_primary_menu_cleanup_v1' ) ) {
			return;
		}

		$all_menus = get_option( 'zencommunity_menu', [] );
		$items     = $all_menus['primary_menu']['items'] ?? [];
		$changed   = false;

		$items = array_values( array_filter( $items, function ( $item ) use ( &$changed ) {
			$label = strtolower( trim( $item['label'] ?? '' ) );
			if ( in_array( $label, [ 'follower', 'following' ], true ) ) {
				$changed = true;
				return false;
			}
			return true;
		} ) );

		foreach ( $items as &$item ) {
			$src = $item['icon']['src'] ?? '';
			if ( is_string( $src ) && false !== strpos( $src, '<svg' ) && 'svg' !== ( $item['icon']['type'] ?? '' ) ) {
				$item['icon']['type'] = 'svg';
				$changed              = true;
			}
		}
		unset( $item );

		if ( $changed && isset( $all_menus['primary_menu'] ) ) {
			$all_menus['primary_menu']['items'] = $items;
			update_option( 'zencommunity_menu', $all_menus );
		}

		update_option( 'zencommunity_primary_menu_cleanup_v1', true );
	}
}

if ( ! function_exists( 'zencommunity_suppress_other_admin_notices' ) ) {
	function zencommunity_suppress_other_admin_notices() : void {
		$screen = get_current_screen();
		if ( ! $screen || 'toplevel_page_zencommunity-settings' !== $screen->id ) {
			return;
		}

		remove_all_actions( 'admin_notices' );
		remove_all_actions( 'all_admin_notices' );
		add_action( 'admin_notices', 'zencommunity_configuration_check' );
	}
}

if ( ! function_exists( 'zencommunity_top_bar_link' ) ) {
	function zencommunity_top_bar_link( $wp_admin_bar ) : void {
		if ( ! is_admin() && ! is_user_logged_in() ) {
			return;
		}

		if ( empty( $settings_data = get_option( ZENCOMMUNITY_SETTINGS_NAME ) ) )
			return;

		if ( ! isset( $GLOBALS['zencommunity_settings'] ) ) 
			$GLOBALS['zencommunity_settings'] = json_decode( $settings_data );

		$wp_admin_bar->add_node( [
			'id'    => 'zenc_visit_community',
			'title' => __( 'Visit Community', 'zencommunity' ),
			'href'  => home_url( Helper::get_setting( 'path', '' ) ),
			'meta'  => [
				'target' => '_blank',
				'title'  => 'Visit the community area',
			],
			'parent' => 'site-name',
		] );
	}
} 

if ( ! function_exists( 'zencommunity_register_addon' ) ) {
	function zencommunity_register_addon( callable $register ) : void {
		$register( 'email', Email::class, true );
		$register( 'Migration', Migration::class, true );
		$register( 'AcademyLms', AcademyLms::class, false );
		$register( 'Gameengine', Gameengine::class, false );
		$register( 'Learndash', Learndash::class, true );
		$register( 'TutorLMS', TutorLMS::class, true );
		$register( 'LearnPress', LearnPress::class, true );
		$register( 'LifterLms', LifterLms::class, true );
		$register( 'Masterstudy', Masterstudy::class, true );

	}
} 

if ( ! function_exists( 'zencommunity_cleanup_uploads' ) ) {
	function zencommunity_cleanup_uploads () : void {
		$action_queue = \ZenCommunity\ActionQueue::get_instance();

		// Only schedule if not already scheduled
		if ( ! $action_queue->get_next( 'zencommunity_cleanup_uploads' ) ) {
			$action_queue->schedule_recurring(
				time(),                      // Start now
				15 * MINUTE_IN_SECONDS,      // Every 15 minutes
				'zencommunity_cleanup_uploads', // Hook name
				[],                          // Optional args
				'zencommunity'               // Group name
			);
		}
	}
}

/**
 * Send notification when a new feed (post) is created in a group.
 *
 * @param int   $id   Feed ID.
 * @param array $data Feed data containing user_id, group_id, title/content, etc.
 * 
 * @return void
 */
if ( ! function_exists( 'zencommunity_notification_feed_created' ) ) {
	function zencommunity_notification_feed_created( int $id, array $data ) : void {
		
		$to_member_ids = Profile::ins()->qb()
			->join( 'zenc_group_members', 'spm', 'spm.user_id = pf.user_id')
			->where( 'spm.group_id', '=', $data['group_id'] )->values('spm.user_id');

		// exclude sender id 
		$to_member_ids = array_diff( $to_member_ids, [ $data['user_id'] ] );

		if ( empty( $to_member_ids ) ) {
			return;
		}

		$user = Profile::ins()->qb()->select( [ 'pf.username', 'pf.first_name', 'pf.last_name' ] )
			->where( 'pf.user_id', '=', $data['user_id'] )
			->first();
		
		$group = Group::ins()->qb()->select( [ 's.name', 's.slug' ] )
			->where( 's.id', '=', $data['group_id'] )
			->first();

		if ( empty( $user ) || empty( $group )) {
			return;
		}
		// translators: %s is username, %s is group
		$template = __( '%1$s posted a new update in the "%2$s" group.', 'zencommunity' );

		$message = sprintf( $template, Helper::user_name( $user ), $group['name'] );

		$path = trim( (string) Helper::get_setting( 'path', '' ), '/' );
		$base = $path ? "/{$path}" : '';

		$meta_data = [];
		$excerpt = mb_substr( $data['title'] ?? $data['content'], 0, 150 );
		$meta_data['route']['feed'] =[
			'id'    => $data['id'],
			'title' => $excerpt,
			'slug'  => $data['slug'],
			'url'  => home_url( "{$base}/feed/" . $data['id']  ),
		];

		$meta_data['route']['group'] = [
			'id'    => $data['group_id'],
			'name' => $group['name'],
			'slug'  => $group['slug'],
			'url'  => home_url( "{$base}/group/" . $data['group_id']  ),
		];

		Notification::send( [
			'type'         => 'feed_posted', 
			'from_user_id' => $data['user_id'],
			'to_user_ids'  => $to_member_ids,
			'message'      => $message,
			'data'         => $meta_data,
			'group_id'     => $data['group_id'],
			'feed_id'      => $data['id']
		] );
	}
}

/**
 * Send a notification when a feed or comment is liked.
 *
 * @param int        $reaction_id Reaction ID.
 * @param int        $feed_id     Feed ID.
 * @param int        $user_id     User who liked.
 * @param int|null   $comment_id  Optional comment ID (if a comment was liked).
 * @param array      $feed        Feed data including title/content/user_id/group_id.
 *
 * @return void
 */
if ( ! function_exists( 'zencommunity_notification_like' ) ) {
	function zencommunity_notification_like( string $react_type, int $reaction_id, int $feed_id, int $user_id, ?int $comment_id, array $feed ) : void {
		
		$type = empty( $comment_id ) ? 'feed_liked' : 'comment_liked';
		$object_type = empty( $comment_id ) ? 'feed' : 'comment';

		$user = Profile::ins()->qb()->select( [ 'pf.username', 'pf.first_name', 'pf.last_name' ] )
			->where( 'pf.user_id', '=', $feed['user_id'] )
			->first();

		if ( empty( $user ) ) {
			return;
		}

		$meta_data = [];

		if( 'feed' === $object_type ) {
			
			if ( absint( $feed['user_id'] ) === $user_id )
				return;
			
			$group = Group::ins()->qb()->select( [ 's.name', 's.slug' ] )
				->where( 's.id', '=', $feed['group_id'] )
				->first();

			if ( empty( $group )) {
				return;
			}

			// translators: %s is post, %s is username, %s is group
			$template = __( 'Your post "%1$s" was  "%2$s" reacted by %3$s in the %4$s group!.', 'zencommunity' );
			$excerpt = mb_substr( $feed['title'] ?? $feed['content'], 0, 150 );
			$message = sprintf( $template, $excerpt, $react_type, Helper::user_name( $user ), $group['name'] ); 
			
			$meta_data['route']['feed'] = [
				'id'    => $feed['id'],
				'title' => $excerpt,
				'slug'  => $feed['slug'],
			];
		}
		else {
			$comment = Feed::get_comment( $comment_id );

			if( empty( $comment ) )
				return;

			if ( absint( $comment['user_id'] ) === $user_id )
				return;

			// translators: %s is post, %s is username
			$template = __( 'Your comment on "%1$s" was "%2$s" reacted by %3$s!', 'zencommunity' );
			// $comment_excerpt = mb_substr( $comment['content'], 0, 150 );
			$feed_excerpt = mb_substr( $feed['title'] ?? $feed['content'], 0, 150 );
			$message = sprintf( $template, $feed_excerpt, $react_type, Helper::user_name( $user ) );
			
			$meta_data['route']['feed'] = [
				'id'    => $feed['id'],
				'title' => $feed_excerpt,
				'slug'  => $feed['slug'],
			];
			$meta_data['route']['comment'] = $comment;
		}


		Notification::send( [
			'type'         => $type,
			'from_user_id' => $user_id,
			'to_user_ids'  => [ $feed['user_id'] ],
			'message'      => $message,
			'data'         => $meta_data,
			'group_id'     => $feed['group_id'],
			'feed_id'      => $feed_id,
			'object_id'    => $reaction_id,
			'object_type'  => $object_type,
		] );
	}
} 



/**
 * Send a notification when a user comments or replies to a feed/comment.
 *
 * @param int        $new_comment_id ID of the new comment or reply.
 * @param int        $feed_id        ID of the parent feed.
 * @param int        $user_id        ID of the user making the comment/reply.
 * @param int|null   $comment_id     ID of the parent comment (null if it's a comment on feed).
 * @param array      $feed           Feed data.
 *
 * @return void
 */
if ( ! function_exists( 'zencommunity_notification_comment' ) ) {
	function zencommunity_notification_comment( int $new_comment_id, int $feed_id, int $user_id, ?int $comment_id, array $feed, ?array $comment  ) : void {
		global $zencommunity_settings;

		$type = empty( $comment_id ) ? 'feed_comment' : 'comment_reply';
		$object_type = empty( $comment_id ) ? 'comment' : 'reply';
		$to_user_id = empty( $comment_id ) ? $feed['user_id'] : ( Feed::get_comment( $comment_id, [ 'cm.user_id' ] )['user_id'] ?? null );

		if ( empty( $to_user_id ) )
			return;

		$user = Profile::ins()->qb()->select( [ 'pf.username', 'pf.first_name', 'pf.last_name' ] )
			->where( 'pf.user_id', '=', $feed['user_id'] )
			->first();
			
		if ( empty( $user ) )
			return;
		
		// $comment_excerpt = mb_substr( $comment['content'], 0, 150 );
		$feed_excerpt = mb_substr( $feed['title'] ?? $feed['content'], 0, 150 );
		
		if ( absint( $to_user_id ) === $user_id )
			return;

		if( empty( $comment ) )
			return;

		if ( 'comment' === $object_type ) {
			// check notification is off or not
			if ( false === boolval( $zencommunity_settings->notification->comments ?? true ) ) {
				return;
			}

			// translators: %s is post, %s is post, %s is username
			$template     = __( 'New comment on your post "%1$s" by %2$s!', 'zencommunity' );
			$message      = sprintf( $template, $feed_excerpt, Helper::user_name( $user )  );

		}
		else {
			// check notification is off or not
			if ( false === boolval( $zencommunity_settings->notification->comments ?? true ) ) {
				return;
			}

			// translators: %s is username, %s is post
			$template     = __( '%1$s has replied to your comment on "%2$s"', 'zencommunity' );
			$message      = sprintf( $template, Helper::user_name( $user ), $feed_excerpt );
		}

		$meta_data['route']['feed'] = [
			'id'    => $feed['id'],
			'title' => $feed_excerpt,
			'slug'  => $feed['slug'],
			'url'  => home_url( "feed/" . $feed['id']  ),
		];
		$meta_data['route']['comment'] = $comment;
		$meta_data['route']['comment']['url'] = $meta_data['route']['feed']['url'] . '?comment=' . $comment['id'];

		Notification::send( [
			'type'         => $type,
			'from_user_id' => $user_id,
			'to_user_ids'  => [ $to_user_id ],
			'message'      => $message,
			'data'         => $meta_data,
			'group_id'     => $feed['group_id'],
			'feed_id'      => $feed_id,
			'object_id'    => $new_comment_id,
			'object_type'  => $object_type,
		] );

	}
} 

/**
 * Send a notification to users mentioned in a feed.
 *
 * @param int   $feed_id          ID of the feed.
 * @param array $newly_mentioned  List of newly mentioned usernames.
 *
 * @return void
 */
if ( ! function_exists( 'zencommunity_notification_mentioned_on_feed' ) ) {
	function zencommunity_notification_mentioned_on_feed( int $feed_id, array $newly_mentioned, ?string $content ) : void {
		
		global $zencommunity_settings;
		// check notification is off or not
		if ( false === boolval( $zencommunity_settings->notification->mentions ?? true ) ) {
			return;
		}
		
		$feed = Feed::ins()->qb()
			->select( [ 'fd.id', 'fd.slug', 'fd.title', 'fd.content', 'fd.user_id', 'fd.group_id' ] )
			->where( 'fd.id', '=', $feed_id )
			->first();
			
		if ( empty( $feed ) ) {
			return;
		}

		$newly_mentioned_ids = Profile::ins()->qb()
			->where_in( 'pf.username', $newly_mentioned )
			->values('pf.user_id');

		// exclude sender id 
		$to_member_ids = array_diff( $newly_mentioned_ids, [ $feed['user_id'] ] );
		if ( empty( $to_member_ids ) ) {
			return;
		}

		$user = Profile::ins()->qb()->select( [ 'pf.id', 'pf.avatar_url', 'pf.first_name','pf.last_name', 'pf.username' ] )
			->where( 'pf.user_id', '=', $feed['user_id'] )
			->first();
		
		$group = Group::ins()->qb()->select( [ 's.name', 's.id', 's.slug' ] )
			->where( 's.id', '=', $feed['group_id'] )
			->first();

		if ( empty( $user ) || empty( $group )) {
			return;
		}

		$excerpt = mb_substr( $feed['title'] ?? $content, 0, 100 );
		$content = mb_substr( $content, 0, 150 );
		// translators: %s is post, %s is username, %s is group
		$template = __( 'You were mentioned in a post titled "%1$s" by %2$s in the %3$s group.', 'zencommunity' );

		$message = sprintf( $template, $excerpt, Helper::user_name( $user ), $group['name'] );

		$meta_data = [];
		$meta_data['route']['feed'] = [
			'id'    => $feed['id'],
			'title' => $excerpt,
			'content' => $content,
			'slug'  => $feed['slug'],
			'url'  => home_url( "feed/" . $feed['id']  ),
		];

		$meta_data['route']['group'] = $group;
		$meta_data['route']['user'] = $user;


		Notification::send( [
			'type'         => 'mentioned_in_feed', 
			'from_user_id' => $feed['user_id'],
			'to_user_ids'  => $to_member_ids,
			'message'      => $message,
			'data'         => $meta_data,
			'group_id'     => $feed['group_id'],
			'feed_id'      => $feed['id']
		] );
	}
}



/**
 * Send a notification to users mentioned in a comment.
 *
 * @param int   $comment_id       ID of the comment.
 * @param array $newly_mentioned  List of newly mentioned usernames.
 *
 * @return void
 */
if ( ! function_exists( 'zencommunity_notification_mentioned_on_comment' ) ) {
	function zencommunity_notification_mentioned_on_comment( int $comment_id, array $newly_mentioned, ?string $content, ?string $rendered ) : void {

		global $zencommunity_settings;
		// check notification is off or not
		if ( false === boolval( $zencommunity_settings->notification->mentions ?? true ) ) {
			return;
		}

		$comment = Feed::get_comment( $comment_id );
		if ( empty( $comment ) ) {
			return;
		}
		$comment['content'] = $content;
		$comment['rendered'] = $rendered;

		$newly_mentioned_ids = Profile::ins()->qb()
			->where_in( 'pf.username', $newly_mentioned )
			->values('pf.user_id');

		// exclude sender id 
		$to_member_ids = array_diff( $newly_mentioned_ids, [ $comment['user_id'] ] );
		if ( empty( $to_member_ids ) ) {
			return;
		}

		$user = Profile::ins()->qb()->select( [ 'pf.id', 'pf.avatar_url', 'pf.first_name','pf.last_name', 'pf.username' ] )
			->where( 'pf.user_id', '=', $comment['user_id'] )
			->first();
		
		$feed = Feed::ins()->qb()
			->select( [ 'fd.id', 'fd.slug', 'fd.title', 'fd.content', 'fd.user_id', 'fd.group_id' ] )
			->where( 'fd.id', '=', $comment['feed_id'] )
			->first();

		if ( empty( $user ) || empty( $feed )) {
			return;
		}

		$excerpt = mb_substr( $feed['title'] ?? $feed['content'], 0, 150 );
		// translators: %s is username, %s is post
		$template = __( 'You were mentioned in a comment by %1$s on the post "%2$s"!', 'zencommunity' );

		$message = sprintf( $template, Helper::user_name( $user ), $excerpt );

		$meta_data = [];
		$meta_data['route']['feed'] = [
			'id'    => $feed['id'],
			'title' => $excerpt,
			'slug'  => $feed['slug'],
			'url'  => home_url( "feed/" . $feed['id']  ),
		];

		$meta_data['route']['comment'] = $comment;
		$meta_data['route']['comment']['url'] = $meta_data['route']['feed']['url'] . '?comment=' . $comment['id'];
		$meta_data['route']['user'] = $user;


		Notification::send( [
			'type'         => 'mentioned_in_comment', 
			'from_user_id' => $feed['user_id'],
			'to_user_ids'  => $to_member_ids,
			'message'      => $message,
			'data'         => $meta_data,
			'group_id'     => $feed['group_id'],
			'feed_id'      => $feed['id'],
			'object_id'    => $comment['id'],
			'object_typoe' => 'comment'
		] );
	}
}


/**
 * Send a notification to a user when they are added to a group.
 *
 * @param int   $group_id ID of the group.
 * @param array $data     Array with user_id and role.
 *
 * @return void
 */
if ( ! function_exists( 'zencommunity_notification_member_added' ) ) {
	function zencommunity_notification_member_added( int $group_id, array $data ) : void {
		$meta_data = [];
		$meta_data['user'] = Profile::ins()->qb()->select( [ 'pf.id', 'pf.avatar_url', 'pf.first_name','pf.last_name', 'pf.username' ] )
			->where( 'pf.user_id', '=', $data['user_id'] )
			->first();

		$meta_data['group'] = Group::ins()->qb()->select( [ 's.id','s.slug', 's.name', 's.created_by' ] )
			->where( 's.id', '=', $group_id )
			->first();

		// A "pending" membership is a join request awaiting approval (private /
		// approval-required groups). The requester isn't a member yet, so notify
		// the people who can approve it — the group's admins — instead of telling
		// the requester they were "added". Without this, admins never learn a
		// request came in.
		if ( 'pending' === ( $data['status'] ?? '' ) ) {
			$admin_ids = QueryBuilder::ins()->from( 'zenc_group_members', 'spm' )
				->where( 'spm.group_id', '=', $group_id )
				->where( 'spm.role', '=', 'admin' )
				->where( 'spm.status', '=', 'active' )
				->values( 'spm.user_id' );

			// The group creator is the fallback approver if no admin membership row
			// exists (e.g. legacy groups where the owner wasn't stored as a member).
			if ( ! empty( $meta_data['group']['created_by'] ) ) {
				$admin_ids[] = (int) $meta_data['group']['created_by'];
			}

			$admin_ids = array_values( array_diff(
				array_unique( array_filter( array_map( 'intval', (array) $admin_ids ) ) ),
				[ (int) $data['user_id'] ] // never notify the requester about their own request
			) );

			if ( empty( $admin_ids ) ) {
				return;
			}

			$requester = trim( sprintf(
				'%s %s',
				$meta_data['user']['first_name'] ?? '',
				$meta_data['user']['last_name'] ?? ''
			) );
			if ( '' === $requester ) {
				$requester = $meta_data['user']['username'] ?? __( 'Someone', 'zencommunity' );
			}

			// translators: %1$s is the requesting member's name, %2$s is the group name.
			$template = __( '%1$s requested to join "%2$s"', 'zencommunity' );
			$message  = sprintf( $template, $requester, $meta_data['group']['name'] ?? '' );

			Notification::send( [
				'type'         => 'group_join_request',
				'from_user_id' => $data['user_id'],
				'to_user_ids'  => $admin_ids,
				'message'      => $message,
				'data'         => $meta_data,
				'group_id'     => $group_id
			] );
			return;
		}

		// translators: %s is group, %s is role
		$template     = __( 'You are added on "%1$s" group as %2$s!', 'zencommunity' );
		$message      = sprintf( $template, $meta_data['group']['name'] ?? '', $data['role'] );
		Notification::send( [
			'type'         => 'user_added_in_group',
			'from_user_id' => null,
			'to_user_ids'  => [ $data['user_id'] ],
			'message'      => $message,
			'data'         => $meta_data,
			'group_id'     => $group_id
		] );
	}
}

/**
 * Send a notification when a member's role in a group is changed.
 *
 * @param int    $group_id ID of the group.
 * @param int    $user_id  ID of the user whose role changed.
 * @param string $role     New role name.
 *
 * @return void
 */
if ( ! function_exists( 'zencommunity_notification_member_role_changed' ) ) {
	function zencommunity_notification_member_role_changed( int $group_id, int $user_id, string $role ) : void {
		$meta_data = [];
		$meta_data['user'] = Profile::ins()->qb()->select( [ 'pf.id', 'pf.avatar_url', 'pf.first_name','pf.last_name', 'pf.username' ] )
			->where( 'pf.user_id', '=', $user_id )
			->first();

		$meta_data['group'] = Group::ins()->qb()->select( [ 's.id','s.slug', 's.name' ] )
			->where( 's.id', '=', $group_id )
			->first();

		// translators: %s is group, %s is role
		$template     = __( 'Your role is changed to %1$s at %2$s group', 'zencommunity' );
		$message      = sprintf( $template, $role, $meta_data['group']['name'] ?? '' );
		Notification::send( [
			'type'         => 'user_role_changed_in_group', 
			'from_user_id' => null,
			'to_user_ids'  => [ $user_id ],
			'message'      => $message,
			'data'         => $meta_data,
			'group_id'     => $group_id
		] );
	}
}



/**
 * Add Activity when a new feed (post) is created in a group.
 *
 * @param int   $id   Feed ID.
 * @param array $data Feed data containing user_id, group_id, title/content, etc.
 * 
 * @return void
 */
if ( ! function_exists( 'zencommunity_activity_feed_created' ) ) {
	function zencommunity_activity_feed_created( int $id, array $data ) : void {
		

		$user = Profile::ins()->qb()
			->select( [ 'pf.username', 'pf.first_name', 'pf.last_name', 'pf.avatar_url',  ] )
			->where( 'pf.user_id', '=', $data['user_id'] )
			->first();
		
		$group = Group::ins()->qb()->select( [ 's.name', 's.slug', 's.privacy' ] )
			->where( 's.id', '=', $data['group_id'] )
			->first();

		if ( empty( $user ) || empty( $group )) {
			return;
		}


		$excerpt = mb_substr( $data['title'] ?? $data['content'], 0, 150 );
		// translators: %s is username, %s is group
		$template = __( ' %1$s has posted a new feed in the %2$s group.', 'zencommunity' );
		$message = sprintf( $template, Helper::user_name( $user ), $group['name'] );

		$meta_data = [];
		$meta_data['message'] = $message;
		$meta_data['route']['user'] = [
			'id'         => $data['user_id'],
			'first_name' => $user['first_name'],
			'last_name'  => $user['last_name'],
			'username'   => $user['username'],
			'avatar_url' => $user['avatar_url'],
		];
		
		$meta_data['route']['feed'] = [
			'id'    => $data['id'],
			'title' => $excerpt,
			'slug'  => $data['slug'],
		];

		$meta_data['route']['group'] = [
			'id'    => $data['group_id'],
			'name' => $group['name'],
			'slug'  => $group['slug'],
		];

		$is_public = 'public' === $group['privacy'];

		Activity::add( [
			'type'         => 'feed_posted', 
			'user_id'      => (int) $data['user_id'],
			'data'         => $meta_data,
			'group_id'     => $data['group_id'],
			'feed_id'      => $data['id']
		], $is_public );
	}
}

/**
 * add  Activity when a user comments or replies to a feed/comment.
 *
 * @param int        $new_comment_id ID of the new comment or reply.
 * @param int        $feed_id        ID of the parent feed.
 * @param int        $user_id        ID of the user making the comment/reply.
 * @param int|null   $comment_id     ID of the parent comment (null if it's a comment on feed).
 * @param array      $feed           Feed data.
 *
 * @return void
 */
if ( ! function_exists( 'zencommunity_activity_comment' ) ) {
	function zencommunity_activity_comment( int $new_comment_id, int $feed_id, int $user_id, ?int $comment_id, array $feed ) : void {

		$type = empty( $comment_id ) ? 'feed_comment' : 'comment_reply';
		$object_type = empty( $comment_id ) ? 'comment' : 'reply';


		$user = Profile::ins()->qb()->select( [ 'pf.username', 'pf.first_name', 'pf.last_name', 'pf.avatar_url',  ] )
			->where( 'pf.user_id', '=', $user_id )
			->first();
			
		$group = Group::ins()->qb()->select( [ 's.privacy' ] )
			->where( 's.id', '=', $feed['group_id'] )
			->first();

		if ( empty( $user ) ||  empty( $group ) )
			return;
		

		$comment = Feed::get_comment( $new_comment_id );
		// $comment_excerpt = mb_substr( $comment['content'], 0, 150 );
		$feed_excerpt = mb_substr( $feed['title'] ?? $feed['content'], 0, 150 );
		
		if( empty( $comment ) )
			return;

		if ( 'comment' === $object_type ) {
				
			// translators: %1$s is username, %2$s is comment
			$template             = __( '%1$s commented on \'%2$s\'', 'zencommunity' );
			$meta_data['message'] = sprintf( $template, Helper::user_name( $user ), $feed_excerpt );
			
		}
		else {

			$parent_comment = Feed::get_comment( $comment_id );
			// translators: %1$s is username, %2$s is comment
			$template     = __( '%1$s has replied on "%2$s"', 'zencommunity' );
			$comment_excerpt = mb_substr( $parent_comment['content'], 0, 150 );
			$meta_data['message'] = sprintf( $template, Helper::user_name( $user ), $comment_excerpt );
			$meta_data['route']['parent_comment'] = $parent_comment;
		}

		$meta_data['route']['feed'] = [
			'id'    => $feed['id'],
			'title' => $feed_excerpt,
			'slug'  => $feed['slug'],
		];
		$meta_data['route']['comment'] = $comment;
		$meta_data['route']['user'] = $user;

		$is_public = 'public' === $group['privacy'];

		Activity::add( [
			'type'         => $type, 
			'user_id'      => (int) $user_id,
			'data'         => $meta_data,
			'group_id'     => $feed['group_id'],
			'feed_id'      => $feed['id'],
			'object_id'    => $new_comment_id,
			'object_type'  => 'comment',
		], $is_public );

	}
} 


if ( ! function_exists( 'zencommunity_remove_feed_activity' ) ) {
	function zencommunity_remove_feed_activity( int $feed_id, array $feed ) : void {
		Activity::ins()->qb()->where( 'act.feed_id', '=', $feed_id )->delete();
	}
} 

if ( ! function_exists( 'zencommunity_remove_comment_activity' ) ) {
	function zencommunity_remove_comment_activity( int $comment_id, int $feed_id, int $user_id, array $child_ids ) : void {
		// if comment has reply, then delete
		if ( ! empty( $child_ids ) ) {
			Activity::ins()->qb()
				->where( 'act.feed_id', '=', $feed_id )
				->where_in( 'act.object_id', $child_ids )
				->delete();
		}

		Activity::ins()->qb()
			->where( 'act.feed_id', '=', $feed_id )
			->where( 'act.object_id', '=', $comment_id )
			->delete();
			
	}
} 

if ( ! function_exists( 'zencommunity_remove_group_activity' ) ) {
	function zencommunity_remove_group_activity( int $group_id ) : void {
		Activity::ins()->qb()
			->where( 'act.group_id', '=', $group_id )
			->delete();
			
	}
} 

if ( ! function_exists( 'zencommunity_remove_category_activity' ) ) {
	function zencommunity_remove_category_activity( int $category_id ) : void {
		$group_ids = Group::ins()->qb()->where( 's.category_id', '=', $category_id )->values( 's.id' );
		Activity::ins()->qb()
			->where_in( 'act.group_id', $group_ids )
			->delete();
			
	}
} 

if ( ! function_exists( 'zencommunity_publish_scheduled_post' ) ) {
	function zencommunity_publish_scheduled_post( int $feed_id ) : void {
		try {
			Feed::update( $feed_id, [
				'status' => 'published',
			] );
		}
		catch( Throwable $e ){
			// error_log($e->getMessage());
		}
	}
}

if ( ! function_exists( 'zencommunity_expire_member_suspension' ) ) {
	function zencommunity_expire_member_suspension( int $group_id, int $user_id, int $action_id ) : void {
		try {
			Group_Member_Action::expire_suspension( $group_id, $user_id, $action_id );
		}
		catch( Throwable $e ){
			// error_log($e->getMessage());
		}
	}
}

if ( ! function_exists( 'zencommunity_notification_feed_pending' ) ) {
	function zencommunity_notification_feed_pending( int $feed_id, array $data ) : void {
		$group_id = absint( $data['group_id'] ?? 0 );
		if ( ! $group_id ) return;

		$admin_ids = Profile::ins()->qb()
			->join( 'zenc_group_members', 'spm', 'spm.user_id = pf.user_id' )
			->where( 'spm.group_id', '=', $group_id )
			->where_in( 'spm.role', [ 'admin', 'moderator' ] )
			->where( 'spm.status', '=', 'active' )
			->values( 'spm.user_id' );

		$admin_ids = array_diff( $admin_ids, [ $data['user_id'] ] );
		if ( empty( $admin_ids ) ) return;

		$author = Profile::ins()->qb()
			->select( [ 'pf.username', 'pf.first_name', 'pf.last_name' ] )
			->where( 'pf.user_id', '=', $data['user_id'] )
			->first();
		$group = Group::ins()->qb()
			->select( [ 's.name' ] )
			->where( 's.id', '=', $group_id )
			->first();
		if ( empty( $author ) || empty( $group ) ) return;

		$message = sprintf(
			/* translators: %1$s author name, %2$s group name */
			__( '%1$s submitted a post for approval in %2$s', 'zencommunity' ),
			Helper::user_name( $author ),
			$group['name']
		);

		Notification::send( [
			'type'         => 'post_pending_approval',
			'from_user_id' => $data['user_id'],
			'to_user_ids'  => $admin_ids,
			'message'      => $message,
			'data'         => [ 'feed_id' => $feed_id ],
			'group_id'     => $group_id,
			'feed_id'      => $feed_id,
		] );
	}
}

if ( ! function_exists( 'zencommunity_notification_feed_approved' ) ) {
	function zencommunity_notification_feed_approved( int $feed_id, array $data ) : void {
		$group_id  = absint( $data['group_id'] ?? 0 );
		$author_id = absint( $data['user_id'] ?? 0 );
		if ( ! $author_id ) return;

		$group = Group::ins()->qb()
			->select( [ 's.name' ] )
			->where( 's.id', '=', $group_id )
			->first();
		if ( empty( $group ) ) return;

		$message = sprintf(
			/* translators: %s group name */
			__( 'Your post in %s was approved', 'zencommunity' ),
			$group['name']
		);

		Notification::send( [
			'type'         => 'post_approved',
			'from_user_id' => get_current_user_id(),
			'to_user_ids'  => [ $author_id ],
			'message'      => $message,
			'data'         => [ 'feed_id' => $feed_id ],
			'group_id'     => $group_id,
			'feed_id'      => $feed_id,
		] );
	}
}

if ( ! function_exists( 'zencommunity_notification_feed_rejected' ) ) {
	function zencommunity_notification_feed_rejected( int $feed_id, array $data ) : void {
		$group_id  = absint( $data['group_id'] ?? 0 );
		$author_id = absint( $data['user_id'] ?? 0 );
		if ( ! $author_id ) return;

		$group = Group::ins()->qb()
			->select( [ 's.name' ] )
			->where( 's.id', '=', $group_id )
			->first();
		if ( empty( $group ) ) return;

		$message = sprintf(
			/* translators: %s group name */
			__( 'Your post in %s was not approved', 'zencommunity' ),
			$group['name']
		);

		Notification::send( [
			'type'         => 'post_rejected',
			'from_user_id' => get_current_user_id(),
			'to_user_ids'  => [ $author_id ],
			'message'      => $message,
			'data'         => [ 'feed_id' => $feed_id ],
			'group_id'     => $group_id,
			'feed_id'      => $feed_id,
		] );
	}
}

if ( ! function_exists( 'zencommunity_create_event_feed_post' ) ) {
	function zencommunity_create_event_feed_post( int $event_id, int $group_id, array $data ) : void {
		try {
			\ZenCommunity\Database\Models\Feed::create( $group_id, [
				'type'    => 'event',
				'status'  => 'published',
				'content' => '',
				'title'   => sanitize_text_field( $data['title'] ?? '' ),
				'meta'    => [ 'event_id' => $event_id ],
			] );
		} catch ( \Exception $e ) {
			// Non-fatal: event was created successfully; feed post is best-effort.
		}
	}
}

if ( ! function_exists( 'zencommunity_notification_event_created' ) ) {
	function zencommunity_notification_event_created( int $event_id, int $group_id, array $data ) : void {
		$creator_id = get_current_user_id();
		if ( ! $group_id ) return;

		$member_ids = Profile::ins()->qb()
			->join( 'zenc_group_members', 'spm', 'spm.user_id = pf.user_id' )
			->where( 'spm.group_id', '=', $group_id )
			->where( 'spm.status', '=', 'active' )
			->values( 'spm.user_id' );

		$member_ids = array_diff( $member_ids, [ $creator_id ] );
		if ( empty( $member_ids ) ) return;

		$creator = Profile::ins()->qb()
			->select( [ 'pf.username', 'pf.first_name', 'pf.last_name' ] )
			->where( 'pf.user_id', '=', $creator_id )
			->first();
		$group = Group::ins()->qb()
			->select( [ 's.name' ] )
			->where( 's.id', '=', $group_id )
			->first();

		if ( empty( $creator ) || empty( $group ) ) return;

		$message = sprintf(
			/* translators: %1$s creator name, %2$s group name, %3$s event title */
			__( '%1$s created a new event in %2$s: %3$s', 'zencommunity' ),
			Helper::user_name( $creator ),
			$group['name'],
			sanitize_text_field( $data['title'] ?? '' )
		);

		Notification::send( [
			'type'         => 'event_created',
			'from_user_id' => $creator_id,
			'to_user_ids'  => array_values( $member_ids ),
			'message'      => $message,
			'data'         => [ 'event_id' => $event_id ],
			'group_id'     => $group_id,
		] );
	}
}

/**
 * Per-user notification preferences.
 *
 * Members can opt out of categories of in-app notifications. Stored in user
 * meta `zenc_notification_prefs` as a map of category => bool. Unset categories
 * default to enabled, so existing users keep getting everything until they opt
 * out.
 */
if ( ! function_exists( 'zencommunity_notification_pref_categories' ) ) {
	function zencommunity_notification_pref_categories() : array {
		return apply_filters( 'zencommunity/notification/pref_categories', [
			'posts'     => __( 'New posts in your groups', 'zencommunity' ),
			'comments'  => __( 'Comments & replies on your content', 'zencommunity' ),
			'mentions'  => __( 'Mentions', 'zencommunity' ),
			'reactions' => __( 'Reactions to your posts & comments', 'zencommunity' ),
			'groups'    => __( 'Group activity (invites, role changes)', 'zencommunity' ),
			'tickets'   => __( 'Support ticket updates', 'zencommunity' ),
			'messages'  => __( 'Direct & group messages', 'zencommunity' ),
		] );
	}
}

if ( ! function_exists( 'zencommunity_default_notification_prefs' ) ) {
	function zencommunity_default_notification_prefs() : array {
		return array_fill_keys( array_keys( zencommunity_notification_pref_categories() ), true );
	}
}

if ( ! function_exists( 'zencommunity_get_user_notification_prefs' ) ) {
	function zencommunity_get_user_notification_prefs( int $user_id ) : array {
		$stored = get_user_meta( $user_id, 'zenc_notification_prefs', true );
		$stored = is_array( $stored ) ? $stored : [];
		// Merge so newly-added categories default to enabled.
		return array_merge( zencommunity_default_notification_prefs(), $stored );
	}
}

if ( ! function_exists( 'zencommunity_notification_category' ) ) {
	/**
	 * Map a raw notification `type` string to a preference category.
	 * Substring matching keeps this robust to the many exact type strings.
	 */
	function zencommunity_notification_category( string $type ) : ?string {
		$type = strtolower( $type );
		if ( strpos( $type, 'mention' ) !== false )                                   return 'mentions';
		if ( strpos( $type, 'react' ) !== false )                                     return 'reactions';
		if ( strpos( $type, 'group' ) !== false )                                     return 'groups';
		if ( strpos( $type, 'ticket' ) !== false )                                    return 'tickets';
		if ( strpos( $type, 'message' ) !== false || strpos( $type, 'chat' ) !== false ) return 'messages';
		if ( strpos( $type, 'comment' ) !== false || strpos( $type, 'reply' ) !== false ) return 'comments';
		if ( $type === 'feed_posted' )                                                return 'posts';
		return null; // Unmapped types are always delivered.
	}
}

if ( ! function_exists( 'zencommunity_user_allows_notification' ) ) {
	function zencommunity_user_allows_notification( int $user_id, string $type ) : bool {
		$category = zencommunity_notification_category( $type );
		if ( is_null( $category ) ) {
			return true;
		}
		$prefs = zencommunity_get_user_notification_prefs( $user_id );
		return false !== ( $prefs[ $category ] ?? true );
	}
}

/**
 * Resolve the in-app SPA path a notification should deep-link to, from the
 * data already stored on the notification row (top-level group_id/feed_id
 * columns, falling back to the various shapes callers stuff into `meta`).
 * Used to build the "View" link on notification emails and the digest.
 */
if ( ! function_exists( 'zencommunity_notification_target_path' ) ) {
	function zencommunity_notification_target_path( array $event_data ) : string {
		$meta     = is_array( $event_data['meta'] ?? null ) ? $event_data['meta'] : [];
		$route    = is_array( $meta['route'] ?? null ) ? $meta['route'] : [];

		$feed_id  = absint( $event_data['feed_id']  ?? ( $route['feed']['id']  ?? ( $meta['feed']['id']  ?? 0 ) ) );
		$group_id = absint( $event_data['group_id'] ?? ( $route['group']['id'] ?? ( $meta['group']['id'] ?? 0 ) ) );

		$path = apply_filters( 'zencommunity/notification/target_path', null, $event_data );
		if ( is_string( $path ) && '' !== $path ) {
			return $path;
		}

		if ( $feed_id ) {
			return '/feed/' . $feed_id;
		}
		if ( $group_id ) {
			return '/group/' . $group_id;
		}
		return '/notifications';
	}
}

/**
 * Per-user email digest frequency.
 *
 * Members can have notification emails batched instead of sent one-by-one.
 * Stored in user meta `zenc_email_digest_frequency`; unset defaults to
 * `instant` so existing users keep getting today's behavior.
 */
if ( ! function_exists( 'zencommunity_email_digest_frequencies' ) ) {
	function zencommunity_email_digest_frequencies() : array {
		return apply_filters( 'zencommunity/email/digest_frequencies', [
			'instant' => __( 'Send right away', 'zencommunity' ),
			'daily'   => __( 'Daily digest', 'zencommunity' ),
			'weekly'  => __( 'Weekly digest', 'zencommunity' ),
		] );
	}
}

if ( ! function_exists( 'zencommunity_get_user_email_digest_frequency' ) ) {
	function zencommunity_get_user_email_digest_frequency( int $user_id ) : string {
		$frequency = get_user_meta( $user_id, 'zenc_email_digest_frequency', true );
		return array_key_exists( $frequency, zencommunity_email_digest_frequencies() ) ? $frequency : 'instant';
	}
}
if ( ! function_exists( 'zencommunity_evaluate_badges_for_user' ) ) {
	/**
	 * Re-checks every rule-based badge (role/group/profile-field conditions,
	 * configured on the Badges settings screen) against one member and
	 * auto-assigns whichever now match. Wrapped in try/catch because badge
	 * evaluation must never break the action that triggered it (login,
	 * publishing a post, updating a profile, joining a group).
	 */
	function zencommunity_evaluate_badges_for_user( int $user_id ) : void {
		if ( ! $user_id ) {
			return;
		}
		try {
			Badge::evaluate_for_user( $user_id );
		} catch ( \Throwable $e ) {
			// Auto-assignment is a best-effort side effect; swallow and move on.
		}
	}
}

if ( ! function_exists( 'zencommunity_evaluate_badges_on_login' ) ) {
	function zencommunity_evaluate_badges_on_login( string $user_login, \WP_User $user ) : void {
		zencommunity_evaluate_badges_for_user( (int) $user->ID );
	}
}

if ( ! function_exists( 'zencommunity_evaluate_badges_on_feed_created' ) ) {
	function zencommunity_evaluate_badges_on_feed_created( int $id, array $data ) : void {
		zencommunity_evaluate_badges_for_user( absint( $data['user_id'] ?? 0 ) );
	}
}

if ( ! function_exists( 'zencommunity_evaluate_badges_on_profile_saved' ) ) {
	function zencommunity_evaluate_badges_on_profile_saved( $id, array $data ) : void {
		zencommunity_evaluate_badges_for_user( absint( $data['user_id'] ?? $id ) );
	}
}

if ( ! function_exists( 'zencommunity_evaluate_badges_on_group_joined' ) ) {
	function zencommunity_evaluate_badges_on_group_joined( int $group_id, array $data ) : void {
		zencommunity_evaluate_badges_for_user( absint( $data['user_id'] ?? 0 ) );
	}
}

/**
 * Keep the background-job retry sweep scheduled.
 *
 * Five minutes is deliberately unhurried: the jobs being retried failed once
 * already, usually because a provider was briefly unavailable, and retrying
 * sooner mostly repeats the failure.
 */
function zencommunity_schedule_bg_process_retries() : void {
	if ( ! wp_next_scheduled( 'zencommunity_bg_process_retry' ) ) {
		wp_schedule_event( time() + 300, 'zencommunity_five_minutes', 'zencommunity_bg_process_retry' );
	}
}

add_filter( 'cron_schedules', function ( array $schedules ) : array {
	if ( ! isset( $schedules['zencommunity_five_minutes'] ) ) {
		$schedules['zencommunity_five_minutes'] = [
			'interval' => 300,
			'display'  => __( 'Every five minutes (ZenCommunity)', 'zencommunity' ),
		];
	}
	return $schedules;
} );
