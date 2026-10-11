import React, { useMemo, useRef, useEffect } from 'react';
import { createBrowserRouter, createMemoryRouter, Navigate, RouterProvider, Routes, Route } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { theme } from './utils/theme';
import { AuthProvider } from './Context/AuthContext';
import store from '@Redux/store';
import useZenTheme from '@Hooks/useZenTheme';
import Feed from './Pages/Feed';
import Group from './Pages/Group';
import Layout from './Pages/Layout';
import Notification from './Components/Notification';
import Members from '@Pages/Members';
import Profiles from '@Pages/Profile';
import Login from './Pages/Auth/Login';
import ResetPassword from './Pages/Auth/ResetPassword';
import { community_path, PrivateRoutes, current_logged_user, is_pro_active, active_addons, is_academy_active } from '@Utils/helper';
import GroupDetails from '@Pages/GroupDetails';
import Ticket from './Pages/Ticket';
import SingleFeedPost from './Pages/SingleFeedPost';
import TicketDetails from './Pages/Ticket/TicketDetails';
import GuestTicketCreate from './Pages/Ticket/GuestTicketCreate';
import Engineering from './Pages/Engineering';
import SupportLiveChat from './Pages/SupportLiveChat';
import LiveChatFeedback from './Pages/LiveChatFeedback';
import CommunityChat from './Pages/CommunityChat';
import AgentActivity from './Pages/AgentActivity';
import Preferences from './Pages/Preferences';
import Notifications from './Pages/Notifications';
import Moderation from './Pages/Moderation';
import GroupSettings from '@Pages/GroupDetails/GroupSettings';
import Courses from '@Pages/Courses';
import CourseDetail from '@Pages/Courses/CourseDetail';
import Learn from '@Pages/Courses/Learn';
import Leaderboard from '@Pages/Leaderboard';
import GamificationDetail from '@Pages/Gamification/Detail';
import { gameengineConfig } from '@Pages/Gamification/api';
import ErrorPage from '@Components/ErrorPage';
import ErrorBoundary from '@Components/ErrorPage/ErrorBoundary';

// Ensures theme CSS variables are applied on every page load, even on routes
// (like /settings) that don't render the Layout/Header component.
export const ThemeApplier = () => {
    useZenTheme(window.ZencommunityGlobal?.theme_settings);
    return null;
};

export const basePathName = () => {
    const pathSegments = window.location.pathname.split('/');
    const cleanPath = community_path.startsWith('/') ? community_path.slice(1) : community_path;
    const workspaceIndex = pathSegments.findIndex((segment) => segment === cleanPath);

    return workspaceIndex !== -1
        ? '/' + pathSegments.slice(1, workspaceIndex + 1).join('/')
        : '';
};

/**
 * The community route table as a plain data-router config array. Single source
 * of truth shared by the browser router (standalone SPA + FSE `community-app`
 * block) and the memory router (page shortcode embeds), so every member/group/
 * dynamic route works identically in all three mounts.
 */
export const communityRouteConfig = () => [
    {
        path: '/',
        element: <Layout />,
        errorElement: <ErrorPage />,
        children: [
            { index: true, element: <Feed /> },
            { path: 'feed/:id', element: <PrivateRoutes><SingleFeedPost /></PrivateRoutes> },
            { path: 'groups', element: <Group /> },
            { path: 'group/:id', element: <GroupDetails /> },
            { path: 'member/:id', element: <PrivateRoutes><Profiles /></PrivateRoutes> },
            { path: 'members', element: <PrivateRoutes><Members /></PrivateRoutes> },
            { path: 'courses', element: is_academy_active ? <Courses /> : <Navigate to="/" replace /> },
            { path: 'course/:id', element: is_academy_active ? <CourseDetail /> : <Navigate to="/" replace /> },
            {
                path: 'leaderboard',
                element: gameengineConfig.enabled && gameengineConfig.show_leaderboard
                    ? <Leaderboard />
                    : <Navigate to="/" replace />,
            },
            {
                path: 'gamification/:id?',
                element: gameengineConfig.enabled
                    ? <PrivateRoutes><GamificationDetail /></PrivateRoutes>
                    : <Navigate to="/" replace />,
            },
            {
                path: 'tickets',
                element: current_logged_user?.user_id
                    ? <PrivateRoutes><Ticket /></PrivateRoutes>
                    : <GuestTicketCreate />,
            },
            { path: 'ticket/:id', element: <PrivateRoutes><TicketDetails /></PrivateRoutes> },
            {
                path: 'engineering',
                element: is_pro_active && active_addons.includes('Engineering')
                    ? <PrivateRoutes><Engineering /></PrivateRoutes>
                    : <Navigate to="/" replace />,
            },
            { path: 'chat', element: <PrivateRoutes><CommunityChat /></PrivateRoutes> },
            { path: 'live-chat', element: <PrivateRoutes><SupportLiveChat /></PrivateRoutes> },
            // No PrivateRoutes: reached from the CSAT link emailed to a client,
            // identified only by the chat_id/token query pair (see LiveChatFeedback).
            { path: 'live-chat-feedback', element: <LiveChatFeedback /> },
            { path: 'agent-activity', element: <PrivateRoutes><AgentActivity /></PrivateRoutes> },
            { path: 'preferences', element: <PrivateRoutes><Preferences /></PrivateRoutes> },
            { path: 'notifications', element: <PrivateRoutes><Notifications /></PrivateRoutes> },
            { path: 'moderation', element: <PrivateRoutes><Moderation /></PrivateRoutes> },
            { path: 'signin', element: <Login /> },
            { path: 'signup', element: <Login isNew={true} /> },
            { path: 'reset-password', element: <ResetPassword /> },
        ],
    },
    { path: '/group/:id/settings', element: <PrivateRoutes><GroupSettings /></PrivateRoutes>, errorElement: <ErrorPage /> },
    {
        path: '/learn/:id',
        element: is_academy_active
            ? <PrivateRoutes><Learn /></PrivateRoutes>
            : <Navigate to="/" replace />,
        errorElement: <ErrorPage />,
    },
    { path: '*', element: <ErrorPage /> },
];

/**
 * Build the full community router. This is the single source of truth for the
 * SPA route table, shared by the standalone SPA (app.js) and the FSE
 * `community-app` block so member/group/dynamic routes work in both modes.
 */
export const createCommunityRouter = () => createBrowserRouter(
    communityRouteConfig(),
    { basename: basePathName() }
);

/**
 * Build an in-memory community router pinned to `initialPath`. Used by page
 * shortcode embeds: the community renders a specific view (e.g. /tickets,
 * /group/12) inside a host page, and internal navigation stays within the
 * embed's own memory history — the host page's browser URL is never touched.
 */
export const createEmbeddedRouter = ( initialPath = '/' ) => createMemoryRouter(
    communityRouteConfig(),
    { initialEntries: [ initialPath || '/' ] }
);

/**
 * The full community as a self-contained React tree (providers + router).
 * Used by the SPA bootstrap and by the FSE `community-app` block — because it
 * brings its own data router, it must NOT be wrapped in the island providers.
 */
export const CommunityApp = () => {
    const router = useMemo(() => createCommunityRouter(), []);
    return (
        <Provider store={store}>
            <AuthProvider>
                <ThemeApplier />
                <ChakraProvider value={theme}>
                    <RouterProvider router={router} />
                </ChakraProvider>
            </AuthProvider>
        </Provider>
    );
};

/** The community base path (community_path, trailing slash trimmed). */
const communityBase = () => {
    const p = community_path || '';
    const trimmed = p.endsWith('/') ? p.slice(0, -1) : p;
    return trimmed === '/' ? '' : trimmed;
};

/**
 * The full community as a self-contained React tree pinned to a starting route,
 * for page shortcode embeds ([zencommunity page="…"]). Same providers + chrome
 * as CommunityApp, but backed by a memory router so it works when mounted on an
 * arbitrary host page whose URL doesn't match the SPA's routes, and so internal
 * navigation stays inside the embed.
 *
 * Navigation fix: the community chrome (header nav, sidebars, share links) build
 * links with baseURL()/menu item.url, i.e. ABSOLUTE URLs like
 * `https://site/community/groups`. React-router renders a <Link> with an
 * absolute `to` as a plain external anchor and does NOT client-route it, so the
 * browser full-reloads (and leaves the host page). We intercept clicks on those
 * absolute in-community anchors inside the embed and drive the memory router
 * instead — root-relative <Link>s already route client-side and are left alone.
 */
export const EmbeddedCommunityApp = ( { initialPath = '/' } ) => {
    const router = useMemo(() => createEmbeddedRouter(initialPath), [initialPath]);
    const containerRef = useRef(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return undefined;

        const base = communityBase();

        const onClick = (event) => {
            if (event.defaultPrevented || event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const anchor = event.target.closest && event.target.closest('a[href]');
            if (!anchor || !el.contains(anchor)) return;
            if (anchor.target && anchor.target !== '_self') return;
            if (anchor.hasAttribute('download')) return;
            if (anchor.getAttribute('role') === 'button' || anchor.hasAttribute('data-no-route')) return;

            // Only ABSOLUTE-URL anchors need rescuing — root-relative <Link>s are
            // already client-routed by react-router through the memory history.
            const raw = anchor.getAttribute('href') || '';
            if (!/^https?:\/\//i.test(raw)) return;

            let url;
            try {
                url = new URL(raw, window.location.href);
            } catch {
                return;
            }
            if (url.origin !== window.location.origin) return; // truly external link
            if (/\/wp-(admin|login|json|content|includes)/.test(url.pathname)) return;

            // Map the absolute URL to a community-relative SPA path.
            let path = url.pathname;
            if (base) {
                if (path === base || path.startsWith(base + '/')) {
                    path = path.slice(base.length) || '/';
                } else {
                    // Same origin but outside the community — a genuine external
                    // link; let the browser handle it rather than trap it here.
                    return;
                }
            }
            if (!path.startsWith('/')) path = '/' + path;

            event.preventDefault();
            router.navigate(path + url.search + url.hash);
        };

        el.addEventListener('click', onClick, true);
        return () => el.removeEventListener('click', onClick, true);
    }, [router]);

    return (
        <div ref={containerRef} className="zencommunity-app-embed-root">
            <Provider store={store}>
                <AuthProvider>
                    <ThemeApplier />
                    <ChakraProvider value={theme}>
                        <RouterProvider router={router} />
                    </ChakraProvider>
                </AuthProvider>
            </Provider>
        </div>
    );
};

/**
 * The routed content area WITHOUT the SPA chrome (no Layout/Header/sidebars).
 * Rendered by the FSE `content-outlet` block so the view swaps by route while
 * header/sidebar blocks stay put. Mirrors the child routes in
 * createCommunityRouter(); must be used inside a Router (IslandProviders
 * provides one).
 */
export const CommunityRoutes = () => (
    <ErrorBoundary>
        {/* Toast/notification host — the SPA mounts this in <Layout>, which the
        FSE content-outlet never renders, so notifications never appeared in
        Gutenberg (FSE) render mode. Mount it here so they work in FSE too. */}
        <Notification />
        <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="feed/:id" element={<PrivateRoutes><SingleFeedPost /></PrivateRoutes>} />
        <Route path="groups" element={<Group />} />
        <Route path="group/:id" element={<GroupDetails />} />
        <Route path="member/:id" element={<PrivateRoutes><Profiles /></PrivateRoutes>} />
        <Route path="members" element={<PrivateRoutes><Members /></PrivateRoutes>} />
        <Route path="courses" element={is_academy_active ? <Courses /> : <Navigate to="/" replace />} />
        <Route path="course/:id" element={is_academy_active ? <CourseDetail /> : <Navigate to="/" replace />} />
        <Route
            path="leaderboard"
            element={gameengineConfig.enabled && gameengineConfig.show_leaderboard ? <Leaderboard /> : <Navigate to="/" replace />}
        />
        <Route
            path="gamification/:id?"
            element={gameengineConfig.enabled ? <PrivateRoutes><GamificationDetail /></PrivateRoutes> : <Navigate to="/" replace />}
        />
        <Route
            path="tickets"
            element={current_logged_user?.user_id ? <PrivateRoutes><Ticket /></PrivateRoutes> : <GuestTicketCreate />}
        />
        <Route path="ticket/:id" element={<PrivateRoutes><TicketDetails /></PrivateRoutes>} />
        <Route
            path="engineering"
            element={is_pro_active && active_addons.includes('Engineering') ? <PrivateRoutes><Engineering /></PrivateRoutes> : <Navigate to="/" replace />}
        />
        <Route path="chat" element={<PrivateRoutes><CommunityChat /></PrivateRoutes>} />
        <Route path="live-chat" element={<PrivateRoutes><SupportLiveChat /></PrivateRoutes>} />
        <Route path="live-chat-feedback" element={<LiveChatFeedback />} />
        <Route path="agent-activity" element={<PrivateRoutes><AgentActivity /></PrivateRoutes>} />
        <Route path="preferences" element={<PrivateRoutes><Preferences /></PrivateRoutes>} />
        <Route path="notifications" element={<PrivateRoutes><Notifications /></PrivateRoutes>} />
        <Route path="moderation" element={<PrivateRoutes><Moderation /></PrivateRoutes>} />
        <Route path="signin" element={<Login />} />
        <Route path="signup" element={<Login isNew={true} />} />
        <Route path="reset-password" element={<ResetPassword />} />
        </Routes>
    </ErrorBoundary>
);

export default CommunityApp;
