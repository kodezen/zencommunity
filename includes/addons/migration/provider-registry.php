<?php
namespace ZenCommunity\Addons\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Addons\Migration\Contracts\ProviderInterface;

/**
 * Class ProviderRegistry
 *
 * Mirrors ZenCommunity\Classes\Addon\Manager's registration idiom: any plugin
 * (pro, or a future third-party extension) hooks
 * `zencommunity/migration/register_providers` to add its own migration
 * source, e.g.:
 *
 *   add_action( 'zencommunity/migration/register_providers', function( callable $register ) {
 *       $register( 'fluent_support', FluentSupportProvider::class );
 *   } );
 *
 * @package ZenCommunity\Addons\Migration
 */
class ProviderRegistry {

	/** @var array<string, string> provider key => fully qualified class name */
	protected static array $registered = [];

	protected static bool $booted = false;

	public static function boot() : void {
		if ( self::$booted ) {
			return;
		}
		self::$booted = true;
		do_action( 'zencommunity/migration/register_providers', [ static::class, 'register' ] );
	}

	public static function register( string $key, string $class ) : void {
		if ( ! class_exists( $class ) || ! in_array( ProviderInterface::class, class_implements( $class ) ?: [], true ) ) {
			return;
		}
		self::$registered[ $key ] = $class;
	}

	/** @return array<string, string> */
	public static function get_all() : array {
		self::boot();
		return self::$registered;
	}

	public static function get( string $key ) : ?ProviderInterface {
		self::boot();
		if ( ! isset( self::$registered[ $key ] ) ) {
			return null;
		}
		$class = self::$registered[ $key ];
		return new $class();
	}

	public static function exists( string $key ) : bool {
		self::boot();
		return isset( self::$registered[ $key ] );
	}
}
