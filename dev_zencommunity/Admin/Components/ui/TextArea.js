import React from 'react';
import { NotchedField } from '../NotchedFields';

/** Multi-line text area; notched when it has a `label` (see TextField). */
const TextArea = ({ label, value, onChange, placeholder, rows = 3, required, className = '', ...rest }) => {
	const props = {
		rows,
		value: value || '',
		placeholder,
		onChange: (e) => onChange(e.target.value),
		...rest,
	};

	if (label) {
		return <NotchedField as="textarea" label={label} required={required} className={`tw-mt-[10px] ${className}`} {...props} />;
	}

	return (
		<textarea
			className={`tw-m-0 tw-block tw-w-full tw-rounded-[6px] tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-2 tw-text-sm tw-text-zc-fg tw-shadow-none focus:tw-border-zc-primary focus:tw-outline-none ${className}`}
			{...props}
		/>
	);
};

export default TextArea;
