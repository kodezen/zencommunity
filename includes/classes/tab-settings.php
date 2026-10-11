<?php
namespace ZenCommunity\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Per-group configurable tab list. Group admins can enable/disable and
 * reorder the group page's *optional* tabs (About, Members, Events, Media,
 * Courses, Pending Posts) from the group settings panel. Discussion and
 * Featured are permanent and never go through this class.
 *
 * Stored as two `meta.*` keys, both always submitted/persisted as a complete
 * set covering every key in self::KEYS (never a partial subset):
 *  - meta.enabled_tabs: { about: bool, members: bool, ... }
 *  - meta.tab_order:    ['events', 'about', ...] — a full permutation of KEYS
 *
 * `tab_order` in particular must stay a full permutation: Group::update()
 * merges incoming meta into the stored value via Helper::recursive_merge(),
 * which overwrites a nested array by key/index rather than diffing it. For a
 * plain numeric list that means a *shorter* submitted array (e.g. disabling
 * a tab) would leave the old array's trailing entries behind in storage, so
 * a disabled tab could silently reappear. Requiring the full key set on
 * every write sidesteps that without touching the shared merge helper.
 *
 * This class is the single source of truth: it registers the new meta keys
 * with the group REST schema and the model's sanitize rules via the same
 * filters SpaceType uses, plus a REST-layer whitelist/normalize step, so no
 * core model/schema/controller files need editing.
 */
class Tab_Settings {

	/** Known optional tab keys, in the plugin's default display order. */
	const KEYS = [ 'about', 'members', 'events', 'media', 'courses', 'pending-posts' ];

	public static function init() : void {
		$self = new static();
		add_filter( 'zencommunity/group/schema', [ $self, 'extend_schema' ] );
		add_filter( 'zencommunity/group/create/sanitaization/rules', [ $self, 'extend_rules' ] );
		add_filter( 'zencommunity/group/update/sanitaization/rules', [ $self, 'extend_rules' ] );
		add_filter( 'zencommunity/group/default_data', [ $self, 'default_tabs' ], 10, 2 );
		// Whitelist-by-value and shape-normalize meta.enabled_tabs/tab_order
		// before the request reaches Group::create()/update() — Sanitizer's
		// per-path rules only coerce format, they can't reject an unknown
		// tab key or enforce "must be a full permutation".
		add_filter( 'rest_request_before_callbacks', [ $self, 'normalize_request' ], 10, 3 );
	}

	/**
	 * Register the new meta keys with the group REST schema for
	 * discoverability. Not the real enforcement point (see normalize_request
	 * / extend_rules) — the base `meta` schema has no additionalProperties
	 * restriction, so this is documentation, not a gate.
	 */
	public function extend_schema( array $schema ) : array {
		$schema['meta']['properties']['enabled_tabs'] = [
			'type'        => 'object',
			'required'    => false,
			'description' => __( 'Which optional group tabs are enabled.', 'zencommunity' ),
		];
		$schema['meta']['properties']['tab_order'] = [
			'type'        => 'array',
			'items'       => [
				'type' => 'string',
				'enum' => self::KEYS,
			],
			'required'    => false,
			'description' => __( 'Display order of the optional group tabs.', 'zencommunity' ),
		];
		return $schema;
	}

	/**
	 * Whitelist the new meta keys in the model sanitizers (defense in depth
	 * — normalize_request() already enforces the real value whitelist before
	 * this runs). Explicit per-key rules, not a wildcard, since the rules
	 * array is itself what lets a path survive Sanitizer::sanitize() at all.
	 */
	public function extend_rules( array $rules ) : array {
		foreach ( self::KEYS as $key ) {
			$rules[ "meta.enabled_tabs.{$key}" ] = Sanitizer::BOOL;
		}
		$rules['meta.tab_order.*'] = Sanitizer::KEY;
		return $rules;
	}

	/**
	 * New groups start with every optional tab enabled, in the plugin's
	 * default order — identical to today's fixed tab bar. Categories
	 * (category_id === null) are not Spaces, so skip them.
	 *
	 * @param array    $data
	 * @param int|null $category_id
	 */
	public function default_tabs( array $data, $category_id ) : array {
		if ( null === $category_id ) {
			return $data;
		}
		if ( ! isset( $data['meta']['enabled_tabs'] ) ) {
			$data['meta']['enabled_tabs'] = array_fill_keys( self::KEYS, true );
		}
		if ( ! isset( $data['meta']['tab_order'] ) ) {
			$data['meta']['tab_order'] = self::KEYS;
		}
		return $data;
	}

	/**
	 * Scoped to the group create/update route: strips any `enabled_tabs` key
	 * or `tab_order` entry that isn't a known tab, and pads `tab_order` back
	 * out to a full permutation of self::KEYS (valid submitted entries keep
	 * their order, anything missing is appended). Runs before the route's
	 * own callback, so Group::create()/update() only ever see an
	 * already-whitelisted, already-complete value.
	 *
	 * @param mixed            $response
	 * @param array            $_handlers
	 * @param \WP_REST_Request $request
	 */
	public function normalize_request( $response, $_handlers, $request ) {
		if (
			! preg_match( '#^/zencommunity/v1/group/\d+$#', $request->get_route() ) ||
			! in_array( $request->get_method(), [ 'PUT', 'POST', 'PATCH' ], true )
		) {
			return $response;
		}

		$meta = $request->get_param( 'meta' );
		if ( ! is_array( $meta ) ) {
			return $response;
		}

		if ( isset( $meta['enabled_tabs'] ) && is_array( $meta['enabled_tabs'] ) ) {
			$meta['enabled_tabs'] = array_intersect_key( $meta['enabled_tabs'], array_flip( self::KEYS ) );
		}

		if ( isset( $meta['tab_order'] ) && is_array( $meta['tab_order'] ) ) {
			$valid             = array_values( array_intersect( $meta['tab_order'], self::KEYS ) );
			$missing           = array_values( array_diff( self::KEYS, $valid ) );
			$meta['tab_order'] = array_merge( $valid, $missing );
		}

		$request->set_param( 'meta', $meta );
		return $response;
	}
}
