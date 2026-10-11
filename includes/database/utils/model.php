<?php
namespace ZenCommunity\Database\Utils;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/**
 * Abstract base Model class for interacting with database tables using QueryBuilder.
 */
abstract class Model {
	protected string $table;
	protected ?string $alias = null;
	// protected ?string $primary_key = null;
	protected array   $selects = ['*'];
	protected ?QueryBuilder $qb = null;

	public function __construct() {
	}

	/**
	 * Get the list of columns to select, applying alias if present.
	 */
	public function get_selects() : array {
		return empty( $this->alias ) ? $this->selects : array_map( fn( string $col ) => ( strpos($col, '.') === false ? $this->alias . '.' . $col : $col ), $this->selects );
	}

	/**
	 * Get the table alias.
	 */
	public function get_alias() : ?string {
		return $this->alias;
	}

	/**
	 * Get the table name.
	 */
	public function get_table() : ?string {
		return $this->table;
	}

	/**
	 * Get the QueryBuilder instance, initializing it if necessary.
	 */
	public function qb() : ?QueryBuilder {
		$this->qb = new QueryBuilder();
		$this->qb->select( $this->get_selects() )->from( $this->table, $this->alias );
		return $this->qb;
	}

	/**
	 * Join with another model and merge its selects.
	 */
	public function join_with( Model $model, string $on, string $type = 'INNER' ) : ?QueryBuilder {
		$this->qb()->select( array_merge( $this->get_selects(), $model->get_selects() ) );
		return $this->join(  $model, $on, $type );
	}

	/**
	 * Join with another model and select only its columns.
	 */
	public function join_only_with( Model $model, string $on, string $type = 'INNER' ) : ?QueryBuilder {
		$this->qb()->select( $model->get_selects() );
		return $this->join(  $model, $on, $type );
	}

	/**
	 * Perform a join with another model.
	 * $on : u.ID = {alias}.user_id, here {alias} willbe replacved with table alias
	 */
	public function join( Model $model, string $on, string $type = 'INNER' ) : ?QueryBuilder {
		return $this->qb()->join( $model->get_table(), $model->get_alias(), str_replace( '{alias}', $model->get_alias(), $on ), $type );
	}

	/**
	 * Create a new record & return the ID or null on failure
	 */
	public function insert( array $data ) {
		return $this->qb()->create( $this->table, $data );
	}

	/**
	 * Get a instance of the model.
	 */
	public static function ins() : self {
		return new static;
	}
}