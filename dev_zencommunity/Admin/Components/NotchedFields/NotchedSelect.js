import React from 'react';
import NotchedField from './NotchedField';

/** Plain native notched <select>. Drop-in replacement for ui/SelectField. */
const NotchedSelect = ({ label, value, onChange, options, required, className }) => (
	<NotchedField
		as="select"
		label={label}
		required={required}
		className={className}
		value={value ?? ''}
		onChange={(e) => onChange(e.target.value)}
	>
		{options.map((o) => (
			<option key={o.value} value={o.value}>{o.label}</option>
		))}
	</NotchedField>
);

export default NotchedSelect;
