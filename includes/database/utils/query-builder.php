<?php
namespace ZenCommunity\Database\Utils;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Exceptions\ZencommunityException;
class QueryBuilder extends Common {
    protected string $select = '';
    protected string $from;
    protected array $joins = [];
    protected array $where_clauses = [];
    protected ?string $group_by = null;
    protected array $order_by = [];
    protected ?int $limit = null;
    protected ?int $offset = null;
    protected ?int   $cache_seconds = null;
    protected ?string $cache_key     = null;
    protected string $cache_group   = 'zenc_queries';
    protected array $unions = [];

    public static function ins() : self {
        return new static;
    }

    protected function sanitize_alias( string $alias ): string {
        if ( ! preg_match( '/^[a-zA-Z_][a-zA-Z0-9_]*$/', $alias ) ) {
            // translators: %s is alias
            throw new ZencommunityException( esc_html( sprintf( __( 'Invalid alias: %s', 'zencommunity' ), $alias ) ), 500 );
        }
        return $alias;
    }

    protected function sanitize_column( string $column ): string {
        // Trim and basic cleanup.
        $column = trim( $column );
    
        // Disallow obviously dangerous content.
        if (
            strpos( $column, ';' ) !== false ||
            strpos( $column, '--' ) !== false ||
            strpos( $column, '#' ) !== false
        ) {
            throw new ZencommunityException(
                esc_html(
                    // translators: %s is column
                    sprintf( __( 'Potentially unsafe column expression: %s', 'zencommunity' ), $column )
                ),
                500
            );
        }
    
        // Whitelisted functions - add more if needed.
        $allowed_functions = array(
            'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'GROUP_CONCAT',
            'IF', 'CASE', 'CAST', 'CONCAT', 'LENGTH', 'TRIM', 'SUBSTRING',
            'JSON_OBJECT', 'JSON_EXTRACT', 'DATE_FORMAT', 'NOW', 'LOWER', 'UPPER',
            'COALESCE', 'ROUND', 'FLOOR', 'CEIL', 'ABS', 'END', 'WHEN', 'THEN', 'ELSE',
            'LEAST', 'GREATEST', 'MONTH', 'YEAR', 'DAY', 'YEARWEEK', 'CURRENT_DATE', 'DATE', 'IN'
        );
    
        // Allow wildcards.
        if ( preg_match( '/^([a-zA-Z_][a-zA-Z0-9_]*\.)?\*$/', $column ) ) {
            return $column;
        }
    
        // Allow simple columns or table.column.
        if ( preg_match( '/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/', $column ) ) {
            return $column;
        }
    
        // Quoted column name (e.g., "col" or 'col')
        if ( preg_match( '/^[\'"][a-zA-Z_][a-zA-Z0-9_]*[\'"]$/', $column ) ) {
            return $column;
        }

        // Allow DISTINCT expressions.
        if ( preg_match( '/^DISTINCT\s+(.+)$/i', $column, $m ) ) {
            $inner = $this->sanitize_column( $m[1] );
            return "DISTINCT $inner";
        }
    
        // Allow expressions with aliases.
        if ( preg_match( '/^(.+)\s+AS\s+([a-zA-Z_][a-zA-Z0-9_]*)$/i', $column, $m ) ) {
            $expression = $this->sanitize_column( $m[1] );
            $alias      = $m[2];
            return "$expression AS $alias";
        }
    
        // Allow basic math/logic operations and function calls.
        if ( preg_match( '/^[\(\)\s0-9a-zA-Z_\.\+\-\*\/\,\'\"\<\>\=\!]+$/', $column ) ) {
            // Validate function names.
            if ( preg_match_all( '/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/', $column, $funcs ) ) {
                foreach ( $funcs[1] as $func ) {
                    if ( ! in_array( strtoupper( $func ), $allowed_functions, true ) ) {
                        throw new ZencommunityException(
                            esc_html(
                                // translators: %s is SQL Function
                                sprintf( __( 'Function not allowed: %s', 'zencommunity' ), $func )
                            ),
                            500
                        );
                    }
                }
            }
    
            // Optionally validate identifiers (columns).
            if ( preg_match_all( '/\b([a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?)\b/', $column, $words ) ) {
                foreach ( $words[1] as $word ) {
                    // Skip known functions.
                    if ( in_array( strtoupper( $word ), $allowed_functions, true ) ) {
                        continue;
                    }
    
                    // Skip numeric values.
                    if ( preg_match( '/^\d+$/', $word ) ) {
                        continue;
                    }
    
                    // Add more SQL keywords if needed (optional).
                }
            }
    
            return $column;
        }
    
        // Final fallback.
        throw new ZencommunityException(
            esc_html(
                // translators: %s is column
                sprintf( __( 'Invalid column expression: %s', 'zencommunity' ), $column )
            ),
            500
        );
    }
    
    protected function sanitize_columns( array $columns = [] ) : string {
        return implode( ', ', array_map( function ( $key, $value ) {
            if ( is_int( $key ) ) {
                // Case 1: Numeric key, meaning no explicit alias provided.
                return $this->sanitize_column( $value );
            } elseif ( is_callable( $value ) ) {
                // Case 2: The value is a closure, indicating a subquery in SELECT.
                // $key is the alias for the subquery result.
                $subquery = new static();
                $value( $subquery ); // Execute closure on subquery
    
                if ( empty( $subquery->from ) ) {
                    throw new ZencommunityException( esc_html( sprintf( __( 'Subquery in SELECT must define a FROM clause.', 'zencommunity' ) ) ), 500 );
                }
    
                // Subquery in select: should not return more than 1 row
                $subquery->limit(1);
                $sql = $subquery->get_select();
                $sql .= $subquery->get_join();
    
                list( $where_sql, $bindings  ) = $subquery->build_where();
                $sql .= ' ' . $where_sql;
                $sql .= $subquery->get_extra();
                $sql = $subquery->prepare( $sql, ...$bindings );
                return '(' . $sql . ') AS ' . $this->sanitize_alias( $key ); // Ensure alias is sanitized
            } else {
                $column = $this->sanitize_column( $key ); 
                $alias  = $this->sanitize_alias( $value );
                return "{$column} AS {$alias}";
            }
        }, array_keys( $columns ), $columns ) );
    }
    

    protected function sanitize_table( string $table ): string {
        if ( ! preg_match( '/^[a-zA-Z_][a-zA-Z0-9_]*$/', $table ) ) {
            throw new ZencommunityException( esc_html( sprintf( "Invalid table name: %s", $table ) ), 500 );
        }
        return $table;
    }

    protected function get_placeholder( $value, ?string $placeholder = null ) : string {
        if ( ! empty( $placeholder ) ) {
            if ( in_array( $placeholder, [ '%d', '%f', '%s' ], true ) ){
                return $placeholder;
            }
            throw new ZencommunityException( esc_html( sprintf( "Invalid placeholder: %s", $placeholder ) ), 500 );
        }
        
        if ( is_int( $value ) ) {
            return '%d';
        } elseif ( is_float( $value ) ) {
            return '%f';
        }
        return '%s';
    }
    
    public function select( array $columns ) : self {
        $this->select = $this->sanitize_columns( $columns );
        return $this;
    }

    public function from( string $table, ?string $alias = null ) : self {
        $this->from = $this->table( $this->sanitize_table( $table ) ) . ( empty( $alias ) ? '' : ' ' . $this->sanitize_alias( $alias ) );
        return $this;
    }

    public function join( string $table, ?string $alias, $on, string $type = 'INNER' ) : self {
        $allowed_types = [ 'INNER', 'LEFT', 'RIGHT', 'FULL OUTER' ];
        $type = strtoupper( $type );

        if ( ! in_array( $type, $allowed_types, true ) ) {
            // translators: %s is join type
            throw new ZencommunityException( esc_html( sprintf( __( "Invalid JOIN type: %s", 'zencommunity' ), $type ) ), 500 );
        }

        $table = $this->table( $this->sanitize_table( $table ) ) . ( empty( $alias ) ? '' : ' ' . $this->sanitize_alias( $alias ) );

        if ( is_array( $on ) ) {
            $on_clauses = array_map( function( array $condition ) : string {
                if ( count( $condition ) !== 3 ) {
                    throw new ZencommunityException( esc_html( __( "Invalid ON clause format.", 'zencommunity' ) ), 500 );
                }
                list( $left, $operator, $right ) = $condition;

                $allowed_operators = [ '=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'NOT LIKE' ];
                if ( ! in_array( $operator, $allowed_operators, true ) ) {
                    // translators: %s is oparator
                    throw new ZencommunityException( esc_html( sprintf( __( "Invalid ON clause operator: %s", 'zencommunity' ), $operator ) ), 500 );
                }

                $left  = $this->sanitize_column( $left );
                // $right = $this->sanitize_column( $right );
                if ( is_array( $right ) && isset( $right['value'] ) ) {
                    // Use placeholder safely
                    $value = $right['value'];
                    $placeholder = $this->get_placeholder( $value );
                    $right = $this->prepare( $placeholder, $value );
                } else {
                    // Otherwise treat as column
                    $right = $this->sanitize_column( $right );
                }

                return "{$left} {$operator} {$right}";
            }, $on );
            $on_clause = implode( ' AND ', $on_clauses );
        } 
        else {
            if ( ! preg_match( '/^\s*([a-zA-Z_][\w.]+)\s*(=|!=|<|>|<=|>=)\s*([a-zA-Z_][\w.]+)\s*$/', $on ) ) {
                throw new ZencommunityException( esc_html( __( "Unsafe ON clause.", 'zencommunity' ) ), 500 );
            }
            $on_clause = $on;
        }

        $this->joins[] = "{$type} JOIN {$table} ON {$on_clause}";
        return $this;
    }
    
    public function where( string $column, string $operator = '=', $value = null, ?string $placeholder = null ) : self {
        return $this->add_where( 'AND', $column, $operator, $value, $placeholder );
    }

    public function or_where( string $column,  string $operator = '=', $value = null, ?string $placeholder = null ) : self {
        return $this->add_where( 'OR', $column, $operator, $value, $placeholder );
    }

    public function where_group( callable $cb ) {
        return $this->add_group( 'AND', $cb );
    }
    
    public function or_where_group(callable $cb) {
        return $this->add_group( 'OR', $cb );
    }
    
    protected function add_group( string $relation, callable $cb ) {
        $sub_query = new static(); 
        $cb($sub_query);
    
        list( $group_sql, $bindings ) = $sub_query->build_where();
        $group_sql = trim( $group_sql );
    
        if ($group_sql) {
            $group_sql = preg_replace( '/^WHERE\s+/i', '', $group_sql );
            $this->where_clauses[] = [
                'relation' => $relation,
                'query'   => '(' . $group_sql . ')',
                'binding' => $bindings
            ];
        }
    
        return $this;
    }
    
    protected function add_where( string $relation,  string $column,  string $operator, $value, ?string $placeholder = null ) : self {
        $allowed_operators = [ '=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'NOT LIKE' ];
        if ( ! in_array( $operator, $allowed_operators, true ) ) {
            // translators: %s is oparator
            throw new ZencommunityException( esc_html( sprintf( __( "Invalid operator: %s", 'zencommunity' ), $operator ) ), 500 );
        }
        $column = $this->sanitize_column( $column );
        
        if ( is_array( $value ) && isset( $value['expr'] ) ) {
            $placeholder = $value['expr'];
            $value = [];
        }
        else {
            $placeholder = $this->get_placeholder( $value, $placeholder );
        }

        $this->where_clauses[] = [
            'relation' => $relation,
            'query'   => "$column $operator $placeholder",
            'binding' => $value
        ];
        return $this;
    }

    public function where_in( string $column, array $values, ?string $placeholder = null  ) : self {
        if ( empty( $values ) ){ 
            return $this;
        }
        $column = $this->sanitize_column( $column );
        
        $placeholders = implode( ', ', 
            array_fill(
                0, 
                count( $values ), 
                $this->get_placeholder( reset( $values ), $placeholder ) 
            ) 
        );

        $this->where_clauses[] = [
            'relation' => 'AND',
            'query'    => "$column IN ($placeholders)",
            'binding'  => $values
        ];
        return $this;
    }

    public function where_not_in( string $column, array $values, ?string $placeholder = null ) : self {
        if ( empty( $values ) ) {
            return $this;
        }
        $column = $this->sanitize_column( $column );
        $placeholders = implode( 
            ', ', 
            array_fill(
                0, 
                count( $values ), 
                $this->get_placeholder( reset( $values ), $placeholder ) 
            )
        );
        $this->where_clauses[] = [
            'relation' => 'AND',
            'query'    => "$column NOT IN ($placeholders)",
            'binding'  => $values
        ];
        return $this;
    }

    public function where_in_subquery( string $column, callable $cb, string $relation = 'AND' ) : self {
        $column = $this->sanitize_column( $column );
    
        $sub_query = new static();
        $cb( $sub_query );
    
        if ( empty( $sub_query->from ) ) {
            throw new ZencommunityException( esc_html( __( 'Subquery in IN clause must define a FROM clause.', 'zencommunity' ) ), 500 );
        }
    
        $sql = '';
        $sql .= $sub_query->get_select();
        $sql .= $sub_query->get_join();
    
        list( $where_sql, $bindings ) = $sub_query->build_where();
        $sql .= ' ' . $where_sql;
        $sql .= $sub_query->get_extra();
    
        $this->where_clauses[] = [
            'relation' => $relation,
            'query'    => "$column IN ($sql)",
            'binding'  => $bindings
        ];
    
        return $this;
    }

    public function where_not_in_subquery( string $column, callable $cb, string $relation = 'AND' ) : self {
        $column = $this->sanitize_column( $column );
    
        $sub_query = new static();
        $cb( $sub_query );
    
        if ( empty( $sub_query->from ) ) {
            throw new ZencommunityException( esc_html( __( 'Subquery in IN clause must define a FROM clause.', 'zencommunity' ) ), 500 );
        }
    
        $sql = '';
        $sql .= $sub_query->get_select();
        $sql .= $sub_query->get_join();
    
        list( $where_sql, $bindings ) = $sub_query->build_where();
        $sql .= ' ' . $where_sql;
        $sql .= $sub_query->get_extra();
    
        $this->where_clauses[] = [
            'relation' => $relation,
            'query'    => "$column NOT IN ($sql)",
            'binding'  => $bindings
        ];
    
        return $this;
    }

    public function or_where_in_subquery( string $column, callable $cb, string $relation = 'AND' ) : self {
        return $this->where_in_subquery( $column, $cb, 'OR' );
    }

    public function or_where_not_in_subquery( string $column, callable $cb, string $relation = 'AND' ) : self {
        return $this->where_not_in_subquery( $column, $cb, 'OR' );
    }

    public function where_null( string $column ) : self {
        $column = $this->sanitize_column( $column );
        $this->where_clauses[] = [
            'relation' => 'AND',
            'query'    => "$column IS NULL",
            'binding'  => []
        ];
        return $this;
    }

    public function where_not_null( string $column ) : self {
        $column = $this->sanitize_column( $column );
        $this->where_clauses[] = [
            'relation' => 'AND',
            'query'    => "$column IS NOT NULL",
            'binding'  => []
        ];
        return $this;
    }

    public function or_where_null( string $column ) : self {
        $column = $this->sanitize_column( $column );
        $this->where_clauses[] = [
            'relation' => 'OR',
            'query'    => "$column IS NULL",
            'binding'  => []
        ];
        return $this;
    }

    public function or_where_not_null( string $column ) : self {
        $column = $this->sanitize_column( $column );
        $this->where_clauses[] = [
            'relation' => 'OR',
            'query'    => "$column IS NOT NULL",
            'binding'  => []
        ];
        return $this;
    }

    protected function _where_between( string $relation, string $column, array $values, bool $not_between = false ) : self {
        if ( count( $values ) !== 2 ) {
            throw new ZencommunityException( esc_html( __( "BETWEEN operator requires exactly two values.", 'zencommunity' ) ), 500 );
        }

        $operator = $not_between ? 'NOT BETWEEN' : 'BETWEEN';
        $column   = $this->sanitize_column( $column );

        $bindings = [];
        $placeholders = [];

        foreach ( $values as $value ) {
            if ( is_array( $value ) && isset( $value['expr'] ) ) {
                $placeholders[] = $value['expr'];
            } else {
                $placeholders[] = $this->get_placeholder( $value );
                $bindings[]     = $value;
            }
        }

        $query = "$column $operator {$placeholders[0]} AND {$placeholders[1]}";

        $this->where_clauses[] = [
            'relation' => $relation,
            'query'    => $query,
            'binding'  => $bindings,
        ];

        return $this;
    }

    
    public function where_between( string $column, array $values ) : self {
        return $this->_where_between( 'AND', $column, $values );
    }

    public function or_where_between( string $column, array $values ) : self {
        return $this->_where_between( 'OR', $column, $values );
    }
    
    public function where_not_between( string $column, array $values ) : self {
        return $this->_where_between( 'AND', $column, $values, true );
    }

    public function or_where_not_between( string $column, array $values ) : self {
        return $this->_where_between( 'OR', $column, $values, true );
    }
    
    protected function _where_subquery( string $relation, string $column, string $operator, callable $cb ) : self {
        $column = $this->sanitize_column( $column );
        $relation = strtoupper( $relation );
        if ( ! in_array( $relation, [ 'AND', 'OR'], true ) ) {
            throw new ZencommunityException( esc_html( __( 'Invalid relation.', 'zencommunity' ) ), 500 );
        }

        $allowed_operators = [ '=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'NOT LIKE' ];
        if ( ! in_array( $operator, $allowed_operators, true ) ) {
            // translators: %s is oparator
            throw new ZencommunityException( esc_html( sprintf( __( "Invalid operator: %s", 'zencommunity' ), $operator ) ), 500 );
        }

        $sub_query = new static();
        $cb( $sub_query );
    
        if ( empty( $sub_query->from ) ) {
            throw new ZencommunityException( esc_html( __( 'Subquery  must define a FROM clause.', 'zencommunity' ) ), 500 );
        }
    
        $sql = '';
        $sql .= $sub_query->get_select();
        $sql .= $sub_query->get_join();
    
        list( $where_sql, $bindings ) = $sub_query->build_where();
        $sql .= ' ' . $where_sql;
        $sql .= $sub_query->get_extra();
    
        $this->where_clauses[] = [
            'relation' => $relation,
            'query'    => "$column $operator ($sql)",
            'binding'  => $bindings
        ];
    
        return $this;
    }

    public function where_subquery( string $column, string $operator, callable $cb ) : self {
        return $this->_where_subquery( 'AND', $column, $operator, $cb );
    }

    public function or_where_subquery( string $column, string $operator, callable $cb ) : self {
        return $this->_where_subquery( 'OR', $column, $operator, $cb );
    }

    public function cache( int $seconds = 3600,  ?string $key = null ) : self {
        $this->cache_seconds = $seconds;
        $this->cache_key     = $key;
        return $this;
    }

    protected function generate_cache_key( string $sql, array $bindings, string $pre = '' ) : string {
        if ( $this->cache_key ) { 
            return $this->cache_key;
        }
        ksort( $bindings );
        return implode( '_', [ 'qb', $pre, md5( $sql . serialize( $bindings ) ) ] );
    }


    
    protected function build_where() : array {
        if ( empty( $this->where_clauses ) ) {
            return [ '', [] ];
        }

        $sql_parts = [];
        $bindings = [];

        foreach ( $this->where_clauses as $i => $clause ) {
            $prefix = $i === 0 ? '' : $clause['relation'] . ' ';
            $sql_parts[] = $prefix . $clause['query'];

            if ( is_array( $clause['binding'] ) ) {
                $bindings = array_merge( $bindings, $clause['binding'] );
            } elseif ( $clause['binding'] !== null ) {
                $bindings[] = $clause['binding'];
            }
        }

        return [ 'WHERE ' . implode( ' ', $sql_parts ), $bindings ];
    }

    public function group_by( array $columns ) : self {
        $this->group_by = $this->sanitize_columns( $columns );
        return $this;
    }
    
    public function order_by( string $column, string $direction = 'ASC' ) : self {
        $direction = strtoupper( $direction );
        if ( ! in_array( $direction, [ 'ASC', 'DESC' ], true  ) ) {
            // translators: %s is direction
            throw new ZencommunityException( esc_html( sprintf( __( "Invalid direction: %s", 'zencommunity' ), $direction ) ), 500 );
        }
        $column = $this->sanitize_column( $column );

        $this->order_by[] = "{$column}  {$direction}";
        return $this;
    }
    
    public function limit( int $limit ) : self {
        $this->limit = $limit;
        return $this;
    }
    
    public function offset( int $offset ) : self {
        $this->offset = $offset;
        return $this;
    }
    
    public function where_column( string $left_column, string $operator = '=', string $right_column = '' ) : self {
        return $this->add_column_where( 'AND', $left_column, $operator, $right_column );
    }
    
    public function or_where_column( string $left_column, string $operator = '=', string $right_column = '' ) : self {
        return $this->add_column_where( 'OR', $left_column, $operator, $right_column );
    }
    
    protected function add_column_where( string $relation, string $left_column, string $operator, string $right_column ) : self {
        $allowed_operators = [ '=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'NOT LIKE' ];
    
        if ( ! in_array( $operator, $allowed_operators, true ) ) {
            // translators: %s is oparator
            throw new ZencommunityException( esc_html( sprintf( __( 'Invalid operator: %s', 'zencommunity' ), $operator ) ), 500 );
        }
    
        $left_column  = $this->sanitize_column( $left_column );
        $right_column = $this->sanitize_column( $right_column );
    
        $this->where_clauses[] = [
            'relation' => $relation,
            'query'    => "$left_column $operator $right_column",
            'binding'  => [],
        ];
    
        return $this;
    }
    
    public function where_exists( callable $cb ) {
        return $this->add_exists_clause( 'EXISTS', $cb );
    }
    
    public function where_not_exists( callable $cb ) {
        return $this->add_exists_clause( 'NOT EXISTS', $cb );
    }
    
    public function or_where_exists( callable $cb ) {
        return $this->add_exists_clause( 'EXISTS', $cb, 'OR' );
    }
    
    public function or_where_not_exists( callable $cb ) {
        return $this->add_exists_clause( 'NOT EXISTS', $cb, 'OR' );
    }
    
    protected function add_exists_clause( string $type, callable $cb, string $relation = 'AND' ) : self {
        $sub_query = new self();
        $cb( $sub_query );

        if ( empty( $sub_query->from ) ) {
            throw new ZencommunityException( esc_html( __( 'Subquery in EXISTS must define a FROM clause.', 'zencommunity' ) ), 500 );
        }

        $sql = '';
        $sql .= $sub_query->get_select('1');
        $sql .= $sub_query->get_join();

        list( $where_sql, $bindings ) = $sub_query->build_where();
        $sql .= ' ' . $where_sql;

        $sql .= $sub_query->get_extra();

        $this->where_clauses[] = [
            'relation' => $relation,
            'query'    => "$type ($sql)",
            'binding'  =>  $bindings
        ];
    
        return $this;
    }

    public function prepare( string $sql, ...$bindings ) : ?string {
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        return empty( $bindings ) ? $sql : $this->wpdb->prepare( $sql, ...$bindings );
    }

    public function get() : array {
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        return $this->results( fn( string $sql, array $bindings) : array => $this->wpdb->get_results( $this->prepare( $sql, ...$bindings ), ARRAY_A ) ?? [], 'get' );
    }

    public function first() : array {
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        return $this->results( fn( string $sql, array $bindings) : array => $this->wpdb->get_row( $this->prepare( $sql, ...$bindings ), ARRAY_A ) ?? [], 'first' );
    }

    public function dump() : array {
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        return  $this->results( fn( string $sql, array $bindings) : array =>  [ 'sql' => $sql, 'bindings'=> $bindings, 'final' => $this->prepare( $sql, ...$bindings ) ], 'sql' );
    }
    
    public function value( string $column ) {
        $qb_clone = clone $this;
        $qb_clone->select = $this->sanitize_column( $column );
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $result = $qb_clone->results( fn( string $sql, array $bindings) => $qb_clone->wpdb->get_var( $qb_clone->prepare( $sql, ...$bindings ) ) , 'value' );
        return empty( $result )  ? null : $result;

    }
    
    public function values( string $column, bool $is_distinct = false ) : array {
        $qb_clone = clone $this;
        $qb_clone->select = $this->sanitize_column( ( $is_distinct ? 'DISTINCT ' : '' ) . $column );
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $result = $qb_clone->results( fn( string $sql, array $bindings) => $qb_clone->wpdb->get_col( $qb_clone->prepare( $sql, ...$bindings ) ) , 'values' );
        return empty( $result )  ? [] : $result;
    }

    public function count( string $column = '*', bool $distinct = false ) : int {
        $qb_clone = clone $this;
        $column = $this->sanitize_column( $column );
        $qb_clone->select = ( $distinct ? "COUNT(DISTINCT {$column})" : "COUNT({$column})" );
        $qb_clone->order_by = [];
        $qb_clone->limit    = null;
        $qb_clone->offset   = null;
        $qb_clone->group_by = null;
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        return $qb_clone->results( fn( string $sql, array $bindings) : int => absint( $qb_clone->wpdb->get_var( $qb_clone->prepare( $sql, ...$bindings ) ) ), 'count' );
    }
    
    public function paginate( int $page = 0, int $per_page = 15, string $column = '*', bool $distinct = false ) : array {
        $total = $this->count( $column, $distinct );
        $page = max( 1, absint( $page ) );
        $per_page = absint( $per_page );
        $pages = ceil( $total / $per_page );
        $offset = ( $page - 1 ) * $per_page; 
        $records = $total > 0 ? $this->offset( $offset )->limit( $per_page )->get() : [];
        return [
            'total'    => $total,
            'pages'    => $pages,
            'page'     => $page,
            'per_page' => $per_page,
            'records'  => $records,
        ];
    }

    protected function get_select( ?string $select = null ) : string {
        $select = empty( $select ) ? $this->select : $select;
        
        if ( empty( $select ) ) {
            throw new ZencommunityException( esc_html( __( 'SELECT clause must be defined explicitly.', 'zencommunity' ) ), 500 );
        }

        return "SELECT {$select} FROM {$this->from}";
    }

    protected function get_join() : string {
        return $this->joins ? ' ' . implode( ' ', $this->joins ) : '';
    }

    protected function get_extra() : string {
        $sql = '';
        if ( $this->group_by ) {
            $sql .= " GROUP BY {$this->group_by}";
        }
        if ( ! empty( $this->order_by ) ) {
            $sql .= " ORDER BY " . implode( ', ', $this->order_by );
        }
        if ( $this->limit !== null ) {
            $sql .= " LIMIT {$this->limit}";
        }
        if ( $this->offset !== null ) {
            $sql .= " OFFSET {$this->offset}";
        }
        return $sql;
    }

    public function union( callable $cb ) : self {
        return $this->add_union( $cb, false );
    }

    public function union_all( callable $cb ) : self {
        return $this->add_union( $cb, true );
    }

    protected function add_union( callable $cb, bool $is_all ) : self {
        $sub_query = new static();
        $cb( $sub_query );

        if ( empty( $sub_query->from ) ) {
            throw new ZencommunityException( esc_html( __( 'Subquery in UNION must define a FROM clause.', 'zencommunity' ) ), 500 );
        }

        $sql = $sub_query->get_select();
        $sql .= $sub_query->get_join();

        list( $where_sql, $bindings ) = $sub_query->build_where();
        $sql .= ' ' . $where_sql;
        $sql .= $sub_query->get_extra();

        $this->unions[] = [
            'type'    => $is_all ? 'UNION ALL' : 'UNION',
            'sql'     => $sql,
            'binding' => $bindings,
        ];

        return $this;
    }

    
    protected function results( callable $cb, string $cache_key_prefix ) {
        $sql = '';
        if ( 0 < count( $this->unions ) ) {
            $unions = [];
            foreach ( $this->unions as $union ) {
                // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare
                $unions[] = ( count( $unions ) > 0 ? $union['type'] . ' ' : '' ) . '(' . $this->wpdb->prepare( $union['sql'], ...$union['binding'] ) . ')';
            }
            $this->from = '(' . implode( ' ', $unions ) . ') as unioned_query';
        }
        $sql .= $this->get_select();
        $sql .= $this->get_join();

        list( $where_sql, $bindings ) = $this->build_where();
        $sql .= ' ' . $where_sql;

        $sql .= $this->get_extra();

        if ( $this->cache_seconds !== null ) {
            $key = $cache_key_prefix . $this->generate_cache_key( $sql, $bindings );
            $cached = wp_cache_get( $key, $this->cache_group );
            if ( $cached !== false ){
                return $cached;
            }
        }
        
        $result = $cb( $sql, $bindings );
        $this->debug();

        if ( $this->cache_seconds !== null ) {
            wp_cache_set( $key, $result, $this->cache_group, $this->cache_seconds );
        }

        return $result;
    }

    public function update( array $data ) : bool  {
        if ( empty( $this->from ) ) {
            throw new ZencommunityException( esc_html( __( "Missing FROM clause", 'zencommunity' ) ), 500 );
        }

        $set_parts = [];
        $set_bindings = [];

        foreach ( $data as $column => $value ) {
            $column = $this->sanitize_column( $column ); 
            $set_parts[] = "$column = " . $this->get_placeholder( $value );
            $set_bindings[] = $value;
        }

        $sql = "UPDATE {$this->from}";
        if ( $this->joins) $sql .= ' ' . implode( ' ', $this->joins );

        list( $where_sql, $where_bindings ) = $this->build_where();
        $sql .= ' SET ' . implode( ', ', $set_parts ) . ' ' . $where_sql;

        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $is_updated = $this->wpdb->query( $this->prepare( $sql, ...array_merge( $set_bindings, $where_bindings ) ) )  !== false;
        $this->debug();
        return $is_updated;
    }

    public function delete() : bool {
        if ( empty( $this->from ) ) {
            throw new ZencommunityException( esc_html( __( "Missing FROM clause", 'zencommunity' ) ), 500 );
        }
        
        $sql   = '';
        $alias = '';
        if ( empty( $this->joins ) ) {
            // removing alias if no join query: remomove from FROM clause
            $parts = preg_split( '/\s+/i', trim( $this->from ) );
            $from  = $parts[0];
            $alias = end( $parts );
            $sql   = "DELETE FROM {$from}";
        } else {
            $sql = "DELETE FROM {$this->from}";
        }
    
        if ( ! empty( $this->joins ) ) {
            $sql .= ' ' . implode( ' ', $this->joins );
        }
    
        list( $where_sql, $bindings ) = $this->build_where();
        // removing alias if no join query: remomove from where
        if ( ! empty( $alias ) ) {
            $where_sql = preg_replace( 
                '/\b' . preg_quote( $alias, '/' ) . '\./', 
                '', 
                $where_sql
            );
        }
    
        $sql .= ' ' . $where_sql;

        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $is_deleted = $this->wpdb->query( $this->prepare( $sql, ...$bindings ) ) !== false;
        $this->debug();
        return $is_deleted;
    }
    
    public function create( string $table, array $data ) {
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        if ( false === $this->wpdb->insert( $this->table( $table ), $data ) ) {
            $this->debug();
            return null;
        }
        return $this->wpdb->insert_id;
    }

    protected function debug() : void {
        if ( $this->wpdb->last_error && defined('WP_DEBUG') && WP_DEBUG && current_user_can('manage_options') ) {
            // translators: %s The database error message.
            throw new ZencommunityException( esc_html( sprintf( __( 'Database error: %s', 'zencommunity' ), $this->wpdb->last_error ) ), 500 );
        }
    }
}
