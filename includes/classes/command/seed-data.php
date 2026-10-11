<?php
/**
 * WP-CLI dummy-data seeder for ZenCommunity.
 *
 * Generates realistic test data for the heavy/hard-to-test areas: support
 * tickets (with conversations + assignees), direct & group messaging, and
 * live chat. Every row is tagged with a `zenc_seed` marker so `cleanup` can
 * remove only the seeded data and never touch real records.
 *
 * Usage:
 *   wp zencommunity seed all                       # seed everything
 *   wp zencommunity seed users --count=15
 *   wp zencommunity seed tickets --count=30 --conversations=8
 *   wp zencommunity seed messaging --threads=10 --messages=25 --groups=3
 *   wp zencommunity seed livechat --count=12 --messages=20
 *   wp zencommunity seed cleanup                   # remove all seeded data
 *
 * @package ZenCommunity
 */

namespace ZenCommunity\Classes\Command;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class SeedData extends Base {

	/**
	 * The WP-CLI command name (parent namespace + command).
	 *
	 * @var string
	 */
	public static string $name = 'zencommunity seed';

	/**
	 * Marker stored in every seeded row's `meta` JSON / user meta.
	 */
	const MARKER_KEY = 'zenc_seed';

	/**
	 * User meta key flagging a dummy user.
	 */
	const USER_FLAG = 'zenc_seed_dummy';

	/** @var object $wpdb */
	protected $db;

	public function __construct() {
		global $wpdb;
		$this->db = $wpdb;
	}

	/**
	 * Seed all entity types at once.
	 *
	 * ## OPTIONS
	 *
	 * [--users=<n>]
	 * : How many dummy users to ensure exist. Default 15.
	 *
	 * [--tickets=<n>]
	 * : How many tickets to create. Default 25.
	 *
	 * [--threads=<n>]
	 * : How many direct-message threads to create. Default 10.
	 *
	 * [--groups=<n>]
	 * : How many group chats to create. Default 3.
	 *
	 * [--livechats=<n>]
	 * : How many live-chat sessions to create. Default 12.
	 *
	 * ## EXAMPLES
	 *
	 *     wp zencommunity seed all
	 *     wp zencommunity seed all --tickets=100 --livechats=40
	 *
	 * @when after_wp_load
	 */
	public function all( $args, $assoc ) {
		$users     = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'users', 15 );
		$tickets   = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'tickets', 25 );
		$threads   = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'threads', 10 );
		$groups    = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'groups', 3 );
		$livechats = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'livechats', 12 );

		$this->users( [], [ 'count' => $users ] );
		$this->tickets( [], [ 'count' => $tickets ] );
		$this->messaging( [], [ 'threads' => $threads, 'groups' => $groups ] );
		$this->livechat( [], [ 'count' => $livechats ] );

		\WP_CLI::success( 'All dummy data seeded.' );
	}

	/**
	 * Create dummy WordPress users (idempotent — reuses existing dummy users).
	 *
	 * ## OPTIONS
	 *
	 * [--count=<n>]
	 * : Total number of dummy users to ensure exist. Default 15.
	 *
	 * [--role=<role>]
	 * : WordPress role for created users. Default 'subscriber'.
	 *
	 * @when after_wp_load
	 */
	public function users( $args, $assoc ) {
		$count = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'count', 15 );
		$role  = (string) \WP_CLI\Utils\get_flag_value( $assoc, 'role', 'subscriber' );

		$existing = $this->dummy_user_ids();
		$have     = count( $existing );

		if ( $have >= $count ) {
			\WP_CLI::log( sprintf( '%d dummy users already exist; nothing to create.', $have ) );
			return;
		}

		$to_create = $count - $have;
		$created   = 0;
		$progress  = \WP_CLI\Utils\make_progress_bar( 'Creating users', $to_create );

		for ( $i = 0; $i < $to_create; $i++ ) {
			$first = $this->pick( self::FIRST_NAMES );
			$last  = $this->pick( self::LAST_NAMES );
			$n     = $have + $i + 1;
			$login = sprintf( 'zc_dummy_%d', $n );

			// Guard against a left-over login collision.
			while ( username_exists( $login ) ) {
				$n++;
				$login = sprintf( 'zc_dummy_%d', $n );
			}

			$user_id = wp_insert_user( [
				'user_login'   => $login,
				'user_pass'    => wp_generate_password( 16 ),
				'user_email'   => $login . '@example.test',
				'display_name' => $first . ' ' . $last,
				'first_name'   => $first,
				'last_name'    => $last,
				'role'         => $role,
			] );

			if ( is_wp_error( $user_id ) ) {
				\WP_CLI::warning( 'Skipped a user: ' . $user_id->get_error_message() );
				continue;
			}

			update_user_meta( $user_id, self::USER_FLAG, 1 );
			$created++;
			$progress->tick();
		}

		$progress->finish();
		\WP_CLI::success( sprintf( 'Created %d dummy users (%d total).', $created, $this->count_dummy_users() ) );
	}

	/**
	 * Seed support tickets with conversations and assignees.
	 *
	 * ## OPTIONS
	 *
	 * [--count=<n>]
	 * : Number of tickets to create. Default 25.
	 *
	 * [--conversations=<n>]
	 * : Max replies per ticket (random 0..n). Default 6.
	 *
	 * @when after_wp_load
	 */
	public function tickets( $args, $assoc ) {
		$this->require_table( 'zenc_tickets' );

		$count    = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'count', 25 );
		$max_conv = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'conversations', 6 );

		$user_ids = $this->ensure_users( 10 );
		$products = $this->ensure_ticket_products();
		$types    = $this->ensure_ticket_labels( 'type', self::TICKET_TYPES );
		$priors   = $this->ensure_ticket_labels( 'priority', self::TICKET_PRIORITIES );

		$statuses = [ 'new', 'open', 'pending', 'resolved', 'closed' ];
		$progress = \WP_CLI\Utils\make_progress_bar( 'Creating tickets', $count );

		for ( $i = 0; $i < $count; $i++ ) {
			$author    = $this->pick( $user_ids );
			$title     = $this->pick( self::TICKET_SUBJECTS );
			$created   = $this->random_datetime( 45 );
			$content   = $this->paragraph();

			$this->db->insert( $this->t( 'zenc_tickets' ), [
				'user_id'            => $author,
				'product_id'         => $this->pick( $products ),
				'type_id'            => $this->pick( $types ),
				'priority_id'        => $this->pick( $priors ),
				'is_trashed'         => 0,
				'title'              => $title,
				'slug'              => sanitize_title( $title ) . '-' . wp_generate_password( 6, false ),
				'content'            => $content,
				'rendered'           => $this->render( $content ),
				'status'             => $this->pick( $statuses ),
				'conversation_count' => 0,
				'meta'               => $this->meta(),
				'created_at'         => $created,
				'updated_at'         => $created,
			] );

			$ticket_id = (int) $this->db->insert_id;
			if ( ! $ticket_id ) {
				continue;
			}

			// Assignee (50% chance).
			if ( $this->chance( 50 ) ) {
				$this->db->insert( $this->t( 'zenc_ticket_assignees' ), [
					'ticket_id'   => $ticket_id,
					'assignee_id' => $this->pick( $user_ids ),
					'assigner_id' => $author,
					'created_at'  => $created,
					'updated_at'  => $created,
				] );
			}

			// Conversations / replies.
			$replies = wp_rand( 0, max( 0, $max_conv ) );
			for ( $r = 0; $r < $replies; $r++ ) {
				$reply_body = $this->paragraph();
				$reply_time = $this->random_datetime_after( $created );
				$this->db->insert( $this->t( 'zenc_ticket_conversations' ), [
					'user_id'     => $this->pick( $user_ids ),
					'ticket_id'   => $ticket_id,
					'is_pinned'   => $this->chance( 10 ) ? 1 : 0,
					'is_official' => $this->chance( 30 ) ? 1 : 0,
					'is_note'     => $this->chance( 15 ) ? 1 : 0,
					'content'     => $reply_body,
					'rendered'    => $this->render( $reply_body ),
					'meta'        => $this->meta(),
					'ip'          => $this->random_ip(),
					'created_at'  => $reply_time,
					'updated_at'  => $reply_time,
				] );
			}

			$this->db->update(
				$this->t( 'zenc_tickets' ),
				[ 'conversation_count' => $replies ],
				[ 'id' => $ticket_id ]
			);

			$progress->tick();
		}

		$progress->finish();
		\WP_CLI::success( sprintf( 'Created %d tickets.', $count ) );
	}

	/**
	 * Seed direct-message threads and group chats.
	 *
	 * ## OPTIONS
	 *
	 * [--threads=<n>]
	 * : Number of distinct 1:1 DM threads. Default 10.
	 *
	 * [--messages=<n>]
	 * : Max messages per thread/group (random 3..n). Default 20.
	 *
	 * [--groups=<n>]
	 * : Number of group chats to create. Default 3.
	 *
	 * @when after_wp_load
	 */
	public function messaging( $args, $assoc ) {
		$this->require_table( 'zenc_messages' );

		$threads      = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'threads', 10 );
		$max_messages = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'messages', 20 );
		$groups       = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'groups', 3 );

		$user_ids = $this->ensure_users( 6 );

		// --- Direct messages -------------------------------------------------
		$progress = \WP_CLI\Utils\make_progress_bar( 'Creating DM threads', $threads );
		for ( $i = 0; $i < $threads; $i++ ) {
			list( $a, $b ) = $this->pick_pair( $user_ids );
			if ( ! $a || ! $b ) {
				continue;
			}
			$n    = wp_rand( 3, max( 3, $max_messages ) );
			$time = $this->random_datetime( 20 );
			for ( $m = 0; $m < $n; $m++ ) {
				$sender   = $this->chance( 50 ) ? $a : $b;
				$receiver = ( $sender === $a ) ? $b : $a;
				$body     = $this->sentence();
				$time     = $this->random_datetime_after( $time, 600 );
				$this->db->insert( $this->t( 'zenc_messages' ), [
					'sender_id'        => $sender,
					'receiver_id'      => $receiver,
					'group_id'         => null,
					'message'          => $body,
					'message_rendered' => $this->render( $body ),
					'meta'             => $this->meta(),
					'sent_at'          => $time,
					'updated_at'       => $time,
				] );
			}
			$progress->tick();
		}
		$progress->finish();

		// --- Group chats -----------------------------------------------------
		if ( $groups > 0 && $this->table_exists( 'zenc_groups' ) ) {
			$progress = \WP_CLI\Utils\make_progress_bar( 'Creating group chats', $groups );
			for ( $g = 0; $g < $groups; $g++ ) {
				$name    = $this->pick( self::GROUP_NAMES ) . ' ' . wp_generate_password( 4, false );
				$creator = $this->pick( $user_ids );
				$created = $this->random_datetime( 30 );

				$this->db->insert( $this->t( 'zenc_groups' ), [
					'name'         => $name,
					'slug'         => sanitize_title( $name ),
					'description'  => $this->sentence(),
					'privacy'      => $this->chance( 50 ) ? 'public' : 'private',
					'status'       => 'published',
					'meta'         => $this->meta(),
					'member_count' => 0,
					'created_by'   => $creator,
					'created_at'   => $created,
					'updated_at'   => $created,
				] );
				$group_id = (int) $this->db->insert_id;
				if ( ! $group_id ) {
					continue;
				}

				// Members + chat participants.
				$members = $this->sample( $user_ids, wp_rand( 3, min( 8, count( $user_ids ) ) ) );
				foreach ( $members as $uid ) {
					if ( $this->table_exists( 'zenc_group_members' ) ) {
						$this->db->insert( $this->t( 'zenc_group_members' ), [
							'group_id'  => $group_id,
							'user_id'   => $uid,
							'role'      => $uid === $creator ? 'admin' : 'member',
							'status'    => 'approved',
							'meta'      => $this->meta(),
							'joined_at' => $created,
						] );
					}
					if ( $this->table_exists( 'zenc_group_chat_participants' ) ) {
						$this->db->insert( $this->t( 'zenc_group_chat_participants' ), [
							'group_id'  => $group_id,
							'user_id'   => $uid,
							'is_active' => 1,
							'is_muted'  => 0,
						] );
					}
				}

				$this->db->update(
					$this->t( 'zenc_groups' ),
					[ 'member_count' => count( $members ) ],
					[ 'id' => $group_id ]
				);

				// Group messages.
				$n    = wp_rand( 3, max( 3, $max_messages ) );
				$time = $created;
				for ( $m = 0; $m < $n; $m++ ) {
					$body = $this->sentence();
					$time = $this->random_datetime_after( $time, 900 );
					$this->db->insert( $this->t( 'zenc_messages' ), [
						'sender_id'        => $this->pick( $members ),
						'receiver_id'      => null,
						'group_id'         => $group_id,
						'message'          => $body,
						'message_rendered' => $this->render( $body ),
						'meta'             => $this->meta(),
						'sent_at'          => $time,
						'updated_at'       => $time,
					] );
				}
				$progress->tick();
			}
			$progress->finish();
		}

		\WP_CLI::success( 'Messaging data seeded.' );
	}

	/**
	 * Seed live-chat sessions with messages.
	 *
	 * ## OPTIONS
	 *
	 * [--count=<n>]
	 * : Number of live-chat sessions. Default 12.
	 *
	 * [--messages=<n>]
	 * : Max messages per chat (random 2..n). Default 15.
	 *
	 * @when after_wp_load
	 */
	public function livechat( $args, $assoc ) {
		$this->require_table( 'zenc_live_chats' );

		$count        = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'count', 12 );
		$max_messages = (int) \WP_CLI\Utils\get_flag_value( $assoc, 'messages', 15 );

		$user_ids = $this->ensure_users( 5 );
		$products = $this->ensure_livechat_products();

		$progress = \WP_CLI\Utils\make_progress_bar( 'Creating live chats', $count );
		for ( $i = 0; $i < $count; $i++ ) {
			$first   = $this->pick( self::FIRST_NAMES );
			$last    = $this->pick( self::LAST_NAMES );
			$created = $this->random_datetime( 15 );
			$agent   = $this->chance( 60 ) ? $this->pick( $user_ids ) : null;

			$this->db->insert( $this->t( 'zenc_live_chats' ), [
				'user_id'     => $this->chance( 50 ) ? $this->pick( $user_ids ) : null,
				'product_id'  => $this->pick( $products ),
				'assignee_id' => $agent,
				'is_blocked'  => 0,
				'is_resolved' => $this->chance( 30 ) ? 1 : 0,
				'name'        => $first . ' ' . $last,
				'email'       => strtolower( $first ) . '@example.test',
				'ip'          => $this->random_ip(),
				'user_agent'  => 'Mozilla/5.0 (SeedBot)',
				'meta'        => $this->meta(),
				'created_by'  => $agent,
				'last_msg_at' => $created,
				'created_at'  => $created,
				'updated_at'  => $created,
			] );
			$chat_id = (int) $this->db->insert_id;
			if ( ! $chat_id ) {
				continue;
			}

			$n    = wp_rand( 2, max( 2, $max_messages ) );
			$time = $created;
			for ( $m = 0; $m < $n; $m++ ) {
				$from_agent = $agent && $this->chance( 45 );
				$body       = $this->sentence();
				$time       = $this->random_datetime_after( $time, 300 );
				$this->db->insert( $this->t( 'zenc_live_chat_messages' ), [
					'chat_id'          => $chat_id,
					'agent_id'         => $from_agent ? $agent : null,
					'message'          => $body,
					'message_rendered' => $this->render( $body ),
					'meta'             => $this->meta(),
					'is_seen'          => $this->chance( 60 ) ? 1 : 0,
					'sent_at'          => $time,
					'updated_at'       => $time,
				] );
			}

			$this->db->update(
				$this->t( 'zenc_live_chats' ),
				[ 'last_msg_at' => $time ],
				[ 'id' => $chat_id ]
			);

			$progress->tick();
		}

		$progress->finish();
		\WP_CLI::success( sprintf( 'Created %d live-chat sessions.', $count ) );
	}

	/**
	 * Remove ALL seeded dummy data (rows tagged with the seed marker + dummy users).
	 *
	 * ## OPTIONS
	 *
	 * [--yes]
	 * : Skip the confirmation prompt.
	 *
	 * [--keep-users]
	 * : Delete data rows but keep the dummy WordPress users.
	 *
	 * @when after_wp_load
	 */
	public function cleanup( $args, $assoc ) {
		\WP_CLI::confirm( 'Delete all ZenCommunity dummy/seeded data?', $assoc );

		$marker = '%"' . self::MARKER_KEY . '":true%';
		$tables = [
			'zenc_tickets',
			'zenc_ticket_conversations',
			'zenc_ticket_assignees',
			'zenc_ticket_products',
			'zenc_ticket_labels',
			'zenc_messages',
			'zenc_groups',
			'zenc_group_members',
			'zenc_live_chats',
			'zenc_live_chat_messages',
			'zenc_live_chat_products',
		];

		$total = 0;
		foreach ( $tables as $table ) {
			if ( ! $this->table_exists( $table ) ) {
				continue;
			}
			// zenc_ticket_assignees has no meta column — clear orphans separately.
			if ( 'zenc_ticket_assignees' === $table ) {
				continue;
			}
			$deleted = $this->db->query(
				$this->db->prepare( "DELETE FROM {$this->t( $table )} WHERE meta LIKE %s", $marker )
			);
			$deleted = (int) $deleted;
			$total  += $deleted;
			if ( $deleted ) {
				\WP_CLI::log( sprintf( '  %s: %d rows', $table, $deleted ) );
			}
		}

		// Orphaned assignees (their ticket is gone).
		if ( $this->table_exists( 'zenc_ticket_assignees' ) ) {
			$at = $this->t( 'zenc_ticket_assignees' );
			$tt = $this->t( 'zenc_tickets' );
			$orphans = (int) $this->db->query(
				"DELETE a FROM {$at} a LEFT JOIN {$tt} t ON a.ticket_id = t.id WHERE t.id IS NULL"
			);
			if ( $orphans ) {
				\WP_CLI::log( sprintf( '  zenc_ticket_assignees: %d orphaned rows', $orphans ) );
				$total += $orphans;
			}
		}

		// Group chat participants for deleted groups.
		if ( $this->table_exists( 'zenc_group_chat_participants' ) && $this->table_exists( 'zenc_groups' ) ) {
			$pt = $this->t( 'zenc_group_chat_participants' );
			$gt = $this->t( 'zenc_groups' );
			$this->db->query( "DELETE p FROM {$pt} p LEFT JOIN {$gt} g ON p.group_id = g.id WHERE g.id IS NULL" );
		}

		\WP_CLI::log( sprintf( 'Deleted %d seeded data rows.', $total ) );

		if ( ! \WP_CLI\Utils\get_flag_value( $assoc, 'keep-users', false ) ) {
			$user_ids = $this->dummy_user_ids();
			require_once ABSPATH . 'wp-admin/includes/user.php';
			foreach ( $user_ids as $uid ) {
				wp_delete_user( $uid );
			}
			\WP_CLI::log( sprintf( 'Deleted %d dummy users.', count( $user_ids ) ) );
		}

		\WP_CLI::success( 'Cleanup complete.' );
	}

	/* ----------------------------------------------------------------------
	 * Helpers
	 * ------------------------------------------------------------------- */

	/** Prefixed table name. */
	protected function t( string $table ): string {
		return $this->db->prefix . $table;
	}

	protected function table_exists( string $table ): bool {
		$full = $this->t( $table );
		return $this->db->get_var( $this->db->prepare( 'SHOW TABLES LIKE %s', $full ) ) === $full;
	}

	protected function require_table( string $table ): void {
		if ( ! $this->table_exists( $table ) ) {
			\WP_CLI::error( sprintf( 'Table %s not found. Is the relevant ZenCommunity Pro addon active?', $this->t( $table ) ) );
		}
	}

	/** JSON meta carrying the seed marker. */
	protected function meta( array $extra = [] ): string {
		return wp_json_encode( array_merge( [ self::MARKER_KEY => true ], $extra ) );
	}

	protected function render( string $text ): string {
		return '<p>' . esc_html( $text ) . '</p>';
	}

	protected function pick( array $items ) {
		return $items[ array_rand( $items ) ];
	}

	/** Random sample of N distinct items. */
	protected function sample( array $items, int $n ): array {
		$n = min( $n, count( $items ) );
		if ( $n <= 0 ) {
			return [];
		}
		$keys = (array) array_rand( $items, $n );
		return array_values( array_intersect_key( $items, array_flip( $keys ) ) );
	}

	/** Two distinct items. */
	protected function pick_pair( array $items ): array {
		if ( count( $items ) < 2 ) {
			return [ null, null ];
		}
		$pair = $this->sample( $items, 2 );
		return [ $pair[0], $pair[1] ];
	}

	protected function chance( int $percent ): bool {
		return wp_rand( 1, 100 ) <= $percent;
	}

	protected function sentence(): string {
		return $this->pick( self::MESSAGES );
	}

	protected function paragraph(): string {
		$n   = wp_rand( 1, 3 );
		$out = [];
		for ( $i = 0; $i < $n; $i++ ) {
			$out[] = $this->pick( self::MESSAGES );
		}
		return implode( ' ', $out );
	}

	protected function random_ip(): string {
		return sprintf( '%d.%d.%d.%d', wp_rand( 11, 240 ), wp_rand( 0, 255 ), wp_rand( 0, 255 ), wp_rand( 1, 254 ) );
	}

	/** A datetime within the last $days days. */
	protected function random_datetime( int $days ): string {
		$ts = time() - wp_rand( 0, $days * DAY_IN_SECONDS );
		return gmdate( 'Y-m-d H:i:s', $ts );
	}

	/** A datetime shortly after the given one (default within ~2h). */
	protected function random_datetime_after( string $after, int $max_gap = 7200 ): string {
		$ts = strtotime( $after ) + wp_rand( 30, $max_gap );
		$ts = min( $ts, time() );
		return gmdate( 'Y-m-d H:i:s', $ts );
	}

	/** IDs of all dummy users created by the seeder. */
	protected function dummy_user_ids(): array {
		$ids = get_users( [
			'meta_key'   => self::USER_FLAG,
			'meta_value' => 1,
			'fields'     => 'ID',
			'number'     => -1,
		] );
		return array_map( 'intval', $ids );
	}

	protected function count_dummy_users(): int {
		return count( $this->dummy_user_ids() );
	}

	/**
	 * Return at least $min usable user IDs — creating dummy users if needed,
	 * and folding in any existing real users so threads look natural.
	 */
	protected function ensure_users( int $min ): array {
		$ids = $this->dummy_user_ids();
		if ( count( $ids ) < $min ) {
			$this->users( [], [ 'count' => $min ] );
			$ids = $this->dummy_user_ids();
		}
		// Include existing real users too (e.g. the admin) for variety.
		$all = get_users( [ 'fields' => 'ID', 'number' => 50 ] );
		$ids = array_values( array_unique( array_map( 'intval', array_merge( $ids, $all ) ) ) );
		return $ids;
	}

	/** Ensure ticket products exist; return their IDs. */
	protected function ensure_ticket_products(): array {
		return $this->ensure_catalog( 'zenc_ticket_products', self::TICKET_PRODUCTS, function ( $name ) {
			return [
				'name'        => $name,
				'description' => $this->sentence(),
				'meta'        => $this->meta(),
				'status'      => 'active',
				'created_by'  => get_current_user_id() ?: 1,
			];
		} );
	}

	/** Ensure live-chat products exist; return their IDs. */
	protected function ensure_livechat_products(): array {
		return $this->ensure_catalog( 'zenc_live_chat_products', self::LIVECHAT_PRODUCTS, function ( $name ) {
			return [
				'name'        => $name,
				'description' => $this->sentence(),
				'meta'        => $this->meta(),
				'status'      => 'active',
				'created_by'  => get_current_user_id() ?: 1,
			];
		} );
	}

	/** Ensure ticket labels of a given type exist; return their IDs. */
	protected function ensure_ticket_labels( string $type, array $names ): array {
		$table = $this->t( 'zenc_ticket_labels' );
		$ids   = [];
		foreach ( $names as $name ) {
			$existing = $this->db->get_var( $this->db->prepare(
				"SELECT id FROM {$table} WHERE type = %s AND name = %s LIMIT 1",
				$type,
				$name
			) );
			if ( $existing ) {
				$ids[] = (int) $existing;
				continue;
			}
			$this->db->insert( $table, [
				'type'        => $type,
				'name'        => $name,
				'description' => '',
				'meta'        => $this->meta(),
				'status'      => 'active',
				'created_by'  => get_current_user_id() ?: 1,
			] );
			$ids[] = (int) $this->db->insert_id;
		}
		return $ids;
	}

	/**
	 * Generic "ensure a small named catalog exists" helper.
	 *
	 * @param string   $table  Unprefixed table.
	 * @param string[] $names  Names to ensure.
	 * @param callable $row_fn Maps a name to a row array.
	 * @return int[] Row IDs.
	 */
	protected function ensure_catalog( string $table, array $names, callable $row_fn ): array {
		$full = $this->t( $table );
		$ids  = [];
		foreach ( $names as $name ) {
			$existing = $this->db->get_var( $this->db->prepare( "SELECT id FROM {$full} WHERE name = %s LIMIT 1", $name ) );
			if ( $existing ) {
				$ids[] = (int) $existing;
				continue;
			}
			$this->db->insert( $full, $row_fn( $name ) );
			$ids[] = (int) $this->db->insert_id;
		}
		return $ids;
	}

	/* ----------------------------------------------------------------------
	 * Fake content pools
	 * ------------------------------------------------------------------- */

	const FIRST_NAMES = [ 'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Jamie', 'Avery', 'Quinn', 'Noah', 'Mia', 'Liam', 'Emma', 'Olivia', 'Aiden', 'Sofia', 'Ethan', 'Zoe', 'Lucas' ];
	const LAST_NAMES  = [ 'Smith', 'Johnson', 'Khan', 'Patel', 'Garcia', 'Chen', 'Nguyen', 'Brown', 'Davis', 'Rahman', 'Lee', 'Hassan', 'Silva', 'Kim', 'Lopez', 'Ali', 'Roy', 'Das', 'Cruz', 'Park' ];

	const TICKET_PRODUCTS = [ 'Core Plugin', 'Pro Add-on', 'Mobile App', 'Billing', 'API & Integrations' ];
	const TICKET_TYPES    = [ 'Bug', 'Question', 'Feature Request', 'Billing', 'How-to' ];
	const TICKET_PRIORITIES = [ 'Low', 'Medium', 'High', 'Urgent' ];
	const LIVECHAT_PRODUCTS = [ 'Pre-sales', 'Technical Support', 'Account Help', 'General' ];

	const GROUP_NAMES = [ 'Design Team', 'Engineering', 'Beta Testers', 'Support Crew', 'Product Feedback', 'Marketing', 'Founders' ];

	const TICKET_SUBJECTS = [
		'Cannot log in after the latest update',
		'Feature request: dark mode for the dashboard',
		'Payment failed but I was still charged',
		'How do I export my data?',
		'Notifications are not being delivered',
		'App crashes when opening the chat',
		'Need help configuring the API keys',
		'Slow loading on the tickets page',
		'Unable to upload attachments',
		'Question about the pricing tiers',
		'Group permissions not working as expected',
		'Email notifications going to spam',
		'Two-factor authentication setup help',
		'Search results are missing recent items',
		'Billing invoice has the wrong address',
	];

	const MESSAGES = [
		'Hi there, thanks for reaching out!',
		'Could you share a screenshot of the issue?',
		'I tried that but it did not work for me.',
		'Let me check this and get back to you shortly.',
		'That worked perfectly, thank you so much!',
		'Can you confirm which version you are running?',
		'We have escalated this to the engineering team.',
		'Sorry for the trouble — we are on it.',
		'Is this happening on every page or just one?',
		'Please clear your cache and try again.',
		'I appreciate your patience while we look into this.',
		'The fix will ship in the next release.',
		'Do you have any error messages in the console?',
		'Following up to see if this is resolved.',
		'Great, glad we could help! Let us know if anything else comes up.',
		'Just sent you an email with the details.',
		'Can we hop on a quick call to debug this?',
		'I reproduced the bug on my end as well.',
		'Here is a workaround until the patch lands.',
		'Thanks for the report, this is really helpful.',
	];
}
