import React from 'react';

const RowCard = ({ children }) => (
	<div className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-white tw-px-4 tw-py-3">
		{children}
	</div>
);

export default RowCard;
