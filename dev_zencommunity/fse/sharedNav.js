import { community_path } from '../utils/helper';
import { sharedHistory } from './sharedHistory';

let installed = false;

const communityBase = () => {
    const p = community_path || '';
    return p.endsWith('/') ? p.slice(0, -1) : p;
};

/**
 * Cross-island navigation in FSE mode is handled natively by the shared history
 * (see sharedHistory.js + IslandProviders.js): every island's router subscribes
 * to one history instance, so a react-router <Link> click in any island updates
 * all of them client-side, with no reload. We no longer monkeypatch
 * history.pushState to broadcast synthetic popstates — that hack caused partial
 * desync and full-page reloads.
 *
 * The one thing react-router can't handle on its own is an ABSOLUTE-URL anchor
 * (e.g. the header's custom menu links / share links use baseURL()/item.url =
 * `https://site/community/…`). React-router renders those as plain external
 * anchors and lets the browser full-navigate them. This click interceptor
 * catches only those in-community absolute anchors and routes them through the
 * shared history instead, so they stay client-side too.
 *
 * Root-relative anchors (`/community/…`) are react-router <Link>s already routed
 * by the shared-history router — they are deliberately left untouched here.
 *
 * Installed once, only on the community frontend for decomposed FSE layouts.
 */
export const installSharedNavigation = () => {
    if (installed || typeof window === 'undefined') return;
    installed = true;

    const base = communityBase();
    if (!base) return; // root-domain install: don't hijack site-wide links.

    document.addEventListener(
        'click',
        (event) => {
            if (event.defaultPrevented || event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const anchor = event.target.closest && event.target.closest('a[href]');
            if (!anchor) return;
            if (anchor.target && anchor.target !== '_self') return;
            if (anchor.hasAttribute('download')) return;
            // Leave the WP admin bar and explicit opt-outs to their default behavior.
            if (anchor.closest('#wpadminbar')) return;
            if (anchor.hasAttribute('data-no-route') || anchor.getAttribute('role') === 'button') return;

            // ONLY absolute-URL anchors need rescuing — root-relative <Link>s are
            // already client-routed by the shared-history router.
            const raw = anchor.getAttribute('href') || '';
            if (!/^https?:\/\//i.test(raw)) return;

            let url;
            try {
                url = new URL(raw, window.location.href);
            } catch {
                return;
            }

            if (url.origin !== window.location.origin) return;
            // Only same-community links; leave wp-admin / login / REST alone.
            if (!url.pathname.startsWith(base + '/') && url.pathname !== base) return;
            if (/\/wp-(admin|login|json|content|includes)/.test(url.pathname)) return;

            // Same-document hash/anchor navigation — let the browser scroll.
            if (url.pathname === window.location.pathname && url.search === window.location.search) return;

            // Routes with their own per-view FSE template must full-load so that
            // distinct template renders (don't client-route within this one).
            const viewRoutes = window.ZencommunityGlobal?.fse_view_routes || [];
            if (viewRoutes.length) {
                const rest = url.pathname.slice(base.length).replace(/^\/+/, '');
                const segment = rest.split('/')[0];
                if (segment && viewRoutes.includes(segment)) return; // allow full load
            }

            event.preventDefault();
            // Drive the SHARED history so every island re-renders in sync. The
            // router's basename (/community) is applied by react-router, so push
            // the full pathname here.
            sharedHistory.push(url.pathname + url.search + url.hash);
        },
        true
    );
};
