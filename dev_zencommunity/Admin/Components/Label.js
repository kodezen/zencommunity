import React from 'react';

/**
 * Admin-local Tailwind port of the shared Components/Chakra/Labels/ZCLabel
 * (Chakra). Only the subset of the original's API actually used inside the
 * admin settings screens is implemented: variant text styles via `type`,
 * plus fontSize/fontWeight/lineHeight/margin/color overrides.
 */
const VARIANTS = {
	heading: 'tw-text-2xl tw-font-semibold tw-text-zc-fg',
	title: 'tw-text-sm tw-font-medium tw-text-zc-fg',
	subtitle: 'tw-text-sm tw-font-normal tw-text-zc-muted',
	miniTitle: 'tw-text-sm tw-font-normal tw-text-zc-muted',
	basic: 'tw-text-sm tw-font-medium tw-text-zc-fg',
	simple: 'tw-text-sm tw-font-normal tw-text-zc-muted',
	simpleLight: 'tw-text-sm tw-font-normal tw-text-zc-muted',
	bold: 'tw-text-base tw-font-medium tw-text-zc-fg',
	boldLight: 'tw-text-base tw-font-medium tw-text-zc-fg',
};

const Label = ({
	type = 'title',
	label = '',
	fontSize,
	fontWeight,
	lineHeight,
	margin,
	color,
	className = '',
	...rest
}) => {
	const variantClass = VARIANTS[type] || VARIANTS.title;
	const isString = typeof label === 'string';

	return (
		<span
			className={`${variantClass} ${className}`}
			style={{ fontSize, fontWeight, lineHeight, margin, color }}
			{...rest}
			{...(isString ? { dangerouslySetInnerHTML: { __html: label } } : {})}
		>
			{isString ? null : label}
		</span>
	);
};

export default Label;
