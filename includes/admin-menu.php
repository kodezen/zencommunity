<?php
namespace ZenCommunity;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class AdminMenu {
	const MENU_SLUG = 'zencommunity-settings';

	// StoreEngine-style: each management screen is its own registered submenu
	// PAGE (a real slug, not an `admin.php?page=…&tab=` URL — WordPress wraps a
	// submenu slug in add_query_arg( ['page' => $slug] ), so a URL slug ends up
	// doubled as `admin.php?page=admin.php?page=…`). Admin/settings.js switches
	// its view on the current ?page= value; WP highlights the active submenu.
	const SUBMENU_SLUGS = [
		'zencommunity-spaces'      => 'Spaces',
		'zencommunity-posts'       => 'Posts',
		'zencommunity-new-post'    => 'New Post',
		'zencommunity-users'       => 'Users',
		'zencommunity-collections' => 'Collections',
		// Reports is Pro-gated client-side (Admin/Pages/Reports/index.js shows
		// an upgrade prompt when inactive) — the slug/menu entry itself stays
		// registered either way, matching every other Pro feature's admin UI
		// convention in this codebase (visible, not hidden, when Pro is off).
		'zencommunity-reports'     => 'Reports',
		'zencommunity-tools'       => 'Tools',
		'zencommunity-addons'      => 'Add-ons',
		'zencommunity-general'     => 'Settings',
	];

	// Sidebar groups: the first page's item is relabelled with the group name
	// and its pages open in a flyout beside it (print_menu_flyouts()); the
	// other pages stay registered but are hidden from the flat list
	// (admin.menu.css), so the menu stays compact.
	// Currently empty: Spaces, Posts, Users and Collections are top-level items
	// again. e.g. 'zencommunity-spaces' => [ 'zencommunity-spaces', 'zencommunity-posts' ].
	const MENU_GROUPS = [];

	// Settings tabs that moved to their own submenu page; old links
	// (?page=zencommunity-general&tab=…) are redirected there.
	const MOVED_TABS = [
		'migration' => 'zencommunity-tools',
		'add-ons'   => 'zencommunity-addons',
	];

	public static function init() {
        add_action( 'admin_menu', function() : void {
			$self = new static;
			add_filter( ZENCOMMUNITY_PLUGIN_SLUG . '/admin_menu', [ $self, 'admin_menu' ], 10, 2 );
			Classes\MenuBuilder::init();
		});

		// Rename the auto-generated first submenu (a duplicate of the parent) to
		// "Dashboard" so the sidebar reads Dashboard / Spaces / Collections / Settings.
		add_action( 'admin_menu', [ static::class, 'rename_first_submenu' ], 999 );

		// "New Post" stays a registered page (Posts → "New post" / "Edit" open it)
		// but has no sidebar entry of its own; while on it, highlight Posts.
		// Hidden on `admin_head`, not `admin_menu`: WordPress checks page access
		// against $submenu between the two, so removing it on `admin_menu` made a
		// reload of ?page=zencommunity-new-post fail with "not allowed".
		add_action( 'admin_head', [ static::class, 'hide_new_post_submenu' ] );
		add_filter( 'submenu_file', [ static::class, 'highlight_posts_for_new_post' ] );
		add_filter( 'submenu_file', [ static::class, 'highlight_menu_group' ], 20 );
		add_action( 'admin_footer', [ static::class, 'print_menu_flyouts' ] );

		// Keep the app screens clean: strip other plugins' license/promo notices
		// on our pages (as StoreEngine/SureDash do). Our own feedback is in-app.
		add_action( 'in_admin_header', [ static::class, 'suppress_foreign_notices' ], 1000 );

		add_action( 'admin_init', [ static::class, 'redirect_moved_tabs' ] );
	}

	/** Send old Settings links for Tools / Add-ons tabs to their new pages. */
	public static function redirect_moved_tabs() : void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';
		$tab  = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : '';
		// phpcs:enable

		// AI Agent moved back from Tools to Settings; send old bookmarks there.
		if ( 'zencommunity-tools' === $page && 'ai-agent' === $tab ) {
			wp_safe_redirect( add_query_arg( [ 'page' => 'zencommunity-general', 'tab' => 'ai-agent' ], admin_url( 'admin.php' ) ) );
			exit;
		}

		if ( 'zencommunity-general' !== $page || ! isset( self::MOVED_TABS[ $tab ] ) ) {
			return;
		}
		$args = [ 'page' => self::MOVED_TABS[ $tab ] ];
		if ( 'zencommunity-tools' === $args['page'] ) {
			$args['tab'] = $tab;
		}
		wp_safe_redirect( add_query_arg( $args, admin_url( 'admin.php' ) ) );
		exit;
	}

	/** Remove all admin notices on the plugin's own screens for a clean UI. */
	public static function suppress_foreign_notices() : void {
		if ( ! self::is_current_admin_page() ) {
			return;
		}
		remove_all_actions( 'admin_notices' );
		remove_all_actions( 'all_admin_notices' );
		remove_all_actions( 'user_admin_notices' );
	}

	/** All wp-admin page slugs this plugin owns (parent + submenus). */
	public static function page_slugs() : array {
		return array_merge( [ self::MENU_SLUG ], array_keys( self::SUBMENU_SLUGS ) );
	}

	/** True on any of the plugin's own wp-admin screens. */
	public static function is_current_admin_page() : bool {
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return in_array( $page, self::page_slugs(), true );
	}

	public function admin_menu( array $menus, Classes\MenuBuilder $menu_builder ) : void {
		$capability = 'manage_options';

		$menu_builder->add_menu(
			__( 'ZenCommunity', 'zencommunity' ),
			__( 'ZenCommunity', 'zencommunity' ),
			$capability,
			self::MENU_SLUG,
			[ $this, 'settings_page' ],
			plugins_url( 'assets/images/icon_logo.png', ZENCOMMUNITY_PLUGIN_FILE ),
			// Sit just above Appearance (core position 60; 59 is core's
			// separator slot) instead of being appended to the very bottom.
			58
		);

		// The parent slug is the Dashboard (its auto-generated first item is
		// relabelled in rename_first_submenu). Each sibling is a real page slug.
		$titles = [
			'zencommunity-spaces'      => __( 'Spaces', 'zencommunity' ),
			'zencommunity-posts'       => __( 'Posts', 'zencommunity' ),
			'zencommunity-new-post'    => __( 'New Post', 'zencommunity' ),
			'zencommunity-users'       => __( 'Users', 'zencommunity' ),
			'zencommunity-collections' => __( 'Collections', 'zencommunity' ),
			'zencommunity-reports'     => __( 'Reports', 'zencommunity' ),
			// Sections (dividers in admin.menu.css): Dashboard / Community /
			// Reports · Add-ons / Tools · Settings.
			'zencommunity-addons'      => __( 'Add-ons', 'zencommunity' ),
			'zencommunity-tools'       => __( 'Tools', 'zencommunity' ),
			'zencommunity-general'     => __( 'Settings', 'zencommunity' ),
		];

		foreach ( $titles as $slug => $title ) {
			$menu_builder->add_submenu(
				self::MENU_SLUG,
				$title,
				isset( self::MENU_GROUPS[ $slug ] ) ? __( 'Community', 'zencommunity' ) : $title,
				$capability,
				$slug,
				[ $this, 'settings_page' ]
			);
		}
	}

	/**
	 * WordPress duplicates the parent as the first submenu item; relabel it.
	 */
	public static function rename_first_submenu() : void {
		global $submenu;
		if ( isset( $submenu[ self::MENU_SLUG ][0][0] ) ) {
			$submenu[ self::MENU_SLUG ][0][0] = __( 'Dashboard', 'zencommunity' ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		}
	}

	/**
	 * Drop "New Post" from the sidebar. Runs after the access check (which needs
	 * the entry) and before the menu is printed, so the page stays reachable.
	 */
	public static function hide_new_post_submenu() : void {
		remove_submenu_page( self::MENU_SLUG, 'zencommunity-new-post' );
	}

	/** Mark "Posts" as the current submenu item while creating/editing a post. */
	public static function highlight_posts_for_new_post( $submenu_file ) {
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return 'zencommunity-new-post' === $page ? 'zencommunity-posts' : $submenu_file;
	}

	/** While on a grouped page, mark its group's sidebar item as current. */
	public static function highlight_menu_group( $submenu_file ) {
		foreach ( self::MENU_GROUPS as $anchor => $pages ) {
			if ( in_array( $submenu_file, $pages, true ) ) {
				return $anchor;
			}
		}
		return $submenu_file;
	}

	/**
	 * Second-level flyouts for MENU_GROUPS: WordPress menus are one level deep,
	 * so the group's pages are added as a nested list beside its item, opening
	 * on hover/focus (styles in admin.menu.css). Printed on every admin screen
	 * since the sidebar is.
	 */
	public static function print_menu_flyouts() : void {
		if ( ! self::MENU_GROUPS || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$titles = [
			'zencommunity-spaces'      => __( 'Spaces', 'zencommunity' ),
			'zencommunity-posts'       => __( 'Posts', 'zencommunity' ),
			'zencommunity-users'       => __( 'Users', 'zencommunity' ),
			'zencommunity-collections' => __( 'Collections', 'zencommunity' ),
		];
		$groups = [];
		foreach ( self::MENU_GROUPS as $anchor => $pages ) {
			foreach ( $pages as $page ) {
				$groups[ $anchor ][] = [
					'page'  => $page,
					'title' => $titles[ $page ] ?? $page,
				];
			}
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$current = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';
		if ( 'zencommunity-new-post' === $current ) {
			$current = 'zencommunity-posts';
		}
		?>
		<script>
		( function () {
			var groups = <?php echo wp_json_encode( $groups ); ?>;
			var current = <?php echo wp_json_encode( $current ); ?>;
			var list = document.querySelector( '#toplevel_page_<?php echo esc_js( self::MENU_SLUG ); ?> > ul.wp-submenu' );
			if ( ! list ) {
				return;
			}
			Object.keys( groups ).forEach( function ( anchor ) {
				var link = list.querySelector( ':scope > li > a[href$="page=' + anchor + '"]' );
				if ( ! link ) {
					return;
				}
				var ul = document.createElement( 'ul' );
				ul.className = 'zc-menu-flyout';
				groups[ anchor ].forEach( function ( item ) {
					var li = document.createElement( 'li' );
					var a = document.createElement( 'a' );
					a.href = 'admin.php?page=' + item.page;
					a.textContent = item.title;
					if ( item.page === current ) {
						li.classList.add( 'current' );
						a.classList.add( 'current' );
					}
					li.appendChild( a );
					ul.appendChild( li );
				} );
				var chevron = document.createElement( 'span' );
				chevron.className = 'zc-menu-chevron';
				chevron.setAttribute( 'aria-hidden', 'true' );
				link.appendChild( chevron );
				link.setAttribute( 'aria-haspopup', 'true' );
				link.parentNode.classList.add( 'zc-menu-group' );
				link.parentNode.appendChild( ul );
			} );
		} )();
		</script>
		<?php
	}

	public function settings_page() : void {
		Helper::get_template( 'admin/settings.php' );
	}
}
