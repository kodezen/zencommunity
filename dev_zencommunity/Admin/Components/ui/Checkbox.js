import React from 'react';
import { LuCheck } from 'react-icons/lu';

/**
 * Brand-coloured checkbox. The native input stays in the DOM (keyboard,
 * screen readers, form semantics) but is visually hidden; the box drawn next
 * to it is styled from its :checked / :focus-visible state in settings-ui.scss
 * (wp-admin's own forms.css checkbox styling never applies to it).
 */
const Checkbox = ({ label, checked, onChange, disabled, className = '' }) => (
	<label className={`zc-checkbox tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-2 ${disabled ? 'tw-cursor-not-allowed tw-opacity-50' : ''} ${className}`}>
		<input
			type="checkbox"
			className="zc-checkbox__input"
			checked={!!checked}
			disabled={disabled}
			onChange={(e) => onChange?.(e.target.checked)}
		/>
		<span className="zc-checkbox__box" aria-hidden="true">
			<LuCheck className="zc-checkbox__tick" strokeWidth={3} />
		</span>
		{label && <span className="tw-text-[14px] tw-text-zc-fg">{label}</span>}
	</label>
);

export default Checkbox;
