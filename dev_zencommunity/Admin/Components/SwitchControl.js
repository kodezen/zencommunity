import React from 'react';
import Toggle from './ui/Toggle';

/**
 * Adapts Formik's <Field component={SwitchControl}> field/form prop shape
 * onto the shared switch primitive (ui/Toggle.js) — the actual switch markup
 * lives in exactly one place; this just wires it up to Formik.
 */
const SwitchControl = ({ field, disabled, form: { touched, errors, setFieldValue }, onChange }) => {
	const isChecked = typeof field.value === 'boolean' ? field.value : false;

	return (
		<div>
			<Toggle
				checked={isChecked}
				disabled={disabled}
				name={field.name}
				onChange={(checked) => {
					if (onChange) {
						onChange({ target: { name: field.name, checked } });
					} else {
						setFieldValue(field.name, checked);
					}
				}}
			/>
			{errors[field.name] && touched[field.name] ? (
				<span className="tw-mt-1 tw-block tw-text-sm tw-text-red-500">{errors[field.name]}</span>
			) : null}
		</div>
	);
};

export default SwitchControl;
