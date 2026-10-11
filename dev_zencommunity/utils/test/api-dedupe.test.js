/**
 * The community screens ask the same question several times at once — three
 * identical /member/notifications GETs in the same millisecond was what started
 * this. These cover the deal that makes that one request: share while open,
 * never share once settled, and never merge two different questions.
 */
import { installGetDedupe, requestKey } from '../api-dedupe';

/** An axios-ish stub whose responses resolve when the test says so. */
const makeApi = () => {
	const calls = [];
	const api = {
		defaults: { baseURL: 'https://example.test/wp-json/zencommunity/v1' },
		get: jest.fn( ( url, config = {} ) => {
			let settle;
			const promise = new Promise( ( resolve ) => {
				settle = resolve;
			} );
			calls.push( { url, config, settle } );
			return promise;
		} ),
	};

	return { api, calls };
};

describe( 'installGetDedupe', () => {
	it( 'makes one request when the same GET is asked for twice at once', async () => {
		const { api, calls } = makeApi();
		installGetDedupe( api );

		const first = api.get( '/member/notifications' );
		const second = api.get( '/member/notifications' );

		expect( calls ).toHaveLength( 1 );

		calls[ 0 ].settle( { data: { records: [ 'a' ] } } );

		// Both callers get the same answer, not one of them an undefined.
		await expect( first ).resolves.toEqual( { data: { records: [ 'a' ] } } );
		await expect( second ).resolves.toEqual( { data: { records: [ 'a' ] } } );
	} );

	it( 'asks again once the first request has settled', async () => {
		const { api, calls } = makeApi();
		installGetDedupe( api );

		const first = api.get( '/feeds' );
		calls[ 0 ].settle( { data: [] } );
		await first;

		api.get( '/feeds' );

		// Nothing is cached: the next caller after it settles goes to the network.
		expect( calls ).toHaveLength( 2 );
	} );

	it( 'keeps different questions apart', () => {
		const { api, calls } = makeApi();
		installGetDedupe( api );

		api.get( '/feeds', { params: { order_by: 'created_at' } } );
		api.get( '/feeds', { params: { order_by: 'trending' } } );
		api.get( '/members' );

		expect( calls ).toHaveLength( 3 );
	} );

	it( 'lets a caller opt out', () => {
		const { api, calls } = makeApi();
		installGetDedupe( api );

		api.get( '/tickets' );
		api.get( '/tickets', { dedupe: false } );

		expect( calls ).toHaveLength( 2 );
	} );

	it( 'stops sharing a request that failed, so the screen can recover', async () => {
		const calls = [];
		const api = {
			defaults: { baseURL: 'https://example.test' },
			get: jest.fn( () => {
				let settle;
				let fail;
				const promise = new Promise( ( resolve, reject ) => {
					settle = resolve;
					fail = reject;
				} );
				calls.push( { settle, fail } );
				return promise;
			} ),
		};
		installGetDedupe( api );

		const first = api.get( '/settings' );
		const second = api.get( '/settings' );
		expect( calls ).toHaveLength( 1 );

		calls[ 0 ].fail( new Error( 'network' ) );
		await expect( first ).rejects.toThrow( 'network' );
		await expect( second ).rejects.toThrow( 'network' );

		// A failure must not leave the key wedged — that would mean one dropped
		// request and a screen that never asks again.
		api.get( '/settings' );
		expect( calls ).toHaveLength( 2 );
	} );

	it( 'treats the same params in a different object as the same question', () => {
		const key = ( params ) => requestKey( 'https://a.test', '/feeds', params );

		expect( key( { page: 1, status: 'open' } ) ).toBe( key( { page: 1, status: 'open' } ) );
		expect( key( { page: 1 } ) ).not.toBe( key( { page: 2 } ) );
	} );
} );
