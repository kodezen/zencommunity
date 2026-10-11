<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Classes\RoleManager;
use ZenCommunity\Database\Utils\Model;
use ZenCommunity\Database\Utils\QueryBuilder;
use ZenCommunity\Exceptions\ZencommunityException;

/**
 * Admin-defined group roles (Settings > Role and Permission > Add Role) that
 * sit alongside the fixed admin/moderator/member roles - additive, not a
 * replacement. A custom role's `slug` is used directly as the `role` value in
 * zenc_group_members, exactly like a built-in role, so once created it's
 * assignable anywhere a group role is (see RoleManager::roles(), which merges
 * these in, and Group::add_member()/change_member_role(), which validate
 * against that merged set).
 */
class CustomRole extends Model {
	protected string $table = 'zenc_custom_roles';
	protected ?string $alias = 'cr';
	protected array   $selects = [ 'cr.*' ];

	const MAX_LABEL_LENGTH = 40;

	public static function all() : array {
		$rows = static::ins()->qb()->order_by( 'cr.label', 'ASC' )->get();
		return array_map( [ static::class, 'wrapper' ], $rows );
	}

	public static function find( int $id ) : array {
		$row = static::ins()->qb()->where( 'cr.id', '=', $id )->first();
		if ( empty( $row ) ) {
			throw new ZencommunityException( esc_html__( 'Role not found.', 'zencommunity' ), 404 );
		}
		return static::wrapper( $row );
	}

	public static function create( array $data ) : array {
		$label = trim( sanitize_text_field( $data['label'] ?? '' ) );
		if ( '' === $label ) {
			throw new ZencommunityException( esc_html__( 'A role needs a label.', 'zencommunity' ), 422 );
		}
		if ( mb_strlen( $label ) > self::MAX_LABEL_LENGTH ) {
			throw new ZencommunityException( esc_html__( 'Role label is too long.', 'zencommunity' ), 422 );
		}

		$capabilities = static::sanitize_capabilities( $data['capabilities'] ?? [] );
		$now          = current_time( 'mysql', true );

		$id = static::ins()->insert( [
			'label'        => $label,
			'slug'         => static::unique_slug( sanitize_title( $label ) ),
			'capabilities' => wp_json_encode( $capabilities ),
			'created_at'   => $now,
			'updated_at'   => $now,
		] );

		if ( empty( $id ) ) {
			throw new ZencommunityException( esc_html__( 'Role could not be created.', 'zencommunity' ), 500 );
		}

		return static::find( (int) $id );
	}

	public static function update( int $id, array $data ) : array {
		static::find( $id ); // throws 404 if missing
		$update = [ 'updated_at' => current_time( 'mysql', true ) ];

		if ( array_key_exists( 'label', $data ) ) {
			$label = trim( sanitize_text_field( $data['label'] ) );
			if ( '' === $label ) {
				throw new ZencommunityException( esc_html__( 'A role needs a label.', 'zencommunity' ), 422 );
			}
			if ( mb_strlen( $label ) > self::MAX_LABEL_LENGTH ) {
				throw new ZencommunityException( esc_html__( 'Role label is too long.', 'zencommunity' ), 422 );
			}
			// The slug (the actual value stored on group members) is
			// intentionally left alone on rename - changing it here would
			// silently orphan every member currently holding this role.
			$update['label'] = $label;
		}
		if ( array_key_exists( 'capabilities', $data ) ) {
			$update['capabilities'] = wp_json_encode( static::sanitize_capabilities( $data['capabilities'] ) );
		}

		static::ins()->qb()->where( 'cr.id', '=', $id )->update( $update );
		return static::find( $id );
	}

	/**
	 * Deletion is blocked while any group member currently holds this role,
	 * rather than silently reassigning them - an admin should choose what
	 * those members become, not have it decided for them.
	 */
	public static function delete( int $id ) : bool {
		$role      = static::find( $id );
		$in_use_by = QueryBuilder::ins()
			->select( [ 'id' ] )
			->from( 'zenc_group_members' )
			->where( 'role', '=', $role['slug'] )
			->count();

		if ( $in_use_by > 0 ) {
			// No esc_html() here (unlike most exception messages in this
			// codebase) - this one's rendered as plain React text, not
			// echoed into raw HTML, so esc_html() would leave a literal
			// "&quot;" in the UI instead of a quote character. Sidestepped
			// entirely by not needing a quote character in the message.
			throw new ZencommunityException(
				sprintf(
					/* translators: 1: role label, 2: number of members currently holding this role */
					_n(
						'%1$s is still assigned to %2$d member - change their role first.',
						'%1$s is still assigned to %2$d members - change their roles first.',
						$in_use_by,
						'zencommunity'
					),
					sanitize_text_field( $role['label'] ),
					$in_use_by
				),
				422
			);
		}

		return static::ins()->qb()->where( 'cr.id', '=', $id )->delete();
	}

	protected static function wrapper( array $row ) : array {
		$row['capabilities'] = static::sanitize_capabilities( json_decode( $row['capabilities'] ?? '[]', true ) ?: [] );
		return $row;
	}

	/**
	 * Whitelist against RoleManager::capability_catalog() - a custom role can
	 * only ever be built from capabilities the codebase actually checks.
	 */
	protected static function sanitize_capabilities( $capabilities ) : array {
		$capabilities = is_array( $capabilities ) ? $capabilities : [];
		$known        = array_keys( RoleManager::capability_catalog() );
		return array_values( array_intersect( array_unique( array_map( 'sanitize_key', $capabilities ) ), $known ) );
	}

	protected static function unique_slug( string $base ) : string {
		$base     = $base ?: 'role';
		$reserved = array_keys( RoleManager::default_roles() );
		$slug     = $base;
		$i        = 2;

		while ( true ) {
			$taken = in_array( $slug, $reserved, true )
				|| ! empty( static::ins()->qb()->where( 'cr.slug', '=', $slug )->first() );

			if ( ! $taken ) {
				// zenc_group_members.role is VARCHAR(100); leave headroom
				// since this slug becomes that column's value directly.
				return mb_substr( $slug, 0, 90 );
			}
			$slug = $base . '-' . $i++;
		}
	}
}
