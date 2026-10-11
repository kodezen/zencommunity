import React, { useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Drawer, PrimaryButton, GhostButton } from './ui';

/**
 * Admin-local Tailwind port of the shared Components/ZenComDrawer (Chakra).
 * Bundles its own trigger button + open state (unlike ui.js's bare Drawer).
 */
const DrawerPanel = ({
	children,
	title,
	triggerContent = __('Open', 'zencommunity'),
	triggerClassname,
	clearBtnTitle = 'Clear',
	saveBtnTitle = 'Save changes',
	onSave,
	isFooter = false,
	bodyPadding,
	side = 'end',
}) => {
	const [open, setOpen] = useState(false);
	const triggerClass = triggerClassname?.className || '';

	return (
		<>
			<button type="button" onClick={() => setOpen(true)} className={triggerClass}>
				{triggerContent}
			</button>

			<Drawer open={open} onClose={() => setOpen(false)} title={title} side={side}>
				<div style={bodyPadding !== undefined ? { padding: bodyPadding } : undefined}>
					{children}
				</div>

				{isFooter && (
					<div className="tw-flex tw-justify-end tw-gap-2 tw-border-0 tw-border-t tw-border-solid tw-border-zc-border tw-pt-4">
						<GhostButton onClick={() => setOpen(false)}>{__(clearBtnTitle, 'zencommunity')}</GhostButton>
						<PrimaryButton onClick={() => { onSave?.(); setOpen(false); }}>{__(saveBtnTitle, 'zencommunity')}</PrimaryButton>
					</div>
				)}
			</Drawer>
		</>
	);
};

export default DrawerPanel;
