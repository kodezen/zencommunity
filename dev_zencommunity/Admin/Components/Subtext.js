import React from 'react';

/**
 * Admin-local Tailwind port of the shared Components/Labels/Subtext (Chakra).
 * Secondary/muted text, used broadly across the settings screens.
 */
const Subtext = ({ children, className = '', style, fontSize, fontWeight, color, ...rest }) => (
	<span
		className={`tw-text-xs tw-leading-[18px] tw-text-zc-muted ${className}`}
		style={{ fontSize, fontWeight, color, ...style }}
		{...rest}
	>
		{children}
	</span>
);

export default Subtext;
