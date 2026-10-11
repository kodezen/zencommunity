<?php

namespace ZenCommunity\Addons\Gameengine\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Reads a user's gamification state out of GameEngine for native display in the
 * ZenCommunity SPA. Full profile reads use GameEngine's managers; batch summary
 * (for inline chips) and the leaderboard use lightweight point-log queries plus
 * a points→rank ladder so member lists stay fast.
 */
class State {

	protected static $point_type_id = null;
	protected static $ladder        = null;

	public static function available() : bool {
		return class_exists( '\GameEngine\Classes\PointsManager' )
			&& class_exists( '\GameEngine\Classes\LevelsManager' )
			&& class_exists( '\GameEngine\Classes\AchievementsManager' );
	}

	/** Point type the community ranks are bound to (seeded "community-points"). */
	public static function point_type_id() : int {
		if ( null !== self::$point_type_id ) {
			return self::$point_type_id;
		}
		global $wpdb;
		$table = $wpdb->prefix . 'gameengine_point_types';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$id = (int) $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$table} WHERE slug = %s", Seeder::POINT_SLUG ) );
		if ( ! $id ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$id = (int) $wpdb->get_var( "SELECT id FROM {$table} ORDER BY id ASC LIMIT 1" );
		}
		return self::$point_type_id = $id ?: 1;
	}

	/** Ordered ranks (id, title, icon, min_points) for the community point type. */
	public static function ladder() : array {
		if ( null !== self::$ladder ) {
			return self::$ladder;
		}
		global $wpdb;
		$table = $wpdb->prefix . 'gameengine_levels';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$rows = $wpdb->get_results( $wpdb->prepare(
			"SELECT id, title, icon, min_points FROM {$table} WHERE point_type_id = %d AND status = 'publish' ORDER BY min_points ASC",
			self::point_type_id()
		), ARRAY_A );
		return self::$ladder = is_array( $rows ) ? $rows : [];
	}

	protected static function rank_for_points( int $points ) : ?array {
		$current = null;
		foreach ( self::ladder() as $rank ) {
			if ( $points >= (int) $rank['min_points'] ) {
				$current = $rank;
			}
		}
		if ( ! $current ) {
			return null;
		}
		return [
			'id'    => (int) $current['id'],
			'title' => $current['title'],
			'icon'  => self::media_url( $current['icon'] ),
		];
	}

	/**
	 * Lightweight summary for many users at once (inline rank chips).
	 *
	 * @return array map user_id => [ 'points' => int, 'rank' => array|null ]
	 */
	public static function summary_for_users( array $user_ids ) : array {
		$user_ids = array_values( array_filter( array_map( 'absint', $user_ids ) ) );
		if ( empty( $user_ids ) || ! self::available() ) {
			return [];
		}

		global $wpdb;
		$table  = $wpdb->prefix . 'gameengine_points_log';
		$ph     = implode( ',', array_fill( 0, count( $user_ids ), '%d' ) );
		$params = array_merge( [ self::point_type_id() ], $user_ids );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results( $wpdb->prepare(
			"SELECT user_id, SUM(points) AS total FROM {$table} WHERE point_type_id = %d AND user_id IN ($ph) GROUP BY user_id",
			$params
		), ARRAY_A );

		$points = [];
		foreach ( (array) $rows as $row ) {
			$points[ (int) $row['user_id'] ] = (int) $row['total'];
		}

		$out = [];
		foreach ( $user_ids as $uid ) {
			$p = $points[ $uid ] ?? 0;
			$out[ $uid ] = [ 'points' => $p, 'rank' => self::rank_for_points( $p ) ];
		}
		return $out;
	}

	/**
	 * Full gamification state for a single user (profile panel).
	 */
	public static function for_user( int $user_id ) : array {
		if ( ! $user_id || ! self::available() ) {
			return [ 'enabled' => false ];
		}

		$pt = self::point_type_id();
		$pm = new \GameEngine\Classes\PointsManager();
		$lm = new \GameEngine\Classes\LevelsManager();
		$am = new \GameEngine\Classes\AchievementsManager();

		$points  = (int) $pm->get_total( $user_id, $pt );
		$current = $lm->get_current_level( $user_id );
		$next    = $lm->get_next_level( $user_id, $pt );
		$badges  = $am->get_user_achievements( $user_id );

		$rank = $current
			? [ 'id' => (int) $current->id, 'title' => $current->title, 'icon' => self::media_url( $current->icon ?? '' ) ]
			: self::rank_for_points( $points );

		$next_rank = null;
		if ( is_array( $next ) && ! empty( $next['level'] ) ) {
			$lvl = $next['level'];
			$next_rank = [
				'title'        => is_object( $lvl ) ? $lvl->title : ( $lvl['title'] ?? '' ),
				'progress_pc'  => (float) ( $next['progress_pc'] ?? 0 ),
				'points_needed' => (int) ( $next['points_needed'] ?? 0 ),
			];
		}

		// Standing among all members by all-time community points (ties share
		// a position, consistent with the leaderboard's competition ranking).
		$position = null;
		if ( $points > 0 ) {
			global $wpdb;
			$table = $wpdb->prefix . 'gameengine_points_log';
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$higher = (int) $wpdb->get_var( $wpdb->prepare(
				"SELECT COUNT(*) FROM ( SELECT user_id, SUM(points) AS total FROM {$table} WHERE point_type_id = %d GROUP BY user_id HAVING total > %d ) ranked",
				$pt,
				$points
			) );
			$position = $higher + 1;
		}

		return [
			'enabled'   => true,
			'points'    => $points,
			'position'  => $position,
			'rank'      => $rank,
			'next_rank' => $next_rank,
			'badges'    => array_map( static fn( $b ) => [
				'id'      => (int) ( is_object( $b ) ? $b->achievement_id : ( $b['achievement_id'] ?? 0 ) ),
				'title'   => is_object( $b ) ? $b->title : ( $b['title'] ?? '' ),
				'image'   => self::media_url( is_object( $b ) ? ( $b->badge_image ?? '' ) : ( $b['badge_image'] ?? '' ) ),
			], is_array( $badges ) ? $badges : [] ),
		];
	}

	/**
	 * Leaderboard: top members by community points.
	 *
	 * Periods ('week' = current calendar week from Monday, 'month' = current
	 * calendar month, 'all') filter the points log by created_at. For bounded
	 * periods each row also carries `delta` — how many positions the member
	 * moved compared to the previous week/month — and points are the period's
	 * earnings, while rank titles stay based on all-time points (a champion
	 * doesn't become a "Newcomer" in the weekly view).
	 *
	 * The full ranking is aggregated in one grouped query (not paged SQL):
	 * tie-aware positions, movement, and the viewer's own placement all need
	 * the complete ordering.
	 *
	 * @return array { items, total, me }
	 */
	public static function leaderboard( int $per_page = 20, int $page = 1, string $period = 'all', int $viewer_id = 0 ) : array {
		if ( ! self::available() ) {
			return [ 'items' => [], 'total' => 0, 'me' => null ];
		}

		global $wpdb;
		$table    = $wpdb->prefix . 'gameengine_points_log';
		$pt       = self::point_type_id();
		$per_page = max( 1, min( 100, $per_page ) );
		$page     = max( 1, $page );

		// Period boundaries as naive local wall-clock strings, matching how
		// GameEngine writes created_at (current_time-based).
		$now        = (int) current_time( 'timestamp' );
		$cur_start  = null;
		$prev_start = null;
		if ( 'week' === $period ) {
			$cur_start  = strtotime( 'monday this week', $now );
			$prev_start = strtotime( '-7 days', $cur_start );
		} elseif ( 'month' === $period ) {
			$cur_start  = strtotime( gmdate( 'Y-m-01 00:00:00', $now ) );
			$prev_start = strtotime( gmdate( 'Y-m-01 00:00:00', strtotime( '-1 day', $cur_start ) ) );
		}

		$totals = function ( ?int $from, ?int $to ) use ( $wpdb, $table, $pt ) : array {
			$sql  = "SELECT user_id, SUM(points) AS total FROM {$table} WHERE point_type_id = %d";
			$args = [ $pt ];
			if ( $from ) {
				$sql   .= ' AND created_at >= %s';
				$args[] = gmdate( 'Y-m-d H:i:s', $from );
			}
			if ( $to ) {
				$sql   .= ' AND created_at < %s';
				$args[] = gmdate( 'Y-m-d H:i:s', $to );
			}
			$sql .= ' GROUP BY user_id HAVING total > 0 ORDER BY total DESC, user_id ASC';
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared
			return (array) $wpdb->get_results( $wpdb->prepare( $sql, $args ), ARRAY_A );
		};

		// Competition ("1224") ranking: equal totals share a position.
		$position_map = static function ( array $rows ) : array {
			$map  = [];
			$pos  = 0;
			$i    = 0;
			$last = null;
			foreach ( $rows as $row ) {
				$i++;
				$t = (int) $row['total'];
				if ( $t !== $last ) {
					$pos  = $i;
					$last = $t;
				}
				$map[ (int) $row['user_id'] ] = [ 'position' => $pos, 'points' => $t ];
			}
			return $map;
		};

		$cur_rows = $totals( $cur_start, null );
		$cur_map  = $position_map( $cur_rows );
		$prev_map = ( 'all' !== $period ) ? $position_map( $totals( $prev_start, $cur_start ) ) : [];

		$rows_page = array_slice( $cur_rows, ( $page - 1 ) * $per_page, $per_page );

		// Rank titles come from all-time points; in period views the row total
		// is period-only, so batch-read the page's all-time summaries.
		$overall = [];
		if ( 'all' !== $period && ! empty( $rows_page ) ) {
			$overall = self::summary_for_users( array_map( static fn( $r ) => (int) $r['user_id'], $rows_page ) );
		}

		$items = [];
		foreach ( $rows_page as $row ) {
			$uid  = (int) $row['user_id'];
			$user = get_userdata( $uid );
			if ( ! $user ) {
				continue;
			}

			$delta = null;
			if ( 'all' !== $period && isset( $prev_map[ $uid ] ) ) {
				$delta = $prev_map[ $uid ]['position'] - $cur_map[ $uid ]['position'];
			}

			$items[] = [
				'position' => $cur_map[ $uid ]['position'],
				'user_id'  => $uid,
				'name'     => $user->display_name,
				'avatar'   => get_avatar_url( $uid, [ 'size' => 96 ] ),
				'points'   => (int) $row['total'],
				'rank'     => 'all' === $period
					? self::rank_for_points( (int) $row['total'] )
					: ( $overall[ $uid ]['rank'] ?? null ),
				'delta'    => $delta,
			];
		}

		// Viewer banner: period placement + all-time rank and next-rank gap.
		$me = null;
		if ( $viewer_id ) {
			$state = self::for_user( $viewer_id );
			if ( ! empty( $state['enabled'] ) ) {
				$user = get_userdata( $viewer_id );
				$me   = [
					'user_id'   => $viewer_id,
					'name'      => $user ? $user->display_name : '',
					'avatar'    => get_avatar_url( $viewer_id, [ 'size' => 96 ] ),
					'position'  => $cur_map[ $viewer_id ]['position'] ?? null,
					'points'    => $cur_map[ $viewer_id ]['points'] ?? 0,
					'rank'      => $state['rank'],
					'next_rank' => $state['next_rank'],
				];
			}
		}

		return [ 'items' => $items, 'total' => count( $cur_rows ), 'me' => $me ];
	}

	/**
	 * Full rank ladder for the detailed gamification view: every published
	 * rank (earned or not), with the user's progress toward each.
	 */
	public static function all_ranks( int $user_id ) : array {
		if ( ! self::available() ) {
			return [];
		}

		global $wpdb;
		$achieved_ids = [];
		if ( $user_id ) {
			$table = $wpdb->prefix . 'gameengine_user_levels';
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$achieved_ids = array_map( 'absint', (array) $wpdb->get_col( $wpdb->prepare(
				"SELECT level_id FROM {$table} WHERE user_id = %d", $user_id
			) ) );
		}

		$points = $user_id ? (int) ( new \GameEngine\Classes\PointsManager() )->get_total( $user_id, self::point_type_id() ) : 0;

		return array_map( static function ( $rank ) use ( $achieved_ids, $points ) {
			$min = (int) $rank['min_points'];
			return [
				'id'            => (int) $rank['id'],
				'title'         => $rank['title'],
				'icon'          => self::media_url( $rank['icon'] ),
				'min_points'    => $min,
				'achieved'      => in_array( (int) $rank['id'], $achieved_ids, true ) || $points >= $min,
				'points_needed' => max( 0, $min - $points ),
			];
		}, self::ladder() );
	}

	/**
	 * Full badge catalog for the detailed gamification view: every published
	 * achievement (earned or not). Secret achievements withhold their
	 * title/image until earned.
	 */
	public static function all_badges( int $user_id ) : array {
		if ( ! self::available() ) {
			return [];
		}

		global $wpdb;
		$table = $wpdb->prefix . 'gameengine_achievements';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$rows = $wpdb->get_results(
			"SELECT id, title, badge_image, required_points_amount, secret_achievement FROM {$table} WHERE status = 'publish' ORDER BY id ASC",
			ARRAY_A
		);

		$earned = [];
		if ( $user_id ) {
			$ua_table = $wpdb->prefix . 'gameengine_user_achievements';
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery
			$earned_rows = $wpdb->get_results( $wpdb->prepare(
				"SELECT achievement_id, achieved_at FROM {$ua_table} WHERE user_id = %d", $user_id
			), ARRAY_A );
			foreach ( (array) $earned_rows as $row ) {
				$earned[ (int) $row['achievement_id'] ] = $row['achieved_at'];
			}
		}

		$out = [];
		foreach ( (array) $rows as $row ) {
			$id      = (int) $row['id'];
			$is_earned = isset( $earned[ $id ] );

			if ( ! empty( $row['secret_achievement'] ) && ! $is_earned ) {
				$out[] = [
					'id'              => $id,
					'title'           => __( 'Secret badge', 'zencommunity' ),
					'image'           => '',
					'secret'          => true,
					'earned'          => false,
					'earned_at'       => null,
					'required_points' => 0,
				];
				continue;
			}

			$out[] = [
				'id'              => $id,
				'title'           => $row['title'],
				'image'           => self::media_url( $row['badge_image'] ),
				'secret'          => false,
				'earned'          => $is_earned,
				'earned_at'       => $is_earned ? $earned[ $id ] : null,
				'required_points' => (int) $row['required_points_amount'],
			];
		}
		return $out;
	}

	/**
	 * Paginated points transaction history for the detailed gamification view.
	 *
	 * @return array { items, total }
	 */
	public static function points_history( int $user_id, int $page = 1, int $per_page = 20 ) : array {
		if ( ! $user_id || ! self::available() ) {
			return [ 'items' => [], 'total' => 0 ];
		}

		global $wpdb;
		$table    = $wpdb->prefix . 'gameengine_points_log';
		$pt       = self::point_type_id();
		$per_page = max( 1, min( 100, $per_page ) );
		$offset   = max( 0, ( max( 1, $page ) - 1 ) * $per_page );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$total = (int) $wpdb->get_var( $wpdb->prepare(
			"SELECT COUNT(id) FROM {$table} WHERE user_id = %d AND point_type_id = %d",
			$user_id,
			$pt
		) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$rows = $wpdb->get_results( $wpdb->prepare(
			"SELECT points, context, description, created_at FROM {$table} WHERE user_id = %d AND point_type_id = %d ORDER BY created_at DESC, id DESC LIMIT %d OFFSET %d",
			$user_id,
			$pt,
			$per_page,
			$offset
		), ARRAY_A );

		$items = array_map( static function ( $row ) {
			return [
				'points'     => (int) $row['points'],
				'label'      => $row['description'] ?: ucwords( str_replace( [ '_', '-' ], ' ', $row['context'] ) ),
				'created_at' => $row['created_at'],
			];
		}, (array) $rows );

		return [ 'items' => $items, 'total' => $total ];
	}

	/** Is the progress_map addon active? */
	public static function has_journey() : bool {
		return class_exists( '\GameEngine\Addons\ProgressMap\Progress_Map_Logic' );
	}

	/**
	 * The progress_map addon's combined ranks+badges roadmap for a user
	 * (completed first, then locked), read directly from GameEngine since
	 * its own REST endpoint for this is admin-only.
	 */
	public static function journey( int $user_id ) : array {
		if ( ! $user_id || ! self::has_journey() ) {
			return [];
		}

		$journey = \GameEngine\Addons\ProgressMap\Progress_Map_Logic::get_combined_journey( $user_id );

		return array_map( static function ( $item ) {
			return [
				'id'                   => (int) ( $item['id'] ?? 0 ),
				'title'                => $item['title'] ?? '',
				'icon'                 => self::media_url( $item['icon'] ?? '' ),
				'type'                 => $item['type'] ?? 'achievement',
				'status'               => $item['status'] ?? 'locked',
				'restriction_message'  => $item['restriction_message'] ?? '',
			];
		}, (array) $journey );
	}

	/**
	 * Resolve a badge/level icon that may be an attachment id or a URL.
	 */
	protected static function media_url( $value ) : string {
		if ( empty( $value ) ) {
			return '';
		}
		if ( is_numeric( $value ) ) {
			return (string) ( wp_get_attachment_image_url( (int) $value, 'thumbnail' ) ?: '' );
		}
		return (string) $value;
	}
}
