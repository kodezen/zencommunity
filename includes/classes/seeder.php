<?php
/**
 * Fresh-install default data seeder.
 *
 * On first activation the community is completely empty, which makes the admin
 * screens look broken (no Collection to file a Space under, nothing in the
 * feed). This seeds a single default Collection and one Space inside it so a
 * fresh install has a usable starting point. Runs exactly once, guarded by an
 * option, off the `zencommunity/activate` action.
 *
 * @package ZenCommunity\Classes
 */

namespace ZenCommunity\Classes;

use ZenCommunity\Database\Models\Group;
use ZenCommunity\Database\Models\Feed;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Seeder {
	/** Idempotency flag — set once so defaults are never re-inserted. */
	const SEEDED_OPTION = 'zencommunity_seeded';

	/**
	 * Create the default Collection + Space on fresh install.
	 *
	 * Hooked to `zencommunity/activate` (fired by Installer::init on plugin
	 * activation and on the fresh-install init path).
	 */
	public static function run_default_data() : void {
		if ( get_option( self::SEEDED_OPTION ) ) {
			return;
		}

		// Mark as seeded up front so a mid-run failure can never turn this into
		// a loop that retries (and errors on duplicate slugs) on every request.
		update_option( self::SEEDED_OPTION, 1 );

		// Only seed a genuinely FRESH install. `zencommunity/activate` also fires
		// on upgrade activations of existing sites (which never had this flag), so
		// bail if the community already has any Collections/Spaces — we must never
		// inject default content into an established community.
		try {
			if ( Group::ins()->qb()->count() > 0 ) {
				return;
			}
		} catch ( \Throwable $e ) {
			return;
		}

		// Group::create() stamps the current user as creator and adds them as a
		// member admin. On plugin activation that's the activating admin; on the
		// fresh-install init fallback (a front-end request) there may be no
		// logged-in user, so borrow the first administrator so the default Space
		// has a real owner.
		$had_user = (bool) get_current_user_id();
		if ( ! $had_user ) {
			$admins = get_users( [ 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ] );
			if ( ! empty( $admins ) ) {
				wp_set_current_user( (int) $admins[0] );
			}
		}

		try {
			// Collection (category_id omitted => a Collection, not a Space).
			$collection_id = Group::slug_exists( 'general', true )
				? null
				: Group::create( [
					'name'   => __( 'General', 'zencommunity' ),
					'slug'   => 'general',
					'status' => 'published',
				] );

			// Default Space inside the new Collection.
			if ( $collection_id && ! Group::slug_exists( 'welcome', false ) ) {
				$space_id = Group::create( [
					'name'    => __( 'Welcome', 'zencommunity' ),
					'slug'    => 'welcome',
					'status'  => 'published',
					'privacy' => 'public',
				], (int) $collection_id );

				// Seed a welcome post so the default Space (and the feed) isn't
				// empty on first load. actor_user_id is null to skip the
				// membership/permission check — the author defaults to the current
				// (seeding) admin.
				if ( $space_id ) {
					Feed::create( (int) $space_id, [
						'type'    => 'post',
						'status'  => 'published',
						'title'   => __( 'Welcome to the community! 🎉', 'zencommunity' ),
						'content' => '<p>' . __( "We're glad you're here. This is your community space to share updates, ask questions, and connect with other members.", 'zencommunity' ) . '</p>'
							. '<p>' . __( 'Say hello below to get started 👋', 'zencommunity' ) . '</p>',
					] );
				}
			}
		} catch ( \Throwable $e ) {
			// Seeding is best-effort — never let it break activation.
		} finally {
			if ( ! $had_user ) {
				wp_set_current_user( 0 );
			}
		}
	}
}
