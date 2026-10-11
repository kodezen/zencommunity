import React from 'react';

/**
 * Notched-legend field primitive: the label rests straddling the field's top
 * border (like a <fieldset><legend>) at rest, then animates up into a normal
 * floating label above the box once the field is focused — pure CSS via
 * `:focus-within` on the wrapper, no JS state needed.
 *
 * The label's white background is what visually "cuts" the gap in the border
 * line; it must match whatever sits directly behind the field. Every field in
 * this folder assumes a white panel (e.g. Modal.js's body) — reusing one of
 * these on a non-white surface needs that background swapped to match.
 *
 * The focused offset (-22px) is deliberately large enough that the label
 * fully clears the border with real breathing room — a smaller offset leaves
 * it still grazing the top edge, making the rest and focused positions look
 * almost identical at a glance.
 */
export const NOTCHED_LABEL_CLASS =
	'tw-pointer-events-none tw-absolute tw-whitespace-nowrap tw-left-2.5 tw-top-0 tw-z-10 -tw-translate-y-1/2 tw-bg-white tw-px-1.5 tw-text-sm tw-text-zc-muted tw-transition-all tw-duration-200 group-focus-within:-tw-top-[24px] group-focus-within:tw-left-[-5px] group-focus-within:tw-translate-y-0 group-focus-within:tw-text-[13px] group-focus-within:tw-font-semibold group-focus-within:tw-text-zc-primary';

export const NOTCHED_INPUT_CLASS =
	'tw-m-0 tw-block tw-w-full tw-rounded-[6px] tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-2.5 tw-text-sm tw-text-zc-fg tw-shadow-none tw-transition-colors focus:tw-border-zc-primary focus:tw-outline-none';

const NotchedLabel = ({ label, required }) =>
	label ? (
		<span className={NOTCHED_LABEL_CLASS}>
			{label} {required && <span className="tw-text-red-500">*</span>}
		</span>
	) : null;

/**
 * Generic wrapper: renders `children` (anything that draws its own bordered
 * box, e.g. a styled <Select>) inside the `tw-group tw-relative` container
 * the notch label needs, without assuming an <input>/<textarea> shape. Use
 * this directly when neither NotchedTextField nor NotchedTextArea fits.
 */
export const NotchedFieldShell = ({ label, required, className = 'tw-mt-[10px]', children }) => (
	<div className={`tw-group tw-relative ${className}`}>
		{children}
		<NotchedLabel label={label} required={required} />
	</div>
);

const TAGS = { input: 'input', textarea: 'textarea', select: 'select' };

/** `as="input" | "textarea" | "select"` convenience for a plain native field. */
const NotchedField = ({ as = 'input', label, required, className = 'tw-mt-[10px]', children, ...rest }) => {
	const Tag = TAGS[as] || 'input';
	return (
		<NotchedFieldShell label={label} required={required} className={className}>
			<Tag className={NOTCHED_INPUT_CLASS} {...rest}>{children}</Tag>
		</NotchedFieldShell>
	);
};

export default NotchedField;
