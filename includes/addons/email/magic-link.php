<?php

namespace ZenCommunity\Addons\Email;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Deep links for notification/digest emails.
 *
 * Notification emails link straight into the SPA (e.g. `/feed/123`). The
 * link carries no credentials: a signed-out recipient signs in through the
 * normal login flow, so login protections from other plugins still apply.
 */
class MagicLink {

	public static function init() : void {}

	/**
	 * Build a home-relative SPA URL for $path.
	 *
	 * Honors the configured community base path (Settings > General), the
	 * same way Hooks::guest_welcome_vars() builds the signin URL — the SPA
	 * only owns bare top-level slugs like /feed/ when installed at the site
	 * root, so a site with a custom path needs it prefixed or the link
	 * 404s.
	 *
	 * @param int $user_id Recipient (kept for API compatibility).
	 */
	public static function url( int $user_id, string $path ) : string {
		$base = trim( (string) ( $GLOBALS['zencommunity_settings']->path ?? '' ), '/' );
		$path = ( $base ? "/{$base}" : '' ) . '/' . ltrim( $path, '/' );
		return home_url( $path );
	}
}
