/**
 * Extended URLSearchParams.
 */

// noinspection CommaExpressionJS
/**
 * Data type mapping.
 */
const typeMapping = {
	number: ( num ) => ( ( num = Number( num ) ), isFinite( num ) ? num : 0 ),
	int: ( int ) => ( ( int = parseInt( int ) ), isFinite( int ) ? int : 0 ),
	float: ( float ) => (
		( float = parseFloat( float ) ), isFinite( float ) ? float : 0
	),
	bool: ( bool ) =>
		[ '1', 'yes', 'true' ].includes( ( bool + '' ).toString().trim() ),
	object: JSON.parse,
	id: parseInt,
	ids: ( ids ) =>
		ids
			.split( ',' )
			.map( ( i ) => parseInt( i.trim() ) )
			.filter( ( i ) => isFinite( i ) ),
	text: ( str ) => ( str + '' ).toString().trim(),
	string: ( str ) => ( str + '' ).toString().trim(),
};

export default class ZenCommunityURLSearchParams extends URLSearchParams {
	/**
	 *
	 * @param {string}                                               name
	 * @param {*}                                                    [defaultValue]
	 * @param {*}                                                    [allowedValue]
	 * @param {'text'|'string'|'int'|'float'|'bool'|'id'|'ids'|null} [returnType]
	 *
	 * @return{string|null|*}
	 */
	getValue(
		name,
		defaultValue = null,
		allowedValue = null,
		returnType = null
	) {
		let value = this.get( name );
		if ( value ) {
			if ( defaultValue && typeof defaultValue !== typeof value ) {
				if ( null === returnType ) {
					returnType = typeof defaultValue;
				}
				if ( returnType && typeMapping.hasOwnProperty( returnType ) ) {
					try {
						value = typeMapping[ returnType ]( value );
					} catch ( e ) {
						value = defaultValue;
					}
				}
			}

			if (
				( 'string' === typeof value || 'number' === typeof value ) &&
				null !== allowedValue &&
				Array.isArray( allowedValue ) &&
				! allowedValue.includes( value )
			) {
				return defaultValue;
			}

			return value;
		}

		return defaultValue;
	}
}

// End of file ZenCommunityURLSearchParams.js
