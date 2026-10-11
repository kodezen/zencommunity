import Header from '../Components/Header';
import ChatHead from '../Pages/CommunityChat/ChatHead';
import LeftSidebar from '../Components/Sidebar/LeftSidebar';
import RightSidebar from '../Components/Sidebar/RightSidebar';
import FeedPosts from '../Pages/Feed/FeedPosts';
import Login from '../Pages/Auth/Login';
import Group from '../Pages/Group';
import Members from '../Pages/Members';
import Leaderboard from '../Pages/Leaderboard';
import Banner from '../Components/Banner/Banner';
import PostComposer from './blocks/PostComposer';
import ContentOutlet from './blocks/ContentOutlet';
import ContentBody from './blocks/ContentBody';
import Navigation from './blocks/Navigation';
import Notifications from './blocks/Notifications';
import Identity from './blocks/Identity';
import ThemeToggle from './blocks/ThemeToggle';
import Search from './blocks/Search';
import { CommunityApp } from '../communityRouter';

/**
 * Maps an FSE block `type` (the manifest key emitted by the PHP render callback
 * as data-zc-block) to the React component the island mounts. Each component
 * already exists in the SPA — FSE mode just re-uses them as islands.
 *
 * Keys MUST match includes/fse/manager.php::block_manifest().
 */
export const blockRegistry = {
    // Full community app: the entire routed SPA as one block. All routes
    // (feed, members, groups, member/:id, group/:id, …) work because it hosts
    // the real react-router. Use this when you want a fully working community.
    'community-app': CommunityApp,

    // Layout parts
    'header': Header,
    // Floating "chat head" bubbles/mini-windows + the header's quick Messages
    // panel. Renders nothing itself unless the panel is open or there's an
    // active bubble/window (see ChatHead/index.js) — mount it once per page
    // alongside `header` so the message icon's togglePanel() has something to
    // show. Needs its own island (not just a plain child of `header`) because
    // it's meant to float above the WHOLE page, not just the header block's
    // column.
    'chat-head': ChatHead,
    'left-sidebar': LeftSidebar,
    'right-sidebar': RightSidebar,
    'feed-stream': FeedPosts,
    'post-composer': PostComposer,
    'welcome-banner': Banner,
    'guest-cta': Login,

    // The routed content area — swaps views (feed/members/groups/…) by URL.
    'content-outlet': ContentOutlet,
    // Routed content WITHOUT the view's own sidebars — for custom column layouts.
    'content-body': ContentBody,

    // Granular header/chrome parts (compose your own navigation bar)
    'navigation': Navigation,
    'search': Search,
    'notifications': Notifications,
    'identity': Identity,
    'theme-toggle': ThemeToggle,

    // Full views (self-contained)
    'groups-view': Group,
    'members-view': Members,
    'leaderboard-view': Leaderboard,
};

/**
 * Blocks that render their own providers + router and therefore must NOT be
 * wrapped in the island providers (doing so would nest two routers).
 */
export const selfContainedBlocks = new Set(['community-app']);

export const getBlockComponent = (type) => blockRegistry[type] || null;
