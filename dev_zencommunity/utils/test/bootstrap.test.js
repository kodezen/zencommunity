/**
 * A ticket page opened with five separate requests for its own products,
 * label sets, engineering-issue settings and support agents, plus five more
 * for the ticket itself, its conversation, its pinned notes, the customer's
 * purchases and any linked issue — all of it small, all of it the same
 * question every time. These cover the batching that replaced them: one
 * request stands in for a whole scope, a legitimate empty answer is not
 * mistaken for a missing one, and a stale batch stops answering rather than
 * serving an hour-old menu.
 *
 * The module keeps its batches in a top-level Map, so each test loads a fresh
 * copy via jest.resetModules() rather than sharing state with the others.
 */

/** A controllable stand-in for API.get: settle() resolves it when the test says so. */
const makeApi = () => {
	const calls = [];
	const api = {
		get: jest.fn( ( url ) => {
			let settle;
			let fail;
			const promise = new Promise( ( resolve, reject ) => {
				settle = resolve;
				fail = reject;
			} );
			calls.push( { url, settle, fail } );
			return promise;
		} ),
	};

	return { api, calls };
};

/** Load a fresh copy of the module with the given API stub wired to './helper'. */
const loadBootstrap = ( api ) => {
	jest.resetModules();
	jest.doMock( '../helper', () => ( { API: api, namespace: 'zencommunity/v1' } ) );
	return require( '../bootstrap' );
};

describe( 'takeBootstrapValue', () => {
	it( 'answers several keys from one request', async () => {
		const { api, calls } = makeApi();
		const { takeBootstrapValue, primeBootstrap } = loadBootstrap( api );

		primeBootstrap();
		const settings = takeBootstrapValue( 'settings' );
		const menus = takeBootstrapValue( 'menus' );

		expect( api.get ).toHaveBeenCalledTimes( 1 );

		calls[ 0 ].settle( {
			data: {
				settings: { status: 200, data: { theme: 'dark' } },
				menus: { status: 200, data: [ 'home' ] },
			},
		} );

		await expect( settings ).resolves.toEqual( { theme: 'dark' } );
		await expect( menus ).resolves.toEqual( [ 'home' ] );
		expect( api.get ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'gives a caller who arrives after it resolved the same answer, not a new request', async () => {
		const { api, calls } = makeApi();
		const { takeBootstrapValue, primeBootstrap } = loadBootstrap( api );

		primeBootstrap();
		calls[ 0 ].settle( { data: { settings: { status: 200, data: { theme: 'dark' } } } } );
		await takeBootstrapValue( 'settings' );

		await expect( takeBootstrapValue( 'settings' ) ).resolves.toEqual( { theme: 'dark' } );
		expect( api.get ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'returns undefined for a key the batch never started for', async () => {
		const { api } = makeApi();
		const { takeBootstrapValue } = loadBootstrap( api );

		// Nothing primed this scope at all.
		await expect( takeBootstrapValue( 'settings' ) ).resolves.toBeUndefined();
		expect( api.get ).not.toHaveBeenCalled();
	} );

	it( 'treats a route the batch refused (non-2xx) as no preload, not an empty one', async () => {
		const { api, calls } = makeApi();
		const { takeBootstrapValue, primeBootstrap } = loadBootstrap( api );

		primeBootstrap();
		const result = takeBootstrapValue( 'settings' );
		calls[ 0 ].settle( { data: { settings: { status: 401, data: null } } } );

		await expect( result ).resolves.toBeUndefined();
	} );

	it( 'returns undefined when the batch request itself fails, so every caller falls back on its own', async () => {
		const { api, calls } = makeApi();
		const { takeBootstrapValue, primeBootstrap } = loadBootstrap( api );

		primeBootstrap();
		const settings = takeBootstrapValue( 'settings' );
		const menus = takeBootstrapValue( 'menus' );
		calls[ 0 ].fail( new Error( 'network' ) );

		await expect( settings ).resolves.toBeUndefined();
		await expect( menus ).resolves.toBeUndefined();
	} );

	it( 'gives back a genuinely null answer rather than treating it as missing', async () => {
		// A ticket with no linked engineering issue answers the question with a
		// real null, not an absent key — collapsing that into "no preload" was
		// the bug: every caller for that ticket fell through to a live request
		// that only confirmed the same null.
		const { api, calls } = makeApi();
		const { takeBootstrapValue, primeTicketDetail, ticketScope } = loadBootstrap( api );

		primeTicketDetail( 28 );
		const result = takeBootstrapValue( 'eng_issue', ticketScope( 28 ) );
		calls[ 0 ].settle( { data: { eng_issue: { status: 200, data: null } } } );

		await expect( result ).resolves.toBeNull();
	} );

	it( 'keeps two scopes apart: a key in one is not answered by the other', async () => {
		const { api, calls } = makeApi();
		const { takeBootstrapValue, primeBootstrap, primeTicketBootstrap } = loadBootstrap( api );

		primeBootstrap();
		primeTicketBootstrap();
		expect( api.get ).toHaveBeenCalledTimes( 2 );

		const products = takeBootstrapValue( 'products', 'ticket' );
		// 'products' only exists in the ticket scope's response — the page
		// scope's batch never carries it.
		calls[ 0 ].settle( { data: {} } );
		calls[ 1 ].settle( { data: { products: { status: 200, data: [ 'widget' ] } } } );

		await expect( products ).resolves.toEqual( [ 'widget' ] );
		await expect( takeBootstrapValue( 'products' ) ).resolves.toBeUndefined();
	} );

	it( 'stops answering once the reuse window has passed', async () => {
		const { api, calls } = makeApi();
		const { takeBootstrapValue, primeBootstrap } = loadBootstrap( api );
		const now = jest.spyOn( Date, 'now' );

		now.mockReturnValue( 1_000 );
		primeBootstrap();
		calls[ 0 ].settle( { data: { settings: { status: 200, data: { theme: 'dark' } } } } );
		await expect( takeBootstrapValue( 'settings' ) ).resolves.toEqual( { theme: 'dark' } );

		// Ten seconds and change later, the same batch no longer stands in —
		// nothing here should serve a stale answer to a page that has been open
		// a while.
		now.mockReturnValue( 1_000 + 10_001 );
		await expect( takeBootstrapValue( 'settings' ) ).resolves.toBeUndefined();

		now.mockRestore();
	} );
} );

describe( 'primeTicketDetail', () => {
	it( 'drops the previous ticket\'s batch when a new one opens', async () => {
		const { api, calls } = makeApi();
		const { takeBootstrapValue, primeTicketDetail, ticketScope } = loadBootstrap( api );

		primeTicketDetail( 28 );
		calls[ 0 ].settle( { data: { ticket: { status: 200, data: { id: 28 } } } } );
		await expect( takeBootstrapValue( 'ticket', ticketScope( 28 ) ) ).resolves.toEqual( { id: 28 } );

		// Moving to a second ticket starts a fresh request rather than reusing
		// the first ticket's — a stale batch answering for the wrong ticket
		// would be worse than one extra request.
		primeTicketDetail( 29 );
		expect( api.get ).toHaveBeenCalledTimes( 2 );

		await expect( takeBootstrapValue( 'ticket', ticketScope( 28 ) ) ).resolves.toBeUndefined();
	} );
} );
