import React from 'react';

const GhostButton = ({ children, className = '', ...props }) => (
	<button
		type="button"
		className={`tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-1.5 tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-transparent tw-px-3 tw-py-1.5 tw-text-sm tw-font-medium tw-text-zc-fg hover:tw-bg-zc-hover disabled:tw-cursor-not-allowed disabled:tw-opacity-50 ${className}`}
		{...props}
	>
		{children}
	</button>
);

export default GhostButton;
