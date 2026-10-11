<?php
namespace ZenCommunity;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Exceptions\ZencommunityException;
class Helper {

    public static function get_setting( string $key, $default = null ) : string {
		global $zencommunity_settings;
		if( is_object( $zencommunity_settings ) && property_exists( $zencommunity_settings, $key ) )
			return $zencommunity_settings->{$key};
		return $default;
	}

	/**
	 * Which frontend renderer is active.
	 *
	 * @return string 'spa' (built-in React interface) or 'fse' (Gutenberg blocks).
	 */
	public static function render_mode() : string {
		global $zencommunity_settings;
		$mode = is_object( $zencommunity_settings ) ? ( $zencommunity_settings->render_mode ?? 'spa' ) : 'spa';
		$mode = in_array( $mode, [ 'spa', 'fse' ], true ) ? $mode : 'spa';

		// FSE composes the frontend from block templates in the Site Editor, which
		// only classic-vs-block theme detection can back. If FSE was saved but the
		// active theme is now a classic (non-block) theme, fall back to the SPA so
		// the community still renders instead of breaking. The settings UI also
		// locks the FSE option under a classic theme (see CommunitySettings.js).
		if ( 'fse' === $mode && function_exists( 'wp_is_block_theme' ) && ! wp_is_block_theme() ) {
			$mode = 'spa';
		}

		return $mode;
	}

	/**
	 * True when the community frontend is composed from Gutenberg (FSE) blocks
	 * instead of the built-in React SPA interface.
	 */
	public static function is_fse_mode() : bool {
		return 'fse' === self::render_mode();
	}

	public static function verify_char_limit( ?string $string, string $type = 'post', ?int $limit = 5000 ) : void {
		if ( empty( $string ) ) {
			return;
		}

		global $zencommunity_settings;
		$defaults = [
			'title' => 250, 
			'description' => 15000, 
			'comment' => 3000, 
			'message' => 3000
		];

		if ( in_array( $type, array_keys( $defaults) ) ) {
			$prop_name = "{$type}_char_limit";
			$limit = $zencommunity_settings->{$prop_name} ?? $defaults[$type] ?? 5000;
		}

		if ( function_exists( 'mb_strlen' ) ) {
			$len = mb_strlen( $string, 'UTF-8' );
		}
		else {
			$len = strlen($string);
		}


		if ( $len > $limit ) {
			throw new ZencommunityException(  
				sprintf( 
					// translators: %1$s: The item (e.g., username, title, etc.) whose length is too big. 
					esc_html__( '%1$s length is bigger.', 'zencommunity' ), 
					esc_html( $type )
				), 
				422 
			);
		}

	}

    /**
     * Recursively merge two arrays.
     *
     * @param array $data     The original data array.
     * @param array $fields_to_update  The nested updates to apply.
     *
     * @return array The merged data array.
     */
    public static function user_name( array $data ) : string {
        if (
			empty( $data['first_name'] ?? '' )  &&
			empty( $data['last_name'] ?? '' ) 
		) {
			return $data['username'] ?? '';
		}

		return implode( ' ', array_filter( [
			$data['first_name'] ?? '',
			$data['last_name'] ?? ''
		] ) );
    }

	public static function user_ip() : string {
		$server_env_keys = [
			'HTTP_CF_CONNECTING_IP',   // Cloudflare
			'HTTP_X_FORWARDED_FOR',  // Proxies/load balancers
			'HTTP_CLIENT_IP',		// client IP
			'REMOTE_ADDR'          // Fallback
		];
	
		foreach ( $server_env_keys as $key ) {
			if ( ! empty( $_SERVER[ $key ]  ) ) {
				// Handle multiple IPs (such as. "127.0.0.1, 127.0.0.2, ...")
				$sanitized_input = sanitize_text_field( wp_unslash( $_SERVER[ $key ] ) );
				$ips = explode( ',', $sanitized_input ); // use safely
				foreach ( $ips as $ip ) {
					$ip = trim( $ip );
					// Only return public IPs
					if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
						return $ip;
					}
				}
			}
		}
		// fallback
		return sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0' ) );
	}
	
	/**
	 * Extract all @mentions form text contents 
	 * Example: @username
	 *
	 * @param string $content
	 * @return array List of mentioned unique usernames except @
	 */
	public static function extract_mentions( string $content ) : array {
		preg_match_all( '/@([a-zA-Z0-9_]+)/', $content, $matches );
		return array_unique( $matches[1] ?? [] );
	}

    /**
     * Recursively merge two arrays.
     *
     * @param array $data     The original data array.
     * @param array $fields_to_update  The nested updates to apply.
     *
     * @return array The merged data array.
     */
    public static function recursive_merge( array $data, array $fields_to_update ) : array {
        foreach ($fields_to_update as $key => $value) {
            if ( is_array( $value ) && isset( $data[ $key ] ) && is_array( $data[ $key ] ) ) {
                $data[ $key ] = static::recursive_merge( $data[ $key ], $value );
            } else {
                $data[ $key ] = $value;
            }
        }
        return $data;
    }

	/**
	 * Get template part (for templates like the course-loop).
	 *
	 * ZENCOMMUNITY_TEMPLATE_DEBUG_MODE will prevent overrides in themes from taking priority.
	 *
	 * @param mixed  $slug Template slug.
	 * @param string $name Template name (default: '').
	 */
	public static function get_template_part( $slug, $name = '' ) {
		$template = false;
		if ( $name ) {
			$template = ZENCOMMUNITY_TEMPLATE_DEBUG_MODE ? '' : locate_template(
				array(
					"{$slug}-{$name}.php",
					self::template_path() . "{$slug}-{$name}.php",
				)
			);

			if ( ! $template ) {
				$fallback = self::plugin_path() . "/templates/{$slug}-{$name}.php";
				$template = file_exists( $fallback ) ? $fallback : '';
			}
		}

		if ( ! $template ) {
			// If template file doesn't exist, look in yourtheme/slug.php and yourtheme/academy/slug.php.
			$template = ZENCOMMUNITY_TEMPLATE_DEBUG_MODE ? '' : locate_template(
				array(
					"{$slug}.php",
					self::template_path() . "{$slug}.php",
				)
			);
		}
		// Allow 3rd party plugins to filter template file from their plugin.
		$template = apply_filters( ZENCOMMUNITY_PLUGIN_SLUG . '/get_template_part', $template, $slug, $name );
		if ( $template ) {
			load_template( $template, false );
		}
	}

	/**
	 * Get the template path.
	 *
	 * @return string
	 */
	public static function template_path() {
		return apply_filters( ZENCOMMUNITY_PLUGIN_SLUG . '/template_path', ZENCOMMUNITY_PLUGIN_SLUG . '/' );
	}

	/**
	 * Get the template path.
	 *
	 * @return string
	 */
	public static function plugin_path() {
		return apply_filters( ZENCOMMUNITY_PLUGIN_SLUG . '/plugin_path', ZENCOMMUNITY_ROOT_DIR_PATH );
	}

	/**
	 * Get other templates (e.g. course attributes) passing attributes and including the file.
	 *
	 * @param string $template_name Template name.
	 * @param array  $args Arguments. (default: array).
	 * @param string $template_path Template path. (default: '').
	 * @param string $default_path Default path. (default: '').
	 */
	public static function get_template( $template_name, $args = array(), $template_path = '', $default_path = '' ) {
		$template = false;

		if ( ! $template ) {
			$template = self::locate_template( $template_name, $template_path, $default_path );
		}

		// Allow 3rd party plugin filter template file from their plugin.
		$filter_template = apply_filters( ZENCOMMUNITY_PLUGIN_SLUG . '/get_template', $template, $template_name, $args, $template_path, $default_path );

		if ( $filter_template !== $template ) {
			if ( ! file_exists( $filter_template ) ) {
				/* translators: %s template */
				wc_doing_it_wrong( __FUNCTION__, sprintf( __( '%s does not exist.', 'zencommunity' ), '<code>' . $filter_template . '</code>' ), '1.0.0' );

				return;
			}
			$template = $filter_template;
		}

		$action_args = array(
			'template_name' => $template_name,
			'template_path' => $template_path,
			'located'       => $template,
			'args'          => $args,
		);

		if ( ! empty( $args ) && is_array( $args ) ) {
			if ( isset( $args['action_args'] ) ) {
				wc_doing_it_wrong(
					__FUNCTION__,
					__( 'action_args should not be overwritten when calling academy/get_template.', 'zencommunity' ),
					'1.0.0'
				);
				unset( $args['action_args'] );
			}
			extract( $args ); // @codingStandardsIgnoreLine
		}

		do_action( ZENCOMMUNITY_PLUGIN_SLUG . '/before_template_part', $action_args['template_name'], $action_args['template_path'], $action_args['located'], $action_args['args'] );
		include $action_args['located'];

		do_action( ZENCOMMUNITY_PLUGIN_SLUG . '/after_template_part', $action_args['template_name'], $action_args['template_path'], $action_args['located'], $action_args['args'] );
	}

	/**
	 * Locate a template and return the path for inclusion.
	 *
	 * This is the load order:
	 *
	 * yourtheme/$template_path/$template_name
	 * yourtheme/$template_name
	 * $default_path/$template_name
	 *
	 * @param string $template_name Template name.
	 * @param string $template_path Template path. (default: '').
	 * @param string $default_path Default path. (default: '').
	 *
	 * @return string
	 */
	public static function locate_template( $template_name, $template_path = '', $default_path = '' ) {
		if ( ! $template_path ) {
			$template_path = self::template_path();
		}

		if ( ! $default_path ) {
			$default_path = self::plugin_path() . 'templates/';
		}

		// Look within passed path within the theme - this is priority.
		if ( false !== strpos( $template_name, ZENCOMMUNITY_PLUGIN_SLUG . '_courses_category' ) || false !== strpos( $template_name, ZENCOMMUNITY_PLUGIN_SLUG . '_courses_tag' ) ) {
			$cs_template = str_replace( '_', '-', $template_name );
			$template    = locate_template(
				array(
					trailingslashit( $template_path ) . $cs_template,
					$cs_template,
				)
			);
		}

		if ( empty( $template ) ) {
			$template = locate_template(
				array(
					trailingslashit( $template_path ) . $template_name,
					$template_name,
				)
			);
		}

		// Get default template/.
		if ( ! $template || ZENCOMMUNITY_TEMPLATE_DEBUG_MODE ) {
			if ( empty( $cs_template ) ) {
				$template = $default_path . $template_name;
			} else {
				$template = $default_path . $cs_template;
			}
		}

		// Return what we found.
		return apply_filters( ZENCOMMUNITY_PLUGIN_SLUG . '/locate_template', $template, $template_name, $template_path );
	}

}