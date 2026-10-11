import { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import store from '../redux/store';
import useZenTheme from '../hooks/useZenTheme';
import useWebSocket from '../hooks/useWebSocket';
import { fetchAllMenus } from '../redux/slices/MenuSlice/MenuSlice';
import { fetchActiveAddon } from '../redux/slices/addons/addonsSlice';
import { feedPostLikeSocket } from '../redux/slices/feedSlice/feedSlice';
import { socketNotification } from '../redux/slices/userNotificationSlice/userNotificationSlice';
import { showNotification } from '../redux/slices/notificationSlice/notificationSlice';
import { sliceString } from '../utils/helper';

/**
 * Headless runtime for FSE mode. In the SPA these global concerns live in
 * <Layout>, which does not render when the community is composed from blocks.
 * A single hidden runtime root runs them once, regardless of which/how many
 * blocks are on the page. Renders nothing.
 *
 * Handles: theme CSS vars, core data fetches, and the real-time socket
 * (notifications + feed reactions). Chat-head spawning is intentionally left to
 * the SPA — it needs the ChatHead UI context that FSE mode does not mount.
 */
const RuntimeInner = () => {
    const dispatch = useDispatch();
    const { onMessage } = useWebSocket();

    // Applies the theme CSS variables to :root, same as the SPA's ThemeApplier.
    useZenTheme(window.ZencommunityGlobal?.theme_settings);

    useEffect(() => {
        dispatch(fetchAllMenus());
        dispatch(fetchActiveAddon());
    }, [dispatch]);

    // Mirror the notification handling in Pages/Layout.js so live updates
    // (likes, new posts, mentions…) still reach the store in FSE mode.
    useEffect(() => {
        const handleSocketMessage = (event) => {
            const { action: eventType, data } = event ?? {};
            if (!data) return;
            if (eventType !== 'notification') return;

            const message = sliceString(data.message ?? '', 40, '...');
            const linkTo = data.feed_id ? `feed/${data.feed_id}` : undefined;

            if (data.event_type === 'feed_liked' && data.feed_id) {
                dispatch(feedPostLikeSocket(data.feed_id));
            }

            dispatch(socketNotification(data));
            dispatch(showNotification({ message, isShow: true, type: 'notification', linkTo }));
        };

        const unsubscribe = onMessage(handleSocketMessage);
        return unsubscribe;
    }, [onMessage, dispatch]);

    return null;
};

const FseRuntime = () => (
    <Provider store={store}>
        <RuntimeInner />
    </Provider>
);

export default FseRuntime;
