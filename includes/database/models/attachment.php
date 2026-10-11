<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use Throwable;
use ZenCommunity\Helper;
use ZenCommunity\Classes\Sanitizer;
use ZenCommunity\Exceptions\ZencommunityException;
use ZenCommunity\Database\Utils\{ Model, QueryBuilder };
/**
 * Class Attachment
 *
 * Model class for handling attachment files within the ZenCommunity plugin.
 * Provides methods for uploading, retrieving, deleting, and managing media files
 * associated with various object types such as profiles, groups, feeds, and comments.
 *
 * @package ZenCommunity\Database\Models
 */
class Attachment extends Model {
	
    /**
     * Database table name.
     * @var string
     */
	protected string $table = 'zenc_attachments';
	    
	/**
     * Table alias for query builder.
     * @var string|null
     */
	protected ?string $alias = 'atcm';

	/**
     * Default select fields for queries.
     * @var array
     */
	protected array   $selects = [
		'*'
	];

	/**
	 * Get allowed mime type types for attachments.
	 *
	 * @return string[] Allowed object types
	 */
	public static function get_allowed_mime_map() : array {
		return apply_filters( 'zencommunity/attachments/allowed_mime_map', [ 
			'img' => [
				'image/jpeg',
				'image/png',
				'image/webp',
				'image/jpg',
				'image/gif',
				'image/bmp',
			],
			'svg' => [ 'image/svg+xml' ],
			'pdf' => [ 'application/pdf'],
			'docx' => [ 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ],
			'doc' => [ 'application/msword' ],
			'csv' => [ 'text/csv', 'application/vnd.ms-excel' ],
			'zip' => [ 'application/zip', 'application/x-zip-compressed', 'application/octet-stream' ],
			'json' => [ 'application/json', 'text/plain' ],
			'audio' => [
				'audio/webm',
				'audio/mpeg',
				'audio/mp3',
				'audio/wav',
				'audio/x-wav',
				'audio/wave',
				'audio/ogg',
				'audio/mp4',
				'audio/x-m4a',
				'audio/aac',
				'audio/flac',
			],
			'video' => [
				'video/mp4',
				'video/webm',
				'video/ogg',
				'video/avi',
				'video/mkv',
				'video/quicktime',
				'video/x-msvideo',
				'video/x-flv',
				'video/x-ms-wmv',
				'video/3gpp',
				'video/3gpp2',
				'video/mpeg',
				'video/mp2t',
			],
		] );
	}

	/**
	 * Get allowed object types for attachments.
	 *
	 * @return string[] Allowed object types
	 */
	public static function get_media_types() : array {
		return apply_filters( 'zencommunity/attachments/allowed_media_types', [ 
			'site_logo'		 => [ 'img', 'svg' ],
			'site_logo_dark' => [ 'img', 'svg' ],
			'profile_avatar' => [ 'img' ],
			'profile_cover'	 => [ 'img' ], 
			'group_featured' => [ 'img' ], 
			'group_cover'    => [ 'img' ], 
			'group_icon'     => [ 'img' ], 
			'feed_image'     => [ 'img' ],
			'comment_image'  => [ 'img' ],
			'event_cover'    => [ 'img' ],
			'menu_icon'      => [ 'img' ],
		] );
	}

	/**
	 * Get allowed dimention types for img.
	 *
	 * @return string[] Allowed dimention types
	 */
	public static function get_img_dimention_types() : array {
		return apply_filters( 'zencommunity/img/dimention/types', [ 
			'cover' => ['max_width' => 1920, 'max_height' => 1080],
			'avatar' => ['max_width' => 300, 'max_height' => 300],
			'thumbnail' => ['max_width' => 300, 'max_height' => 300],
			'product' => ['max_width' => 800, 'max_height' => 800],
			'banner' => ['max_width' => 1920, 'max_height' => 500],
			'icon' => ['max_width' => 100, 'max_height' => 100],
		] );
	}
	/*
	 * Get allowed dimention types for img.
	 *
	 * @return string[] Allowed dimention types
	 */
	public static function get_img_dimentions() : array {
		return apply_filters( 'zencommunity/img/dimention', [ 
			'site_logo'		 => 'cover',
			'site_logo_dark' => 'cover',
			'profile_avatar' => 'avatar',
			'profile_cover'	 => 'cover', 
			'group_featured' => 'avatar', 
			'group_cover'    => 'cover', 
			'group_icon'     => 'icon', 
			'feed_image'     => 'cover',
			'comment_image'  => 'cover',
			'event_cover'    => 'cover',
			'menu_icon'      => 'icon',
		] );
	}

	/*
	 * Get allowed types that accept guest upload.
	 *
	 * @return string[]  types
	 */
	public static function get_allowed_guest_upload_types() : array {
		return apply_filters( 'zencommunity/allow_guest_upload/types', [ 

		] );
	}

	public static function refetch( 
		int $object_id, 
		string $object_col, 
		array $meta, 
		string $object_type,
		QueryBuilder $qb,
		array $media_types = [], 
		bool $include_meta = false
	) : array {
		if( 0 === count( $meta['attachments'] ?? [] ) )
			return $meta;
		foreach( $meta['attachments'] as $type => $attachments ) {
			foreach( $attachments as $attachment ) {
				if( ! array_key_exists( 'mime', $attachment ) ) {
					$meta['attachments'] = static::get_all_media_by_object_id(
						$object_id, $object_type, $media_types, $include_meta 
					);
					$qb
						->where( $object_col, '=', $object_id )
						->update( [ 'meta' => json_encode( $meta ) ] );
					return $meta;
				}
			}
		}
		return $meta;
	}

	/**
	 * Get attachment data by attachment ID.
	 *
	 * @param int $id Attachment ID
	 * @return array Attachment data including url and decoded meta
	 * @throws ZencommunityException If attachment is not found
	 */
	public static function by_id( int $id ) : ?array {
		$data = static::ins()->qb()
			->where( 'atcm.id', '=', $id )
			->first();
		if ( empty( $data ) ) {
			throw new ZencommunityException( 
				esc_html( 
					__( 'File not found.', 'zencommunity' )
				), 404 
			);
		}
		$data['url'] = 0 === strpos( (string) $data['path'], 'http' ) ? $data['path'] : site_url( $data['path'] );
		$data['meta'] = json_decode( $data['meta'] ?? '{}' );
		
		do_action( 'zencommunity/attachments/get/single', $data );
		return $data;
	}
		
	/**
	 * Retrieve paginated list of attachments filtered by parameters.
	 *
	 * @param array $params Parameters for filtering and pagination (page, per_page, search, status, order, order_by)
	 * @param int|null $user_id Optional user ID to filter attachments
	 * @return array Paginated attachments data
	 * @throws ZencommunityException For invalid parameter values
	 */
    public static function index( array $params, ?int $user_id = null ) : array {
        $qb = static::ins()->qb();

        if ( ! empty( $user_id ) ) {
            $qb->where( 'atcm.user_id', '=', $user_id );
        }

		$params = Sanitizer::sanitize( $params, [
			'page' 	   => Sanitizer::INT,
			'per_page' => Sanitizer::INT,
			'search'   => Sanitizer::STRING,
			'status'   => Sanitizer::STRING,
			'order'    => Sanitizer::STRING,
			'order_by' => Sanitizer::STRING,
		] );

        $page =  $params['page'] ?? 0;
        $per_page =  $params['per_page'] ?? 15;
        $search =  $params['search'] ?? '';
        $status =  $params['status'] ?? '';
        $order =  $params['order'] ?? 'desc';
        $order_by =  $params['order_by'] ?? 'created_at';
        
        if ( ! empty( $per_page ) && $per_page > 100 ) {
            throw new ZencommunityException( esc_html( __( 'The maximum value of  per_page is 100.', 'zencommunity' ) ) );
        }

        if ( 
			! empty( $type ) && 
			! in_array( $type,  static::get_media_types() ) 
		) {
            throw new ZencommunityException( esc_html( __( 'Invalid object type.', 'zencommunity' ) ) );
		}
		
        if ( ! empty( $type ) ) {
            $qb->where( 'atcm.type', '=', $type );
        }

        if ( ! in_array( $order = strtoupper( $order ), [ 'ASC', 'DESC' ] ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order.', 'zencommunity' ) ) );
		}

        if ( ! in_array( $order_by, [ 'id', 'created_at' ], true ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order column.', 'zencommunity' ) ) );
        }

		$order_by = 'atcm.' . $order_by;
        $qb->order_by( $order_by, $order );

        return $qb->paginate( $page, $per_page );
    }
	
	/**
	 * Retrieve paginated list of attachments filtered by parameters.
	 *
	 * @param array $params Parameters for filtering and pagination (page, per_page, search, status, order, order_by)
	 * @param int|null $user_id Optional user ID to filter attachments
	 * @return array Paginated attachments data
	 * @throws ZencommunityException For invalid parameter values
	 */
    public static function group_media_index( array $params, ?int $actor_user_id = null ) : array {
        $qb = Attachment::ins()->qb();
		$params = Sanitizer::sanitize( $params, [
			'page' 	   => Sanitizer::INT,
			'per_page' => Sanitizer::INT,
			'group_id' => Sanitizer::INT,
			'search'   => Sanitizer::STRING,
			'status'   => Sanitizer::STRING,
			'order'    => Sanitizer::STRING,
			'order_by' => Sanitizer::STRING,
		] );

        $page =  $params['page'] ?? 0;
        $per_page =  $params['per_page'] ?? 15;
        $group_id =  absint( $params['group_id'] ?? 0 );
        $search =  $params['search'] ?? '';
        $status =  $params['status'] ?? '';
        $order =  $params['order'] ?? 'desc';
        $order_by =  $params['order_by'] ?? 'created_at';

		$qb->where( 'atcm.object_type', '=', 'feed' );
		$qb->join( 'zenc_feeds', 'fd', 'fd.id = atcm.object_id' );
		$qb->where( 'fd.group_id', '=', $group_id );

		if ( ! is_null( $actor_user_id ) && ! user_can( $actor_user_id, 'manage_options' ) ) {
			$qb->join( 'zenc_groups', 'g', 'g.id = fd.group_id' );
			$qb->where_group( function( QueryBuilder $q1 ) use( $actor_user_id ) : void {
				$q1->where( 'g.privacy', '=', 'public' )
				->or_where_exists( function( QueryBuilder $q2 ) use( $actor_user_id ) : void {
					$q2->select( [ 'gm.id' ] )
					->from( 'zenc_group_members', 'gm' )
					->where_column( 'gm.group_id', '=', 'g.id' )
					->where( 'gm.user_id', '=', $actor_user_id );
				} );
			} );
		}

        if ( ! in_array( $order = strtoupper( $order ), [ 'ASC', 'DESC' ] ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order.', 'zencommunity' ) ) );
		}

        if ( ! in_array( $order_by, [ 'id', 'created_at' ], true ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order column.', 'zencommunity' ) ) );
        }

		$order_by = 'atcm.' . $order_by;
        $qb->order_by( $order_by, $order );

        return $qb->paginate( $page, $per_page );
    }


	/**
	 * Retrieve paginated list of attachments filtered by parameters.
	 *
	 * @param array $params Parameters for filtering and pagination (page, per_page, search, status, order, order_by)
	 * @param int|null $user_id Optional user ID to filter attachments
	 * @return array Paginated attachments data
	 * @throws ZencommunityException For invalid parameter values
	 */
    public static function user_media_index( array $params, ?int $actor_user_id = null ) : array {
        $qb = Attachment::ins()->qb();
		$params = Sanitizer::sanitize( $params, [
			'page' 	   => Sanitizer::INT,
			'per_page' => Sanitizer::INT,
			'user_id' => Sanitizer::INT,
			'search'   => Sanitizer::STRING,
			'status'   => Sanitizer::STRING,
			'order'    => Sanitizer::STRING,
			'order_by' => Sanitizer::STRING,
		] );

        $page =  $params['page'] ?? 0;
        $per_page =  $params['per_page'] ?? 15;
        $user_id =  absint( $params['user_id'] ?? 0 );
        $search =  $params['search'] ?? '';
        $status =  $params['status'] ?? '';
        $order =  $params['order'] ?? 'desc';
        $order_by =  $params['order_by'] ?? 'created_at';

		$qb->where( 'atcm.object_type', '=', 'feed' );
		if ( ! is_null( $actor_user_id ) && ! user_can( $actor_user_id, 'manage_options' ) ) {
			$qb->where_exists( function( QueryBuilder $q ) use( $actor_user_id ) : void {
				$q->select( [ 'fd.id' ] )
				->from( 'zenc_feeds', 'fd' )
				->join( 'zenc_groups', 'g', 'g.id = fd.group_id' )
				->where_column( 'fd.id', '=', 'atcm.object_id' )
				->where_group( function( QueryBuilder $q1 ) use( $actor_user_id ) : void {
					$q1->where( 'g.privacy', '=', 'public' )
					->or_where_exists( function( QueryBuilder $q2 ) use( $actor_user_id ) : void {
						$q2->select( [ 'gm.id' ] )
						->from( 'zenc_group_members', 'gm' )
						->where_column( 'gm.group_id', '=', 'g.id' )
						->where( 'gm.user_id', '=', $actor_user_id );
					} );
				} );
			} );
		}
		
        $qb->where( 'atcm.user_id', '=', $user_id );

        if ( ! in_array( $order = strtoupper( $order ), [ 'ASC', 'DESC' ] ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order.', 'zencommunity' ) ) );
		}

        if ( ! in_array( $order_by, [ 'id', 'created_at' ], true ) ) {
            throw new ZencommunityException( esc_html( __( 'invalid order column.', 'zencommunity' ) ) );
        }

		$order_by = 'atcm.' . $order_by;
        $qb->order_by( $order_by, $order );
		
        return $qb->paginate( $page, $per_page );
    }

    /**
     * Fetch multiple media files by IDs with optional filtering and meta inclusion.
     *
     * @param int[] $ids Attachment IDs to fetch
     * @param string[] $media_types Filter by object types
     * @param bool $include_meta Whether to include decoded meta data
     * @return array Grouped attachment data by type
     */
	public static function get_media_files( array $ids, array $media_types = [], bool $include_meta = false ) : array {
		if ( empty( $ids ) )
			return [];

		$cols = [ 'id','path', 'type' ];
		if (  $include_meta ) 
			$cols[] = 'meta';

		$qb = static::ins()->qb()
			->select( $cols )
			->where_null( 'atcm.object_id' )
			->where_in( 'atcm.id', $ids );

		if ( ! empty( $media_types ) )
			$qb->where_in( 'atcm.type', $media_types );

		if ( empty( $files = $qb->get() ) )
			return [];

		$data = [];
		foreach ( $files as $file ) {
			if ( $include_meta )
				$file['meta'] = json_decode( $file['meta'] ?? '{}' );
			
			$data[$file['type']][] = $file;
		}
		
		return $data;
	}

	/**
	 * Delete attachments by their IDs.
	 *
	 * This method deletes the files from the filesystem and removes their records from the database.
	 * It fires actions before and after deletion.
	 *
	 * @param int[] $ids Array of attachment IDs to delete.
	 * @return bool True if deletion succeeded, false otherwise.
	 */
	public static function delete( array $ids ) : bool {
		if ( empty( $ids ) ) {
			return false;
		}
		$qb = static::ins()->qb()
			->where_in( 'atcm.id', $ids );
		if ( ! empty( $files = $qb->values( 'path' ) )) {
			do_action( 'zencommunity/attachments/before_delete', $files );
			foreach ( $files as $path ) {
				static::delete_file( $path );
			}
			$is_deleted = $qb->delete();
			do_action( 'zencommunity/attachments/after_delete', $files );
			return $is_deleted;
		}
		return false;
	}

	public static function delete_media_by_media_type( string $type, ?string $object_type = null, ?int $object_id = null  ) : bool {
		$qb = static::ins()->qb()
			->where( 'atcm.type', '=', $type );

		if ( ! is_null( $object_id ) ) {
			$qb->where( 'atcm.object_id', '=', $object_id );
		}

		if ( ! empty( $object_type ) ) {
			$qb->where( 'atcm.object_type', '=', $object_type );
		}
		
		if ( ! empty( $files = $qb->values( 'path' ) )) {
			do_action( 'zencommunity/attachments/before_delete', $files );
			foreach ( $files as $path ) {
				static::delete_file( $path );
			}
			$is_deleted = $qb->delete();
			do_action( 'zencommunity/attachments/after_delete', $files );
			return $is_deleted;
		}
		return false;
	}

	/**
	 * Delete media files by object ID and object type.
	 *
	 * Optionally restrict deletion to specific media IDs.
	 *
	 * @param int $object_id The ID of the object owning the media.
	 * @param string $object_type The type of the object owning the media.
	 * @param int[] $media_ids Optional array of media IDs to delete.
	 * @return bool True if deletion succeeded, false otherwise.
	 */
	public static function delete_media_by_object_id( int $object_id, string $object_type, array $media_ids = [] ) : bool {
		$qb = static::ins()->qb()
			->where( 'atcm.object_id', '=', $object_id )
			->where( 'atcm.object_type', '=', $object_type );
		
		if ( ! empty( $media_ids ) ) {
			$qb->where_in( 'atcm.id', $media_ids ); // for delete object specific media
		}

		if ( ! empty( $files = $qb->values( 'path' ) )) {
			do_action( 'zencommunity/attachments/before_delete', $files );
			foreach ( $files as $path ) {
				static::delete_file( $path );
			}
			$is_deleted = $qb->delete();
			do_action( 'zencommunity/attachments/after_delete', $files );
			return $is_deleted;
		}
		return false;
	}

	/**
	 * Delete media files by parent object ID and parent object type.
	 *
	 * Optionally restrict deletion to specific media IDs.
	 *
	 * @param int $object_id The parent object ID owning the media.
	 * @param string $object_type The parent object type owning the media.
	 * @param int[] $media_ids Optional array of media IDs to delete.
	 * @return bool True if deletion succeeded, false otherwise.
	 */
	public static function delete_media_by_parent_object_id( int $object_id, string $object_type, array $media_ids = [] ) : bool {
		$qb = static::ins()->qb()
			->where( 'atcm.parent_object_id', '=', $object_id )
			->where( 'atcm.parent_object_type', '=', $object_type );
		
		if ( ! empty( $media_ids ) ) {
			$qb->where_in( 'atcm.id', $media_ids ); // for delete object specific media
		}

		if ( ! empty( $files = $qb->values( 'path' ) )) {
			do_action( 'zencommunity/attachments/before_delete', $files );
			foreach ( $files as $path ) {
				static::delete_file( $path );
			}
			$is_deleted = $qb->delete();
			do_action( 'zencommunity/attachments/after_delete', $files );
			return $is_deleted;
		}
		return false;
	}

	/**
	 * Check if media IDs correspond to media files that are not yet attached to any object.
	 *
	 * @param int[] $media_ids Array of media IDs to check.
	 * @return bool True if none of the media IDs are attached to an object (available), false otherwise.
 	*/
	public static function is_media_available( array $media_ids ) : bool {
		$media_ids = array_values( $media_ids );
		return ! empty( $media_ids ) ? static::ins()->qb()
		->where_in( 'atcm.id', $media_ids )
		->where_null( 'atcm.object_id' )
		->count() === 0 : false;
	}

	/**
	 * Retrieve all media files associated with a specific object ID and type.
	 *
	 * Optionally filter by a list of object types and include metadata.
	 *
	 * @param int $id The object ID to fetch media for.
	 * @param string $object_type The type of the object.
	 * @param array $media_types Optional array of object types to filter.
	 * @param bool $include_meta Whether to decode and include metadata.
	 * @return array Associative array of media files grouped by object type.
	 */
	public static function get_all_media_by_object_id( int $id, string $object_type, array $media_types = [], bool $include_meta = false ) : array {
		if ( empty( $id ) )
			return [];

		$cols = [ 'id','path', 'object_type', 'type', 'mime' ];
		if (  $include_meta ) 
			$cols[] = 'meta';

		$qb = static::ins()->qb()
			->select( $cols )
			->where( 'atcm.object_id', '=', $id )
			->where( 'atcm.object_type', '=', $object_type );

		if ( ! empty( $media_types ) )
			$qb->where_in( 'atcm.type', $media_types );

		if ( empty( $files = $qb->get() ) )
			return [];

		$data = [];
		foreach ( $files as $file ) {
			if ( $include_meta )
				$file['meta'] = json_decode( $file['meta'] ?? '{}' );
			
			$data[$file['type']][] = $file;
		}
		
		return $data;
	}

	/**
	 * Associate a set of media attachments with an object.
	 *
	 * Only media files that are currently unassigned (object_id is null) will be updated.
	 * Optionally specify parent object ID and type.
	 *
	 * @param int $object_id The object ID to associate the media with.
	 * @param string $object_type The type of the object.
	 * @param int[] $media_ids Array of media IDs to set the association for.
	 * @param array $object_types Optional list of object types to filter media.
	 * @param int|null $parent_object_id Optional parent object ID.
	 * @param string|null $parent_object_type Optional parent object type.
	 * @return bool True on successful update, false otherwise.
	 */
	public static function set_object_id( 
		int $object_id, 
		string $object_type,
		array $media_ids, 
		array $media_types = [],
		?int $parent_object_id = null,
		?string $parent_object_type = null
	) : bool {

		if ( empty( $media_ids ) ) 
			return false;

		$qb = static::ins()->qb()
			->where_in( 'atcm.id', $media_ids )
			->where_null( 'atcm.object_id' );

		if ( ! empty( $media_types ) )
			$qb->where_in( 'atcm.type', $media_types );
		
		$unused_media_ids = $qb->values( 'atcm.id' );

		if ( empty( $unused_media_ids ) ) 
			return false;

		$data = [];
		$data['object_id'] = $object_id;
		$data['object_type'] = $object_type;

		if ( ! empty( $parent_object_id ) ) 
			$data['parent_object_id'] = $parent_object_id;

		if ( ! empty( $parent_object_type ) ) 
			$data['parent_object_type'] = $parent_object_type;

		return static::ins()->qb()
			->where_in( 'atcm.id', $unused_media_ids )->update( $data );
	}

	/**
	 * Largest image (KB) an upload may be before it's rejected. Filterable,
	 * and localized to the frontend so its upload hints and checks match.
	 */
	public static function max_image_size_kb() : int {
		return (int) apply_filters( 'zencommunity/attachment/max_image_size_kb', 2048 );
	}

	protected static function max_image_size_message() : string {
		/* translators: %s: maximum image size, e.g. "2 MB". */
		return sprintf( __( 'Images can be up to %s.', 'zencommunity' ), size_format( static::max_image_size_kb() * KB_IN_BYTES ) );
	}

	public static function convert_and_compress_image( ?string $image_path, string $type, float $max_file_size_kb = 500 ) : ?string {

		if ( ! file_exists( $image_path ) ) {
			throw new ZencommunityException( esc_html( __( 'Invalid image.', 'zencommunity' ) ), 422 );
		}

		$file_size_kb = filesize( $image_path ) / 1024;

		if ( $file_size_kb <= $max_file_size_kb ) {
			return $image_path;
		}

		if ( $file_size_kb > static::max_image_size_kb() ) {
			static::delete_file( $image_path );
			throw new ZencommunityException( esc_html( static::max_image_size_message() ), 422 );
		}

		$editor = wp_get_image_editor( $image_path );
		if ( is_wp_error( $editor ) ) {
			static::delete_file( $image_path );
			throw new ZencommunityException( esc_html( __( 'An error occurred.', 'zencommunity' ) ), 422 );
		}

		if ( empty( $dimention = static::get_img_dimention_types()[$type] ?? [] ) ) {
			static::delete_file( $image_path );
			throw new ZencommunityException( esc_html( __( 'Invalid dimension type.', 'zencommunity' ) ), 422 );
		}

		[ 'max_width' => $max_width, 'max_height' => $max_height ]   = $dimention;
		[ 'width' => $original_width, 'height' => $original_height ] = $editor->get_size();

		$aspect_ratio = $original_width / $original_height;

		if ( $original_width > $max_width || $original_height > $max_height ) {
			if ( $original_width > $original_height ) {
				$new_width = $max_width;
				$new_height = round( $max_width / $aspect_ratio );
			} else {
				$new_height = $max_height;
				$new_width = round( $max_height * $aspect_ratio );
			}

			$editor->resize( $new_width, $new_height );
		}

		$quality = 75;
		$old_img = $image_path;
		$image_path = pathinfo( $image_path, PATHINFO_DIRNAME) . '/' . md5( pathinfo( $image_path, PATHINFO_FILENAME ) ) . '_t_' . time() . '_resized.jpg';
		if ( file_exists( $image_path ) ) {
			static::delete_file( $image_path );
		}

		$result = $editor->save( $image_path, 'image/jpeg', [ 'quality' => $quality ] );

		if ( is_wp_error( $result ) ) {
			static::delete_file( $old_img );
			static::delete_file( $image_path );
			throw new ZencommunityException( esc_html( __( 'Error saving the image.', 'zencommunity' ) ), 422 );
		}

		static::delete_file( $old_img );

		$file_size_kb = filesize( $image_path ) / 1024;

		if ( $file_size_kb > $max_file_size_kb ) {
			static::delete_file( $image_path );
			throw new ZencommunityException( esc_html( __( 'Unable to reduce image size to the target.', 'zencommunity' ) ), 422 );
		}

		return $image_path;
	}

	public static function target_upload_dir( ?array $dirs ) : array {
		$upload_folder = '/zencommunity_uploads/' . gmdate('Y/m');
		$dirs['subdir'] = $upload_folder;
		$dirs['path']   = $dirs['basedir'] . $upload_folder;
		$dirs['url']    = $dirs['baseurl'] . $upload_folder;
		return $dirs;
	}

	public static function rename_uploaded_file( ?array $file ) : array {
		$name = wp_generate_uuid4();
		$ext = pathinfo( $file['name'], PATHINFO_EXTENSION );
		$file['name'] = sanitize_file_name(  $name . '.' . $ext );
		return $file;
	}

	/**
	 * Extend WordPress core's own upload allow-list with extensions our
	 * plugin whitelists but core doesn't ship by default (e.g. .json).
	 * Our own get_allowed_mime_map() check above is the real gate; this
	 * only stops core from rejecting the file before that check matters.
	 *
	 * @param array $mimes Core's extension => mime map.
	 * @return array
	 */
	public static function extend_core_upload_mimes( array $mimes ) : array {
		$mimes['json'] = 'application/json';
		$mimes['svg']  = 'image/svg+xml';
		return $mimes;
	}

	/**
	 * WordPress can't reliably confirm an SVG's real mime type via finfo
	 * (libmagic support for SVG varies by environment), so core's own
	 * extension-vs-real-mime check in wp_check_filetype_and_ext() often
	 * rejects legitimate SVGs. We trust the extension here and rely on
	 * sanitize_svg_content() as the actual content gate.
	 *
	 * @param array  $data     ext/type/proper_filename determined by core.
	 * @param string $file     Full path to the file.
	 * @param string $filename The name of the file.
	 * @return array
	 */
	public static function allow_svg_filetype( array $data, string $file, string $filename ) : array {
		if ( ! empty( $data['ext'] ) && ! empty( $data['type'] ) ) {
			return $data;
		}

		if ( 'svg' !== strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) ) ) {
			return $data;
		}

		$head = @file_get_contents( $file, false, null, 0, 1024 );
		if ( false === $head || false === stripos( $head, '<svg' ) ) {
			return $data;
		}

		$data['ext']  = 'svg';
		$data['type'] = 'image/svg+xml';
		return $data;
	}

	/**
	 * Strip script execution vectors (script tags, event handler attributes,
	 * javascript:/data: URIs, embedded foreign content) from an uploaded SVG
	 * so it can't be used for stored XSS when rendered as the site logo.
	 *
	 * @param string $file_path Absolute path to the SVG file on disk.
	 * @return bool True on success, false if the file isn't a valid/safe SVG.
	 */
	public static function sanitize_svg_content( string $file_path ) : bool {
		$content = @file_get_contents( $file_path );

		if ( false === $content || false === stripos( $content, '<svg' ) ) {
			return false;
		}

		// Reject DTDs/entities outright rather than trying to sanitize them
		// away — a classic XXE / billion-laughs vector for XML parsers.
		if ( false !== stripos( $content, '<!doctype' ) || false !== stripos( $content, '<!entity' ) ) {
			return false;
		}

		$doc = new \DOMDocument();
		$previous_state = libxml_use_internal_errors( true );
		$loaded = $doc->loadXML( $content, LIBXML_NONET );
		libxml_clear_errors();
		libxml_use_internal_errors( $previous_state );

		if ( ! $loaded || ! $doc->documentElement || 'svg' !== strtolower( $doc->documentElement->localName ) ) {
			return false;
		}

		foreach ( [ 'script', 'foreignObject', 'iframe', 'embed', 'object' ] as $tag ) {
			$nodes = $doc->getElementsByTagName( $tag );
			for ( $i = $nodes->length - 1; $i >= 0; $i-- ) {
				$node = $nodes->item( $i );
				$node->parentNode->removeChild( $node );
			}
		}

		$xpath = new \DOMXPath( $doc );
		foreach ( $xpath->query( '//*' ) as $element ) {
			if ( ! $element instanceof \DOMElement || ! $element->attributes ) {
				continue;
			}
			for ( $i = $element->attributes->length - 1; $i >= 0; $i-- ) {
				$attr = $element->attributes->item( $i );
				$name = strtolower( $attr->name );

				if ( str_starts_with( $name, 'on' ) ) {
					$element->removeAttribute( $attr->name );
					continue;
				}

				if (
					in_array( $name, [ 'href', 'xlink:href' ], true ) &&
					preg_match( '/^\s*(javascript|data)\s*:/i', $attr->value )
				) {
					$element->removeAttribute( $attr->name );
				}
			}
		}

		$sanitized = $doc->saveXML( $doc->documentElement );

		if ( empty( $sanitized ) ) {
			return false;
		}

		return false !== file_put_contents( $file_path, $sanitized );
	}

	/**
	 * Handle file upload and store attachment data.
	 *
	 * Validates file type against allowed mime types for the given object type,
	 * moves uploaded file to a custom directory, and saves metadata to the database.
	 *
	 * @param array $file The uploaded file array (from $_FILES).
	 * @param string $media_type The type of media.
	 * @param bool $sideload When true, uses wp_handle_sideload() instead of
	 *        wp_handle_upload() — required whenever $file['tmp_name'] wasn't
	 *        produced by an actual HTTP upload (wp_handle_upload() enforces
	 *        is_uploaded_file(), which a locally-written temp file will never
	 *        pass), e.g. an attachment saved out of an inbound email.
	 * @return array|null Attachment data array on success, or null on failure.
	 * @throws ZencommunityException If any validation or file operation fails.
	 */
	public static function handle_attachment_upload(
		array $file,
		string $media_type,
		bool $sideload = false
	) : ?array {

		$allowed_mime_map = static::get_allowed_mime_map();
		$media_types 	  = static::get_media_types();
		// Captured before wp_handle_upload/rename_uploaded_file overwrite $file['name']
		// with a generated UUID — needed so the frontend can show the real filename.
		$original_name    = sanitize_file_name( $file['name'] ?? '' );

		if ( ! array_key_exists( $media_type, $media_types ) ) {
			throw new ZencommunityException( esc_html( __( 'Invalid media type.', 'zencommunity' ) ), 422 );
		}

		if (
			! in_array( $media_type, static::get_allowed_guest_upload_types(), true ) &&
			! is_user_logged_in()
		) {
			throw new ZencommunityException( esc_html__( 'Unauthorized.', 'zencommunity' ), 401 );
		}


		$allowed_types = $media_types[$media_type] ?? [];
	
		$is_whitelisted = false;
		$file_type = 'unknown';
		foreach ( $allowed_types as $type_key ) {
			if ( isset( $allowed_mime_map[$type_key] ) ) {
				if ( in_array( $file['type'], $allowed_mime_map[$type_key], true ) ) {
					$file_type = $type_key;
					$is_whitelisted = true;
					break;
				}
			}
		}

		if ( false === $is_whitelisted ) {
			throw new ZencommunityException( 
				esc_html( 
					sprintf( 
						// translators: %s is file type
						__( 'Disallowed file type: %s.', 'zencommunity' ), 
						$file['type']
					)
				), 422 
			);
		}

		if ( ! array_key_exists( 'tmp_name', $file ) ) {
			throw new ZencommunityException( 
				esc_html( 
					sprintf( 
						__( 'Unable to access file data.', 'zencommunity' ), 
						( $file['error'] ?? 'unknown' )
					)
				), 500 
			);
		}

		if ( isset( $file['error'] ) && $file['error'] !== UPLOAD_ERR_OK ) {
			throw new ZencommunityException( 
				esc_html( 
					sprintf( 
						// translators: %s is error code
						__( 'Upload failed with error code: %s.', 'zencommunity' ), 
						( $file['error'] ?? 'unknown' )
					)
				), 500 
			);
		}

		do_action( 'zencommunity/attachments/before_upload', $file, $media_type );
		
		add_filter( 
			'upload_dir', 
			[ static::class, 'target_upload_dir' ]
		);

		add_filter(
			'wp_handle_upload_prefilter',
			[ static::class, 'rename_uploaded_file' ]
		);

		// WordPress core's own upload gate (wp_check_filetype_and_ext(), invoked
		// inside wp_handle_upload()) has a separate allow-list from ours and
		// doesn't include .json by default — extend it for the duration of
		// this upload so our own whitelist above is the only gate that matters.
		add_filter(
			'upload_mimes',
			[ static::class, 'extend_core_upload_mimes' ]
		);

		// Core's real-mime check for SVG is unreliable across environments
		// (finfo/libmagic frequently misreports it) — trust the extension
		// plus a content sniff here; sanitize_svg_content() below is the
		// actual security gate against malicious SVG payloads.
		add_filter(
			'wp_check_filetype_and_ext',
			[ static::class, 'allow_svg_filetype' ],
			10,
			3
		);

		if ( ! function_exists( 'wp_handle_upload' ) ) {
			require_once( ABSPATH . 'wp-admin/includes/file.php' );
		}

		$upload = $sideload
			? wp_handle_sideload( $file, [ 'test_form' => false ] )
			: wp_handle_upload( $file, [ 'test_form' => false ] );

		remove_filter(
			'upload_dir',
			[ static::class, 'target_upload_dir' ]
		);

		remove_filter(
			'wp_handle_upload_prefilter',
			[ static::class, 'rename_uploaded_file' ]
		);

		remove_filter(
			'upload_mimes',
			[ static::class, 'extend_core_upload_mimes' ]
		);

		remove_filter(
			'wp_check_filetype_and_ext',
			[ static::class, 'allow_svg_filetype' ],
			10
		);

		if ( isset( $upload['error'] ) ) {
			throw new ZencommunityException(
				esc_html( $upload['error'] ),
				500
			);
		}
		
		$meta = [];
		$target_file = $upload['file']; 
		$target_url  = $upload['url'];
		$type        = $upload['type'];
		
		$meta['type'] = $file_type;
		$meta['original_name'] = $original_name;
		// check if file is image & image is not invalid
		if ( in_array( $file['type'], $allowed_mime_map['img'], true ) ) {
			$target_file  = static::convert_and_compress_image( $target_file, static::get_img_dimentions()[$media_type] ?? 'cover' );
			$size = @getimagesize( $target_file );
			if ( false === $size ) {
				static::delete_file( $target_file );
				throw new ZencommunityException(
					esc_html(
						__( 'Uploaded file is not a valid image.', 'zencommunity' )
					), 500
				);
			}

			$meta['image']['width'] = $size[0] ?? null;
			$meta['image']['height'] = $size[1] ?? null;
			$file['type'] = $size['mime'] ?? $file['type'] ?? null;
		} elseif ( 'svg' === $file_type ) {
			if ( ! static::sanitize_svg_content( $target_file ) ) {
				static::delete_file( $target_file );
				throw new ZencommunityException(
					esc_html(
						__( 'Uploaded file is not a valid SVG image.', 'zencommunity' )
					), 422
				);
			}

			if ( filesize( $target_file ) / 1024 > static::max_image_size_kb() ) {
				static::delete_file( $target_file );
				throw new ZencommunityException( esc_html( static::max_image_size_message() ), 422 );
			}

			$file['type'] = 'image/svg+xml';
		}
		
		$id = static::ins()->insert( [
			'user_id'     => get_current_user_id(),
			'type'  	  => $media_type,
			'mime'        => $file['type'],
			'meta'        => wp_json_encode( $meta ),
			'path'        => static::get_relative_file_path( $target_file ),
			'ip'          => Helper::user_ip(),
			'created_at'  => current_time( 'mysql', true  ),
		] );

		if ( empty( $id ) ) {
			static::delete_file( $target_file );
			throw new ZencommunityException( 
				esc_html( 
					__( 'Unable to save file data .', 'zencommunity' )
				), 500 
			);
		}

		do_action(  'zencommunity/attachments/after_upload', $file_info = static::by_id( $id ) );

		return $file_info;
	}

	/**
	 * Convert an absolute file system path inside the uploads directory to
	 * the stored path: relative to site_url() when uploads live on this site
	 * (the frontend prefixes site_url), otherwise the full uploads URL.
	 * Derived from wp_upload_dir(), so a relocated content/uploads directory
	 * works.
	 *
	 * @param string $absolute_path The absolute file system path.
	 * @return string|null Stored path/URL if inside uploads, null otherwise.
	 */
	protected static function get_relative_file_path( string $absolute_path ) : ?string {
		$absolute_path = wp_normalize_path( $absolute_path );
		$upload_dir    = wp_upload_dir();
		$basedir       = wp_normalize_path( $upload_dir['basedir'] );

		if ( 0 !== strpos( $absolute_path, $basedir ) ) {
			return null;
		}

		return static::uploads_url_prefix() . substr( $absolute_path, strlen( $basedir ) );
	}

	/** Uploads base as stored: site-relative when on this site, else absolute URL. */
	protected static function uploads_url_prefix() : string {
		$baseurl  = untrailingslashit( wp_upload_dir()['baseurl'] );
		$site_url = untrailingslashit( site_url() );
		$baseurl  = set_url_scheme( $baseurl, wp_parse_url( $site_url, PHP_URL_SCHEME ) );

		return 0 === strpos( $baseurl, $site_url ) ? substr( $baseurl, strlen( $site_url ) ) : $baseurl;
	}

	/**
	 * Map a stored path back to its absolute file system path inside the
	 * uploads directory, or null when it doesn't point there. Also reads
	 * rows written before this mapping existed (`/wp-content/uploads/...`).
	 */
	public static function stored_path_to_absolute( string $path ) : ?string {
		$basedir = untrailingslashit( wp_normalize_path( wp_upload_dir()['basedir'] ) );

		foreach ( array_unique( [ static::uploads_url_prefix(), untrailingslashit( wp_upload_dir()['baseurl'] ), '/wp-content/uploads' ] ) as $prefix ) {
			if ( '' !== $prefix && 0 === strpos( $path, $prefix . '/' ) ) {
				$relative = substr( $path, strlen( $prefix ) );
				$absolute = wp_normalize_path( $basedir . $relative );
				// No escaping the uploads directory via `..` segments.
				if ( false !== strpos( $relative, '..' ) ) {
					return null;
				}
				return $absolute;
			}
		}

		return null;
	}

	public static function attach_media(
		int $id, 
		string $type,
		array $data, 
		callable $cb 
	) : array {
		$media_ids = array_filter( $data['media_ids'] ?? [] );

		if ( ! empty( $media_ids ) ) {
			$data['attached'] = [];
			$media = static::get_media_files( $media_ids );
			$data = $cb( $data, $media, $id );
			
			$attached = $data['attached'] ?? [];
			if ( ! empty( $attached ) ) {
				foreach (  $attached  as $media_type => $media_id ) {
					// delete old site logo if exists
					static::delete_media_by_media_type( $media_type, $type, $id );
				}
				static::set_object_id( $id, $type, array_values( $attached ) );
				unset( $data['attached'] );
			}
			unset( $data['media_ids'] );
		}
		return $data;
	}

	public static function delete_unused_files() : void {
		try {
			$ids = static::ins()->qb()
				->where_null( 'atcm.object_type' )
				->where_group( function( QueryBuilder $q ) : void {
					$cutoff = gmdate( 'Y-m-d H:i:s', strtotime( '-15 minutes' ) );
					$q->where( 'atcm.created_at', '<', $cutoff );
					$q->or_where_null( 'atcm.created_at' );
				})
				->values( 'atcm.id' );

			static::delete( $ids );
		}
		catch ( Throwable $e ) {}
	}

	public static function zenc_delete_feed_files( int $feed_id ) : void {
		if ( empty( $feed_id ) ) {
			return;
		}
		try {
			static::delete_media_by_object_id( $feed_id, 'feed' );
			static::delete_media_by_parent_object_id( $feed_id, 'feed' );
		}
		catch ( Throwable $e ) {}
	}

	public static function zenc_delete_comment_files( int $comment_id, array $child_ids ) : void {
		if ( empty( $comment_id ) ) {
			return;
		}
		try {
			// delete comment media
			static::delete_media_by_object_id( $comment_id, 'comment' );
			
			$media_ids = QueryBuilder::ins()->from( 'zenc_attachments' )
					->where_in( 'object_id', $child_ids )
					->where( 'object_type', '=', 'comment' )
					->values( 'id' );
			static::delete( $media_ids );
		}
		catch ( Throwable $e ) {}
	}

	public static function zenc_delete_group_files( int $group_id ) : void {
		if ( empty( $group_id ) ) {
			return;
		}

		try {
			$feed_ids = QueryBuilder::ins()->from( 'zenc_feeds' )
					->where( 'group_id', '=', $group_id )
					->values( 'id' );
			foreach ( $feed_ids as $feed_id ) {
				// delete feed & comment files
				static::delete_media_by_object_id( $feed_id, 'feed' );
				static::delete_media_by_parent_object_id( $feed_id, 'feed' );

				QueryBuilder::ins()->from( 'zenc_feeds' )
					->where( 'id', '=', $feed_id )
					->delete();

				QueryBuilder::ins()->from( 'zenc_comments' )
					->where( 'feed_id', '=', $feed_id )
					->delete();

				QueryBuilder::ins()->from( 'zenc_reactions' )
					->where( 'feed_id', '=', $feed_id )
					->delete();
			}
			// then delete group files
			static::delete_media_by_object_id( $group_id, 'group' );
		}
		catch ( Throwable $e ) {}
	}

	public static function delete_file( string $path ) : void {
		// Stored paths (see get_relative_file_path()) map back into uploads;
		// anything else is already an absolute file system path.
		$path = static::stored_path_to_absolute( $path ) ?? $path;

		if ( file_exists( $path ) && is_file( $path ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.unlink_unlink
			unlink( $path );
		}
	}
}