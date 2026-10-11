import React from 'react';

/**
 * The one switch primitive for the whole admin panel — a plain controlled
 * component (checked/onChange). Formik-connected screens use
 * Components/SwitchControl.js instead, which adapts Formik's <Field
 * component={...}> field/form prop shape and renders this underneath, so
 * there's still a single real switch implementation either way. `value` is
 * accepted as an alias for `checked` so callers migrated from the old
 * Components/CustomSwitch don't need a prop rename.
 */
const Toggle = ({ label, checked, value, onChange, disabled, name, className = '' }) => {
	const isChecked = typeof checked === 'boolean' ? checked : !!value;

	const button = (
		<button
			type="button"
			role="switch"
			name={name}
			aria-checked={isChecked}
			disabled={disabled}
			onClick={() => onChange?.(!isChecked)}
			className={
				// The off-state fill (zc-border) reads fine on white but blends
				// into any similarly light-grey background (e.g. zc-bg cards) —
				// the inset ring keeps a crisp edge regardless of what's behind it.
				'tw-relative tw-inline-flex tw-h-5 tw-w-9 tw-shrink-0 tw-cursor-pointer tw-items-center tw-rounded-full tw-border-0 tw-ring-1 tw-ring-inset tw-ring-black/10 tw-transition-colors tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-zc-primary focus-visible:tw-ring-offset-1 disabled:tw-cursor-not-allowed disabled:tw-opacity-50 ' +
				(isChecked ? 'tw-bg-zc-primary' : 'tw-bg-zc-border') +
				(className ? ` ${className}` : '')
			}
		>
			<span
				className={
					'tw-inline-block tw-h-4 tw-w-4 tw-transform tw-rounded-full tw-bg-white tw-transition-transform ' +
					(isChecked ? 'tw-translate-x-[12px]' : 'tw-translate-x-[-4px]')
				}
			/>
		</button>
	);

	// Only wrap in a <label> when there's label text to associate — callers
	// that already own their own row/label markup (SwitchControl,
	// CheckBoxAndSwitch) pass no `label` and get the bare button back, so
	// they're never left nesting a <label> inside their own <label>.
	if (!label) return button;

	return (
		<label className="tw-flex tw-cursor-pointer tw-items-center tw-justify-between tw-gap-3">
			<span className="tw-text-[14px] tw-font-medium tw-text-zc-fg">{label}</span>
			{button}
		</label>
	);
};

export default Toggle;
