import { createBrowserHistory } from 'history';

/**
 * A single shared browser-history instance for every FSE island.
 *
 * In FSE render mode the community is composed of separate blocks, each mounted
 * in its OWN React root (header, sidebars, content-body…). React context can't
 * cross roots, so each island needs its own router. Previously each island got
 * its own `<BrowserRouter>` (its own private history) and cross-island sync was
 * faked by monkeypatching `window.history.pushState` to broadcast a synthetic
 * `popstate`. That was fragile: a header <Link> click would update the header
 * but not always the content/sidebars (partial desync), and the synthetic
 * popstate + clobbered history state could make react-router resync by doing a
 * FULL DOCUMENT RELOAD — the "click a nav item and the page reloads" bug.
 *
 * The fix: give every island's `<HistoryRouter>` this ONE shared history object.
 * Because they all subscribe to the same instance (`history.listen`), a
 * navigation from any island updates all of them in lock-step — pure client-side
 * react-router navigation, no monkeypatch, no reload, no desync.
 *
 * Only used by the FSE islands. The standalone SPA (createBrowserRouter) and the
 * page shortcode embeds (createMemoryRouter) bring their own routers and are
 * unaffected.
 */
export const sharedHistory = createBrowserHistory();
