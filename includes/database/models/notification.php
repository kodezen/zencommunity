<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Database\Utils\{ Model, QueryBuilder };
class Notification extends Model {
	protected string $table = 'zenc_notifications';
	protected ?string $alias = 'ntf';
	protected array   $selects = [
		'ntf.*'
	];
	private ?int $notification_id = null;
	private ?int $group_id = null;
	private ?int $feed_id = null;
	private ?int $object_id = null;
	private ?string $object_type;
	private ?string $event_type;
	private ?string $message = null;
	private array $payload = [];
	private array $to_users = [];
	private ?int $from_user = null;

	public function __construct(
		?string $event_type = null,
		?string $object_type = null,
		?string $message = null
	) {
		parent::__construct();
		$this->event_type  = $event_type;
		$this->object_type = $object_type;
		$this->message     = $message;
	}
	
	public function set_type(
		?string $event_type = null,
		?string $object_type = null,
		?string $message = null
	) {
		$this->event_type  = is_null( $event_type )?  $this->event_type : $event_type;
		$this->object_type = is_null( $object_type ) ? $this->object_type : $object_type;
		$this->message     = is_null( $message ) ? $this->message : $message;
	}

	public function set_ref(
		?int $group_id = null,
		?int $feed_id = null,
		?int $object_id = null
	) : self {
		$this->group_id    = $group_id;
		$this->feed_id     = $feed_id;
		$this->object_id   = $object_id;
		return $this;
	}

	public function set_payload( array $payload ) : self {
		$this->payload    = array_merge( $this->payload, $payload );
		return $this;
	}

	public function from_user( int $id ) : self {
		$this->from_user = $id;
		return $this;
	}

	public function to_users( array $ids ) : self {
		if ( empty( $ids ) ) {
			throw new ZencommunityException( esc_html__( 'To user id[s] is empty', 'zencommunity' ), 400 );
		} 
		$this->to_users = QueryBuilder::ins()
				->from( 'users' )
				->where_in( 'ID',  $ids )
				->values( 'ID' );
		
		if ( empty( $this->to_users ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid to user id[s]', 'zencommunity' ), 400 );
		} 
		return $this;
	}

	public function to_users_by_username( array $usernames ) : self {
		if ( empty( $usernames ) ) {
			throw new ZencommunityException( esc_html__( 'To user id[s] is empty', 'zencommunity' ), 400 );
		} 
		$this->to_users = QueryBuilder::ins()
				->from( 'users' )
				->where_in( 'user_login',  $usernames )
				->values( 'ID' );
		
		if ( empty( $this->to_users ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid to user id[s]', 'zencommunity' ), 400 );
		} 
		return $this;
	}

	public function _send() : ?int {
		$data = [
			'from_user_id' => $this->from_user,
			'group_id' 	   => $this->group_id,
			'feed_id' 	   => $this->feed_id,
			'object_id'    => $this->object_id,
			'object_type'  => $this->object_type,
			'event_type'   => $this->event_type,
			'message' 	   => $this->message,
			'meta' 		   => wp_json_encode( $this->payload ),
		];

		$id = $this->notification_id;
		if ( empty( $this->notification_id  ) ) {
			$id = static::ins()->insert( $data );
			if ( false === $id ) {
				return null;
			}
		}
		else {
			$is_updated =  static::ins()->qb()
				->where( 'id', '=', $id )
				->update( $data );
			if ( false === $is_updated ) {
				return null;
			}
		}

		foreach ( $this->to_users as $to_user ) {
			QueryBuilder::ins()
				->create( 'zenc_notified_users', [
					'to_user_id' 	  => $to_user,
					'notification_id' => $id,
				] );
		}

		return $id;
	}

	public static function by_id( int $id ) : self {
		$data = static::ins()->qb()
				->select( [ 'ntf.*' ] )
				->where( 'ntf.id', '=', $id )
				->first();
		if ( empty( $data ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid notification  id', 'zencommunity' ), 400 );
		}
		// print_r($data);
		$ins = new static( $data['event_type'], $data['object_type'], $data['message'] );
		$ins->notification_id = $id;
		$ins->set_ref( $data['group_id'], $data['feed_id'], $data['object_id'] );
		$ins->from_user( $data['from_user_id'] );
		$ins->set_payload( json_decode( $data['meta'], true ) );
		return $ins;
	}
	
	public function exclude_users( array $ids ) : bool {
		if ( empty( $this->notification_id  ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid notification  id', 'zencommunity' ), 400 );
		}
		return QueryBuilder::ins()
				->from( 'zenc_notified_users' )
				->where( 'notification_id', '=', $this->notification_id )
				->where_in( 'to_user_id',  $ids )
				->delete();
	}

	public function delete( ) : bool {
		if ( empty( $this->notification_id  ) ) {
			throw new ZencommunityException( esc_html__( 'Invalid notification  id', 'zencommunity' ), 400 );
		}
		$is_deleted = static::ins()->qb()
				->where( 'ntf.id', '=', $this->notification_id )
				->delete();
		if ( $is_deleted ) {
			QueryBuilder::ins()
				->from( 'zenc_notified_users' )
				->where( 'notification_id', '=', $this->notification_id )
				->where_in( 'to_user_id',  $ids )
				->delete();
		}
		return $is_deleted;
	}

	
	public static function wrapper( array $notification ) : array {
		$notification['meta']      = json_decode( $notification['meta'] ?? '{}', true );
		$notification['from_user'] = json_decode( $notification['from_user'] ?? '{}', true );
		return $notification;
	}

	public static function collection_wrapper( array $notifications ) : array {
		$data = [];
		foreach ( $notifications as $notification ) {
			$data[] = static::wrapper( $notification );
		}
		return $data;
	}

	public static function index( int $user_id, ?int $status = null, array $type = [], int $page = 1, int $per_page = 20 ) : array {
		$qb = static::ins()->qb()
			->select( [
				'ntf.*', 'ntu.is_read',
				'ntu.to_user_id',
				'from_user' => fn( QueryBuilder $q ) : QueryBuilder => $q->select( [
						"JSON_OBJECT('id', user_id, 'first_name', first_name, 'last_name', last_name, 'username', username, 'avatar_url', avatar_url)"
					] )
					->from( 'zenc_profiles', 'p' )
					->where_column( 'p.user_id', '=', 'ntf.from_user_id' )->limit( 1 )
			] )
            ->join( 'zenc_notified_users', 'ntu', 'ntf.id = ntu.notification_id' )
			->where( 'ntu.to_user_id', '=', $user_id );
		$type = array_filter( $type );
		if ( ! empty( $type ) ) {
			$qb->where_in( 'ntf.event_type', $type );
		}

		if ( ! is_null( $status ) ) {
			$qb->where( 'ntu.is_read', '=', $status );
		}

		$qb->order_by( 'ntf.created_at', 'DESC' );
		// wp_send_json([$type,$qb->dump()]);
        $data = $qb->paginate( $page, $per_page );
		$data['unread'] =  QueryBuilder::ins()->from('zenc_notified_users')
                ->where( 'to_user_id', '=', $user_id )
                ->where( 'is_read', '=', 0 )
                ->count();
		$data['records'] = static::collection_wrapper( $data['records'] ?? [] );
		return $data;
	}

	/**
	 * Notifications for $user_id created after $since, oldest first — the
	 * feed the email digest cron batches into one message. Caps at
	 * $limit so a very active period still produces one reasonably sized
	 * email; the digest itself notes when items were left out.
	 */
	public static function for_digest( int $user_id, string $since, int $limit = 50 ) : array {
		$data = static::ins()->qb()
			->select( [
				'ntf.*', 'ntu.is_read',
				'from_user' => fn( QueryBuilder $q ) : QueryBuilder => $q->select( [
						"JSON_OBJECT('id', user_id, 'first_name', first_name, 'last_name', last_name, 'username', username, 'avatar_url', avatar_url)"
					] )
					->from( 'zenc_profiles', 'p' )
					->where_column( 'p.user_id', '=', 'ntf.from_user_id' )->limit( 1 )
			] )
			->join( 'zenc_notified_users', 'ntu', 'ntf.id = ntu.notification_id' )
			->where( 'ntu.to_user_id', '=', $user_id )
			->where( 'ntf.created_at', '>', $since )
			->order_by( 'ntf.created_at', 'ASC' )
			->limit( $limit )
			->get();
		return static::collection_wrapper( $data ?? [] );
	}

	public static function mark_as( int $user_id, bool $is_read, ?int $notification_id = null ) : bool {
		$qb = QueryBuilder::ins()
				->from( 'zenc_notified_users' )
				->where( 'to_user_id', '=', $user_id );

		if ( ! empty( $notification_id ) ) {
			$qb->where( 'notification_id', '=', $notification_id );
		}

		return $qb->update( [
			'is_read' => intval( $is_read )
		] );

	}
	
	public static function send( array $params ) : ?bool {
		// Extract individual variables from the passed $params array
		$type 		  = $params['type'] ?? '';
		$from_user_id = $params['from_user_id'] ?? null;
		$to_user_ids  = $params['to_user_ids'] ?? [];
		$message 	  = $params['message'] ?? '';
		$data 		  = $params['data'] ?? null;
		$group_id     = $params['group_id'] ?? null;
		$feed_id      = $params['feed_id'] ?? null;
		$object_id    = $params['object_id'] ?? null;
		$object_type  = $params['object_type'] ?? null;
	
		// Respect the site-wide category master toggle (Settings > Notifications) before anything else.
		if ( function_exists( 'zencommunity_notification_category' ) ) {
			global $zencommunity_settings;
			$category = zencommunity_notification_category( $type );
			if ( $category && false === boolval( $zencommunity_settings->notification->{$category} ?? true ) ) {
				return null;
			}
		}

		// Ensure to_user_ids is unique and valid
		$to_user_ids = array_unique( $to_user_ids );
		$to_user_ids = Profile::ins()->qb()
			->where_in( 'pf.user_id', $to_user_ids )
			->values( 'pf.user_id' );

		// Respect each recipient's per-user notification preferences.
		if ( function_exists( 'zencommunity_user_allows_notification' ) ) {
			$to_user_ids = array_values( array_filter(
				$to_user_ids,
				fn( $uid ) => zencommunity_user_allows_notification( (int) $uid, $type )
			) );
		}

		// Validate the necessary conditions
		if ( 
			empty( $to_user_ids ) || 
			empty( $type ) || 
			( ! empty( $from_user_id ) && ! Profile::exists( $from_user_id ) ) || 
			( empty( $message ) && empty( $group_id ) && empty( $feed_id ) && empty( $object_id ) ) 
		) {
			return null;
		}
	

		$ins = new static( $type, $object_type, $message );
		$ins->set_ref( $group_id, $feed_id, $object_id );
		$ins->set_payload( $data );
		$ins->from_user( (int) $from_user_id );
		$ins->to_users( $to_user_ids );
		$notification_id = $ins->_send();
	
		//  the notification data
		$notification_to_send = [
			'event_type'    => $type,
			'from_user_id'  => (int) $from_user_id,
			'message'       => $message,
			'meta'          => wp_json_encode($data),
			'group_id'      => $group_id,
			'feed_id'       => $feed_id,
			'object_id'     => $object_id,
			'object_type'   => $object_type,
			'created_at'    => current_time( 'mysql', true )
		];

		do_action( 'zencommunity/notification/created', 
			[
				'action' 	  => 'notification',
				'notification_id' => $notification_id,
				'to_user_ids' => $to_user_ids,
				'data' 		  => $notification_to_send, 
			]
		);

		return (bool) $notification_id;
	}
}