<?php
/**
 * Datetime.
 */

namespace ZenCommunity;

use DateTime;
use DateTimeZone;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Datetime class.
 */
class ZencommunityDatetime extends DateTime {

	/**
	 * UTC Offset, if needed. Only used when a timezone is not set. When
	 * timezones are used this will equal 0.
	 *
	 * @var integer
	 */
	protected int $utc_offset = 0;

	/**
	 * Output an ISO 8601 date string in local (WordPress) timezone.
	 *
	 * @return string
	 */
	public function __toString() {
		return $this->format( DATE_ATOM );
	}

	/**
	 * Set UTC offset - this is a fixed offset instead of a timezone.
	 *
	 * @param int $offset Offset.
	 */
	public function set_utc_offset( int $offset ) {
		$this->utc_offset = intval( $offset );
	}

	/**
	 * Get UTC offset if set, or default to the DateTime object's offset.
	 */
	#[\ReturnTypeWillChange]
	public function getOffset(): int {
		return $this->utc_offset ?: parent::getOffset();
	}

	/**
	 * Set timezone.
	 *
	 * @param DateTimeZone $timezone DateTimeZone instance.
	 *
	 * @return DateTime
	 */
	#[\ReturnTypeWillChange]
	public function setTimezone( $timezone ): DateTime {
		$this->utc_offset = 0;

		return parent::setTimezone( $timezone );
	}

	/**
	 * Missing in PHP 5.2 so just here so it can be supported consistently.
	 *
	 * @return int
	 */
	#[\ReturnTypeWillChange]
	public function getTimestamp(): int {
		return method_exists( 'DateTime', 'getTimestamp' ) ? parent::getTimestamp() : $this->format( 'U' );
	}

	/**
	 * Get the timestamp with the WordPress timezone offset added or subtracted.
	 *
	 * @return int
	 */
	public function getOffsetTimestamp(): int {
		return $this->getTimestamp() + $this->getOffset();
	}

	/**
	 * Format a date based on the offset timestamp.
	 *
	 * @param string $format Date format.
	 * @param bool $gmt [Optional] Get gmt date. Default false (get offset date).
	 *
	 * @return string
	 */
	public function date( string $format, bool $gmt = false ): string {
		if ( $gmt ) {
			return gmdate( $format, $this->getTimestamp() );
		}

		return gmdate( $format, $this->getOffsetTimestamp() );
	}

	/**
	 * Return a localised date based on offset timestamp. Wrapper for date_i18n function.
	 *
	 * @param string $format Date format.
	 * @param bool $gmt [Optional] Get gmt date. Default false (get offset date).
	 *
	 * @return string
	 */
	public function date_i18n( string $format = 'Y-m-d', bool $gmt = false ): string {
		if ( $gmt ) {
			return date_i18n( $format, $this->getTimestamp() );
		}

		return date_i18n( $format, $this->getOffsetTimestamp() );
	}
}

// End of file zencommunity-datetime.php.
