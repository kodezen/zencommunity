/**
 * The handful of things a screen needs before it can draw anything, fetched
 * together.
 *
 * The routes behind these are quick — measured in-process, the ten a ticket
 * page opens with come to seventy-odd milliseconds between them. What they cost
 * is not their work but their number: each is a request that loads WordPress,
 * every plugin on the site and the REST stack before it can answer, which is
 * roughly 300-500ms apiece however little it ends up doing. Batching them
 * removes that startup, not the query.
 *
 * Three batches, each with its own endpoint:
 *
 *   page        the community chrome — settings, menus, the welcome banner,
 *               the sidebar widgets, group permissions. Same on every page.
 *   ticket      the ticket screens' chrome — products, both label sets, the
 *               engineering-issue settings, the support agents.
 *   ticket:<id> one ticket — itself, its conversation, its pinned notes, the
 *               customer's purchases, any linked engineering issue.
 *
 * The thunks that own each key ask here first. Whoever asks first starts the
 * request; everyone else waits on the same one.
 */
import { API, namespace } from './helper';

/**
 * How long a batch stands in for its routes.
 *
 * Every key is handed out on this window rather than once each: a screen that
 * dispatches the same thunk twice while loading — the sidebar does — or that
 * mounts the same panel twice for a mobile and a desktop layout — the ticket
 * header does, for the pin list and the engineering-issue panel — must find
 * the same answer both times, not race to see who gets the batch and who gets
 * sent to the network. None of these routes change while a page is opening.
 * After the window every caller goes to the network, so a genuine refresh
 * later still gets a fresh answer.
 *
 * The one key this does not suit is a ticket's conversation, which the page
 * re-reads on purpose — after a reply, on a socket event, on the fallback
 * poll. Its own thunk in ticketSlice tracks single use itself rather than
 * relying on this window; see the comment there.
 */
const WINDOW = 10000;

const scopes = new Map();

const scope = ( name ) => {
	if ( ! scopes.has( name ) ) {
		return null;
	}

	return scopes.get( name );
};

/** Start a batch, if it has not been started. */
const load = ( name, url ) => {
	let entry = scopes.get( name );

	if ( ! entry ) {
		entry = { url, promise: null, loadedAt: 0 };
		scopes.set( name, entry );
	}

	if ( ! entry.promise ) {
		entry.promise = API.get( `${ namespace }/${ entry.url }` )
			.then( ( response ) => {
				entry.loadedAt = Date.now();
				return response?.data || {};
			} )
			.catch( () => {
				entry.loadedAt = Date.now();
				return {}; // Each caller falls back to its own request.
			} );
	}

	return entry.promise;
};

/**
 * The preloaded value for a key, or undefined if there isn't one to give.
 *
 * Undefined — not null — means "ask for it yourself": either the batch was
 * never started, or it failed, past its window, or this key was refused for
 * whoever is asking. A sub-route can legitimately answer with null (a ticket
 * with no linked engineering issue does), and that has to come back as a
 * usable preload rather than be mistaken for a miss — which is exactly why
 * this is not the more obvious `return value?.data || null`.
 *
 * @param {string} key
 * @param {string} name Which batch to read from.
 * @return {Promise<*>}
 */
export const takeBootstrapValue = async ( key, name = 'page' ) => {
	const entry = scope( name );

	if ( ! entry ) {
		return undefined;
	}

	const all = await load( name );

	// Past the opening window this stops answering, and everything asks for
	// itself again — so nothing here can serve a stale menu an hour later.
	if ( Date.now() - entry.loadedAt > WINDOW ) {
		return undefined;
	}

	const value = all?.[ key ];

	// Sub-routes report their own status: a 401 here is a caller who may not
	// see that thing, and it must not be mistaken for an empty result.
	if ( ! value || value.status < 200 || value.status >= 300 ) {
		return undefined;
	}

	return value.data;
};

/** Begin loading before anything asks — called once as the app starts. */
export const primeBootstrap = () => {
	load( 'page', 'bootstrap' );
};

/** The ticket screens' shared chrome, started when one of them opens. */
export const primeTicketBootstrap = () => {
	load( 'ticket', 'bootstrap/tickets' );
};

/**
 * One ticket's own batch.
 *
 * Returns the name to read it back under. Opening a second ticket drops the
 * first's, so moving down a list does not accumulate them.
 */
export const primeTicketDetail = ( id ) => {
	const name = `ticket:${ id }`;

	for ( const existing of scopes.keys() ) {
		if ( existing.startsWith( 'ticket:' ) && existing !== name ) {
			scopes.delete( existing );
		}
	}

	load( name, `bootstrap/ticket/${ id }` );

	return name;
};

/** The name a ticket's batch is read back under. */
export const ticketScope = ( id ) => `ticket:${ id }`;
