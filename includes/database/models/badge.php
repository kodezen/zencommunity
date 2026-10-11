<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Database\Utils\Model;
use ZenCommunity\Exceptions\ZencommunityException;

/**
 * Admin-assignable member labels (e.g. Moderator, Affiliate) - distinct from
 * RoleManager's roles: a badge carries no capabilities, it's a portable,
 * many-per-member display tag an admin hands out by hand. Definitions live in
 * zenc_badges, assignments in the zenc_user_badges join table (a member can
 * hold more than one badge, a badge can go to more than one member).
 */
class Badge extends Model {
	protected string $table = 'zenc_badges';
	protected ?string $alias = 'b';
	protected array   $selects = [ 'b.*' ];

	const MAX_LABEL_LENGTH = 40;
	const USER_BADGES_TABLE = 'zenc_user_badges';

	/**
	 * Every badge definition, each carrying how many members currently hold
	 * it - the Badges settings screen shows this count per row and uses it
	 * to decide whether "browse members" has anything to show.
	 */
	public static function all() : array {
		$badges = static::ins()->qb()
			->select( [ 'b.*', 'COUNT(DISTINCT ub.id)' => 'member_count' ] )
			->join( self::USER_BADGES_TABLE, 'ub', 'ub.badge_id = b.id', 'LEFT' )
			->group_by( [ 'b.id' ] )
			->order_by( 'b.label', 'ASC' )
			->get();
		return array_map( [ static::class, 'decode_rules' ], $badges );
	}

	public static function find( int $id ) : array {
		$badge = static::ins()->qb()->where( 'b.id', '=', $id )->first();
		if ( empty( $badge ) ) {
			throw new ZencommunityException( esc_html__( 'Badge not found.', 'zencommunity' ), 404 );
		}
		return static::decode_rules( $badge );
	}

	/**
	 * Badges with an active auto-assignment rule, i.e. the ones worth
	 * checking whenever a member's role/groups/profile changes.
	 */
	public static function rule_based() : array {
		$badges = array_map( [ static::class, 'decode_rules' ], static::ins()->qb()->get() );
		return array_values( array_filter(
			$badges,
			static fn( $badge ) => ! empty( $badge['rules']['enabled'] ) && ! empty( $badge['rules']['conditions'] )
		) );
	}

	protected static function decode_rules( array $badge ) : array {
		$badge['rules'] = ! empty( $badge['rules'] ) ? json_decode( (string) $badge['rules'], true ) : null;
		return $badge;
	}

	public static function create( array $data ) : array {
		$label = trim( sanitize_text_field( $data['label'] ?? '' ) );
		if ( '' === $label ) {
			throw new ZencommunityException( esc_html__( 'A badge needs a label.', 'zencommunity' ), 422 );
		}
		if ( mb_strlen( $label ) > self::MAX_LABEL_LENGTH ) {
			throw new ZencommunityException( esc_html__( 'Badge label is too long.', 'zencommunity' ), 422 );
		}

		$now = current_time( 'mysql', true );
		$id  = static::ins()->insert( [
			'label'       => $label,
			'slug'        => static::unique_slug( sanitize_title( $label ) ),
			'color'       => static::sanitize_color( $data['color'] ?? '' ),
			'icon'        => static::sanitize_icon( $data['icon'] ?? '' ),
			'description' => sanitize_text_field( $data['description'] ?? '' ) ?: null,
			'rules'       => static::sanitize_rules( $data['rules'] ?? null ),
			'created_at'  => $now,
			'updated_at'  => $now,
		] );

		if ( empty( $id ) ) {
			throw new ZencommunityException( esc_html__( 'Badge could not be created.', 'zencommunity' ), 500 );
		}

		return static::find( (int) $id );
	}

	public static function update( int $id, array $data ) : array {
		$existing = static::find( $id );
		$update   = [ 'updated_at' => current_time( 'mysql', true ) ];

		if ( array_key_exists( 'label', $data ) ) {
			$label = trim( sanitize_text_field( $data['label'] ) );
			if ( '' === $label ) {
				throw new ZencommunityException( esc_html__( 'A badge needs a label.', 'zencommunity' ), 422 );
			}
			if ( mb_strlen( $label ) > self::MAX_LABEL_LENGTH ) {
				throw new ZencommunityException( esc_html__( 'Badge label is too long.', 'zencommunity' ), 422 );
			}
			$update['label'] = $label;
			if ( $label !== $existing['label'] ) {
				$update['slug'] = static::unique_slug( sanitize_title( $label ), $id );
			}
		}
		if ( array_key_exists( 'color', $data ) ) {
			$update['color'] = static::sanitize_color( $data['color'] );
		}
		if ( array_key_exists( 'icon', $data ) ) {
			$update['icon'] = static::sanitize_icon( $data['icon'] );
		}
		if ( array_key_exists( 'description', $data ) ) {
			$update['description'] = sanitize_text_field( $data['description'] ) ?: null;
		}
		if ( array_key_exists( 'rules', $data ) ) {
			$update['rules'] = static::sanitize_rules( $data['rules'] );
		}

		static::ins()->qb()->where( 'b.id', '=', $id )->update( $update );
		return static::find( $id );
	}

	public static function delete( int $id ) : bool {
		static::find( $id ); // throws 404 if missing
		global $wpdb;
		// Assignments have no meaning once the badge definition is gone.
		$wpdb->delete( $wpdb->prefix . self::USER_BADGES_TABLE, [ 'badge_id' => $id ], [ '%d' ] );
		return static::ins()->qb()->where( 'b.id', '=', $id )->delete();
	}

	/**
	 * Badges held by one member, most recently assigned first.
	 */
	public static function for_user( int $user_id ) : array {
		return static::ins()->qb()
			->select( [ 'b.*', 'ub.assigned_at' ] )
			->join( self::USER_BADGES_TABLE, 'ub', 'ub.badge_id = b.id' )
			->where( 'ub.user_id', '=', $user_id )
			->order_by( 'ub.assigned_at', 'DESC' )
			->get();
	}

	/**
	 * Badges for many members at once, keyed by user_id - the batch shape the
	 * `zencommunity/members/wrapper/collection` filter needs so listing
	 * members doesn't run one query per row.
	 */
	public static function for_users( array $user_ids ) : array {
		$user_ids = array_values( array_unique( array_filter( array_map( 'absint', $user_ids ) ) ) );
		if ( empty( $user_ids ) ) {
			return [];
		}

		$rows = static::ins()->qb()
			->select( [ 'b.*', 'ub.user_id', 'ub.assigned_at' ] )
			->join( self::USER_BADGES_TABLE, 'ub', 'ub.badge_id = b.id' )
			->where_in( 'ub.user_id', $user_ids )
			->order_by( 'ub.assigned_at', 'DESC' )
			->get();

		$by_user = [];
		foreach ( $rows as $row ) {
			$user_id = absint( $row['user_id'] ?? 0 );
			unset( $row['user_id'] );
			$by_user[ $user_id ][] = $row;
		}
		return $by_user;
	}

	/**
	 * Paginated members holding one badge, most recently assigned first -
	 * the "browse members" list on the Badges settings screen. Uses the same
	 * profile shape (and zencommunity/user/select filter) Profile::index()
	 * does, and runs each row through the standard member wrapper so badges,
	 * gamification, etc. attach exactly like anywhere else members are listed.
	 */
	public static function members( int $badge_id, int $page = 1, int $per_page = 20 ) : array {
		static::find( $badge_id ); // throws 404 if the badge doesn't exist

		if ( $per_page > 100 ) {
			throw new ZencommunityException( esc_html__( 'The maximum value of per_page is 100.', 'zencommunity' ) );
		}

		$qb = Profile::ins()->qb();
		$qb->select( apply_filters( 'zencommunity/user/select', [ 'pf.*' ] ) )
			->join( self::USER_BADGES_TABLE, 'ub', 'ub.user_id = pf.user_id' )
			->where( 'ub.badge_id', '=', $badge_id )
			->order_by( 'ub.assigned_at', 'DESC' );

		$data = $qb->paginate( $page, $per_page );
		$data['records'] = Profile::collection_wrapper( $data['records'] ?? [] );
		return $data;
	}

	/**
	 * Grant a badge to a member. Idempotent - assigning an already-held badge
	 * is a no-op success rather than an error, so an admin double-clicking
	 * "Add" doesn't see a failure.
	 */
	public static function assign( int $user_id, int $badge_id, int $assigned_by ) : bool {
		static::find( $badge_id ); // throws 404 if the badge doesn't exist
		if ( ! get_userdata( $user_id ) ) {
			throw new ZencommunityException( esc_html__( 'Member not found.', 'zencommunity' ), 404 );
		}

		global $wpdb;
		$table  = $wpdb->prefix . self::USER_BADGES_TABLE;
		$exists = $wpdb->get_var( $wpdb->prepare(
			"SELECT id FROM {$table} WHERE user_id = %d AND badge_id = %d", $user_id, $badge_id
		) );
		if ( $exists ) {
			return true;
		}

		return false !== $wpdb->insert( $table, [
			'user_id'     => $user_id,
			'badge_id'    => $badge_id,
			'assigned_by' => $assigned_by,
			'assigned_at' => current_time( 'mysql', true ),
		], [ '%d', '%d', '%d', '%s' ] );
	}

	public static function unassign( int $user_id, int $badge_id ) : bool {
		global $wpdb;
		return false !== $wpdb->delete(
			$wpdb->prefix . self::USER_BADGES_TABLE,
			[ 'user_id' => $user_id, 'badge_id' => $badge_id ],
			[ '%d', '%d' ]
		);
	}

	/**
	 * Attaches each member's badges under a `badges` key - hooked onto
	 * `zencommunity/members/wrapper/collection|single` (see includes/hooks.php),
	 * the same extension point the GameEngine addon uses to attach
	 * `gamification` data, so member payloads carry badges with no extra
	 * frontend fetch.
	 */
	public static function enrich_members( array $profiles ) : array {
		$ids     = array_filter( array_map( static fn( $p ) => absint( $p['user_id'] ?? 0 ), $profiles ) );
		$by_user = static::for_users( $ids );
		return array_map( static function ( $p ) use ( $by_user ) {
			$p['badges'] = $by_user[ absint( $p['user_id'] ?? 0 ) ] ?? [];
			return $p;
		}, $profiles );
	}

	public static function enrich_member( array $profile ) : array {
		$profile['badges'] = static::for_user( absint( $profile['user_id'] ?? 0 ) );
		return $profile;
	}

	protected static function sanitize_color( $color ) : string {
		$color = sanitize_text_field( (string) $color );
		return preg_match( '/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/', $color ) ? $color : '#6B7280';
	}

	protected static function sanitize_icon( $icon ) : ?string {
		$icon = trim( sanitize_text_field( (string) $icon ) );
		return '' === $icon ? null : mb_substr( $icon, 0, 10 );
	}

	const RULE_CONDITION_TYPES  = [ 'role', 'group', 'points', 'profile_field' ];
	const RULE_NUMERIC_OPERATORS = [ '>=', '>', '=', '<', '<=' ];
	const RULE_PROFILE_FIELDS    = [ 'bio', 'avatar_url', 'pronouns', 'display_name', 'website_url' ];
	const MAX_RULE_CONDITIONS    = 10;

	/**
	 * Normalizes an incoming (admin-authored) rule set to a safe JSON string,
	 * dropping anything unrecognized. Returns null for "no rule" (manual-only
	 * badge), same as before this feature existed.
	 */
	protected static function sanitize_rules( $rules ) : ?string {
		if ( empty( $rules ) || ! is_array( $rules ) ) {
			return null;
		}

		$conditions = [];
		foreach ( (array) ( $rules['conditions'] ?? [] ) as $condition ) {
			if ( ! is_array( $condition ) || ! in_array( $condition['type'] ?? '', self::RULE_CONDITION_TYPES, true ) ) {
				continue;
			}

			$type = $condition['type'];
			if ( 'role' === $type ) {
				$value = sanitize_key( $condition['value'] ?? '' );
				if ( '' === $value ) {
					continue;
				}
				$conditions[] = [ 'type' => 'role', 'value' => $value ];
			} elseif ( 'group' === $type ) {
				$value = absint( $condition['value'] ?? 0 );
				if ( ! $value ) {
					continue;
				}
				$conditions[] = [ 'type' => 'group', 'value' => $value ];
			} elseif ( 'points' === $type ) {
				$operator = in_array( $condition['operator'] ?? '', self::RULE_NUMERIC_OPERATORS, true ) ? $condition['operator'] : '>=';
				$conditions[] = [ 'type' => 'points', 'operator' => $operator, 'value' => (int) ( $condition['value'] ?? 0 ) ];
			} elseif ( 'profile_field' === $type ) {
				$field = in_array( $condition['field'] ?? '', self::RULE_PROFILE_FIELDS, true ) ? $condition['field'] : null;
				if ( ! $field ) {
					continue;
				}
				$conditions[] = [ 'type' => 'profile_field', 'field' => $field, 'operator' => 'not_empty' ];
			}

			if ( count( $conditions ) >= self::MAX_RULE_CONDITIONS ) {
				break;
			}
		}

		if ( empty( $conditions ) ) {
			return null;
		}

		return wp_json_encode( [
			'enabled'    => ! empty( $rules['enabled'] ),
			'conditions' => $conditions,
		] );
	}

	/**
	 * Re-checks every rule-based badge against one member and assigns
	 * whichever ones now match - called after events that can change
	 * eligibility (login, profile update, publishing a post, joining a
	 * group). Never revokes: a badge that stops matching later is left in
	 * place, same as any other admin-assigned badge.
	 *
	 * @return int[] IDs of badges newly assigned this run.
	 */
	public static function evaluate_for_user( int $user_id ) : array {
		$badges = static::rule_based();
		if ( empty( $badges ) || ! $user_id ) {
			return [];
		}

		$profile = Profile::ins()->qb()
			->select( [ 'points', 'bio', 'avatar_url', 'meta' ] )
			->where( 'user_id', '=', $user_id )
			->first();
		if ( empty( $profile ) ) {
			return [];
		}
		$profile['meta'] = json_decode( (string) ( $profile['meta'] ?? '{}' ), true ) ?: [];

		$user      = get_userdata( $user_id ) ?: null;
		$newly_won = [];

		foreach ( $badges as $badge ) {
			// assign() is idempotent (no-op if already held), so no need to
			// check for an existing assignment before evaluating conditions.
			$conditions = $badge['rules']['conditions'] ?? [];
			$matches    = ! empty( $conditions );
			foreach ( $conditions as $condition ) {
				if ( ! static::matches_condition( $condition, $user, $profile ) ) {
					$matches = false;
					break;
				}
			}

			if ( $matches && static::assign( $user_id, (int) $badge['id'], 0 ) ) {
				$newly_won[] = (int) $badge['id'];
			}
		}

		return $newly_won;
	}

	protected static function matches_condition( array $condition, ?\WP_User $user, array $profile ) : bool {
		switch ( $condition['type'] ) {
			case 'role':
				return $user && in_array( $condition['value'], (array) $user->roles, true );

			case 'group':
				return Group::is_member_of( $user->ID ?? 0, (int) $condition['value'] );

			case 'points':
				$points = (int) ( $profile['points'] ?? 0 );
				switch ( $condition['operator'] ) {
					case '>':  return $points > $condition['value'];
					case '=':  return $points === (int) $condition['value'];
					case '<':  return $points < $condition['value'];
					case '<=': return $points <= $condition['value'];
					default:   return $points >= $condition['value']; // '>='
				}

			case 'profile_field':
				$field = $condition['field'];
				$value = in_array( $field, [ 'bio', 'avatar_url' ], true )
					? ( $profile[ $field ] ?? '' )
					: ( $profile['meta'][ $field ] ?? '' );
				return ! empty( $value );

			default:
				return false;
		}
	}

	protected static function unique_slug( string $base, ?int $ignore_id = null ) : string {
		$base = $base ?: 'badge';
		$slug = $base;
		$i    = 2;
		while ( true ) {
			$qb = static::ins()->qb()->where( 'b.slug', '=', $slug );
			if ( $ignore_id ) {
				$qb->where( 'b.id', '!=', $ignore_id );
			}
			if ( empty( $qb->first() ) ) {
				return $slug;
			}
			$slug = $base . '-' . $i++;
		}
	}
}
