<?php
namespace ZenCommunity\Database\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @class Migration
 */
abstract class Migration extends Common {
	
	/**
	 * @method up
	 * Run query on addon activation
	 * @param  void
	 * @return string
	 */
	abstract public function up(): string;
	
	/**
	 * @method down
	 * Run query on addon deactivation
	 * @param  void
	 * @return string
	 */
	abstract public function down(): string;

	/**
	 * @method migrate
	 * Run code statement on addon activation
	 * @param  void
	 * @return void
	 */
	public static function migrate(): void
	{
		self::execute( ( new static )->up() );
	}

	/**
	 * @method rollback
	 * Run code statement on addon deactivation
	 * @param  void
	 * @return void
	 */
	public static function rollback(): void
	{
		self::execute( ( new static )->down() );
	}

	/**
	 * @method execute
	 * Run SQL Query
	 * @param  string $query
	 * @return void
	 */
	protected static function execute( string $query ): void 
	{
		if ( empty( $query ) ) {
			return;
		}
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $query );
	}
}