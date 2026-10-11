import React from 'react';
import Select from 'react-select';
import { NotchedFieldShell } from '../NotchedFields';

// react-select styled to match the zc-* design tokens (SelectField's native
// look), for cases that need search/typeahead over a plain <select>.
const primarySelectStyles = {
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
	// One line, truncated — a long placeholder wrapping made the control taller
	// than the fields beside it.
	// Note: this only styles the wrapper div react-select renders around the
	// real <input> — it can't reach the input element itself. wp-admin's
	// forms.css focus ring on that raw <input> is neutralized separately in
	// settings.scss (`.zc-select__input`).
	input: (base) => ({ ...base, color: 'var(--zencom-font-color)', fontSize: 14, margin: 0, padding: 0 }),
	placeholder: (base) => ({ ...base, color: 'var(--zencom-font-muted)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }),
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

/**
 * Searchable react-select. With a `label` it renders as a notched field (label
 * on the top border, floating above on focus — see NotchedFields).
 */
const PrimarySelect = ({ label, value, onChange, options, placeholder, isClearable = false, isSearchable = true, isRequired = false, required, menuPlacement = 'top', className = '' }) => {
	const selected = options.find((o) => String(o.value) === String(value)) ?? null;
	const select = (
		<Select
			classNamePrefix="zc-select"
			value={selected}
			options={options}
			placeholder={placeholder}
			isClearable={isClearable}
			isSearchable={isSearchable}
			menuPlacement={menuPlacement}
			onChange={(opt) => onChange(opt ? opt.value : '')}
			styles={primarySelectStyles}
		/>
	);

	if (!label) return <div className={className}>{select}</div>;

	return (
		<NotchedFieldShell label={label} required={isRequired || required} className={`tw-mt-[10px] ${className}`}>
			{select}
		</NotchedFieldShell>
	);
};

export default PrimarySelect;
