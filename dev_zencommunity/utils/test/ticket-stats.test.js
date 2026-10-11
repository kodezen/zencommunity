/**
 * The counters were refetched on every poll because they were keyed on the
 * tickets array, which is new each time. These pin the property that fixed it:
 * equal content, equal signature — and any change a counter cares about moves it.
 */
import { ticketStatsSignature } from '../ticket-stats';

const ticket = ( over = {} ) => ( {
	id: 1,
	status: 'open',
	assignees: [ { id: 7 } ],
	updated_at: '2026-09-03 10:00:00',
	...over,
} );

describe( 'ticketStatsSignature', () => {
	it( 'is equal for a fresh array with the same tickets', () => {
		const before = [ ticket(), ticket( { id: 2, status: 'closed' } ) ];
		const after = [ ticket(), ticket( { id: 2, status: 'closed' } ) ];

		// Same tickets, different array identity — this is every poll tick.
		expect( before ).not.toBe( after );
		expect( ticketStatsSignature( after ) ).toBe( ticketStatsSignature( before ) );
	} );

	it( 'ignores changes no counter is derived from', () => {
		const before = [ ticket() ];
		const after = [ ticket( { updated_at: '2026-09-03 11:30:00', last_message: 'hi' } ) ];

		expect( ticketStatsSignature( after ) ).toBe( ticketStatsSignature( before ) );
	} );

	it( 'moves when a status changes', () => {
		expect( ticketStatsSignature( [ ticket( { status: 'closed' } ) ] ) )
			.not.toBe( ticketStatsSignature( [ ticket() ] ) );
	} );

	it( 'moves when an assignment changes', () => {
		expect( ticketStatsSignature( [ ticket( { assignees: [ { id: 9 } ] } ) ] ) )
			.not.toBe( ticketStatsSignature( [ ticket() ] ) );
	} );

	it( 'moves when a ticket appears or disappears', () => {
		const one = ticketStatsSignature( [ ticket() ] );

		expect( ticketStatsSignature( [ ticket(), ticket( { id: 2 } ) ] ) ).not.toBe( one );
		expect( ticketStatsSignature( [] ) ).not.toBe( one );
	} );

	it( 'survives an empty or missing list', () => {
		expect( ticketStatsSignature( [] ) ).toBe( '' );
		expect( ticketStatsSignature( undefined ) ).toBe( '' );
		expect( ticketStatsSignature( null ) ).toBe( '' );
	} );
} );
