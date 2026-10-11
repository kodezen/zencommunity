import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IoChevronDown } from 'react-icons/io5';

/**
 * Menu.Root/Trigger/Content/Item — inline dropdown (no portal, per the
 * scoping constraint documented on Modal). Trigger toggles Content; outside
 * clicks and Escape close it. Content is `tw-fixed` and positioned in JS from
 * the trigger's viewport rect (not `tw-absolute` relative to Root) so it
 * isn't clipped by scrollable ancestors — e.g. Table.Root's
 * `tw-overflow-x-auto` wrapper — the same way Root's own overflow would
 * otherwise cut it off.
 */
const MenuContext = React.createContext(null);
const MenuRoot = ({ children, className = '' }) => {
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

	return (
		<MenuContext.Provider value={{ open, setOpen, triggerRef: ref }}>
			<div ref={ref} className={`tw-relative tw-inline-block ${className}`}>{children}</div>
		</MenuContext.Provider>
	);
};
const MenuTrigger = ({ children, asChild, className = '', ...rest }) => {
	const { open, setOpen } = React.useContext(MenuContext);
	const onClick = (e) => { e.stopPropagation(); setOpen(!open); };
	if (asChild && React.isValidElement(children)) {
		return React.cloneElement(children, { onClick, ...rest });
	}
	// Pass the rest through: an icon-only trigger needs an aria-label, and it
	// was being dropped here, leaving the button unnamed to a screen reader.
	return (
		<button type="button" onClick={onClick} className={className} aria-expanded={open} aria-haspopup="menu" {...rest}>
			{children}
		</button>
	);
};
const MenuContent = ({ children, align = 'end', className = '' }) => {
	const { open, triggerRef } = React.useContext(MenuContext);
	const contentRef = useRef(null);
	const [coords, setCoords] = useState(null);

	useLayoutEffect(() => {
		if (!open || !triggerRef.current) {
			setCoords(null);
			return;
		}
		const updatePosition = () => {
			const triggerRect = triggerRef.current.getBoundingClientRect();
			const menuEl = contentRef.current;
			const menuHeight = menuEl ? menuEl.offsetHeight : 0;
			const menuWidth = menuEl ? menuEl.offsetWidth : 160;
			const spaceBelow = window.innerHeight - triggerRect.bottom;
			const flipUp = menuHeight > 0 && spaceBelow < menuHeight + 8 && triggerRect.top > menuHeight + 8;
			setCoords({
				top: flipUp ? triggerRect.top - menuHeight - 4 : triggerRect.bottom + 4,
				left: align === 'end' ? triggerRect.right - menuWidth : triggerRect.left,
			});
		};
		updatePosition();
		window.addEventListener('scroll', updatePosition, true);
		window.addEventListener('resize', updatePosition);
		return () => {
			window.removeEventListener('scroll', updatePosition, true);
			window.removeEventListener('resize', updatePosition);
		};
	}, [open, align, triggerRef]);

	if (!open) return null;
	return (
		<div
			ref={contentRef}
			style={coords ? { top: coords.top, left: coords.left } : { top: 0, left: 0, visibility: 'hidden' }}
			className={`tw-fixed tw-z-[100000] tw-min-w-[160px] tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-white tw-py-1 tw-shadow-lg ${className}`}
		>
			{children}
		</div>
	);
};
const MenuItem = ({ children, onClick, className = '', disabled }) => {
	const { setOpen } = React.useContext(MenuContext);
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={(e) => { onClick?.(e); setOpen(false); }}
			className={`tw-flex tw-w-full tw-cursor-pointer tw-items-center tw-gap-2 tw-border-0 tw-bg-transparent tw-px-3 tw-py-2 tw-text-left tw-text-sm tw-text-zc-fg hover:tw-bg-zc-secondary disabled:tw-cursor-not-allowed disabled:tw-opacity-50 ${className}`}
		>
			{children}
		</button>
	);
};

const Menu = { Root: MenuRoot, Trigger: MenuTrigger, Content: MenuContent, Item: MenuItem };

export const MenuChevron = ({ size = 14, className = '' }) => <IoChevronDown size={size} className={className} />;

export default Menu;
