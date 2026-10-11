/**
 * React Hooks.
 */
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import ZenCommunityURLSearchParams from '@Utils/ZenCommunityURLSearchParams';

/**
 * Location Search Params hook.
 * @return {ZenCommunityURLSearchParams}
 */
export function useLocationQuery() {
	const { search } = useLocation();

	return useMemo(
		() => new ZenCommunityURLSearchParams( search ),
		[ search ]
	);
}

// End of file index.js
