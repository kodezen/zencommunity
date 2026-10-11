<?php
/**
 * Setup Wizard route — a standalone admin page, deliberately NOT part of the
 * shared Settings.js bundle/DOM tree the way Dashboard/Spaces/etc. are.
 *
 * The wizard used to be a client-side branch inside AdminApp (gated on a
 * `zencommunitySettings.is_configured` flag + a `?zc_wizard=1` query param
 * read once via a React useState initializer). That worked most of the time,
 * but its correctness depended on: the shared `settings.*.js` bundle being
 * freshly and consistently built, the localized global being read at exactly
 * the right render, and a client-side router state — three moving parts a
 * page reload has to get right together. A stale/partial rebuild of that one
 * shared bundle (e.g. a build racing with a `wp-scripts start` watcher) could
 * silently serve a bundle that still "contained" the gating code but didn't
 * evaluate it correctly, with no error to point at.
 *
 * Academy LMS's own setup wizard (includes/admin/setup.php in that plugin)
 * sidesteps all of that: it's a hidden, real wp-admin page whose own
 * `admin_init` hook renders a bare, separate HTML document (its own webpack
 * entry, own script/style enqueue, own DOM root) and `die`s before
 * WordPress's normal admin-page template — and therefore the *other*
 * bundle — ever loads. There is no client-side "should I show the wizard"
 * branch left to get wrong; the answer is just "is this URL requested",
 * decided fresh in PHP on every request. This mirrors that pattern.
 */

namespace ZenCommunity;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Setup {

	const PAGE_ID = 'zencommunity-setup';

	public static function init() : void {
		$self = new self();

		if ( $self->is_current() ) {
			add_action( 'admin_init', [ $self, 'admin_init' ], 0 );
		}

		add_action( 'admin_menu', [ $self, 'register_admin_menu' ] );
	}

	/**
	 * A real, permission-checked admin page (so direct links/redirects to it
	 * work normally) that's never visible in the sidebar. The parent MUST be
	 * a page that is itself already a submenu leaf, not 'options-general.php'
	 * — that one *is* the real parent slug every "Settings" child (Writing,
	 * Reading, etc.) registers under, so nesting under it directly would add
	 * a genuine, visible sibling entry there. 'options-writing.php' has no
	 * submenu drawer of its own for wp-admin's (single-level) sidebar to
	 * attach a child to, so a page registered under IT is reachable by URL
	 * but renders nowhere. The same trick Academy LMS uses for its own setup
	 * page, and a common pattern (WooCommerce, Elementor, etc.) for
	 * "reachable by URL, absent from navigation" admin screens.
	 */
	public function register_admin_menu() : void {
		add_submenu_page(
			'options-writing.php',
			__( 'ZenCommunity Setup', 'zencommunity' ),
			__( 'ZenCommunity Setup', 'zencommunity' ),
			'manage_options',
			self::PAGE_ID
		);
	}

	public function is_current() : bool {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return ! empty( $_GET['page'] ) && self::PAGE_ID === $_GET['page']; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
	}

	/**
	 * Renders the standalone page and exits — deliberately before
	 * WordPress reaches its own "does this user have access to this
	 * registered page" check (that only runs once it tries to invoke the
	 * page's own callback, later than `admin_init`). `add_submenu_page()`'s
	 * `manage_options` requirement alone would NOT be enforced on this path,
	 * so it's re-checked explicitly here.
	 */
	public function admin_init() : void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to access this page.', 'zencommunity' ), 403 );
		}

		$this->enqueue_assets();
		$this->render();
		die;
	}

	private function enqueue_assets() : void {
		$dependencies = include ZENCOMMUNITY_ASSETS_DIR_PATH . sprintf( 'build/setup-wizard.%s.asset.php', ZENCOMMUNITY_VERSION );

		wp_enqueue_style(
			'zencommunity-setup-style',
			ZENCOMMUNITY_ASSETS_URI . 'build/setup-wizard.css',
			[ 'wp-components' ],
			$dependencies['version']
		);

		wp_enqueue_script(
			'zencommunity-setup-scripts',
			ZENCOMMUNITY_ASSETS_URI . sprintf( 'build/setup-wizard.%s.js', ZENCOMMUNITY_VERSION ),
			$dependencies['dependencies'],
			$dependencies['version'],
			true
		);

		// Same global name/shape the main admin app uses (Assets::localized_data())
		// so SetupWizard's existing React code — written against
		// `window.ZencommunityGlobal` — needs no changes to run on this page too.
		wp_localize_script( 'zencommunity-setup-scripts', 'ZencommunityGlobal', Assets::localized_data() );
		wp_set_script_translations( 'zencommunity-setup-scripts', 'zencommunity', ZENCOMMUNITY_ROOT_DIR_PATH . 'i18n/languages' );
	}

	private function render() : void {
		// The template fires `admin_print_styles` itself, without the
		// `admin_enqueue_scripts` step where core (6.4+) swaps the deprecated
		// print_emoji_styles() for wp_enqueue_emoji_styles(). Left hooked, it
		// prints a "deprecated" notice above the page. Emoji styles aren't
		// needed here, so just unhook the old printer.
		remove_action( 'admin_print_styles', 'print_emoji_styles' );
		remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );

		require ZENCOMMUNITY_TEMPLATES_DIR_PATH . 'admin/setup.php';
	}
}
