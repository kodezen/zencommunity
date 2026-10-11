import React, { useEffect, useRef, useState } from 'react';

/**
 * Admin-local Tailwind port of the shared Components/ZenComPopHover
 * (Chakra). Inline (no portal) — click-outside/Escape closes it.
 */
const PopoverPanel = ({ trigger, children, placement = 'bottom-end' }) => {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		if (!open) return;
		const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
		const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
		document.addEventListener('mousedown', onDocClick);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDocClick);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	const align = placement.includes('start') ? 'tw-left-0' : placement.includes('end') ? 'tw-right-0' : 'tw-left-1/2 tw--translate-x-1/2';
	const side = placement.startsWith('top') ? 'tw-bottom-full tw-mb-1' : 'tw-top-full tw-mt-1';

	return (
		<div ref={ref} className="tw-relative tw-inline-block">
			<span onClick={() => setOpen((o) => !o)}>{trigger}</span>
			{open && (
				<div className={`tw-absolute tw-z-[100000] tw-min-w-[228px] tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-shadow-lg ${align} ${side}`}>
					{children}
				</div>
			)}
		</div>
	);
};

export default PopoverPanel;
