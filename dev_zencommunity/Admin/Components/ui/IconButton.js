import React from 'react';

const IconButton = ({ children, className = '', 'aria-label': ariaLabel, ...props }) => (
	<button
		type="button"
		aria-label={ariaLabel}
		className={`tw-inline-flex tw-h-8 tw-w-8 tw-shrink-0 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded tw-border-0 tw-bg-transparent tw-text-zc-muted hover:tw-bg-zc-border/40 hover:tw-text-zc-fg disabled:tw-cursor-not-allowed disabled:tw-opacity-50 ${className}`}
		{...props}
	>
		{children}
	</button>
);

export default IconButton;
