<?php
namespace ZenCommunity\Classes;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
/**
 * Validate color code formats: hex, rgb(a), hsl(a)
 */
class ColorCodeValidator {
    public const HEX_PATTERN = '/^#([a-f0-9]{3}|[a-f0-9]{6})$/i';
    public const RGB_PATTERN = '/^rgb\(\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)\s*\)$/i';
    public const RGBA_PATTERN = '/^rgba\(\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(0|1|0?\.\d+)\s*\)$/i';
    public const HSL_PATTERN = '/^hsl\(\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*\)$/i';
    public const HSLA_PATTERN = '/^hsla\(\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(0|1|0?\.\d+)\s*\)$/i';

    public string $color_code;

    public function __construct( string $color_code ) {
        $this->color_code = trim( strtolower( $color_code ) );
    }

    /**
     * Check if color code is valid or not
     * @return bool
     */
    public function validate() : bool {
        if ( preg_match( static::HEX_PATTERN, $this->color_code ) ) {
            return true;
        }

        if ( preg_match( static::RGB_PATTERN, $this->color_code, $matches ) ) {
            return $this->is_rgb_in_range( $matches[1], $matches[2], $matches[3] );
        }

        if ( preg_match( static::RGBA_PATTERN, $this->color_code, $matches ) ) {
            return $this->is_rgb_in_range( $matches[1], $matches[2], $matches[3] )
                && $this->is_alpha_in_range( $matches[4] );
        }

        if ( preg_match( static::HSL_PATTERN, $this->color_code, $matches ) ) {
            return $this->is_hsl_in_range( $matches[1], $matches[2], $matches[3] );
        }

        if ( preg_match( static::HSLA_PATTERN, $this->color_code, $matches ) ) {
            return $this->is_hsl_in_range( $matches[1], $matches[2], $matches[3] )
                && $this->is_alpha_in_range( $matches[4] );
        }

        return false;
    }
    
    /**
     * Check if RGB values are within 0–255 range.
     * @param float $r : Hue
     * @param float $g : Saturation
     * @param float $b : lightness
     * @return bool
     */
    public function is_rgb_in_range( string $r, string $g, string $b ) : bool {
        return ( $r >= 0 && $r <= 255 )
            && ( $g >= 0 && $g <= 255 )
            && ( $b >= 0 && $b <= 255 );
    }

    /**
     * Check if HSL values are within valid range.
     * @param float $a : Hue
     * @param float $s : Saturation
     * @param float $l : lightness
     * @return bool
     */
    public function is_hsl_in_range( string $h, string $s, string $l ) : bool {
        return ( $h >= 0 && $h <= 360 )
            && ( $s >= 0 && $s <= 100 )
            && ( $l >= 0 && $l <= 100 );
    }

    /**
     * Check if alpha value is between 0–1.
     * @param float $a : alpha
     * @return bool
     */
    public function is_alpha_in_range( float $a ) : bool {
        return is_numeric( $a ) && $a >= 0 && $a <= 1;
    }
}