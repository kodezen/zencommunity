/**
 * What the ticket counters are actually derived from.
 *
 * The stats request used to be keyed on the tickets array itself, and a fetch
 * returns a new array every time — so with the socket down each poll became two
 * requests: the list, and then counts that had not moved. This changes only
 * when something a count depends on changes.
 *
 * @param {Array<Object>} tickets
 * @return {string} A value that is equal whenever the counts would be.
 */
export const ticketStatsSignature = ( tickets ) =>
	( tickets || [] )
		.map( ( ticket ) => {
			const assignees = ticket?.assignees
				? JSON.stringify( ticket.assignees )
				: '';

			return `${ ticket?.id }:${ ticket?.status }:${ assignees }`;
		} )
		.join( '|' );
