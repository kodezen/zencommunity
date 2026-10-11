<?php
namespace ZenCommunity\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Per-group rich-text Rules field. A group admin writes it from the group
 * settings panel; it renders read-only in the group's About tab when
 * non-empty (absent/empty renders nothing — no placeholder).
 *
 * This class is the single source of truth: it registers `meta.rules` with
 * the group REST schema and the model's sanitize rules via the existing
 * filters (same pattern as SpaceType/Tab_Settings), so no core
 * model/schema/controller files need editing.
 */
class Group_Rules {

	public static function init() : void {
		$self = new static();
		add_filter( 'zencommunity/group/schema', [ $self, 'extend_schema' ] );
		add_filter( 'zencommunity/group/create/sanitaization/rules', [ $self, 'extend_rules' ] );
		add_filter( 'zencommunity/group/update/sanitaization/rules', [ $self, 'extend_rules' ] );
	}

	/**
	 * Register `meta.rules` with the group REST schema for discoverability
	 * (documentation only — see extend_rules() for the real whitelist).
	 */
	public function extend_schema( array $schema ) : array {
		$schema['meta']['properties']['rules'] = [
			'type'        => 'string',
			'required'    => false,
			'description' => __( 'Group rules/guidelines, shown in the About tab.', 'zencommunity' ),
		];
		return $schema;
	}

	/**
	 * Whitelist `meta.rules` in the model sanitizers, sanitized as HTML —
	 * matches how meta.page_content (SpaceType) and the group's own
	 * `description` column are already sanitized.
	 */
	public function extend_rules( array $rules ) : array {
		$rules['meta.rules'] = Sanitizer::HTML;
		return $rules;
	}
}
