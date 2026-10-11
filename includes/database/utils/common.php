<?php
namespace ZenCommunity\Database\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class Common
{
	protected string $prefix;
	protected string $charsetCollate;
	protected ?string $table = null;
	protected object $wpdb;

	public function __construct(){
		global $wpdb;
		$this->wpdb           = $wpdb;
		$this->prefix         = $this->wpdb->prefix;
		$this->table          = $this->prefix . $this->table;
		$this->charsetCollate = $this->wpdb->get_charset_collate();
	}

	public static function add_prefix( string $table ) : string
	{
		global $wpdb;
		return $wpdb->prefix . $table;
	}

	public function table( string $table ) : string
	{
		return $this->prefix . $table;
	}
}
