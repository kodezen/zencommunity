import React from 'react';
import { createPortal } from 'react-dom';
import { __ } from '@wordpress/i18n';
import { IoClose } from 'react-icons/io5';

// Portals into #zc-admin-modal-root (a sibling of AdminNav, see
// Admin/settings.js) rather than document.body: the admin Tailwind config
// scopes every utility under #ZenCommunitySettingsElement, so a portal
// further outside would strip all styling. Portaling there — instead of
// rendering inline wherever the call site's own tab content lives — keeps
// this out of any CSS stacking context a tab wrapper creates (e.g.
// .zencom-animate-fade's `animation-name`), which would otherwise trap this
// modal's z-index below AdminNav's sticky bar.
const MODAL_SIZES = {
	md: 'tw-max-w-[480px]',
	lg: 'tw-max-w-[880px]',
	xl: 'tw-max-w-[1040px]',
};

const Modal = ({ title, onClose, children, footer, size = 'md' }) => {
	const modalContent = (
		<div
			className="tw-no-scrollbar tw-fixed tw-inset-0 tw-z-[100000] tw-overflow-y-auto tw-bg-black/40 tw-p-4"
			onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
		>
			{/* No inner max-height/overflow: the overlay itself scrolls so a tall
			modal scrolls as one piece (header/footer included), not a scrollbar
			clipped inside the card. tw-mx-auto centers horizontally; tw-my-8
			centers short modals close enough while giving tall ones breathing
			room top and bottom. */}
			<div className={`tw-mx-auto tw-my-8 tw-flex tw-w-full ${MODAL_SIZES[size] || MODAL_SIZES.md} tw-flex-col tw-rounded-lg tw-bg-white tw-shadow-xl`}>
				<div className="tw-flex tw-shrink-0 tw-items-center tw-justify-between tw-border-0 tw-border-b tw-border-solid tw-border-zc-border tw-px-7 tw-py-5">
					<h2 className="tw-m-0 tw-text-base tw-font-semibold tw-text-zc-fg">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="tw-flex tw-cursor-pointer tw-items-center tw-border-0 tw-bg-transparent tw-p-0 tw-text-zc-muted hover:tw-text-zc-fg"
						aria-label={__('Close', 'zencommunity')}
					>
						<IoClose size={20} />
					</button>
				</div>
				<div className="tw-flex tw-flex-1 tw-flex-col tw-gap-5 tw-px-7 tw-py-6">{children}</div>
				{footer && (
					<div className="tw-flex tw-shrink-0 tw-justify-end tw-gap-2 tw-border-0 tw-border-t tw-border-solid tw-border-zc-border tw-px-7 tw-py-5">
						{footer}
					</div>
				)}
			</div>
		</div>
	);

	const portalTarget = document.getElementById('zc-admin-modal-root');
	return portalTarget ? createPortal(modalContent, portalTarget) : modalContent;
};

export default Modal;
