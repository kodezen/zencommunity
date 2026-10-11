<?php
namespace ZenCommunity\Api;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Api\Common\Permissions;

/**
 * Everything a community page needs before it can draw anything, in one answer.
 *
 * These six are small — settings, menus, the welcome banner, the sidebar
 * widgets, group permissions and the ticker come to a few kilobytes between
 * them — and they are the same on every page. What they cost is not their size
 * but their number: each is a separate request that loads WordPress, every
 * plugin on the site and the REST stack before it can answer, which measured at
 * roughly 350-500ms apiece on an idle local install with almost no data in it.
 *
 * Nothing here reimplements those routes. Each one is dispatched internally,
 * through the same controller and the same permission callback it has always
 * had, so a caller who may not see a thing still may not see it — the answer
 * simply arrives with the others. A route that errors reports its status beside
 * its key rather than taking the whole response down with it.
 */
class Bootstrap extends Common\Base {

	/**
	 * What the client asks for, and the route behind each.
	 *
	 * Kept as a list rather than a free-form parameter: this endpoint exists to
	 * answer one known question quickly, not to become a way of asking for any
	 * route from any other route.
	 */
	private const ROUTES = [
		'settings'           => '/settings',
		'menus'              => '/menus',
		'welcome_banner'     => '/welcome-banner',
		// Active widgets only: what the community's own sidebar asks for. The
		// admin screen wants disabled ones too and asks for itself.
		'sidebar_widgets'    => '/sidebar-widgets',
		'groups_permissions' => '/members/groups-permissions',
		'group_tree'         => '/category/group-tree',
	];

	/**
	 * The same idea for the ticket screens.
	 *
	 * Opening one ticket asked for its products, its two label sets, the
	 * engineering-issue settings and the list of support agents — five separate
	 * requests for a few kilobytes of configuration that is the same for every
	 * ticket and rarely changes.
	 */
	private const TICKET_ROUTES = [
		'products'       => '/ticket/products',
		'types'          => '/ticket/label/types',
		'priorities'     => '/ticket/label/priorities',
		'eng_settings'   => '/eng-issue/settings',
		'support_agents' => '/members?role=support_agent',
		// The list page's header counters ask for these the moment the page
		// opens, same as the four above — same batch, same reasoning.
		'stats'          => '/tickets/stats',
	];

	/**
	 * And once more for a single ticket.
	 *
	 * The ticket itself, its conversation, its pinned notes, the customer's
	 * purchases and any linked engineering issue: five requests, and between
	 * them about twenty milliseconds of actual work. Nearly all of what they
	 * cost is WordPress starting up five times over.
	 */
	private const SINGLE_TICKET_ROUTES = [
		'ticket'        => '/ticket/%d',
		'conversations' => '/ticket/%d/conversations?page=1&per_page=15',
		'pinned'        => '/ticket/%d/conversations?is_pinned=true',
		'purchases'     => '/ticket/%d/purchases',
		'eng_issue'     => '/ticket/%d/eng-issue',
	];

	public function init() : void {
		register_rest_route( $this->namespace, '/bootstrap/ticket/(?P<id>\d+)', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'ticket' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/bootstrap/tickets', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'tickets' ],
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
			],
		] );

		register_rest_route( $this->namespace, '/bootstrap', [
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'all' ],
				// Each route below still runs its own check; this only decides
				// who may ask the question at all, and the answer is the same
				// set a guest already gets one request at a time.
				'permission_callback' => [ Permissions::class, 'even_guest_user_can' ],
			],
		] );
	}

	public function all( WP_REST_Request $request ) : WP_REST_Response {
		return new WP_REST_Response( $this->collect( self::ROUTES, $request ), 200 );
	}

	public function tickets( WP_REST_Request $request ) : WP_REST_Response {
		return new WP_REST_Response( $this->collect( self::TICKET_ROUTES, $request ), 200 );
	}

	public function ticket( WP_REST_Request $request ) : WP_REST_Response {
		$id     = absint( $request->get_param( 'id' ) );
		$routes = [];

		foreach ( self::SINGLE_TICKET_ROUTES as $key => $route ) {
			$routes[ $key ] = sprintf( $route, $id );
		}

		return new WP_REST_Response( $this->collect( $routes, $request ), 200 );
	}

	/** Dispatch each route internally and collect what it said. */
	private function collect( array $routes, WP_REST_Request $request ) : array {
		$out = [];

		foreach ( $routes as $key => $route ) {
			$path  = $route;
			$query = '';

			if ( false !== strpos( $route, '?' ) ) {
				[ $path, $query ] = explode( '?', $route, 2 );
			}

			$sub = new WP_REST_Request( 'GET', $this->namespace_path( $path ) );

			// Carry the caller's own query through, so anything that reads one
			// behaves as it would have on its own.
			foreach ( (array) $request->get_query_params() as $param => $value ) {
				$sub->set_param( $param, $value );
			}

			// Then whatever this route is defined to ask for.
			if ( '' !== $query ) {
				$args = [];
				parse_str( $query, $args );

				foreach ( $args as $param => $value ) {
					$sub->set_param( $param, $value );
				}
			}

			$response = rest_do_request( $sub );
			$status   = $response->get_status();

			$out[ $key ] = [
				'status' => $status,
				'data'   => $status >= 200 && $status < 300 ? $response->get_data() : null,
			];
		}

		return $out;
	}

	private function namespace_path( string $route ) : string {
		return '/' . trim( $this->namespace, '/' ) . $route;
	}
}
