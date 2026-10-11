import React, { Children, isValidElement } from 'react';
import { NotchedFieldShell } from '../NotchedFields';
import TextField from './TextField';
import TextArea from './TextArea';
import SelectField from './SelectField';
import PrimarySelect from './PrimarySelect';

const BOXED_COMPONENTS = [TextField, TextArea, SelectField, PrimarySelect];
const UNBOXED_INPUT_TYPES = ['checkbox', 'radio', 'color', 'file', 'hidden', 'range'];

/**
 * True when `node` is a bordered control the notched label can sit on: one of
 * the ui text/select fields (used without their own label) or a native
 * text-like <input>, <textarea> or <select>.
 */
const isNotchable = (node) => {
	if (!isValidElement(node)) return false;
	const { type, props } = node;
	if (BOXED_COMPONENTS.includes(type)) return !props.label;
	if (type === 'textarea' || type === 'select') return true;
	return type === 'input' && !UNBOXED_INPUT_TYPES.includes(props.type);
};

const Messages = ({ hint, error }) => (
	<>
		{hint && !error && <span className="tw-mt-1 tw-block tw-text-sm tw-text-zc-muted">{hint}</span>}
		{error && <span className="tw-mt-1 tw-block tw-text-sm tw-text-red-500">{error}</span>}
	</>
);

/**
 * Labelled form row. When the first child is a boxed control it gets the
 * notched label (resting on its top border, floating above on focus — see
 * NotchedFields), and any further children (helper text, inline errors)
 * render below it. Anything else (pickers, toggle lists, custom widgets)
 * keeps the label stacked above.
 */
const Field = ({ label, hint, error, required, children, className = '' }) => {
	const [first, ...rest] = Children.toArray(children);
	if (label && isNotchable(first)) {
		return (
			<div className={`tw-block tw-w-full ${className}`}>
				<NotchedFieldShell label={label} required={required}>
					{first}
				</NotchedFieldShell>
				{rest}
				<Messages hint={hint} error={error} />
			</div>
		);
	}

	return (
		<label className={`tw-block tw-w-full ${className}`}>
			{label && (
				<span className="tw-mb-1.5 tw-block tw-text-[14px] tw-font-medium tw-text-zc-fg">
					{label} {required && <span className="tw-text-red-500">*</span>}
				</span>
			)}
			{children}
			<Messages hint={hint} error={error} />
		</label>
	);
};

export default Field;
