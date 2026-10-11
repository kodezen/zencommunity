import React from 'react';
import { NotchedField } from '../NotchedFields';

/** Native <select>; notched when it has a `label` (see TextField). */
const SelectField = ({ label, value, onChange, options, required, className = '' }) => {
	const optionNodes = options.map((o) => (
		<option key={o.value} value={o.value}>{o.label}</option>
	));
	const props = { value: value ?? '', onChange: (e) => onChange(e.target.value) };

	if (label) {
		return (
			<NotchedField as="select" label={label} required={required} className={`tw-mt-[10px] ${className}`} {...props}>
				{optionNodes}
			</NotchedField>
		);
	}

	return (
		<select
			className={`tw-m-0 tw-block tw-w-full tw-rounded-[6px] tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-2 tw-text-sm tw-text-zc-fg focus:tw-border-zc-primary focus:tw-outline-none ${className}`}
			{...props}
		>
			{optionNodes}
		</select>
	);
};

export default SelectField;
