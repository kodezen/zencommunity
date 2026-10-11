import React from 'react';

const RadioGroup = ({ value, onChange, options, name, direction = 'column', className = '' }) => (
	<div
		role="radiogroup"
		className={`tw-flex tw-gap-3 ${direction === 'row' ? 'tw-flex-row tw-items-center tw-flex-wrap' : 'tw-flex-col'} ${className}`}
	>
		{options.map((o) => (
			<label
				key={o.value}
				className={`tw-inline-flex tw-items-center tw-gap-2 ${o.disabled ? 'tw-cursor-not-allowed tw-opacity-50' : 'tw-cursor-pointer'}`}
			>
				<input
					type="radio"
					name={name}
					checked={value === o.value}
					disabled={o.disabled}
					onChange={() => !o.disabled && onChange?.(o.value)}
					className={`tw-m-0 tw-h-4 tw-w-4 tw-border tw-border-solid tw-border-zc-border tw-text-zc-primary focus:tw-outline-none ${o.disabled ? 'tw-cursor-not-allowed' : 'tw-cursor-pointer'}`}
				/>
				<span className="tw-text-[14px] tw-text-zc-fg">{o.label}</span>
			</label>
		))}
	</div>
);

export default RadioGroup;
