<?php
namespace ZenCommunity;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Page shortcodes: embed a single ZenCommunity view (with its complete layout —
 * header, sidebars, working navigation) inside any WordPress page, post or
 * widget via [zencommunity page="…"].
 *
 * Each embed mounts the full community React app pinned to a starting route
 * using an in-memory router (see EmbeddedCommunityApp in communityRouter.js),
 * so it works on host pages whose URL doesn't match the SPA routes and internal
 * navigation stays inside the box.
 */
class Shortcode {

	const TAG = 'zencommunity';

	public static function init() : void {
		$self = new self();
		add_shortcode( self::TAG, [ $self, 'render' ] );
		// Enqueue early (in the <head>) when a singular post's content carries the
		// shortcode, so the app stylesheet isn't left to load late in the footer.
		add_action( 'wp_enqueue_scripts', [ $self, 'maybe_enqueue' ] );
	}

	/**
	 * Map of shortcode `page` keys to the SPA route they open. `{id}` is filled
	 * from the `id` attribute. Addons can register more pages via the filter.
	 *
	 * @return array<string, string>
	 */
	public static function pages() : array {
		return apply_filters( 'zencommunity/shortcode/pages', [
			'feed'           => '/',
			'post'           => '/feed/{id}',
			'ticket'         => '/tickets',
			'ticket-details' => '/ticket/{id}',
			'support-chat'   => '/live-chat',
			'community-chat' => '/chat',
			'profile'        => '/member/{id}',
			'agent-activity' => '/agent-activity',
			'courses'        => '/courses',
			'course'         => '/course/{id}',
			'learn'          => '/learn/{id}',
			'groups'         => '/groups',
			'group'          => '/group/{id}',
			'members'        => '/members',
			'moderation'     => '/moderation',
			'notifications'  => '/notifications',
			'preferences'    => '/preferences',
		] );
	}

	/**
	 * Resolve a page key (+ optional id) to a concrete SPA path, or null when
	 * the key is unknown or a required id is missing.
	 */
	public static function resolve_route( string $page, string $id = '' ) : ?string {
		$pages = self::pages();
		if ( ! isset( $pages[ $page ] ) ) {
			return null;
		}

		$route = $pages[ $page ];

		if ( false !== strpos( $route, '{id}' ) ) {
			// A profile with no explicit id falls back to the current user.
			if ( '' === $id && 'profile' === $page ) {
				$id = (string) get_current_user_id();
			}
			if ( '' === $id || '0' === $id ) {
				return null;
			}
			$route = str_replace( '{id}', rawurlencode( $id ), $route );
		}

		return $route;
	}

	/**
	 * Render callback for [zencommunity].
	 *
	 * @param array|string $atts Shortcode attributes.
	 */
	public function render( $atts ) : string {
		$atts = shortcode_atts(
			[
				'page'       => 'feed',
				'id'         => '',
				'height'     => '',
				'min_height' => '80vh',
			],
			$atts,
			self::TAG
		);

		$route = self::resolve_route( sanitize_key( (string) $atts['page'] ), trim( (string) $atts['id'] ) );

		if ( null === $route ) {
			// Only surface the misconfiguration to users who can fix it.
			if ( current_user_can( 'manage_options' ) ) {
				return '<div class="zencommunity-app-embed-error" style="padding:12px 16px;border:1px solid #f0b7b7;background:#fff5f5;color:#a33;border-radius:8px;">'
					. esc_html__( 'ZenCommunity shortcode: unknown "page" or missing required "id".', 'zencommunity' )
					. '</div>';
			}
			return '';
		}

		Assets::enqueue_app_runtime();

		$style = 'min-height:' . esc_attr( (string) $atts['min_height'] ) . ';';
		if ( '' !== trim( (string) $atts['height'] ) ) {
			$style = 'height:' . esc_attr( (string) $atts['height'] ) . ';';
		}

		return sprintf(
			'<div class="zencommunity-app-embed" data-zc-app="1" data-route="%1$s" style="%2$s"></div>',
			esc_attr( $route ),
			$style
		);
	}

	/**
	 * Load the runtime up-front when the current singular content contains the
	 * shortcode, so the stylesheet lands in <head> rather than being enqueued
	 * late during do_shortcode().
	 */
	public function maybe_enqueue() : void {
		if ( ! is_singular() ) {
			return;
		}
		$post = get_post();
		if ( $post instanceof \WP_Post && has_shortcode( (string) $post->post_content, self::TAG ) ) {
			Assets::enqueue_app_runtime();
		}
	}
}
