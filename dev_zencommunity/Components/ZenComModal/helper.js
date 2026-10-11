export function suffixClassNames(suffix, expandableSize) {
	let classes = 'zen-com-modal';
	if (suffix) classes += ` zen-com-modal--${suffix}`;
	if (expandableSize) classes += ` zen-com-modal--${expandableSize}`;
	return classes;
}

export function contentClassNames(expandableSize) {
	let classes = 'zen-com-modal__content';
	if (expandableSize) classes += ` zen-com-modal--content-${expandableSize}`;
	return classes;
}
