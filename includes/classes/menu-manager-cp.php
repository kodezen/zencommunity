<?php
namespace ZenCommunity\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Exceptions\ZencommunityException;

class MenuManager {
	/**
	 * Menu key.
	 *
	 * @var string
	 */
	private string $menu_key;

	/**
	 * Menu label.
	 *
	 * @var string
	 */
	private string $menu_label;

	/**
	 * Option key base.
	 */
	const BASE_OPTION_KEY = 'zencommunity_menu';

	/**
	 * Protected items for menus.
	 *
	 * @var array
	 */
	private array $protected_items_map = [
		'primary_menu' => [
			[
				'id'    => 'menu_posts',
				'type'  => 'default',
				'label' => 'Posts',
				'status' => true,
				'icon'  => [
					'type' => 'emoji',
					'src'  => '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
				],
			],
			[
				'id'    => 'menu_groups',
				'type'  => 'default',
				'label' => 'Groups',
				'status' => true,
				'icon'  => [
					'type' => 'emoji',
					'src'  => '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
				],
			],
			[
				'id'    => 'menu_members',
				'type'  => 'default',
				'label' => 'Members',
				'status' => true,
				'icon'  => [
					'type' => 'emoji',
					'src'  => '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
				],
			],
			[
				'id'    => 'menu_settings',
				'type'  => 'default',
				'label' => 'Settings',
				'status' => true,
				'icon'  => [
					'type' => 'emoji',
					'src'  => '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M262.29 192.31a64 64 0 1 0 57.4 57.4 64.13 64.13 0 0 0-57.4-57.4zM416.39 256a154.34 154.34 0 0 1-1.53 20.79l45.21 35.46a10.81 10.81 0 0 1 2.45 13.75l-42.77 74a10.81 10.81 0 0 1-13.14 4.59l-44.9-18.08a16.11 16.11 0 0 0-15.17 1.75A164.48 164.48 0 0 1 325 400.8a15.94 15.94 0 0 0-8.82 12.14l-6.73 47.89a11.08 11.08 0 0 1-10.68 9.17h-85.54a11.11 11.11 0 0 1-10.69-8.87l-6.72-47.82a16.07 16.07 0 0 0-9-12.22 155.3 155.3 0 0 1-21.46-12.57 16 16 0 0 0-15.11-1.71l-44.89 18.07a10.81 10.81 0 0 1-13.14-4.58l-42.77-74a10.8 10.8 0 0 1 2.45-13.75l38.21-30a16.05 16.05 0 0 0 6-14.08c-.36-4.17-.58-8.33-.58-12.5s.21-8.27.58-12.35a16 16 0 0 0-6.07-13.94l-38.19-30A10.81 10.81 0 0 1 49.48 186l42.77-74a10.81 10.81 0 0 1 13.14-4.59l44.9 18.08a16.11 16.11 0 0 0 15.17-1.75A164.48 164.48 0 0 1 187 111.2a15.94 15.94 0 0 0 8.82-12.14l6.73-47.89A11.08 11.08 0 0 1 213.23 42h85.54a11.11 11.11 0 0 1 10.69 8.87l6.72 47.82a16.07 16.07 0 0 0 9 12.22 155.3 155.3 0 0 1 21.46 12.57 16 16 0 0 0 15.11 1.71l44.89-18.07a10.81 10.81 0 0 1 13.14 4.58l42.77 74a10.8 10.8 0 0 1-2.45 13.75l-38.21 30a16.05 16.05 0 0 0-6.05 14.08c.33 4.14.55 8.3.55 12.47z"></path></svg>',
				],
			],
		],
		'profile_menu' => [
			[
				'id'    => 'menu_profile_posts',
				'type'  => 'default',
				'label' => 'Posts',
				'status' => true,
				'icon'  => [
					'type' => 'emoji',
					'src'  => '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
				],
			],
			[
				'id'    => 'menu_profile_groups',
				'type'  => 'default',
				'label' => 'Groups',
				'status' => true,
				'icon'  => [
					'type' => 'emoji',
					'src'  => '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
				],
			],
			[
				'id'    => 'menu_profile_about',
				'type'  => 'default',
				'label' => 'About',
				'status' => true,
				'icon'  => [
					'type' => 'emoji',
					'src'  => 'ℹ️',
				],
			],
		],
	];

	/**
	 * Constructor.
	 *
	 * @param string $menu_key   Menu key.
	 * @param string $menu_label Menu label.
	 */
	public function __construct( string $menu_key = 'primary_menu', string $menu_label = 'Primary Menu' ) {
		$this->menu_key   = $menu_key;
		$this->menu_label = $menu_label;

		$all_menus = get_option( self::BASE_OPTION_KEY, [] );

		if ( ! empty( $menu_key ) && ! isset( $all_menus[ $this->menu_key ] ) ) {
			throw new ZencommunityException( esc_html( __( "Menu is not found.", 'zencommunity' ), $permission ), 422 );
		}
	}

	/**
	 * Get all menus.
	 *
	 * @return array
	 */
	private function get_all_menus(): array {
		return get_option( self::BASE_OPTION_KEY, [] );
	}

	/**
	 * Save all menus.
	 *
	 * @param array $menus Menus.
	 *
	 * @return bool
	 */
	private function save_all_menus( array $menus ): bool {
		return update_option( self::BASE_OPTION_KEY, $menus );
	}

	/**
	 * Get current menu items.
	 *
	 * @return array
	 */
	public function get_menu(): array {
		$menus = $this->get_all_menus();
		$menu  = $menus[ $this->menu_key ]['items'] ?? [];

		if ( isset( $this->protected_items_map[ $this->menu_key ] ) ) {
			$existing_ids = wp_list_pluck( $menu, 'id' );

			foreach ( $this->protected_items_map[ $this->menu_key ] as $protected_item ) {
				if ( ! in_array( $protected_item['id'], $existing_ids, true ) ) {
					$menu[] = $protected_item;
				}
			}

			$menus[ $this->menu_key ]['items'] = $menu;
			$this->save_all_menus( $menus );
		}

		return $menu;
	}

	/**
	 * Save menu items.
	 *
	 * @param array $items Menu items.
	 *
	 * @return bool
	 */
	public function save_menu( array $items ): bool {
		$menus                  = $this->get_all_menus();
		$menus[ $this->menu_key ]['items'] = $items;

		return $this->save_all_menus( $menus );
	}

	/**
	 * Add menu item.
	 *
	 * @param array $item Item data.
	 *
	 * @return bool
	 */
	public function add_item( array $item ): bool {
		$menu = $this->get_menu();

		if ( ! isset( $item['id'] ) ) {
			$item['id'] = uniqid( 'menu_', true );
		}

		if ( ! isset( $item['status'] ) ) {
			$item['status'] = true;
		}

		$menu[] = $item;

		return $this->save_menu( $menu );
	}

	/**
	 * Update menu item.
	 *
	 * @param string $id           Item ID.
	 * @param array  $updated_data Updated data.
	 *
	 * @return bool
	 */
	public function update_item( string $id, array $updated_data ): bool {
		$menu = $this->get_menu();

		foreach ( $menu as &$item ) {
			if ( $item['id'] === $id ) {
				if ( $this->is_protected_item( $id ) ) {
					if ( isset( $updated_data['label'] ) ) {
						$item['label'] = sanitize_text_field( $updated_data['label'] );
					}

					if ( isset( $updated_data['icon'] ) ) {
						$item['icon'] = $updated_data['icon'];
					}

					if ( isset( $updated_data['status'] ) ) {
						$item['status'] = (bool) $updated_data['status'];
					}

				} else {
					$item = array_merge( $item, $updated_data );
				}
				break;
			}
		}

		return $this->save_menu( $menu );
	}

	/**
	 * Delete menu item.
	 *
	 * @param string $id Item ID.
	 *
	 * @return bool
	 */
	public function delete_item( string $id ): bool {
		if ( $this->is_protected_item( $id ) ) {
			return false;
		}

		$menu = array_filter(
			$this->get_menu(),
			fn( array $item ) => $item['id'] !== $id
		);

		return $this->save_menu( array_values( $menu ) );
	}

	/**
	 * Reorder menu items.
	 *
	 * @param array $ordered_ids Ordered IDs.
	 *
	 * @return bool
	 */
	public function reorder_items( array $ordered_ids ): bool {
		$menu       = $this->get_menu();
		$menu_by_id = [];

		foreach ( $menu as $item ) {
			$menu_by_id[ $item['id'] ] = $item;
		}

		$new_menu = [];

		foreach ( $ordered_ids as $id ) {
			if ( isset( $menu_by_id[ $id ] ) ) {
				$new_menu[] = $menu_by_id[ $id ];
			}
		}

		// Ensure protected items are included.
		if ( isset( $this->protected_items_map[ $this->menu_key ] ) ) {
			foreach ( $this->protected_items_map[ $this->menu_key ] as $required ) {
				if ( ! in_array( $required['id'], wp_list_pluck( $new_menu, 'id' ), true ) ) {
					$new_menu[] = $required;
				}
			}
		}

		return $this->save_menu( $new_menu );
	}

	/**
	 * Get menu item by ID.
	 *
	 * @param string $id Item ID.
	 *
	 * @return array|null
	 */
	public function get_item( string $id ): ?array {
		foreach ( $this->get_menu() as $item ) {
			if ( $item['id'] === $id ) {
				return $item;
			}
		}

		return null;
	}

	/**
	 * Get menu label.
	 *
	 * @return string
	 */
	public function get_menu_label(): string {
		$menus = $this->get_all_menus();

		return $menus[ $this->menu_key ]['label'] ?? '';
	}

	/**
	 * Update menu label.
	 *
	 * @param string $new_label New label.
	 *
	 * @return bool
	 */
	public function update_menu_label( string $new_label ): bool {
		$menus = $this->get_all_menus();

		if ( isset( $menus[ $this->menu_key ] ) ) {
			$menus[ $this->menu_key ]['label'] = $new_label;

			return $this->save_all_menus( $menus );
		}

		return false;
	}

	/**
	 * Check if an item is protected.
	 *
	 * @param string $id Item ID.
	 *
	 * @return bool
	 */
	private function is_protected_item( string $id ): bool {
		if ( ! isset( $this->protected_items_map[ $this->menu_key ] ) ) {
			return false;
		}

		return in_array( $id, wp_list_pluck( $this->protected_items_map[ $this->menu_key ], 'id' ), true );
	}

    /**
     * Check if primary_menu and profile_menu exist and are not empty.
     * If missing or empty, create with default items.
     */
    public static function ensure_default_menus_exist(): void {
        $all_menus = get_option( self::BASE_OPTION_KEY, [] );
        $ins = new static( '' );

        // Create primary_menu if missing or empty
        if ( empty( $all_menus['primary_menu']['items'] ?? [] ) ) {
            $all_menus['primary_menu'] = [
                'label' => 'Primary Menu',
                'items' => $ins->protected_items_map['primary_menu'],
            ];
        }

        // Create profile_menu if missing or empty
        if ( empty( $all_menus['profile_menu']['items'] ?? [] ) ) {
            $all_menus['profile_menu'] = [
                'label' => 'Profile Menu',
                'items' => $ins->protected_items_map['profile_menu'],
            ];
        }

        // Save if we added anything
        update_option( self::BASE_OPTION_KEY, $all_menus );
    }
}
