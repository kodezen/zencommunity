import React from 'react';

const EmptyState = ({ children, icon: Icon, className = "" }) => (
	<div className={`tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-3 tw-rounded tw-bg-white tw-px-6 tw-py-14 tw-text-sm tw-text-zc-muted tw-border tw-border-solid tw-border-zc-border ${className}`}>
		{Icon && <Icon className="tw-text-[40px] tw-text-zc-muted" />}
		{children}
	</div>
);

export default EmptyState;
