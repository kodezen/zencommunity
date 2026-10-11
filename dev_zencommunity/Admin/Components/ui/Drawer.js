import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseButton from './CloseButton';

// Matches the panel's tw-duration-300 below — kept unmounted for this long
// after close so the slide-out/fade-out transition has time to finish
// instead of the panel just disappearing instantly.
const TRANSITION_MS = 300;

// Panel widths. `sm` is the original mobile-menu width (keeps existing callers
// like LeftBar unchanged); `md`/`lg` are for content-heavy side panels such as
// the Space add/edit form.
const DRAWER_SIZES = {
	sm: 'tw-max-w-[400px]',
	md: 'tw-max-w-[520px]',
	lg: 'tw-max-w-[680px]',
};

/**
 * Drawer — mobile slide-over panel. Portals into #zc-admin-modal-root (a
 * sibling of AdminNav, see Admin/settings.js) rather than document.body: the
 * admin Tailwind config scopes every utility under #ZenCommunitySettingsElement,
 * so a portal further outside would strip all styling. Portaling there keeps
 * this out of any CSS stacking context a tab wrapper creates (e.g.
 * .zencom-animate-fade's `animation-name`), which would otherwise trap this
 * drawer's z-index below AdminNav's sticky bar.
 */
const Drawer = ({ open, onClose, title, children, footer, side = 'start', size = 'sm', bodyClassName = '' }) => {
	// `rendered` keeps the drawer mounted for the exit transition; `visible`
	// drives the actual transform/opacity so open and close each animate
	// instead of the panel just popping in/out (as a bare `if (!open) return
	// null` would do).
	const [rendered, setRendered] = useState(open);
	const [visible, setVisible] = useState(false);
	const closeTimeoutRef = useRef(null);
	const openRafRef = useRef(null);

	useEffect(() => {
		clearTimeout(closeTimeoutRef.current);
		cancelAnimationFrame(openRafRef.current?.outer);
		cancelAnimationFrame(openRafRef.current?.inner);

		if (open) {
			setRendered(true);
			// Mount off-screen first, then flip to visible a frame later so the
			// browser actually has a "from" state to transition out of instead
			// of starting already at the open position. A single rAF still
			// lands in the same paint as the initial (hidden) style in most
			// browsers, so the panel jumps straight to open instead of
			// sliding in — nesting a second rAF forces that first frame to
			// actually be painted before the visible flip is scheduled.
			const outer = requestAnimationFrame(() => {
				openRafRef.current.inner = requestAnimationFrame(() => setVisible(true));
			});
			openRafRef.current = { outer, inner: null };
			return () => {
				cancelAnimationFrame(openRafRef.current?.outer);
				cancelAnimationFrame(openRafRef.current?.inner);
			};
		}

		setVisible(false);
		closeTimeoutRef.current = setTimeout(() => setRendered(false), TRANSITION_MS);
		return () => clearTimeout(closeTimeoutRef.current);
	}, [open]);

	if (!rendered) return null;

	// The panel is `relative`, not `absolute` — `left-0`/`right-0` offsets do
	// nothing for it. Its edge is actually determined by where flexbox places
	// it, so the side has to be controlled via the outer container's
	// justify-content instead.
	const drawerContent = (
		<div
			className={`tw-fixed tw-inset-0 tw-z-[100000] tw-flex ${side === 'end' ? 'tw-justify-end' : 'tw-justify-start'}`}
			onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
		>
			<div className={`tw-absolute tw-inset-0 tw-bg-black/40 tw-transition-opacity tw-duration-300 tw-ease-out ${visible ? 'tw-opacity-100' : 'tw-opacity-0'}`} />
			<div
				className={
					'tw-relative tw-flex tw-h-full tw-w-[90vw] tw-flex-col tw-overflow-hidden tw-bg-white tw-shadow-xl tw-mt-[32px] tw-transition-transform tw-duration-300 tw-ease-out ' +
					(DRAWER_SIZES[size] || DRAWER_SIZES.sm) + ' ' +
					(visible ? 'tw-translate-x-0' : side === 'end' ? 'tw-translate-x-full' : 'tw--translate-x-full')
				}
			>
				<div className="tw-flex tw-shrink-0 tw-items-center tw-justify-between tw-border-0 tw-border-b tw-border-solid tw-border-zc-border tw-bg-white tw-px-5 tw-py-4">
					{title && <h2 className="tw-m-0 tw-text-base tw-font-semibold tw-text-zc-fg">{title}</h2>}
					<CloseButton onClick={onClose} />
				</div>
				<div className={'tw-no-scrollbar tw-flex tw-flex-1 tw-flex-col tw-gap-4 tw-overflow-y-auto tw-bg-white ' + bodyClassName}>{children}</div>
				{footer && (
					<div className="tw-flex tw-shrink-0 tw-justify-end tw-gap-2 tw-border-0 tw-border-t tw-border-solid tw-border-zc-border tw-bg-white tw-px-5 tw-py-4">
						{footer}
					</div>
				)}
			</div>
		</div>
	);

	const portalTarget = document.getElementById('zc-admin-modal-root');
	return portalTarget ? createPortal(drawerContent, portalTarget) : drawerContent;
};

export default Drawer;
