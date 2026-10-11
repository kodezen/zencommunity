import React from 'react';

const PrimaryButton = ({ children, className = '', ...props }) => (
	<button
		type="button"
		className={`tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-1.5 tw-rounded tw-border-0 tw-bg-zc-primary tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white hover:tw-opacity-90 disabled:tw-cursor-not-allowed disabled:tw-opacity-50 ${className}`}
		{...props}
	>
		{children}
	</button>
);

export default PrimaryButton;
