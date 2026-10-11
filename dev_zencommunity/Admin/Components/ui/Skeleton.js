import React from 'react';

const Skeleton = ({ className = '' }) => (
	<div className={`tw-animate-pulse tw-rounded tw-bg-zc-border ${className}`} />
);

export default Skeleton;
