import { createRoot } from 'react-dom/client';
import { CommunityApp, EmbeddedCommunityApp } from './communityRouter';
import { hydrateFseIslands } from './fse/hydrate';

import './app.scss';
import './tailwind.css';
import { primeBootstrap } from '@Utils/bootstrap';

// The handful every page needs, asked for once and together — see
// utils/bootstrap.js. Started here so it is already in flight by the time
// the first screen's thunks run.
primeBootstrap();

// `moment` is WP core's own global vendor bundle (never imported as an ES
// module here — every `.fromNow()`/`.format()` call site across the app
// relies on it already being on `window`). Without this, every relative
// timestamp ("2 hr ago", "4d") always renders in English, regardless of the
// site's language or the viewer's own translation — moment defaults to its
// "en" locale until told otherwise, and nothing here ever told it. Set once,
// as early as possible, before any component gets a chance to call it.
if (window.moment?.locale && window.ZencommunityGlobal?.locale) {
    window.moment.locale(window.ZencommunityGlobal.locale);
}

const EMBED_MOUNTED_FLAG = '__zcEmbedMounted';

/**
 * Page shortcode embeds: every [data-zc-app] node renders a self-contained
 * community pinned to the route in its data-route attribute. Each embed gets
 * its own memory router so internal navigation stays inside the box and the
 * host page URL is untouched. Idempotent — nodes are flagged so re-runs never
 * double-mount.
 */
const mountEmbeds = () => {
    const nodes = document.querySelectorAll('[data-zc-app]');
    nodes.forEach((node) => {
        if (node[EMBED_MOUNTED_FLAG]) return;
        node[EMBED_MOUNTED_FLAG] = true;
        const initialPath = node.getAttribute('data-route') || '/';
        createRoot(node).render(<EmbeddedCommunityApp initialPath={initialPath} />);
    });
    return nodes.length > 0;
};

document.addEventListener('DOMContentLoaded', () => {
    // SPA mode: the single app root is present -> mount the full community.
    const container = document.getElementById('ZenCommunityAppElement');
    if (container) {
        const root = createRoot(container);
        root.render(<CommunityApp />);
        return;
    }

    // Page shortcode embeds: one or more community views dropped onto host pages.
    if (mountEmbeds()) {
        return;
    }

    // Otherwise hydrate ZenCommunity blocks as islands — but only in FSE mode,
    // so a stray [data-zc-block] on an unrelated page can't boot the socket,
    // theme and history patch.
    if (window.ZencommunityGlobal?.is_fse_mode) {
        hydrateFseIslands();
    }
});
