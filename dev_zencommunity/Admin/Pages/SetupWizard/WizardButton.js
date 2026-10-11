import React from 'react';

/**
 * The wizard's one shared button pair. Back and Next/Launch must read as the
 * same scale of control — same height, font-size, font-weight — differing
 * only by fill (solid vs outline) to signal which one advances. Before this,
 * Back reused the app-wide GhostButton (tw-text-sm, sized for compact
 * secondary actions like a "Remove logo" link) paired against a bespoke,
 * bigger/bolder Next button, and each step had written its own version of
 * that Next button with slightly different padding/weight — which is exactly
 * why Back and Next (and the buttons on different steps) looked like they
 * belonged to different design systems. Every step composes from these two
 * instead.
 */
const BASE =
	'tw-inline-flex tw-cursor-pointer tw-items-center tw-rounded-md tw-transition-opacity disabled:tw-cursor-not-allowed disabled:tw-opacity-50';

// `md` is the welcome hero's size; `sm` is the compact footer bar's.
const SIZES = {
	md: 'tw-gap-2 tw-px-4 tw-py-3 tw-text-base tw-font-bold',
	sm: 'tw-gap-1.5 tw-px-4 tw-py-2 tw-text-[14px] tw-font-semibold',
};

export const WizardPrimaryButton = ( { className = '', size = 'md', ...props } ) => (
	<button
		type="button"
		className={`${BASE} ${SIZES[ size ]} tw-border tw-border-solid tw-border-transparent tw-bg-zc-primary tw-text-white tw-shadow-zc hover:tw-opacity-90 ${className}`}
		{...props}
	/>
);

export const WizardSecondaryButton = ( { className = '', size = 'md', ...props } ) => (
	<button
		type="button"
		className={`${BASE} ${SIZES[ size ]} tw-border tw-border-solid tw-border-zc-border tw-bg-white tw-text-zc-fg hover:tw-bg-zc-hover ${className}`}
		{...props}
	/>
);
