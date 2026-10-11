<?php
/**
 * Plugin Name:     ZenCommunity
 * Plugin URI:      http://kodezen.com
 * Description:     All-in-one WordPress community plugin: groups, posts, real-time chat, support tickets & live chat.
 * Version:         3.0.2
 * Author:          kodezen
 * Author URI:      http://zencommunity.pro/
 * License:         GPL-3.0+
 * License URI:     http://www.gnu.org/licenses/gpl-3.0.txt
 * Text Domain:     zencommunity
 * Domain Path:     /i18n/languages/
 *
 * Requires PHP: 7.4
 * Requires at least: 6.8
 * Tested up to: 7.1
 *
 * @package ZenCommunity
 */

use ZenCommunity\ActionQueue;
use ZenCommunity\Exceptions\ZencommunityException;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class ZenCommunity {

	private function __construct() {
		$this->define_constants();
		$this->set_global_settings();
		$this->load_dependency();
		register_activation_hook( __FILE__, [ $this, 'activate' ] );
		register_deactivation_hook( __FILE__, [ $this, 'deactivate' ] );
		add_action( 'activated_plugin', [ $this, 'activated_redirect' ], 10, 2 );
		add_action( 'admin_init', [ $this, 'maybe_redirect_to_setup_wizard' ] );
		add_action( 'plugins_loaded', [ $this, 'on_plugins_loaded' ] );
		add_action( 'zencommunity_loaded', [ $this, 'init_plugin' ] );
	}

	public static function init() {
		static $instance = false;

		if ( ! $instance ) {
			$instance = new self();
		}

		return $instance;
	}
	public function define_constants() {
		/**
		 * Defines CONSTANTS for Whole plugins.
		 */
		define( 'ZENCOMMUNITY_VERSION', '3.0.2' );
		define( 'ZENCOMMUNITY_DB_VERSION', '1.7.4' );
		define( 'ZENCOMMUNITY_SETTINGS_NAME', 'zencommunity_settings' );
		define( 'ZENCOMMUNITY_ROLES_OPTION_NAME', 'zencommunity_roles' );
		define( 'ZENCOMMUNITY_PLUGIN_FILE', __FILE__ );
		define( 'ZENCOMMUNITY_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );
		define( 'ZENCOMMUNITY_PLUGIN_SLUG', 'zencommunity' );
		define( 'ZENCOMMUNITY_PLUGIN_ROOT_URI', plugins_url( '/', __FILE__ ) );
		define( 'ZENCOMMUNITY_ROOT_DIR_PATH', plugin_dir_path( __FILE__ ) );
		define( 'ZENCOMMUNITY_APP_ROUTE_QUERY_VAR', 'zencommunity_app_route' );
		define( 'ZENCOMMUNITY_INCLUDES_DIR_PATH', ZENCOMMUNITY_ROOT_DIR_PATH . 'includes/' );
		define( 'ZENCOMMUNITY_TEMPLATES_DIR_PATH', ZENCOMMUNITY_ROOT_DIR_PATH . 'templates/' );
		define( 'ZENCOMMUNITY_ASSETS_DIR_PATH', ZENCOMMUNITY_ROOT_DIR_PATH . 'assets/' );
		define( 'ZENCOMMUNITY_ADDONS_DIR_PATH', ZENCOMMUNITY_ROOT_DIR_PATH . 'addons/' );
		define( 'ZENCOMMUNITY_ASSETS_URI', ZENCOMMUNITY_PLUGIN_ROOT_URI . 'assets/' );
		define( 'ZENCOMMUNITY_TEMPLATE_DEBUG_MODE', false );
	}

	/**
	 * When WP has loaded all plugins, trigger the `zencommunity_loaded` hook.
	 *
	 * This ensures `zencommunity_loaded` is called only after all other plugins
	 * are loaded, to avoid issues caused by plugin directory naming changing
	 *
	 * @since 1.0.0
	 */
	public function on_plugins_loaded() {
		do_action( 'zencommunity_loaded' );
	}

	/**
	 * Initialize the plugin
	 *
	 * @return void
	 */
	public function init_plugin() {
		// Init action.
		load_plugin_textdomain( 'zencommunity', false, ZENCOMMUNITY_ROOT_DIR_PATH . 'i18n/languages/' );
		do_action( 'zencommunity_before_init' );
		$this->dispatch_hooks();
		$this->load_addons();
		$this->load_commands();
		// Init action.
		do_action( 'zencommunity_init' );
	}

	/**
	 * Initialize the plugin
	 *
	 * @return void
	 */
	public function load_addons() {
		$addon_manager = new ZenCommunity\Classes\Addon\Manager;
		$addon_manager->boot_active_addons();
	}

	public function load_commands() {
		ZenCommunity\Classes\Command\Register::init();
	}

	public function dispatch_hooks() {
		ZenCommunity\Migration::init();
		ZenCommunity\StoreLicense::init();
		ZenCommunity\RewriteRules::init();
		ZenCommunity\Frontend::init();
		ZenCommunity\Assets::init();
		ZenCommunity\Shortcode::init();
		ZenCommunity\RestApiInit::init();
		ZenCommunity\AdminMenu::init();
		ZenCommunity\Setup::init();
		ZenCommunity\Fse\Manager::init();
		ZenCommunity\Classes\SpaceType::init();
		ZenCommunity\Classes\Tab_Settings::init();
		ZenCommunity\Classes\Group_Rules::init();
	}

	public function load_dependency() {
		// Autoload prefixed packages.
		if ( file_exists( ZENCOMMUNITY_ROOT_DIR_PATH . 'vendor/prefixed/autoload.php' ) ) {
			require_once ZENCOMMUNITY_ROOT_DIR_PATH . 'vendor/prefixed/autoload.php';
		}

		// Autoload other packages.
		if ( file_exists( ZENCOMMUNITY_ROOT_DIR_PATH . 'vendor/autoload.php' ) ) {
			require_once ZENCOMMUNITY_ROOT_DIR_PATH . 'vendor/autoload.php';
		}

		require_once ZENCOMMUNITY_INCLUDES_DIR_PATH . 'autoload.php';
		require_once ZENCOMMUNITY_INCLUDES_DIR_PATH . 'functions.php';
		require_once ZENCOMMUNITY_INCLUDES_DIR_PATH . 'hooks.php';
	}

	public function set_global_settings() {
		$GLOBALS['zencommunity_settings'] = json_decode( get_option( ZENCOMMUNITY_SETTINGS_NAME, '{}' ) );
		$GLOBALS['zencommunity_settings']->site_logo = empty( $GLOBALS['zencommunity_settings']->site_logo ?? false ) ? str_replace( rtrim( site_url(), '/' ), '',  plugins_url( '/assets/images/icon_logo.png', ZENCOMMUNITY_PLUGIN_FILE ) ) : $GLOBALS['zencommunity_settings']->site_logo;

		$GLOBALS['zencommunity_settings']->can_see_all_members = (
			'guest' === ( $GLOBALS['zencommunity_settings']->community_visibility ?? 'guest' ) ? 'guest' : ( $GLOBALS['zencommunity_settings']->can_see_all_members ?? 'guest')
		);
	}

	/**
	 * Get queue instance.
	 *
	 * @return ActionQueue
	 * @throws ZencommunityException
	 */
	public function queue(): ActionQueue {
		return ActionQueue::get_instance();
	}

	public function activate() {
		ZenCommunity\Installer::init();
	}

	/**
	 * Send a fresh activation straight into the Setup Wizard. Hooked to
	 * `activated_plugin` rather than done inline in activate() (a redirect
	 * can't happen from within the activation hook itself), and fires
	 * synchronously in the same request as the activation click - unlike a
	 * transient consumed on the *next* admin_init, this doesn't depend on a
	 * second request ever landing, so nothing (a slow network, the server
	 * hiccuping between the two requests) can silently swallow the redirect.
	 *
	 * @param string $plugin       Plugin basename being activated.
	 * @param bool   $network_wide Whether this was a network-wide activation.
	 */
	public function activated_redirect( $plugin, $network_wide = null ) {
		if ( ZENCOMMUNITY_PLUGIN_BASENAME !== $plugin || get_option( 'zencommunity_has_redirect_to_setup_wizard' ) ) {
			return;
		}

		// Redirecting here would cut short a bulk activation (the other
		// plugins never get activated), and makes no sense for WP-CLI, ajax
		// or a whole network. Leave a note instead, and open setup on the
		// next ordinary admin page.
		$bulk = isset( $_POST['checked'] ) || isset( $_GET['activate-multi'] ); // phpcs:ignore WordPress.Security.NonceVerification -- read only, to tell a bulk action apart.
		if ( $network_wide || $bulk || wp_doing_ajax() || ( defined( 'WP_CLI' ) && WP_CLI ) ) {
			set_transient( 'zencommunity_activation_redirect', 1, DAY_IN_SECONDS );
			return;
		}

		update_option( 'zencommunity_has_redirect_to_setup_wizard', true, false );
		wp_safe_redirect( admin_url( 'admin.php?page=' . ZenCommunity\Setup::PAGE_ID ) );
		exit;
	}

	/**
	 * Open setup once, on the first ordinary admin page after an activation
	 * that could not redirect straight away (see activated_redirect()).
	 */
	public function maybe_redirect_to_setup_wizard() {
		if ( ! get_transient( 'zencommunity_activation_redirect' ) || wp_doing_ajax() || is_network_admin() || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		delete_transient( 'zencommunity_activation_redirect' );

		if ( get_option( 'zencommunity_has_redirect_to_setup_wizard' ) ) {
			return;
		}

		update_option( 'zencommunity_has_redirect_to_setup_wizard', true, false );
		wp_safe_redirect( admin_url( 'admin.php?page=' . ZenCommunity\Setup::PAGE_ID ) );
		exit;
	}

	public function deactivate() {
		$this->queue()->cancel_all( 'zencommunity_cleanup_uploads' );
		$this->queue()->cancel_all( 'zenc_delete_group_files' );
	}
}

/**
 * Initializes the main plugin
 *
 * @return \ZenCommunity
 */
function zencommunity_start() {
	return ZenCommunity::init();
}

// Plugin Start
zencommunity_start();
