import React, { useEffect } from 'react';
import { useFormikContext } from 'formik';
import { SelectField } from './ui';

/**
 * Admin-local Tailwind port of the shared Components/Select (Chakra,
 * "ZCSelect"). Formik-bound: reads/writes `name` on the surrounding Formik
 * context. Only the subset of the original API used in the admin panel
 * (single-select) is implemented.
 */
const FormikSelect = ({
	label = '',
	name = '',
	options = [],
	disabled = false,
	_defaultValue,
	onChange = () => {},
}) => {
	const { setFieldValue, values } = useFormikContext();

	useEffect(() => {
		if (_defaultValue !== undefined && name && values?.[name] === undefined) {
			setFieldValue(name, _defaultValue);
		}
	}, [_defaultValue]);

	const value = values?.[name] ?? _defaultValue ?? '';

	return (
		<SelectField
			label={label}
			value={value}
			disabled={disabled}
			options={options}
			onChange={(next) => {
				setFieldValue(name, next);
				onChange(next);
			}}
		/>
	);
};

export default FormikSelect;
