import { createRoot } from 'react-dom/client';
import store from '@Redux/store';
import { Provider } from 'react-redux';
import FullSettings from './Pages/FullSettings';
import Notification from './Components/Notification';
import AdminNav from './Components/AdminNav';
import PermalinkNotice from './Components/PermalinkNotice';
import { AdminRouter, useAdminRouter } from './Components/AdminRouter';
import Dashboard from './Pages/Dashboard';
import SpacesManager from './Pages/SpacesManager';
import PostsManager from './Pages/PostsManager';
import NewPost from './Pages/NewPost';
import CollectionsManager from './Pages/CollectionsManager';
import UsersManager from './Pages/settings/Tabs/UserManagement';
import Reports from './Pages/Reports';
import { API, namespace, site_url, community_path } from '@Utils/helper';
import { PageHeader, Skeleton, Table, EmptyState, PrimarySelect } from './Components/ui';
import { NotchedSearchSelect, NotchedTextField } from './Components/NotchedFields';
import './settings.scss';
import './admin-tailwind.css';

// StoreEngine-style admin: ZenCommunity -> Dashboard / Spaces / Collections /
// Settings. Each is a real wp-admin page slug (deep-link + sidebar highlight),
// but AdminRouter navigates between them client-side (no full reload). The
// active section comes from the router (?page=). Dashboard/Spaces/Collections
// are Tailwind; only Settings pulls in Chakra.
// Runtime handles for add-on admin bundles (e.g. ZenCommunity Pro) that render
// pages inside this app via @wordpress/hooks filters: they share this app's
// REST client, router context and UI primitives instead of bundling copies.
window.zencommunityAdmin = {
    API,
    namespace,
    site_url,
    community_path,
    useAdminRouter,
    ui: { PageHeader, Skeleton, Table, EmptyState, PrimarySelect, NotchedSearchSelect, NotchedTextField },
};

const CurrentView = () => {
    const { page } = useAdminRouter();
    if (page === 'zencommunity-spaces') return <SpacesManager />;
    if (page === 'zencommunity-posts') return <PostsManager />;
    if (page === 'zencommunity-users') return <UsersManager />;
    if (page === 'zencommunity-new-post') return <NewPost />;
    if (page === 'zencommunity-collections') return <CollectionsManager />;
    if (page === 'zencommunity-reports') return <Reports />;
    // Settings, Tools and Add-ons share the settings shell; keyed so switching
    // between them remounts it (fresh tab state per page).
    if (page === 'zencommunity-tools') return <FullSettings key={page} section="tools" />;
    if (page === 'zencommunity-addons') return <FullSettings key={page} section="addons" />;
    if (page === 'zencommunity-general') return <FullSettings key={page} section="settings" />;
    return <Dashboard />;
};

const AdminApp = () => (
    <AdminRouter>
        <PermalinkNotice />
        <AdminNav />
        {/* Matches Academy's admin content width (.academy-page-content, 1250px) */}
        <div className="tw-mx-auto tw-max-w-[1250px] tw-px-6">
            <CurrentView />
        </div>
        {/* Portal target for modals/drawers (see Admin/Components/ui/Modal.js):
        a page tab can wrap its content in an animated class (e.g.
        .zencom-animate-fade), which creates its own CSS stacking context and
        traps any z-index set on a modal nested inside it below AdminNav's
        sticky bar. Sitting here, as a sibling of AdminNav at the root, keeps
        modals out of that trap while staying a descendant of
        #ZenCommunitySettingsElement (required for Tailwind's scoped utilities). */}
        <div id="zc-admin-modal-root" />
    </AdminRouter>
);

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('ZenCommunitySettingsElement');
    if (container) {
        const root = createRoot(container);
        root.render(
            <Provider store={store}>
                <Notification />
                <AdminApp />
            </Provider>
        );
    }
});
