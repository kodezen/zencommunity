import { current_logged_user } from '@Utils/helper';
import { useEffect, useState, useRef } from 'react';

export function useFetchData({ handler, timer = 60000, immediate = true, isSocketActive, is_chat = false, searchParams }) {
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);

    // Keep the latest handler in a ref so the polling interval always calls the
    // current closure (which captures the current selectedUser/searchParams)
    // instead of the stale one captured when the effect first ran.
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    // Guard against overlapping requests: a slow poll response must not stack on
    // top of a still-pending one, and a late response must not overwrite a newer.
    const inFlightRef = useRef(false);

    // When the last fetch finished, so the two paths below cannot both open the
    // screen with the same request. `isSocketActive` is false while the socket
    // is still connecting, so the polling path fetches immediately; a moment
    // later the connection resolves, that path tears down and the realtime path
    // fetches the same thing again. Measured on a cold load: notifications
    // three times, feeds twice, ticket stats twice — per screen.
    //
    // A window rather than a once-only flag, because a fetch after a real
    // reconnect is wanted: the socket was down, events were missed, and the
    // list has to catch up. Only the pile-up inside a couple of seconds goes.
    const lastFetchAtRef = useRef(0);
    const REFETCH_WINDOW = 2000;

    // Only the very first fetch should toggle `loading` — background polls
    // refresh silently so an already-populated list doesn't flash back to a
    // skeleton every timer tick.
    const hasLoadedRef = useRef(false);

    const fetchData = async ({ force = true } = {}) => {
        if (inFlightRef.current) return;
        if (!force && Date.now() - lastFetchAtRef.current < REFETCH_WINDOW) return;

        inFlightRef.current = true;
        if (!hasLoadedRef.current) setLoading(true);
        try {
            const result = await handlerRef.current();
            setResponse(result);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            inFlightRef.current = false;
            hasLoadedRef.current = true;
            lastFetchAtRef.current = Date.now();
            setLoading(false);
        }
    };

    // Realtime (socket) path: fetch once on mount and whenever searchParams
    // changes. A single effect avoids the previous double-fetch on mount.
    useEffect(() => {
        if (!current_logged_user && !is_chat) return;
        if (isSocketActive) fetchData({ force: false });
    }, [searchParams, isSocketActive]);

    // Fallback polling path: only runs while the socket is NOT connected.
    useEffect(() => {
        if (!current_logged_user && !is_chat) return;
        if (isSocketActive) return;

        if (immediate) fetchData({ force: false });

        intervalRef.current = setInterval(() => {
            // Don't poll a backgrounded tab — no one is looking and it just
            // hammers the network and re-renders.
            if (typeof document !== 'undefined' && document.hidden) return;
            fetchData();
        }, timer);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [timer, immediate, isSocketActive, searchParams]);

    return { response, loading, error };
}
