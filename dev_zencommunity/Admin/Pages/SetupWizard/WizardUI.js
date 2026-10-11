import React from 'react';
import { BADGE_COLORS } from './constants';

/**
 * Shared building blocks for the wizard's Steps 2-6, styled in
 * setup-wizard.scss (`.zc-wz-*`) after the admin panel's own card and
 * section-head language, so the wizard reads as part of the same product.
 */

/** Step title + one-line description, left-aligned above the step's content. */
export const StepHeader = ( { title, description, children } ) => (
	<header className="zc-wz-head">
		<h2 className="zc-wz-head__title">{title}</h2>
		{description && <p className="zc-wz-head__desc">{description}</p>}
		{children}
	</header>
);

/**
 * A selectable option card with a radio indicator — the wizard's single
 * "pick one" control (Space type, community access). `layout="row"` puts the
 * icon beside the text for compact lists; the default stacks it on top.
 */
export const ChoiceCard = ( { active, onClick, icon: Icon, color = 'blue', title, description, layout = 'stack', disabled } ) => {
	const c = BADGE_COLORS[ color ] || BADGE_COLORS.blue;
	return (
		<button
			type="button"
			role="radio"
			aria-checked={!! active}
			onClick={onClick}
			disabled={disabled}
			className={`zc-wz-choice is-${layout}${active ? ' is-active' : ''}`}
		>
			<span className="zc-wz-choice__radio" aria-hidden="true" />
			{Icon && (
				<span className={`zc-wz-choice__icon ${c.bg} ${c.fg}`}>
					<Icon className="tw-h-5 tw-w-5" />
				</span>
			)}
			<span className="zc-wz-choice__text">
				<span className="zc-wz-choice__title">{title}</span>
				{description && <span className="zc-wz-choice__desc">{description}</span>}
			</span>
		</button>
	);
};

/** Admin-style segmented control for switching panes inside a step. */
export const Segmented = ( { items, value, onChange } ) => (
	<div className="zc-wz-segmented" role="tablist">
		{items.map( ( item ) => (
			<button
				key={item.key}
				type="button"
				role="tab"
				aria-selected={value === item.key}
				className={`zc-wz-segmented__item${value === item.key ? ' is-active' : ''}`}
				onClick={() => onChange( item.key )}
			>
				{item.icon && <item.icon className="tw-h-4 tw-w-4" />}
				{item.label}
			</button>
		) )}
	</div>
);

/** Label + hint on the left, control on the right, separated by hairlines. */
export const SettingRow = ( { label, hint, children } ) => (
	<div className="zc-wz-row">
		<div className="zc-wz-row__text">
			<span className="zc-wz-row__label">{label}</span>
			{hint && <span className="zc-wz-row__hint">{hint}</span>}
		</div>
		<div className="zc-wz-row__control">{children}</div>
	</div>
);
