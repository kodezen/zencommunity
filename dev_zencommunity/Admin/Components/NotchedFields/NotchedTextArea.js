import React from 'react';
import NotchedField from './NotchedField';

/** Multi-line notched text area. Drop-in replacement for ui/TextArea. */
const NotchedTextArea = ({ label, value, onChange, placeholder, rows = 3, required, className, ...rest }) => (
	<NotchedField
		as="textarea"
		label={label}
		required={required}
		className={className}
		rows={rows}
		value={value || ''}
		placeholder={placeholder}
		onChange={(e) => onChange(e.target.value)}
		{...rest}
	/>
);

export default NotchedTextArea;
