<?php
namespace ZenCommunity\Database\Models;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Exceptions\ZencommunityException;

class Poll {

	public static function vote( int $feed_id, int $user_id, array $option_ids ) : bool {
		global $wpdb;

		$opts_table  = $wpdb->prefix . 'zenc_poll_options';
		$votes_table = $wpdb->prefix . 'zenc_poll_votes';
		$feeds_table = $wpdb->prefix . 'zenc_feeds';

		$feed = $wpdb->get_row(
			$wpdb->prepare( "SELECT type, meta FROM `{$feeds_table}` WHERE id = %d", $feed_id ),
			ARRAY_A
		);

		if ( empty( $feed ) ) {
			throw new ZencommunityException( esc_html__( 'Feed not found.', 'zencommunity' ), 404 );
		}
		if ( ( $feed['type'] ?? 'post' ) !== 'poll' ) {
			throw new ZencommunityException( esc_html__( 'This post is not a poll.', 'zencommunity' ), 400 );
		}

		$meta          = json_decode( $feed['meta'] ?? '{}', true ) ?? [];
		$poll_meta     = $meta['poll'] ?? [];
		$allow_multiple = ! empty( $poll_meta['allow_multiple'] );
		$expires_at    = $poll_meta['expires_at'] ?? '';

		if ( ! empty( $expires_at ) && strtotime( $expires_at ) < time() ) {
			throw new ZencommunityException( esc_html__( 'This poll has expired.', 'zencommunity' ), 422 );
		}

		if ( ! $allow_multiple && count( $option_ids ) !== 1 ) {
			throw new ZencommunityException( esc_html__( 'This poll only allows one answer.', 'zencommunity' ), 422 );
		}

		// Validate option IDs belong to this feed
		$placeholders = implode( ', ', array_fill( 0, count( $option_ids ), '%d' ) );
		$valid_ids    = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT id FROM `{$opts_table}` WHERE id IN ({$placeholders}) AND feed_id = %d",
				...array_merge( $option_ids, [ $feed_id ] )
			)
		);
		$valid_ids = array_map( 'intval', $valid_ids );

		foreach ( $option_ids as $opt_id ) {
			if ( ! in_array( intval( $opt_id ), $valid_ids, true ) ) {
				throw new ZencommunityException( esc_html__( 'Invalid poll option.', 'zencommunity' ), 400 );
			}
		}

		// Delete existing votes and insert new ones in a transaction
		$wpdb->query( 'START TRANSACTION' );
		try {
			$wpdb->delete( $votes_table, [ 'feed_id' => $feed_id, 'user_id' => $user_id ] );
			$now = current_time( 'mysql', true );
			foreach ( $option_ids as $opt_id ) {
				$wpdb->insert( $votes_table, [
					'feed_id'    => $feed_id,
					'option_id'  => intval( $opt_id ),
					'user_id'    => $user_id,
					'created_at' => $now,
				] );
			}
			$wpdb->query( 'COMMIT' );
		} catch ( \Throwable $e ) {
			$wpdb->query( 'ROLLBACK' );
			throw new ZencommunityException( esc_html__( 'Could not save vote.', 'zencommunity' ), 500 );
		}

		return true;
	}

	public static function remove_vote( int $feed_id, int $user_id ) : bool {
		global $wpdb;

		$feeds_table = $wpdb->prefix . 'zenc_feeds';
		$votes_table = $wpdb->prefix . 'zenc_poll_votes';

		$feed = $wpdb->get_row(
			$wpdb->prepare( "SELECT type, meta FROM `{$feeds_table}` WHERE id = %d", $feed_id ),
			ARRAY_A
		);

		if ( empty( $feed ) || ( $feed['type'] ?? 'post' ) !== 'poll' ) {
			throw new ZencommunityException( esc_html__( 'Poll not found.', 'zencommunity' ), 404 );
		}

		$meta       = json_decode( $feed['meta'] ?? '{}', true ) ?? [];
		$expires_at = $meta['poll']['expires_at'] ?? '';
		if ( ! empty( $expires_at ) && strtotime( $expires_at ) < time() ) {
			throw new ZencommunityException( esc_html__( 'This poll has expired.', 'zencommunity' ), 422 );
		}

		$wpdb->delete( $votes_table, [ 'feed_id' => $feed_id, 'user_id' => $user_id ] );
		return true;
	}

	public static function get_results( int $feed_id, ?int $user_id = null ) : array {
		global $wpdb;

		$opts_table  = $wpdb->prefix . 'zenc_poll_options';
		$votes_table = $wpdb->prefix . 'zenc_poll_votes';

		$options = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT po.id, po.text, po.sort_order,
				    COUNT(pv.id) AS vote_count
				 FROM `{$opts_table}` po
				 LEFT JOIN `{$votes_table}` pv ON pv.option_id = po.id AND pv.feed_id = %d
				 WHERE po.feed_id = %d
				 GROUP BY po.id
				 ORDER BY po.sort_order ASC",
				$feed_id,
				$feed_id
			),
			ARRAY_A
		);

		$total_votes = array_sum( array_column( $options ?? [], 'vote_count' ) );

		foreach ( $options as &$opt ) {
			$opt['id']         = intval( $opt['id'] );
			$opt['vote_count'] = intval( $opt['vote_count'] );
			$opt['percentage'] = $total_votes > 0
				? round( ( $opt['vote_count'] / $total_votes ) * 100, 1 )
				: 0;
		}
		unset( $opt );

		$user_voted_option_ids = [];
		if ( $user_id ) {
			$rows = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT option_id FROM `{$votes_table}` WHERE feed_id = %d AND user_id = %d",
					$feed_id,
					$user_id
				)
			);
			$user_voted_option_ids = array_map( 'intval', $rows );
		}

		return [
			'options'              => $options ?? [],
			'total_votes'          => $total_votes,
			'user_voted_option_ids'=> $user_voted_option_ids,
		];
	}
}
