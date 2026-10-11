import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Lightweight React router for the wp-admin app. Each section is a real
 * wp-admin submenu page (?page=zencommunity-…) so refresh, deep-links and the
 * sidebar highlight keep working — but navigating between them here is
 * client-side (pushState, no full reload), giving a StoreEngine-style SPA feel.
 *
 * We route on the ?page= query param (wp-admin URLs are all /wp-admin/admin.php
 * so path-based routing can't distinguish views). navigate() pushes the URL,
 * syncs the wp-admin submenu highlight, and updates state; back/forward is
 * handled via popstate.
 */
const HOME = 'zencommunity-settings';

const pageFromUrl = () => new URLSearchParams(window.location.search).get('page') || HOME;

// Query params besides `page` (e.g. `id` for the New/Edit Post route) — kept
// in the URL, not just pageProps, so a hard reload/deep-link can still work
// out what to load instead of losing state and falling back to a blank page.
const paramsFromUrl = () => Object.fromEntries(new URLSearchParams(window.location.search));

const syncAdminMenuHighlight = (page) => {
	const menu = document.getElementById('adminmenu');
	if (!menu) return;
	// New Post has no menu entry of its own; it belongs to Posts.
	const target = page === 'zencommunity-new-post' ? 'zencommunity-posts' : page;
	menu.querySelectorAll('.wp-submenu a').forEach((a) => {
		const href = a.getAttribute('href') || '';
		const match = href === `admin.php?page=${target}`;
		a.classList.toggle('current', match);
		if (a.parentElement) a.parentElement.classList.toggle('current', match);
	});
	// A grouped page (Posts, Users, …) lives in its group's flyout (see
	// AdminMenu::print_menu_flyouts()); highlight the group's row too.
	menu.querySelectorAll('.zc-menu-group').forEach((group) => {
		if (!group.querySelector('.zc-menu-flyout a.current')) return;
		group.classList.add('current');
		group.firstElementChild?.classList.add('current');
	});
};

const AdminRouterContext = createContext({ page: HOME, pageProps: undefined, params: {}, navigate: () => {} });

export const useAdminRouter = () => useContext(AdminRouterContext);

export const AdminRouter = ({ children }) => {
	const [page, setPage] = useState(pageFromUrl);
	const [params, setParams] = useState(paramsFromUrl);
	// In-memory only (also mirrored into history.state so back/forward restores
	// it) — lets a caller hand data to the page it's navigating to, e.g. Posts
	// -> New Post with the post being edited, without a re-fetch. `params`
	// (below) is the reload-safe counterpart: identifiers that belong in the
	// URL (?id=…) so a hard reload can re-fetch instead of losing state.
	const [pageProps, setPageProps] = useState(undefined);

	const navigate = useCallback(
		(next, props, query) => {
			if (!next) return;
			const qs = query ? new URLSearchParams(query).toString() : '';
			const url = `admin.php?page=${next}${qs ? `&${qs}` : ''}`;
			window.history.pushState({ zcPage: next, pageProps: props }, '', url);
			setPage(next);
			setParams({ page: next, ...(query || {}) });
			setPageProps(props);
			syncAdminMenuHighlight(next);
			window.scrollTo({ top: 0 });
		},
		[]
	);

	useEffect(() => {
		const onPop = (e) => {
			const next = pageFromUrl();
			setPage(next);
			setParams(paramsFromUrl());
			setPageProps(e.state?.pageProps);
			syncAdminMenuHighlight(next);
		};
		window.addEventListener('popstate', onPop);

		// WP renders the left #adminmenu sidebar (Dashboard/Spaces/Posts/…)
		// itself, outside this React tree, so those links are plain <a href>s
		// that would otherwise force a full page reload. Intercept clicks on
		// our own pages there too, so the whole plugin is one SPA regardless
		// of which nav (in-app tabs or wp-admin sidebar) the user clicks.
		const onMenuClick = (e) => {
			if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
			const link = e.target.closest('a[href*="page=zencommunity"]');
			if (!link) return;
			const match = (link.getAttribute('href') || '').match(/[?&]page=([^&]+)/);
			const next = match && decodeURIComponent(match[1]);
			if (!next) return;
			e.preventDefault();
			navigate(next);
		};
		const menu = document.getElementById('adminmenu');
		menu?.addEventListener('click', onMenuClick);

		return () => {
			window.removeEventListener('popstate', onPop);
			menu?.removeEventListener('click', onMenuClick);
		};
	}, [navigate]);

	return <AdminRouterContext.Provider value={{ page, pageProps, params, navigate }}>{children}</AdminRouterContext.Provider>;
};

/**
 * Anchor that navigates client-side but keeps a real href so it is
 * middle-clickable / open-in-new-tab and degrades if JS is disabled.
 */
export const AdminLink = ({ page, className, children, ...rest }) => {
	const { navigate } = useAdminRouter();
	const onClick = (e) => {
		// let modified clicks (new tab, etc.) fall through to the browser
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
		e.preventDefault();
		navigate(page);
	};
	return (
		<a href={`admin.php?page=${page}`} className={className} onClick={onClick} {...rest}>
			{children}
		</a>
	);
};
