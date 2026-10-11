import React from 'react';
import Select from 'react-select';
import { NotchedFieldShell } from './NotchedField';

// Same control styling as ui/PrimarySelect — react-select renders its own
// DOM, so the border lives on its `control`, not on a class we can hand to
// NotchedField. NotchedFieldShell only needs to overlay the label on top of
// whatever's passed as children, so wrapping this is just as compatible as
// wrapping a plain <input>.
const notchedSelectStyles = {
	control: (base, state) => ({
		...base,
		minHeight: 42,
		borderRadius: 6,
		borderColor: state.isFocused ? 'var(--zencom-primary-color)' : 'var(--zencom-border-color)',
		backgroundColor: 'var(--zencom-background)',
		boxShadow: 'none',
		'&:hover': { borderColor: state.isFocused ? 'var(--zencom-primary-color)' : 'var(--zencom-border-color)' },
	}),
	valueContainer: (base) => ({ ...base, padding: '2px 12px' }),
	singleValue: (base) => ({ ...base, color: 'var(--zencom-font-color)', fontSize: 14 }),
	input: (base) => ({ ...base, color: 'var(--zencom-font-color)', fontSize: 14, margin: 0, padding: 0 }),
	placeholder: (base) => ({ ...base, color: 'var(--zencom-font-muted)', fontSize: 14 }),
	menu: (base) => ({
		...base,
		zIndex: 100000,
		backgroundColor: 'var(--zencom-background)',
		border: '1px solid var(--zencom-border-color)',
		boxShadow: 'var(--zencom-shadow)',
	}),
	option: (base, state) => ({
		...base,
		fontSize: 14,
		cursor: 'pointer',
		backgroundColor: state.isSelected ? 'var(--zencom-primary-color)' : state.isFocused ? 'var(--zencom-border-color)' : 'transparent',
		color: state.isSelected ? '#fff' : 'var(--zencom-font-color)',
	}),
	indicatorSeparator: () => ({ display: 'none' }),
	dropdownIndicator: (base) => ({ ...base, color: 'var(--zencom-font-muted)', padding: '0 8px' }),
};

/** Searchable/typeahead notched select. Drop-in replacement for ui/PrimarySelect. */
const NotchedSearchSelect = ({ label, value, onChange, options, placeholder, isClearable = false, required, className= 'tw-mt-[10px] tw-cursor-pointer' }) => {
	const selected = options.find((o) => String(o.value) === String(value)) ?? null;
	return (
		<NotchedFieldShell label={label} required={required} className={className}>
			<Select
				classNamePrefix="zc-select"
				value={selected}
				options={options}
				placeholder={placeholder}
				isClearable={isClearable}
				onChange={(opt) => onChange(opt ? opt.value : '')}
				styles={notchedSelectStyles}
			/>
		</NotchedFieldShell>
	);
};

export default NotchedSearchSelect;
