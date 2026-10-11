<?php

namespace ZenCommunity\Addons\Email;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Helper;
use ZenCommunity\Addons\Email\Database\Models\Template as TmpModel;
class Template {
	public string $event;
	public ?string $email;
	public array $template;
	public array $event_data;
	public array $settings;
	private ?string $cached_action_url = null;
	private bool $action_url_resolved = false;
	public function __construct( string $event, array $event_data, ?string $mock_email = null ) {
		$this->event = $event;
		$this->event_data = $event_data;
		$this->settings = get_option( 'zenc_email_settings', [
				'from' => [
					'name' => '',
					'email' => get_option( 'admin_email' ),
				],
				'footer_text' => 'Thank you'
			] );
			
		$this->template = TmpModel::by_event( $event, empty( $mock_email ) ? true : null );
		$this->email    = empty( $mock_email ) ? ( get_userdata( absint( $this->event_data['to_user_id'] ) )->user_email ?? null ) : $mock_email;
		if ( empty( $this->email ) ) 
			throw new ZencommunityException( esc_html( __( 'email not found.', 'zencommunity' ) ), 404 );

	}

	public function send() : void {
		$site_name   = $this->settings['from']['name'] ?? get_bloginfo( 'name' );
		$admin_email = $this->settings['from']['email'] ?? get_option( 'admin_email' );
		add_filter( 'wp_mail_content_type', [ $this, 'set_html_mail_content_type' ] );

		wp_mail(
			$this->email, 
			apply_filters( 
				'zencommunity/email/subject', 
				$this->template['subject'] ?? '',
				$this
			), 
			apply_filters( 
				'zencommunity/email/body', 
				$this->message(),
				$this
			), 
			apply_filters( 
				'zencommunity/email/headers', 
				[
					'Content-Type: text/html; charset=UTF-8',
					"From: {$site_name} <{$admin_email}>",
				],
				$this
			)
		);
		remove_filter( 'wp_mail_content_type', [ $this, 'set_html_mail_content_type' ] );
	}

	public function set_html_mail_content_type() : string {
		return 'text/html';
	}

	public function template() : string {
		$template = $this->template['template'] ?? '';
		$tmpvars = apply_filters(
			"zencommunity/email/template/{$this->event}",
			array_merge( $this->conv_template(), [ 'action_url' => $this->action_url() ?? '' ] ),
			$this->event_data
		);

		foreach ( $tmpvars as $search => $replace ) {
			$template = str_replace( "{{" . $search . "}}", $replace, $template );
		}
		return $this->parse_mention( $template );
	}

	/**
	 * Home-relative SPA URL for the content this notification is about,
	 * carrying a magic-login token so clicking it from the inbox signs the
	 * recipient straight in. Exposed as the `{{action_url}}` merge tag and
	 * auto-appended as a "View in Community" button in message() so every
	 * notification email links somewhere, even templates that don't
	 * reference the merge tag.
	 *
	 * Skipped for `guest_account_created`, which already carries its own
	 * set-password/login CTA.
	 */
	protected function action_url() : ?string {
		// Memoized — this mints a fresh, one-time token per call, and both
		// template() (for the {{action_url}} merge tag) and message() (for
		// the auto-appended button) need the same link.
		if ( $this->action_url_resolved ) {
			return $this->cached_action_url;
		}
		$this->action_url_resolved = true;

		if ( 'guest_account_created' === $this->event ) {
			return $this->cached_action_url = null;
		}
		$user_id = absint( $this->event_data['to_user_id'] ?? 0 );
		if ( $user_id <= 0 ) {
			return $this->cached_action_url = null;
		}
		return $this->cached_action_url = MagicLink::url( $user_id, zencommunity_notification_target_path( $this->event_data ) );
	}

	protected function parse_mention( string $content ) : string {
		$pattern = '/<Mention\s+id=(\d+)\s+username="[^"]*"\s*\/?>/i';

		$content = preg_replace_callback( $pattern, function( ?array $matches ) : ?string {
			$user_id = intval( $matches[1] );
			$user = get_userdata( $user_id );

			if ( $user ) {
				$display_name = $user->display_name;
				return esc_html( $display_name );
			} else {
				return 'UnknownUser';
			}
		}, $content );

		return $content;
	}

	private function preferences_url() : string {
		$path = trim( (string) Helper::get_setting( 'path', '' ), '/' );
		return home_url( ( $path ? "/{$path}" : '' ) . '/preferences' );
	}

	private function conv_template(): array {
		$author = get_userdata( absint( $this->event_data['from_user_id'] ?? 0 ) );
		$result = [
			'author_name' => ( $author->display_name ?? '' )
		];

		foreach ( $this->event_data['meta']['route'] ?? [] as $key => $sub_arr ) {
			if ( is_array( $sub_arr ) ) {
				foreach ( $sub_arr as $sub_key => $value ) {
					if ( 
						is_null( $value ) || 
						is_array( $value ) ||
						is_object( $value ) 
					)  continue;
					$result["{$key}_{$sub_key}"] = $value;
				}
			} else {
				$result[$key] = $sub_arr;
			}
		}

		return $result;
	}

	public function message() : string {
		ob_start();
		?>
		<!DOCTYPE html>
		<html>
		<head>
		<meta charset="UTF-8">
		<title>Email template</title>
		<style>
			body {
				font-family: Arial, sans-serif;
				background-color: #f6f6f6;
				margin: 10;
				padding: 10;
			}
			.footer {
				background-color: #f1f1f1;
				padding: 15px 30px;
				text-align: center;
				font-size: 13px;
				color: #777777;
			}
		</style>
		</head>
		<body>
		<div class="container">
			<div class="header">
			<h1><?php echo esc_html( $this->template['heading'] ?? ucfirst( str_replace( ['_', '-', ], ' ', $this->event ) ) ); ?></h1>
			</div>
			<div class="content">
				<?php echo wp_kses_post( $this->template() ); ?>
				<?php if ( $action_url = $this->action_url() ) : ?>
				<p style="margin-top: 20px;">
					<a href="<?php echo esc_url( $action_url ); ?>" style="display:inline-block;padding:10px 18px;background:#4a4aff;color:#ffffff;text-decoration:none;border-radius:6px;">
						<?php echo esc_html__( 'View in Community', 'zencommunity' ); ?>
					</a>
				</p>
				<?php endif; ?>
			</div>
			<div class="footer">
				<?php echo wp_kses_post( $this->settings['footer_text'] ); ?>
				<p style="margin-top:10px;">
					<a href="<?php echo esc_url( $this->preferences_url() ); ?>" style="color:#0073aa;text-decoration:underline;"><?php esc_html_e( 'Manage your notification preferences', 'zencommunity' ); ?></a>
				</p>
			</div>

		</div>
		</body>
		</html>
		<?php
		return ob_get_clean();
	}
}