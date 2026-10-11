<?php
namespace ZenCommunity\Addons\Email\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Database\Utils\{ Model, QueryBuilder };
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Helper;

class Template extends Model {
	protected string $table = 'zenc_email_templates';
	protected ?string $alias = 'tm';
	protected array   $selects = [
		'tm.*'
	];

	public static function wrapper( array $note ) : array {
		return $note;
	}

	public static function collection_wrapper( array $notes ) : array {
		$data = [];
		foreach ( $notes as $note ) {
			$data[] = static::wrapper( $note );
		}
		return $data;
	}


	/**
	 * Check if a Template exists by ID.
	 *
	 * @param int $id
	 * @return bool
	 */
	public static function exists( string $event ) : bool {
		return $qb = static::ins()->qb()->where( 'tm.event', '=', $event )->count() > 0;
	}
    
	public static function by_id( int $id ) : ?array {
		$qb = static::ins()->qb()->where( 'tm.id', '=', $id );

		if ( empty( $data = $qb->first() ) ) {
			throw new ZencommunityException( esc_html( __( 'Record not found.', 'zencommunity' ) ), 404 );
		}
		
		return  static::wrapper( $data );;
	}

	public static function by_event( string $event, ?bool $is_active = null ) : ?array {
		$qb = static::ins()->qb()->where( 'tm.event', '=', $event );
		
		if ( true === $is_active ) {
			$qb->where( 'tm.status', '=', 'active' );
		}
		else if ( false === $is_active ) {
			$qb->where( 'tm.status', '=', 'inactive' );
		}

		if ( empty( $data = $qb->first() ) ) {
			throw new ZencommunityException( esc_html( __( 'Record not found.', 'zencommunity' ) ), 404 );
		}
		
		return  static::wrapper( $data );;
	}

    public static function rescan_templates() : void {
		try  {
			$templates =  array_merge( 
				...static::template_loop( 
					function( array $template_info ) : array {
						return $template_info['events'];
					} 
				) 
			);
			
			$exists = static::ins()
					->qb()
					->where_in( 'tm.event', array_keys( $templates ) )
					->values( 'tm.event', true ) ?? [];

			foreach ( $templates as $event => $template ) {
				if (  in_array( $event, $exists ) ) continue;
				static::create( [
					'status' => 'active',
					'event' => $event,
					'template' => $template['template'],
					'subject' => $template['subject'],
					'heading' => $template['heading'],
				] );
			}
		}
		catch ( ZencommunityException $e ) {}
	}

    public static function get_templates( bool $only_event = false ) : array {
		$templates =  static::template_loop( function( array $template_info ) use( $only_event ) : array {
			if ( $only_event ) {
				return $template_info['events'];
			}
			$events = $template_info['events'];
			$template_info['events'] = array_map(
				function( ?array $template ) use( $events ) : ?array {
					$template['event_title'] = ucfirst( str_replace( 
						 ['_', '-', ], ' ', $template['event']
					) );
					return $template;
				},
				static::ins()
				->qb()
				->where_in( 'tm.event', array_keys( $template_info['events'] ) )
				->get()
			);
			return static::wrapper( $template_info );
		} );
		return $only_event ? array_merge( ...$templates ) : $templates;
	}

    public static function template_loop( callable $cb ) : array {
		$registered = apply_filters( "zencommunity/email/template/registered", [] );
		if ( empty( $registered ) ) return [];
		
		foreach ( $registered as &$template_info ) {
			if ( !  empty( $events = $template_info['events'] ?? '' ) && is_array( $events ) ) {
				$template_info = $cb( $template_info );
			}
		}
		return $registered;
	}

    public static function index( array $params ) : array {
        $qb = static::ins()->qb();
		$rules = apply_filters( "zencommunity/email/template/index/sanitization_rules",  [
			'page' 	   => Sanitizer::INT,
			'per_page' => Sanitizer::INT,
			'search'   => Sanitizer::STRING,
			'order'    => Sanitizer::STRING,
			'order_by' => Sanitizer::STRING,
			'event'    => Sanitizer::STRING,
		] );

		$params = Sanitizer::sanitize( $params, $rules );
		$params = apply_filters( "zencommunity/email/template/index/query", $params );


        $page 	  = $params['page'] ?? 0;
        $per_page = $params['per_page'] ?? 15;
        $search   = $params['search'] ?? '';
        $order    = $params['order'] ?? 'desc';
        $order_by = $params['order_by'] ?? 'updated_at';
        $event = $params['event'] ?? null;
		
        if ( ! empty( $per_page ) && $per_page > 100 ) {
			throw new ZencommunityException( esc_html( __( 'The maximum value of  per_page is 100.', 'zencommunity' ) ) );
        }
        
        if ( ! empty( $event ) ) {
            $qb->where( 'tm.event', '=', $event );
        }

        if ( ! empty( $search ) ) {
            $qb->where_group( 
				fn( QueryBuilder $q ) => $q->where( 'tm.event', 'LIKE', "%{$search}%" )->or_where( 'tm.template', 'LIKE', "%{$search}%" ) 
			);
        }

        if ( ! in_array( $order = strtoupper( $order ), [ 'ASC', 'DESC' ] ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order.', 'zencommunity' ) ) );
		}

        if ( ! in_array( $order_by, [ 'event', 'created_at', 'updated_at', 'id' ], true ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order columtm.', 'zencommunity' ) ) );
        }

		$order_by = 'tm.' . $order_by;
		$qb->order_by( $order_by, $order );
		
        $data = $qb->paginate( $page, $per_page );
		$data['records'] = static::collection_wrapper( $data['records'] ?? [] );
		return $data;
    }

	public static function create( array $data ) : ?array {
		
		$data = Sanitizer::sanitize( $data, apply_filters( "zencommunity/email/template/create/sanitization_rules", [
			'event'   => Sanitizer::STRING,
			'subject'   => Sanitizer::STRING,
			'heading'   => Sanitizer::STRING,
			'status'   => Sanitizer::STRING,
			'template'   => Sanitizer::HTML,
		] ) );

		// Validate content length
		Helper::verify_char_limit( $data['template'] ?? null , 'description' );
		
		if ( empty( $data['event'] ) ) 
			throw new ZencommunityException( esc_html__( 'Event field is empty.', 'zencommunity' ), 422 );

		if ( ! in_array( $data['status'] ?? '', [ 'active', 'inactive' ] ) ) 
			throw new ZencommunityException( esc_html__( 'Invalid Status.', 'zencommunity' ), 422 );

		if ( static::exists( $data['event'] ) ) 
			throw new ZencommunityException( esc_html__( 'Event is already exists.', 'zencommunity' ), 422 );

		if ( empty( $data['template'] ) ) {
			throw new ZencommunityException( esc_html__( 'template field is empty.', 'zencommunity' ), 422 );
		}
		$data['created_by'] = get_current_user_id();

        $data['updated_at'] = current_time( 'mysql' );
        $data['created_at'] = current_time( 'mysql' );


		// Insert 
		$id = static::ins()->insert( $data );
		if ( empty( $id ) ) {
			throw new ZencommunityException( esc_html__( 'Could not create note.', 'zencommunity' ), 500 );
		}

        $data =  static::by_id( intval( $id ) );
		do_action( "zencommunity/email/template/created", $data );
		return $data;

	}
	
    public static function update( string $event, array $data ) : array {
		$event = sanitize_text_field( $event );
		$data = Sanitizer::sanitize( $data, apply_filters( "zencommunity/email/template/update/sanitization_rules", [
			'status'   => Sanitizer::STRING,
			'subject'   => Sanitizer::STRING,
			'heading'   => Sanitizer::STRING,
			'template' => Sanitizer::HTML,
		] ) );

		if ( ! in_array( $data['status'] ?? '', [ 'active', 'inactive' ] ) ) 
			throw new ZencommunityException( esc_html__( 'Invalid Status.', 'zencommunity' ), 422 );;

		// Validate content length
		Helper::verify_char_limit( $data['template'] ?? null , 'description' );

        $qb = static::ins()->qb()
            ->where( 'tm.event', '=', $event );

        $old_data = static::by_event( $event );

		if ( ! isset( $data['updated_at'] ) ) {
			$data['updated_at'] = current_time( 'mysql' );
		}

 
		$is_updated = $qb->update( $data );

		if ( ! $is_updated ) {
			throw new ZencommunityException( esc_html( __( 'An error is occured.', 'zencommunity' ) ) );
		}
		// Post-update hook 
        $updated_data = static::by_event( $event );
		
		do_action( "zencommunity/email/template/updated", $event, $updated_data, $old_data );
        return $updated_data;
    }

    
    public static function delete( string $event ) : bool {
        $qb = static::ins()->qb()
            ->where( 'tm.id', '=', $event );


        if ( 0 === $qb->count() ) {
			throw new ZencommunityException( esc_html( __( 'Record not found.', 'zencommunity' ) ), 404 );
        }

		do_action( "zencommunity/email/template/deleted", $event  );
        return $qb->delete();
    }
}
