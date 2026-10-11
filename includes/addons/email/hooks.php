<?php

namespace ZenCommunity\Addons\Email;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Database\Models\Profile;
class Hooks {
	public static function init() : void {
		add_action( 'zencommunity/activate', [ static::class, 'rescan_templates' ] );
		add_action( 'zencommunity_pro/activate', [ static::class, 'rescan_templates' ] );
		add_action( 'zencommunity/addon/activate', [ static::class, 'rescan_templates' ] );
		add_filter( 'zencommunity/email/template/registered', [ static::class, 'register_templates' ] );

		MagicLink::init();
		Digest::init();

		add_action(
			'zencommunity/notification/created',
			[ static::class, 'notify' ]
		);

		// Welcome + login info when a guest is auto-registered (e.g. ticket/chat).
		add_action( 'zencommunity/guest_user/registered', [ static::class, 'send_guest_welcome' ], 10, 3 );
		add_filter( 'zencommunity/email/template/guest_account_created', [ static::class, 'guest_welcome_vars' ], 10, 2 );
	}

	/**
	 * Email a freshly auto-registered guest their login info (a set-password link
	 * + the community login URL). Sent directly via Template — guest users have no
	 * community Profile, so Notification::send would drop them. Self-heals the
	 * template registry on first use so it works without a reactivation.
	 */
	public static function send_guest_welcome( int $user_id, string $email = '', string $name = '' ) : void {
		if ( $user_id <= 0 ) {
			return;
		}
		$data = [ 'to_user_id' => $user_id, 'from_user_id' => 0, 'meta' => [ 'route' => [] ] ];
		try {
			( new Template( 'guest_account_created', $data ) )->send();
		} catch ( \Throwable $e ) {
			try {
				Database\Models\Template::rescan_templates();
				( new Template( 'guest_account_created', $data ) )->send();
			} catch ( \Throwable $e2 ) {
				unset( $e2 );
			}
		}
	}

	/** Render-time merge tags: name, email, login URL, fresh set-password link. */
	public static function guest_welcome_vars( array $vars, array $event_data ) : array {
		$user = get_userdata( absint( $event_data['to_user_id'] ?? 0 ) );
		if ( ! $user ) {
			return $vars;
		}
		$reset_key = get_password_reset_key( $user );
		$reset_url = is_wp_error( $reset_key ) ? '' : network_site_url(
			'wp-login.php?action=rp&key=' . $reset_key . '&login=' . rawurlencode( $user->user_login ),
			'login'
		);
		$path = trim( (string) ( $GLOBALS['zencommunity_settings']->path ?? '' ), '/' );
		$vars['account_name']             = $user->display_name ?: $user->user_email;
		$vars['account_email']            = $user->user_email;
		$vars['account_login_url']        = home_url( ( $path ? "/{$path}" : '' ) . '/signin' );
		$vars['account_set_password_url'] = $reset_url;
		return $vars;
	}
	
	public static function notify( array $notification ) : void {
		$rescanned = false;

		foreach ( (array) ( $notification['to_user_ids'] ?? [] ) as $user_id ) {
			// Digest subscribers get this batched by Digest::run() on
			// their chosen schedule instead of one email per event; the
			// in-app notification row itself is already written by
			// Notification::send(), independent of this email hook.
			if ( 'instant' !== zencommunity_get_user_email_digest_frequency( (int) $user_id ) ) {
				continue;
			}

			$meta = $notification['data']['meta'] ?? '{}';
			$notification['data']['meta']       = is_string( $meta ) ? json_decode( $meta, true ) : $meta;
			$notification['data']['to_user_id'] = $user_id;
			$notification['data']['from_user']  = Profile::by_id( $user_id );

			// Per recipient, so one address that cannot be mailed - a member
			// with no email, a profile row that has gone - no longer takes the
			// rest of the recipients down with it. Everyone after the first
			// failure used to get nothing at all.
			try {
				( new Template( $notification['data']['event_type'], $notification['data'] ) )->send();
			} catch ( \Throwable $e ) {
				// A template an addon registers after the last activation has
				// no row yet, and Template throws rather than saying so - which
				// is how an entire event type can go from release to release
				// never sending anything while the log quietly fills up.
				// Rescan once per batch and try again; the live-chat feedback
				// mail already does the same. A genuinely unregistered event
				// throws the second time too and is logged.
				try {
					if ( ! $rescanned ) {
						$rescanned = true;
						Database\Models\Template::rescan_templates();
					}
					( new Template( $notification['data']['event_type'], $notification['data'] ) )->send();
				} catch ( \Throwable $retry ) {
					error_log( print_r( [
						'origin'  => 'notification',
						'event'   => $notification['data']['event_type'] ?? '',
						'to_user' => (int) $user_id,
						'file'    => $retry->getFile(),
						'line'    => $retry->getLine(),
						'msg'     => $retry->getMessage(),
					], true ) );
				}
			}
		}
	}

	public static function rescan_templates() : void {
		Database\Models\Template::rescan_templates();
	}

	public static function register_templates( array $templates ) : array {
		$templates[] = [
			'label'=> 'Feeds',
			'sub_title'=> 'Stay in the loop with community activity.',
			'events'=> [
				'feed_posted' => [
					'template' => ' <p><strong>{{author_name}}</strong> has created a new feed in the group <strong>{{group_name}}</strong>.</p>
					<p>The feed title is:</p>
					<p style="font-size: 18px; font-weight: bold; color: #0073aa;">{{feed_title}}</p>

					<p><a href="{{feed_url}}" style="display:inline-block;padding:10px 18px;background:#4a4aff;color:#ffffff;text-decoration:none;border-radius:6px;">View Feed</a></p>',
					'subject' => 'A new Feed is posted',
					'heading' => 'A new Feed is posted',
				],
				
				'feed_comment' => [
					'template' => '
						<p><strong>{{author_name}}</strong> has commented on your feed: <strong>{{feed_title}}</strong>.</p>

						<p>The comment:</p>
						<p style="background-color: #f1f1f1; padding: 15px; border-left: 4px solid #0073aa; font-style: italic;">
							{{comment_rendered}}
						</p>

						<p>Visit your feed to view the full comment and respond.</p>
					',
					'subject' => 'New Comment on Your Feed',
					'heading' => 'Someone commented on your feed',
				],
				
				'comment_reply' => [
					'template' => '
						<p><strong>{{author_name}}</strong> has Replied your comment on  <strong>{{feed_title}}</strong>.</p>

						<p>The Reply:</p>
						<p style="background-color: #f1f1f1; padding: 15px; border-left: 4px solid #0073aa; font-style: italic;">
							{{comment_rendered}}
						</p>

						<p>Visit your feed to view the full comment and respond.</p>
					',
					'subject' => 'New Reply on your Comment',
					'heading' => 'Someone replied on your comment',
				],
				'mentioned_in_comment' => [
					'template' => '
						<p><strong>{{author_name}}</strong> mentioned you in a comment on <strong>{{feed_title}}</strong>.</p>

						<p><strong>The Comment:</strong></p>
						<blockquote style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #0073aa; font-style: italic;">
							{{comment_rendered}}
						</blockquote>
					',
					'subject' => 'You Were Mentioned in a Comment',
					'heading' => 'You Were Mentioned!',
				],
				'mentioned_in_feed' => [
					'template' => '
						<p><strong>{{author_name}}</strong> mentioned you in the feed <strong>{{feed_title}}</strong>.</p>
					',
					'subject' => 'You Were Mentioned in a Comment',
					'heading' => 'You Were Mentioned!',
				],

			],
		];

		$templates[] = [
			'label'=> 'User accounts',
			'sub_title'=> 'Sent when an account is created for a guest.',
			'events'=> [
				'guest_account_created' => [
					'template' => '
						<p>Hi {{account_name}},</p>
						<p>Thanks for reaching out. We\'ve created an account for you so you can track your support tickets and see our replies in one place.</p>
						<p><strong>Your login email:</strong> {{account_email}}</p>
						<p>Set a password to get started:</p>
						<p><a href="{{account_set_password_url}}" style="display:inline-block;padding:10px 18px;background:#4a4aff;color:#ffffff;text-decoration:none;border-radius:6px;">Set your password</a></p>
						<p>Once your password is set, log in any time here:<br><a href="{{account_login_url}}">{{account_login_url}}</a></p>
						<p style="color:#777777;font-size:13px;">If you didn\'t request this, you can safely ignore this email.</p>
					',
					'subject' => 'Your account is ready — set your password',
					'heading' => 'Welcome! Your account is ready',
				],
			],
		];

		$templates[] = [
			'label'=> 'Digest',
			'sub_title'=> 'Sent to members who chose a daily/weekly digest instead of per-event emails (Preferences page).',
			'events'=> [
				'notification_digest' => [
					// `subject`/`heading` aren\'t merge-tag substituted (only the
					// body is), so the period name is worked into the body text
					// instead of those fields.
					'template' => '
						<p>Here\'s your {{digest_period}} — {{digest_count}} update(s) since your last one:</p>
						{{digest_items}}
					',
					'subject' => 'Your community digest',
					'heading' => 'Your community digest',
				],
			],
		];

		return $templates;
	}
}