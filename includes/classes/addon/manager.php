<?php
namespace ZenCommunity\Classes\Addon;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Exceptions\ZencommunityException;
/**
 * Manages Addons.
 */
class Manager {

	/**
	 * Option Name
	 *
	 * @const string
	 */
    const ADDON_SETTING_NAME = 'zenc_active_addons';

	/**
	 * All registered addons.
	 *
	 * @var array
	 */
	protected array $registered_addons = [];

	/**
	 * Activate on plugin activation.
	 *
	 * @var array
	 */
	protected array $activate_on_plugin_activation = [];

	/**
	 * Active addons.
	 *
	 * @var array
	 */
	protected array $activated_addons = [];

	/**
	 * Constructor.
	 */
	public function __construct() {
		$this->activated_addons = get_option( static::ADDON_SETTING_NAME, [] );
		do_action( 'zencommunity/addon/register', [ $this, 'register_addon' ] );
	}

	public function get_activated() : array {
		return array_intersect( 
			$this->activated_addons ?? [],
			array_keys( $this->registered_addons ?? [] )
		);
	}

	public function get_pre_activated() : array {
		return $this->registered_addons;
	}

	/**
	 * Register addon with class.
	 *
	 * @param string $key   Addon key.
	 * @param string $class Fully qualified class name.
	 */
	public function register_addon( string $key, string $class, bool $activate_on_plugin_activation = false ): void {
		if ( class_exists( $class ) && is_subclass_of( $class, Base::class ) ) {
			$this->registered_addons[ $key ] = $class;
			if ( $activate_on_plugin_activation && ! in_array( $key, $this->activate_on_plugin_activation ) ) {
				$this->activate_on_plugin_activation[] = $key;
			}
            return;
		}
		// translation is skip due to call too early
        // throw new ZencommunityException(  "Invalid addon." , 422 );
	}

	/**
	 * Activate addon.
	 *
	 * @param string $key Addon key.
	 */
	public function activate_addon( string $key ): void {
		if ( ! isset( $this->registered_addons[ $key ] ) ) {
            throw new ZencommunityException( esc_html( __( "Invalid addon key.", 'zencommunity' ) ), 422 );
		}

		$class = $this->registered_addons[ $key ];

		if ( ! class_exists( $class ) ) {
            throw new ZencommunityException( esc_html( __( "Addon bootstrap class not found.", 'zencommunity' ) ), 422 );
		}

		if ( ! is_subclass_of( $class, Base::class ) ) {
			throw new ZencommunityException( esc_html( __( "Addon bootstrap class is invalid.", 'zencommunity' ) ), 422 );
		}

		$addon = new $class();
		if ( in_array( $key, $this->activated_addons, true ) ) {
			throw new ZencommunityException( esc_html( __( "Addon is alredy activated.", 'zencommunity' ) ), 422 );
		}

		foreach( $addon->parent_addon_keys as $addon_key ) {
			if ( ! empty( $addon_key ) ) {
				if ( ! isset( $this->registered_addons[ $addon_key ] ) ) {
					throw new ZencommunityException( esc_html( __( "Parent addon is not exists.", 'zencommunity' ) ), 422 );
				}

				if ( ! in_array( $addon_key, $this->activated_addons, true ) ) {
					throw new ZencommunityException( esc_html( __( "Parent addon is not activated.", 'zencommunity' ) ), 422 );
				}
			}
		}

		$addon->activate();
		$this->activated_addons[] = $key;
		update_option( 'zenc_active_addons', $this->activated_addons );
		do_action( 'zencommunity/addon/activate', $key, $addon );
	}

	/**
	 * Deactivate addon.
	 *
	 * @param string $key Addon key.
	 */
	public function deactivate_addon( string $key ): void {
		if ( ! isset( $this->registered_addons[ $key ] ) ) {
            throw new ZencommunityException( esc_html( __( "Invalid addon key.", 'zencommunity' ) ), 422 );
		}

		$class = $this->registered_addons[ $key ];

		if ( ! class_exists( $class ) ) {
            throw new ZencommunityException( esc_html( __( "Addon bootstrap class not found.", 'zencommunity' ) ), 422 );
		}

		if ( ! is_subclass_of( $class, Base::class ) ) {
			throw new ZencommunityException( esc_html( __( "Addon bootstrap class is invalid.", 'zencommunity' ) ), 422 );
		}

		$addon = new $class();

		if ( ! in_array( $key, $this->activated_addons, true ) ) {
			throw new ZencommunityException( esc_html( __( "Addon is alredy deactivated.", 'zencommunity' ) ), 422 );
		}

		$addon->deactivate();
		$this->activated_addons = array_filter(
			$this->activated_addons,
			static fn( string $a ) : bool => $a !== $key
		);
		update_option( 'zenc_active_addons', $this->activated_addons );
	}

	/**
	 * Boot all active addons.
	 */
	public function boot_active_addons(): void {
		foreach ( $this->registered_addons as $key => $class ) {
			if ( in_array( $key, $this->activated_addons, true ) ) {
				$addon = new $class();
				$addon->boot();
			}
		}
	}

	/**
	 * Get registered addons.
	 */
	public function get_registered_addons(): array {
		return $this->registered_addons;
	}

	/**
	 * Get active addons.
	 */
	public function get_active_addons(): array {
		return $this->activated_addons;
	}
}
