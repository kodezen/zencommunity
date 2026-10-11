import React from 'react';
import { NotchedField } from '../NotchedFields';

const PLAIN_INPUT_CLASS = 'tw-m-0 tw-block tw-w-full tw-rounded-[6px] tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-2 tw-text-sm tw-text-zc-fg tw-shadow-none focus:tw-border-zc-primary focus:tw-outline-none';

/**
 * Text input. With a `label` it renders as a notched field (label resting on
 * the top border, floating above on focus — see NotchedFields); without one
 * it's a plain bordered input.
 */
const TextField = ({ label, value, onChange, placeholder, autoFocus, type = 'text', className = '', inputClassName = '', required, ...rest }) => {
	const inputProps = {
		type,
		value: value ?? '',
		autoFocus,
		placeholder,
		onChange: (e) => onChange(e.target.value),
		...rest,
	};

	if (label) {
		return (
			<NotchedField label={label} required={required} className={`tw-mt-[10px] ${className}`} {...inputProps} />
		);
	}

	return (
		<div className={`tw-block ${className}`}>
			<input className={`${PLAIN_INPUT_CLASS} ${inputClassName}`} {...inputProps} />
		</div>
	);
};

export default TextField;
