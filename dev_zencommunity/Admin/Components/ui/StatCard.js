import React from 'react';
import Skeleton from './Skeleton';

// Literal, fully-spelled class names (not interpolated) so Tailwind's
// content scanner can pick them up — see tailwind.admin.config.js.
const TONES = {
	primary: 'tw-bg-zc-primary-soft tw-text-zc-primary',
	emerald: 'tw-bg-emerald-50 tw-text-emerald-600',
	amber: 'tw-bg-amber-50 tw-text-amber-600',
	rose: 'tw-bg-rose-50 tw-text-rose-600',
};

/**
 * Small summary counter — a lighter-weight sibling of Reports' KpiCard (no
 * trend/% change, just a total) for admin list screens that want a quick
 * at-a-glance breakdown (e.g. Users: Total/Active/Pending/Inactive) above
 * their filterable table.
 */
const StatCard = ({ icon: Icon, tone = 'primary', label, value, loading = false }) => (
	<div className="tw-flex tw-items-center tw-gap-3 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-white tw-p-4">
		{Icon && (
			<span className={`tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg ${TONES[tone] || TONES.primary}`}>
				<Icon size={18} />
			</span>
		)}
		<div className="tw-flex tw-min-w-0 tw-flex-col tw-gap-0.5">
			<span className="tw-truncate tw-text-xs tw-font-medium tw-text-zc-muted">{label}</span>
			{loading ? (
				<Skeleton className="tw-h-[22px] tw-w-10" />
			) : (
				<span className="tw-text-xl tw-font-semibold tw-leading-tight tw-text-zc-fg">{Number(value ?? 0).toLocaleString()}</span>
			)}
		</div>
	</div>
);

export default StatCard;
