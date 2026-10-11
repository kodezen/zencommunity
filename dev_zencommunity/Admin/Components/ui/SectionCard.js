import React from 'react';

/**
 * Shared card chrome for an admin section: rounded-xl + border + an
 * optional icon-chip header (icon, title, subtitle, right-aligned action
 * slot) instead of each screen hand-rolling its own box.
 */
const SectionCard = ({ title, subtitle, icon: Icon, action, className = '', children }) => (
	<div className={`tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-white tw-p-5 ${className}`}>
		{(title || action) && (
			<div className="tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
				<div className="tw-flex tw-items-center tw-gap-2.5">
					{Icon && (
						<span className="tw-flex tw-h-8 tw-w-8 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-zc-primary-soft tw-text-zc-primary">
							<Icon size={16} />
						</span>
					)}
					{title && (
						<div>
							<h3 className="tw-m-0 tw-text-sm tw-font-semibold tw-text-zc-fg">{title}</h3>
							{subtitle && <p className="tw-m-0 tw-text-xs tw-text-zc-muted">{subtitle}</p>}
						</div>
					)}
				</div>
				{action}
			</div>
		)}
		{children}
	</div>
);

export default SectionCard;
