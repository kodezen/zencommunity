import React from 'react';
import NotchedField from './NotchedField';

/** Single-line notched text field. Drop-in replacement for ui/TextField. */
const NotchedTextField = ({ label, value, onChange, placeholder, type = 'text', required, autoFocus, className, ...rest }) => (
	<NotchedField
		label={label}
		required={required}
		className={className}
		type={type}
		value={value || ''}
		autoFocus={autoFocus}
		placeholder={placeholder}
		onChange={(e) => onChange(e.target.value)}
		{...rest}
	/>
);

export default NotchedTextField;
