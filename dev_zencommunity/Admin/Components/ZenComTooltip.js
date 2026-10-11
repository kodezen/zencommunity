import React, { useState, useRef, useEffect } from 'react';

const POSITION_CLASS = {
	top: 'tw-bottom-full tw-left-1/2 tw--translate-x-1/2 tw-mb-1.5',
	bottom: 'tw-top-full tw-left-1/2 tw--translate-x-1/2 tw-mt-1.5',
	left: 'tw-right-full tw-top-1/2 tw--translate-y-1/2 tw-mr-1.5',
	right: 'tw-left-full tw-top-1/2 tw--translate-y-1/2 tw-ml-1.5',
};

/**
 * Admin-local Tailwind port of the shared Components/ZenComTooltip. Inline
 * (no portal) — positioned absolutely within a relative wrapper.
 */
const ZenComTooltip = ({ children, content, position = 'top', disabled = false, delay = 150 }) => {
	const [visible, setVisible] = useState(false);
	const timeoutRef = useRef(null);
	const shouldShow = !disabled && content;

	const showTooltip = () => {
		if (!shouldShow) return;
		if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
		setVisible(true);
	};

	const hideTooltip = () => {
		if (!shouldShow) return;
		timeoutRef.current = setTimeout(() => { setVisible(false); timeoutRef.current = null; }, delay);
	};

	useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

	return (
		<div className="tw-relative tw-inline-block" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
			{children}
			{shouldShow && visible && (
				<div
					className={`tw-absolute tw-z-[100000] tw-whitespace-nowrap tw-rounded tw-bg-zc-fg tw-px-2 tw-py-1 tw-text-sm tw-text-zc-bg tw-shadow-lg ${POSITION_CLASS[position] || POSITION_CLASS.top}`}
				>
					{content}
				</div>
			)}
		</div>
	);
};

export default ZenComTooltip;
