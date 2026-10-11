/**
 * One request for one GET, however many components ask for it.
 *
 * Measured on a cold community page: three identical GETs to
 * /member/notifications in the same millisecond, then three more on every
 * thirty-second tick — plus ticket stats twice, and the same pattern on any
 * screen where more than one component wants the same data. Whatever the
 * arrangement of components behind that, the server is being asked the same
 * question several times at once and answering it several times.
 *
 * A caller that asks while an identical GET is still in flight is handed that
 * request's promise instead of starting another. Only GETs, and only while one
 * is genuinely open: the moment it settles the next caller goes to the network,
 * so nothing here caches anything or serves anything stale.
 *
 * Kept apart from the axios instance it wraps so it can be tested without a
 * browser, a nonce, or the rest of the app's globals.
 */

/** The key two requests have to agree on to count as the same question. */
export const requestKey = ( baseURL, url, params ) =>
	`${ baseURL || '' }|${ url || '' }|${ params ? JSON.stringify( params ) : '' }`;

/**
 * Wrap an axios-like instance's `get` so identical concurrent calls share one
 * request. Pass `{ dedupe: false }` in a call's config to opt out.
 *
 * @param {{get: Function, defaults?: {baseURL?: string}}} api
 * @return {Function} The original `get`, for anything that needs to restore it.
 */
export const installGetDedupe = ( api ) => {
	const inFlight = new Map();
	const original = api.get.bind( api );

	api.get = ( url, config = {} ) => {
		if ( config.dedupe === false ) {
			return original( url, config );
		}

		const key = requestKey( api.defaults?.baseURL, url, config.params );
		const pending = inFlight.get( key );

		if ( pending ) {
			return pending;
		}

		const request = original( url, config ).finally( () => {
			inFlight.delete( key );
		} );

		inFlight.set( key, request );

		return request;
	};

	return original;
};
