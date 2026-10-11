<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_User;
use ZenCommunity\Helper;
use ZenCommunity\Database\Utils\QueryBuilder;
use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Database\Utils\Model;
class ProcessLog extends Model {

	/** Seconds to wait before retrying a failed job. */
	private const RETRY_DELAY = 120;

	/**
	 * How long a job may sit at `pending` before its initial dispatch is
	 * treated as dropped and retried.
	 *
	 * `run()` fires the actual handler via a non-blocking, 1-second-timeout
	 * loopback `wp_remote_get()` (see below) so the request that created the
	 * job doesn't have to wait on it — but "non-blocking" also means nothing
	 * ever confirms that request was received. If it silently fails (a self
	 * -request blocked by a security plugin, a saturated PHP-FPM pool, a
	 * dev-environment proxy dropping loopback calls), the row is left behind
	 * at its default `pending` status forever: `retry_failed()`/
	 * `purge_exhausted()` below only look at `status = 'failed'`, so a job
	 * whose dispatch never landed is invisible to both and the reply it
	 * represents (an AI answer someone is waiting on) never happens, with no
	 * error anywhere to explain why.
	 */
	private const PENDING_TIMEOUT = 60;

	/**
	 * How old a job may be and still be worth retrying.
	 *
	 * Past this the work has lost its point: the visitor whose message produced
	 * an AI job has long since given up and gone, and answering them an hour
	 * later is worse than not answering — it bills a provider call to restart a
	 * conversation nobody is in. Older jobs are treated as exhausted instead, so
	 * whatever was waiting on them is told rather than left hanging.
	 */
	private const MAX_AGE = 3600;

	/**
	 * Proof that a dispatch request originated on this server.
	 *
	 * Keyed on the same secret the websocket push uses, so there is one secret
	 * to rotate rather than two.
	 */
	public static function signature( string $pid ) : string {
		$secret = (string) get_option( 'zenc_ws_push_secret', '' );

		if ( '' === $secret ) {
			$secret = wp_generate_password( 64, true, true );
			update_option( 'zenc_ws_push_secret', $secret );
		}

		return hash_hmac( 'sha256', $pid, $secret );
	}

	/** Whether a presented signature matches the one this pid should carry. */
	public static function verify_signature( string $pid, string $signature ) : bool {
		return '' !== $signature && hash_equals( static::signature( $pid ), $signature );
	}

	protected string $table = 'zenc_process_logs';
	protected ?string $alias = 'p';
	protected array   $selects = [
		'p.*'
	];

	public static function remove( string $pid ) : bool {
		return static::ins()->qb()
			->where( 'p.pid', '=', $pid )
			->delete();
	}

	public static function exists( string $pid ) : bool {
		return static::ins()->qb()
			->where( 'p.pid', '=', $pid )
			->count() > 0;
	}

	public static function wrapper( array $product ) : array {
		$product['args'] 	  = json_decode( $product['args'] ?? '{}', true );
		return $product;
	}

	public static function collection_wrapper( array $products ) : array {
		$data = [];
		foreach ( $products as $product ) {
			$data[] = static::wrapper( $product );
		}
		return $data;
	}

    public static function index( array $params ) : array {
        $qb = static::ins()->qb();
        
		$rules = apply_filters( "zencommunity/ai_agent/msgs/index/sanitization_rules",  [
			'page' 	   => Sanitizer::INT,
			'per_page' => Sanitizer::INT,
			'search'   => Sanitizer::STRING,
			'handler'   => Sanitizer::STRING,
			'order'    => Sanitizer::STRING,
			'order_by' => Sanitizer::STRING,
		] );

		$params = Sanitizer::sanitize( $params, $rules );
		$params = apply_filters( "zencommunity/ai_agent/msgs/index/query", $params );

        $page 	  = $params['page'] ?? 0;
        $per_page = $params['per_page'] ?? 15;
        $search   = $params['search'] ?? '';
        $handler   = $params['handler'] ?? '';
        $order    = $params['order'] ?? 'desc';
        $order_by = $params['order_by'] ?? 'id';
        
        if ( ! empty( $per_page ) && $per_page > 100 ) {
			throw new ZencommunityException( esc_html( __( 'The maximum value of  per_page is 100.', 'zencommunity' ) ) );
        }
        
        if ( ! empty( $search ) ) {
            $qb->where( 'p.handler', 'LIKE', "%{$search}%" );
        }


        if ( ! empty( $handler ) ) {
            $qb->where( 'p.handler', '=', $handler );
        }

        if ( ! in_array( $order = strtoupper( $order ), [ 'ASC', 'DESC' ] ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order.', 'zencommunity' ) ) );
		}

        if ( ! in_array( $order_by, [ 'created_at', 'updated_at', 'id' ], true ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order column.', 'zencommunity' ) ) );
        }

		$order_by = 'p.' . $order_by;
		$qb->order_by( $order_by, $order );
		
        $data = $qb->paginate( $page, $per_page );
		$data['records'] = static::collection_wrapper( $data['records'] ?? [] );
		return $data;
    }
	
	public static function create( 
		string $handler, 
		array $args,
		int $max_retry = 5,
	) : ?string {
		$data = [];
        $data['pid'] = uniqid('', true);
        $data['handler'] = $handler;
        $data['max_retry'] = $max_retry;
        $data['args'] = json_encode( $args );
        $data['created_at'] = time();
		if( empty( $id = static::ins()->insert( $data ) ) ) 
			return null;
		return static::ins()->qb()
			->where( 'p.id', '=', $id )
			->value( 'p.pid' );
	}

	public static function update( string $pid, array $data ) : bool {
        if (  empty( $pid ) )
			throw new ZencommunityException( esc_html( __( 'PID is empty.', 'zencommunity' ) ) );

        if (  empty( $data ) )
			throw new ZencommunityException( esc_html( __( 'data is empty.', 'zencommunity' ) ) );

        if ( ! static::exists( $pid ) )
			throw new ZencommunityException( esc_html( __( 'Process is not exists.', 'zencommunity' ) ) );

        $data['cupdated_at'] = time();
		return static::ins()->qb()
			->where( 'p.pid', '=', $pid )
			->update( $data );
	}

	public static function dispatch( string $pid ) : bool {
        if (  empty( $pid ) )
			throw new ZencommunityException( esc_html( __( 'PID is empty.', 'zencommunity' ) ) );

		$data = static::ins()->qb()
			->select( [ 'p.status', 'p.handler', 'p.args', 'p.max_retry', 'p.retry', 'p.updated_at' ] )
			->where( 'p.pid', '=', $pid )
			->first();

        if ( empty( $data ) )
			throw new ZencommunityException( esc_html( __( 'Process is not exists.', 'zencommunity' ) ) );

        if ( 
			120 > ( time() - $data['updated_at'] ) &&
			'running' === $data['status'] 
		)
			throw new ZencommunityException( esc_html( __( 'Process is already running.', 'zencommunity' ) ) );

		$handler = $data['handler'];
		try{
			static::ins()->qb()
				->where( 'p.pid', '=', $pid )
				->update( [ 
					'status' => 'running',
					'updated_at' => time()
				] );

			if ( ! has_action( $action = 'zencommunity/bg_process/' . $handler ) )
				throw new ZencommunityException( esc_html( __( 'Handler is not exists.', 'zencommunity' ) ) );

			do_action( $action, json_decode( $data['args'], true ) );

			static::remove( $pid );
			return true;
		}
		catch( \Throwable $e ) {
			if( intval( $data['retry'] ) >=  intval( $data['max_retry'] ) ) {
				static::remove( $pid );
				return false;
			}
			$data_to_update = [];
			$data_to_update['status'] = 'failed';
			$data_to_update['retry'] = $data['retry'] + 1;
			$data_to_update['error_msg'] = esc_html( $e->getMessage() );
			static::ins()->qb()
				->where( 'p.pid', '=', $pid )
				->update( $data_to_update );
			return false;
		}

		return true;
	}

	/**
	 * Re-dispatch jobs that failed but have retries left.
	 *
	 * dispatch() records a failure and bumps the retry count, but nothing ever
	 * looked at those rows again, so max_retry described an intention rather
	 * than a behaviour: a job that failed once stayed failed, and the work it
	 * represented — an AI reply a visitor is waiting for — never happened. A
	 * transient outage was therefore permanent for every request made during it.
	 *
	 * Runs from cron so a retry costs the visitor nothing, and leaves a gap
	 * before retrying so a provider that is rate-limiting is not hammered.
	 */
	public static function retry_failed( int $limit = 20 ) : int {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_process_logs';

		// Column-to-column comparison, which the query builder has no shape for.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$pids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT pid FROM {$table} WHERE status = 'failed' AND retry < max_retry AND updated_at < %d AND created_at > %d ORDER BY id ASC LIMIT %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				time() - self::RETRY_DELAY,
				time() - self::MAX_AGE,
				$limit
			)
		);

		$dispatched = 0;
		foreach ( (array) $pids as $pid ) {
			if ( '' === (string) $pid ) {
				continue;
			}
			try {
				static::dispatch( (string) $pid );
				$dispatched++;
			} catch ( \Throwable $e ) {
				// dispatch() already recorded the outcome on the row.
				continue;
			}
		}

		return $dispatched;
	}

	/**
	 * Re-dispatch jobs whose initial async dispatch (`run()`'s loopback
	 * request) never landed and so never even started.
	 *
	 * Runs in-process rather than via another `run()` loopback call — that
	 * second network hop would be exposed to the exact same failure mode
	 * that stranded the job in the first place. Cron is already executing
	 * server-side, so `dispatch()` can just run the handler directly.
	 */
	public static function retry_stale_pending( int $limit = 20 ) : int {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_process_logs';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$pids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT pid FROM {$table} WHERE status = 'pending' AND created_at < %d AND created_at > %d ORDER BY id ASC LIMIT %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				time() - self::PENDING_TIMEOUT,
				time() - self::MAX_AGE,
				$limit
			)
		);

		$dispatched = 0;
		foreach ( (array) $pids as $pid ) {
			if ( '' === (string) $pid ) {
				continue;
			}
			try {
				static::dispatch( (string) $pid );
				$dispatched++;
			} catch ( \Throwable $e ) {
				// dispatch() already recorded the outcome (or left it running).
				continue;
			}
		}

		return $dispatched;
	}

	/**
	 * Discard jobs that have used every retry — or, past MAX_AGE, jobs still
	 * stuck at `pending` that retry_stale_pending() itself has given up
	 * retrying (its own window ends at MAX_AGE, see its query above).
	 *
	 * dispatch() removes a row once retries are exhausted, but only if it is the
	 * call that exhausts them. Rows left behind by an earlier version, or by a
	 * max_retry that was lowered afterwards, would otherwise be retried forever.
	 */
	public static function purge_exhausted() : int {
		global $wpdb;
		$table = $wpdb->prefix . 'zenc_process_logs';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT pid, handler, args FROM {$table} WHERE ( status = 'failed' AND ( retry >= max_retry OR created_at <= %d ) ) OR ( status = 'pending' AND created_at <= %d ) LIMIT 100", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				time() - self::MAX_AGE,
				time() - self::MAX_AGE
			),
			ARRAY_A
		);

		$removed = 0;
		foreach ( (array) $rows as $row ) {
			$pid = (string) ( $row['pid'] ?? '' );
			if ( '' === $pid ) {
				continue;
			}
			// Announced before removal so a subsystem can do something about the
			// work that will now never happen — a live chat, for instance, has a
			// visitor waiting on a reply that is not coming.
			do_action(
				'zencommunity/bg_process/exhausted',
				(string) ( $row['handler'] ?? '' ),
				json_decode( (string) ( $row['args'] ?? '{}' ), true ) ?: []
			);
			static::remove( $pid );
			$removed++;
		}

		return $removed;
	}

    public static function run( string $pid ) : void {
        if (  empty( $pid ) )
			throw new ZencommunityException( esc_html( __( 'PID is empty.', 'zencommunity' ) ) );
		
        if ( ! static::exists( $pid ) )
			throw new ZencommunityException( esc_html( __( 'Process is not exists.', 'zencommunity' ) ) );

        // Signed, because the endpoint that receives this had no authentication
        // at all: anyone who learned a pid could run other people's jobs, and
        // each run of an AI job is a paid provider call. The pid alone is not a
        // secret — it travels in a URL — so the signature is what proves the
        // request came from here.
        $endpoint_url = add_query_arg(
            [ 'sig' => static::signature( $pid ) ],
            rest_url( "zencommunity/v1/bg/process/{$pid}" )
        );

        $response = wp_remote_get( $endpoint_url, [
            'sslverify' => false,
            'blocking'  => false,
            'timeout'   => 1,
        ] );
    }
}