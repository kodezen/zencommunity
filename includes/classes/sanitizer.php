<?php
namespace ZenCommunity\Classes;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
class Sanitizer {
    public const INT       = 'absint';
    public const FLOAT     = 'floatval';
    public const BOOL      = 'boolval';
    public const STRING    = 'sanitize_text_field';
    public const EMAIL     = 'sanitize_email';
    public const URL       = 'esc_url_raw';
    public const USERNAME  = 'sanitize_user';
    public const KEY       = 'sanitize_key';
    public const TITLE     = 'sanitize_title';
    public const FILE_NAME = 'sanitize_file_name';
    public const HTML      = 'wp_kses_post';
    public const META      = 'sanitize_meta';

    public static function sanitize( array $input, array $rules ): array {
        $sanitized = [];
        foreach ( $rules as $path => $sanitizer ) {
            if ( ! is_callable( $sanitizer ) ) {
                continue; // ignore if sanitizer callable is invalid
            }
    
            $path_parts = explode('.', $path);
            static::apply_deep_sanitizer( $input, $sanitized, $path_parts, $sanitizer );
        }
        return $sanitized;
    }
    
    protected static function apply_deep_sanitizer( array $input, array &$output, array $path_parts, callable $sanitizer ) : void {
        $key = array_shift( $path_parts );
    
        if ( $key === '*' ) {
            if ( ! is_array( $input ) ) {
                return;
            }

            foreach ( $input as $index => $value ) {
                if ( 0 === count( $path_parts ) ) {
                    $output[$index] = $sanitizer( $value );
                    $output[$index] = is_string( $output[$index] ) ? str_replace( '&amp;', '&', $output[$index] ) : $output[$index];

                } else {
                    if ( ! isset( $output[$index] ) ) {
                        $output[$index] = [];
                    }
                    static::apply_deep_sanitizer( $value, $output[$index], $path_parts, $sanitizer );
                }
            }
        } elseif ( isset( $input[$key] ) ) {
            if ( 0 === count( $path_parts ) ) {
                $output[$key] = $sanitizer( $input[$key] );
                $output[$key] = is_string( $output[$key] ) ? str_replace( '&amp;', '&', $output[$key] ) : $output[$key];
            }
            else {
                if ( ! isset( $output[$key] ) ) {
                    $output[$key] = [];
                }
                static::apply_deep_sanitizer( $input[$key], $output[$key], $path_parts, $sanitizer );
            }
        }
    }    
}
