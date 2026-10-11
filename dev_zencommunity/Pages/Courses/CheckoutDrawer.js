import React, { useEffect } from 'react';
import { LuX } from 'react-icons/lu';
import { __ } from '@wordpress/i18n';

/**
 * Slide-over StoreEngine checkout. We embed the direct-checkout URL
 * (`checkout_page?product_id=&price_id=`) in an iframe so the student never
 * leaves the community shell. On close we re-check enrollment, since payment
 * completion enrolls + auto-joins the group server-side via StoreEngine hooks.
 */
const CheckoutDrawer = ({ isOpen, url, onClose }) => {
	useEffect(() => {
		const onKey = (e) => e.key === 'Escape' && onClose?.();
		if (isOpen) {
			document.addEventListener('keydown', onKey);
			document.body.style.overflow = 'hidden';
		}
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div className="tw-fixed tw-inset-0 tw-z-[2000] zencom-checkout-drawer">
			<div className="tw-absolute tw-inset-0 tw-bg-black/45" onClick={onClose} />

			<div className="zencom-animate-fade tw-absolute tw-right-0 tw-top-0 tw-flex tw-h-full tw-w-full tw-flex-col tw-bg-zc-bg tw-shadow-2xl md:tw-w-[480px]">
				<div className="tw-flex tw-items-center tw-justify-between tw-border-b tw-border-zc-border tw-px-5 tw-py-4">
					<span className="tw-text-base tw-font-semibold tw-text-zc-fg">
						{__('Complete your purchase', 'zencommunity')}
					</span>
					<button
						type="button"
						aria-label={__('Close', 'zencommunity')}
						onClick={onClose}
						className="tw-rounded-md tw-p-1.5 tw-text-zc-fg hover:tw-bg-zc-hover"
					>
						<LuX />
					</button>
				</div>

				<div className="tw-min-h-0 tw-flex-1">
					<iframe
						title={__('Checkout', 'zencommunity')}
						src={url}
						className="tw-h-full tw-w-full tw-border-0"
					/>
				</div>
			</div>
		</div>
	);
};

export default CheckoutDrawer;
