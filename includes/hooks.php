<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
add_action( 'admin_bar_menu', 'zencommunity_top_bar_link', 999 );
// Finishes a guest/visitor account claim once its owner sets a password via the emailed link.
add_action( 'after_password_reset', [ \ZenCommunity\Api\Auth::class, 'finalize_claim' ] );

add_action( 'admin_notices', 'zencommunity_configuration_check' );

add_action( 'current_screen', 'zencommunity_suppress_other_admin_notices' );

add_action( 'admin_init', 'zencommunity_cleanup_primary_menu_legacy_items' );

/**
 * Register addon 
 * @param calllable $register
 */
add_action( 'zencommunity/addon/register', 'zencommunity_register_addon' );

add_action( 'zencommunity/activate', 'zencommunity_activate_addon_on_plugin_activation' );

/**
 * Seed a default Collection + Space on fresh install (runs once).
 */
add_action( 'zencommunity/activate', [ \ZenCommunity\Classes\Seeder::class, 'run_default_data' ] );

/**
 * Delete unused media uploads
 */
// Background jobs record their failures but nothing looked at them again, so a
// job that failed once stayed failed and max_retry described an intention
// rather than a behaviour. Give the retries a driver.
add_action( 'init', 'zencommunity_schedule_bg_process_retries' );
add_action( 'zencommunity_bg_process_retry', [ \ZenCommunity\Database\Models\ProcessLog::class, 'retry_failed' ] );
add_action( 'zencommunity_bg_process_retry', [ \ZenCommunity\Database\Models\ProcessLog::class, 'retry_stale_pending' ] );
add_action( 'zencommunity_bg_process_retry', [ \ZenCommunity\Database\Models\ProcessLog::class, 'purge_exhausted' ] );

// Throttled: asking Action Scheduler whether this is still queued costs real
// queries, and `init` runs on every request. See ScheduleGuard.
add_action( 'init', function () {
	\ZenCommunity\ScheduleGuard::ensure( 'cleanup-uploads', 'zencommunity_cleanup_uploads' );
} );
add_action( 'zencommunity_cleanup_uploads', [ \ZenCommunity\Database\Models\Attachment::class, 'delete_unused_files' ] );


/**
 * Triggered when a new feed is created.
 *
 * @param int   $id   Feed ID.
 * @param array $data Feed data including title, content, user_id, group_id, etc.
 */
add_action( "zencommunity/feed/created", 'zencommunity_notification_feed_created', 10, 3 );
add_action( "zencommunity/event/created", 'zencommunity_notification_event_created', 10, 3 );
add_action( 'zencommunity/event/created', 'zencommunity_create_event_feed_post', 20, 3 );
add_action( "zencommunity/feed/pending", 'zencommunity_notification_feed_pending', 10, 2 );
add_action( "zencommunity/feed/approved", 'zencommunity_notification_feed_approved', 10, 2 );
add_action( "zencommunity/feed/rejected", 'zencommunity_notification_feed_rejected', 10, 2 );

/**
 * Triggered when a feed or comment is liked.
 *
 * @param int        $reaction_id Reaction ID.
 * @param int        $feed_id     Feed ID.
 * @param int        $user_id     ID of user who liked.
 * @param int|null   $comment_id  Optional comment ID.
 * @param array      $feed        Feed data.
 */
add_action( "zencommunity/feed/react", 'zencommunity_notification_like', 10, 6 );


/**
 * Triggered when a comment or reply is created on a feed.
 *
 * @param int        $new_comment_id New comment or reply ID.
 * @param int        $feed_id        Feed ID.
 * @param int        $user_id        Commenting user ID.
 * @param int|null   $comment_id     Optional parent comment ID.
 * @param array      $feed           Feed data.
 */
add_action( "zencommunity/feed/comment_created", 'zencommunity_notification_comment', 10, 6 );

/**
 * Triggered when users are mentioned in a feed.
 *
 * @param int   $feed_id         Feed ID.
 * @param array $newly_mentioned Array of usernames mentioned.
 */
add_action( "zencommunity/feed/mentioned", 'zencommunity_notification_mentioned_on_feed', 10, 4 );


/**
 * Triggered when users are mentioned in a comment.
 *
 * @param int   $comment_id      Comment ID.
 * @param array $newly_mentioned Array of usernames mentioned.
 */
add_action( "zencommunity/comment/mentioned", 'zencommunity_notification_mentioned_on_comment', 10, 4 );


/**
 * Triggered when a user is added to a group.
 *
 * @param int   $group_id Group ID.
 * @param array $data     User data including user_id and role.
 */
add_action( "zencommunity/group/user_added", 'zencommunity_notification_member_added', 10, 2 );

/**
 * Triggered when a user's role is changed in a group.
 *
 * @param int    $group_id Group ID.
 * @param int    $user_id  User ID.
 * @param string $role     New role name.
 */
add_action( "zencommunity/group/user_role_changed", 'zencommunity_notification_member_role_changed', 10, 3 );




/**
 * Triggered when a new feed is created.
 *
 * @param int   $id   Feed ID.
 * @param array $data Feed data including title, content, user_id, group_id, etc.
 */
add_action( "zencommunity/feed/created", 'zencommunity_activity_feed_created', 10, 3 );

/**
 * Triggered when a comment or reply is created on a feed.
 *
 * @param int        $new_comment_id New comment or reply ID.
 * @param int        $feed_id        Feed ID.
 * @param int        $user_id        Commenting user ID.
 * @param int|null   $comment_id     Optional parent comment ID.
 * @param array      $feed           Feed data.
 */
add_action( "zencommunity/feed/comment_created", 'zencommunity_activity_comment', 10, 5 );


add_action( 'zencommunity/feed/deleted', 'zencommunity_remove_feed_activity', 10, 2 );
add_action( "zencommunity/feed/comment_deleted", 'zencommunity_remove_comment_activity', 10, 4 );

add_action( "zencommunity/group/deleted", 'zencommunity_remove_group_activity', 10, 1 );
add_action( "zencommunity/category/deleted", 'zencommunity_remove_category_activity', 10, 1 );

/**
 * Attach each member's admin-assigned badges to their profile payload, same
 * extension point the (optional) GameEngine addon uses for `gamification`.
 */
add_filter( 'zencommunity/members/wrapper/collection', [ \ZenCommunity\Database\Models\Badge::class, 'enrich_members' ] );
add_filter( 'zencommunity/members/wrapper/single', [ \ZenCommunity\Database\Models\Badge::class, 'enrich_member' ] );

/**
 * Keep the WordPress-wide avatar (comments, wp-admin, core widgets, etc.)
 * in sync with the community profile picture whenever a member has
 * uploaded one, so admins/users only ever manage a single picture.
 */
add_filter( 'pre_get_avatar_data', [ \ZenCommunity\Database\Models\Profile::class, 'sync_avatar_data' ], 10, 2 );

/**
 * Auto-assign badges (see the Badges settings screen "Auto-assign" rule)
 * whenever something that could make a member newly eligible happens:
 * logging in, publishing a post, saving their profile, or joining a group.
 */
add_action( 'wp_login', 'zencommunity_evaluate_badges_on_login', 10, 2 );
add_action( 'zencommunity/feed/created', 'zencommunity_evaluate_badges_on_feed_created', 20, 2 );
add_action( 'zencommunity/profile/created', 'zencommunity_evaluate_badges_on_profile_saved', 10, 2 );
add_action( 'zencommunity/profile/updated', 'zencommunity_evaluate_badges_on_profile_saved', 10, 2 );
add_action( 'zencommunity/group/user_added', 'zencommunity_evaluate_badges_on_group_joined', 20, 2 );

add_action(
	'zencommunity/queue/scheduled_post',
	'zencommunity_publish_scheduled_post'
);

add_action(
	'zencommunity/queue/member_suspension_expired',
	'zencommunity_expire_member_suspension',
	10,
	3
);