import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { __ } from '@wordpress/i18n';

const CONFIRM_MESSAGE = __(
	'You have unsaved changes. Leave without posting?',
	'zencommunity'
);

/**
 * Warns before the in-progress content of a form (e.g. the post composer)
 * is lost — both for in-app navigation (sidebar links, route changes) and
 * for a real page unload (tab close, refresh, typed-in address).
 *
 * `useBlocker` only works under a data router (`createBrowserRouter`/
 * `createMemoryRouter` + `RouterProvider`), which is how the main
 * community app and its embeds mount — but not how FSE block islands mount
 * (`unstable_HistoryRouter`, a declarative router). Under that router it
 * throws on every render, so it's wrapped rather than left to crash the
 * composer for that one embed context; the `beforeunload` guard below still
 * covers real page unloads there regardless.
 *
 * @param {boolean} when Block navigation/unload while this is true.
 */
export function useUnsavedChangesGuard( when ) {
	let blocker = null;
	try {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		blocker = useBlocker( when );
	} catch ( e ) {
		blocker = null;
	}

	useEffect( () => {
		if ( blocker?.state !== 'blocked' ) {
			return;
		}

		if ( window.confirm( CONFIRM_MESSAGE ) ) {
			blocker.proceed();
		} else {
			blocker.reset();
		}
	}, [ blocker ] );

	useEffect( () => {
		if ( ! when ) {
			return;
		}

		const handleBeforeUnload = ( e ) => {
			e.preventDefault();
			e.returnValue = '';
		};

		window.addEventListener( 'beforeunload', handleBeforeUnload );
		return () => window.removeEventListener( 'beforeunload', handleBeforeUnload );
	}, [ when ] );
}

export default useUnsavedChangesGuard;
