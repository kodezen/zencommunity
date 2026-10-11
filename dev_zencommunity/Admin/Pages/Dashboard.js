import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { LuArrowRight, LuChartBar, LuExternalLink, LuFileText, LuFolders, LuHeart, LuLayoutDashboard, LuLayoutGrid, LuMessageCircle, LuPlus, LuRefreshCw, LuSettings, LuUsers } from 'react-icons/lu';
import { applyFilters } from '@wordpress/hooks';
import { site_url, community_path } from '@Utils/helper';
import { fetchAllGroups } from '@Redux/slices/groupSlice/groupSlice';
import { fetchAllCollection } from '@Redux/slices/collectionSlice/collectionSlice';
import { fetchAllMembers } from '@Redux/slices/membersSlice/membersSlice';
import { upgradeProModal } from '@Redux/slices/upgradeToProSlice/upgradeToProSlice';
import { PageHeader, Skeleton } from '../Components/ui';
import { AdminLink, useAdminRouter } from '../Components/AdminRouter';
import ExtendCommunity from '../Components/ExtendCommunity';
import UpgradeMessage from '../Components/UpgradeMessage';
import ProTag from '../Components/ProTag';

const communityUrl = () => `${site_url || ''}/${String(community_path || 'community').replace(/^\/+/, '')}`;
const CARD_CLASS =
	'tw-group tw-flex tw-items-start tw-gap-3.5 tw-rounded-xl tw-bg-zc-bg tw-p-5 tw-border tw-border-solid tw-border-zc-border tw-no-underline tw-transition-colors tw-duration-150 hover:tw-border-zc-primary/40 hover:tw-bg-zc-primary/[0.03]';

// Literal, pre-spelled tone classes — Tailwind's JIT scanner can't resolve
// `bg-${tone}-50`-style interpolation, so each tone is a fully-written class
// string rather than a built one.
const TONES = {
	primary: { chip: 'tw-bg-zc-primary-soft tw-text-zc-primary' },
	indigo: { chip: 'tw-bg-indigo-50 tw-text-indigo-600' },
	emerald: { chip: 'tw-bg-emerald-50 tw-text-emerald-600' },
};

const StatCard = ({ icon, label, value, loading, tone = 'primary' }) => (
	<div className="tw-flex tw-items-center tw-gap-4 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-5">
		<div className={`tw-flex tw-h-11 tw-w-11 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg ${TONES[tone].chip}`}>
			{icon}
		</div>
		<div className="tw-min-w-0">
			{loading ? (
				<Skeleton className="tw-mb-1.5 tw-h-[26px] tw-w-12" />
			) : (
				<p className="tw-m-0 tw-text-[24px] tw-font-semibold tw-leading-tight tw-tracking-tight tw-text-zc-fg">{value}</p>
			)}
			<p className="tw-m-0 tw-mt-0.5 tw-text-sm tw-text-zc-muted">{label}</p>
		</div>
	</div>
);

/**
 * "Last 7 days" engagement slot. ZenCommunity Pro renders live KPIs here via
 * the `zencommunity.admin.dashboardReportsWidget` filter; without it this
 * shows what the Reports add-on offers.
 */
const ReportsWidget = () => {
	const dispatch = useDispatch();
	const ProWidget = applyFilters('zencommunity.admin.dashboardReportsWidget', null);

	return (
		<div className="tw-mb-9">
			{ProWidget ? (
				<ProWidget />
			) : (
				<>
				<p className="!tw-mb-3 tw-text-[12px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-zc-muted/80">
					{__('Last 7 days', 'zencommunity')}
				</p>
				<div className="zc-pro-banner">
					<svg className="zc-pro-banner__chart" viewBox="0 0 240 90" preserveAspectRatio="none" aria-hidden="true">
						<defs>
							<linearGradient id="zcProBannerFill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="#7c3aed" stopOpacity="0.22" />
								<stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
							</linearGradient>
						</defs>
						<path d="M0 78 L30 66 L60 70 L90 50 L120 56 L150 34 L180 40 L210 18 L240 10 L240 90 L0 90 Z" fill="url(#zcProBannerFill)" />
						<path d="M0 78 L30 66 L60 70 L90 50 L120 56 L150 34 L180 40 L210 18 L240 10" fill="none" stroke="#7c3aed" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
					<div className="zc-pro-banner__body">
						<span className="zc-pro-banner__icon" aria-hidden="true">
							<LuChartBar size={22} />
						</span>
						<div className="zc-pro-banner__text">
							<div className="zc-pro-banner__title">
								{__('Unlock community reports', 'zencommunity')}
								<ProTag />
							</div>
							<p className="zc-pro-banner__desc">
								{__('See member growth, posts, comments and reactions trends at a glance.', 'zencommunity')}
							</p>
						</div>
					</div>
					<button type="button" className="zc-upgrade__cta zc-pro-banner__cta" onClick={() => dispatch(upgradeProModal(true))}>
						{__('Upgrade to Pro', 'zencommunity')} <LuArrowRight size={16} />
					</button>
				</div>
				</>
			)}
			<UpgradeMessage />
		</div>
	);
};

const ActionBody = ({ icon, title, desc, external }) => (
	<>
		<div className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-zc-primary-soft tw-text-zc-primary">
			{icon}
		</div>
		<div className="tw-min-w-0 tw-flex-1">
			<p className="tw-m-0 !tw-mb-1 tw-flex tw-items-center tw-gap-1.5 tw-text-[14.5px] tw-font-semibold tw-text-zc-fg">
				{title}
				{external ? (
					<LuExternalLink size={14} className="tw-text-zc-muted" />
				) : (
					<LuArrowRight size={15} className="tw--translate-x-1 tw-text-zc-primary tw-opacity-0 tw-transition-all tw-duration-150 group-hover:tw-translate-x-0 group-hover:tw-opacity-100" />
				)}
			</p>
			<p className="tw-m-0 tw-mt-1 tw-text-sm tw-leading-relaxed tw-text-zc-muted">{desc}</p>
		</div>
	</>
);

// Internal cards navigate client-side via AdminLink (same Settings.js SPA);
// external ones (the live community) are plain anchors that open in a new
// tab. `hardNav` is a third case: an internal wp-admin page that is NOT part
// of this SPA — the Setup Wizard is its own standalone document/bundle (see
// includes/setup.php), so it needs a real full-page navigation rather than
// client-side routing into a tree that doesn't contain it.
const ActionCard = ({ page, href, external, hardNav, ...body }) =>
	external ? (
		<a href={href} target="_blank" rel="noreferrer" className={CARD_CLASS}>
			<ActionBody external {...body} />
		</a>
	) : hardNav ? (
		<a href={`admin.php?page=${page}`} className={CARD_CLASS}>
			<ActionBody {...body} />
		</a>
	) : (
		<AdminLink page={page} className={CARD_CLASS}>
			<ActionBody {...body} />
		</AdminLink>
	);

/**
 * wp-admin landing screen (StoreEngine-style Dashboard). Lifetime totals,
 * a last-7-days engagement widget, and quick actions into the Spaces /
 * Collections / Settings screens and the live community. Tailwind-only.
 */
const Dashboard = () => {
	const dispatch = useDispatch();
	const spaces = useSelector((s) => s.groups?.totalGroups ?? s.groups?.data?.length ?? 0);
	const collections = useSelector((s) => s.collections?.total ?? s.collections?.data?.length ?? 0);
	const members = useSelector((s) => s.members?.totalMembers ?? 0);
	const siteName = window?.ZencommunityGlobal?.name || 'ZenCommunity';
	const [statsLoading, setStatsLoading] = useState(true);

	useEffect(() => {
		Promise.all([
			dispatch(fetchAllGroups()),
			dispatch(fetchAllCollection()),
			dispatch(fetchAllMembers({ per_page: 1, page: 1 })),
		]).finally(() => setStatsLoading(false));
	}, []);

	return (
		<div className="tw-pb-[100px]">
			<PageHeader icon={LuLayoutDashboard}
				title={__('Dashboard', 'zencommunity')}
				subtitle={`${siteName} — ${__('community overview', 'zencommunity')}`}
				action={
					<a
						href={communityUrl()}
						target="_blank"
						rel="noreferrer"
						className="tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-lg tw-border tw-border-solid tw-border-zc-border tw-bg-transparent tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-zc-fg tw-no-underline tw-transition-colors hover:tw-bg-zc-secondary"
					>
						<LuExternalLink size={15} /> {__('View community', 'zencommunity')}
					</a>
				}
			/>

			<div className="tw-mb-9 tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-3">
				<StatCard icon={<LuUsers size={19} />} label={__('Members', 'zencommunity')} value={members} loading={statsLoading} tone="primary" />
				<StatCard icon={<LuLayoutGrid size={19} />} label={__('Spaces', 'zencommunity')} value={spaces} loading={statsLoading} tone="indigo" />
				<StatCard icon={<LuFolders size={19} />} label={__('Collections', 'zencommunity')} value={collections} loading={statsLoading} tone="emerald" />
			</div>

			<ReportsWidget />

			<p className="!tw-mb-4 tw-text-[12px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-zc-muted/80">
				{__('Quick actions', 'zencommunity')}
			</p>
			<div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
				<ActionCard icon={<LuLayoutGrid size={18} />} title={__('Manage Spaces', 'zencommunity')} desc={__('Create and organise community groups.', 'zencommunity')} page="zencommunity-spaces" />
				<ActionCard icon={<LuFolders size={18} />} title={__('Manage Collections', 'zencommunity')} desc={__('Group your Spaces into categories.', 'zencommunity')} page="zencommunity-collections" />
				<ActionCard icon={<LuSettings size={18} />} title={__('Settings', 'zencommunity')} desc={__('Configure the community, roles and appearance.', 'zencommunity')} page="zencommunity-general" />
				<ActionCard icon={<LuPlus size={18} />} title={__('Add a Space', 'zencommunity')} desc={__('Spin up a new group for your members.', 'zencommunity')} page="zencommunity-spaces" />
				<ActionCard
					icon={<LuRefreshCw size={18} />}
					title={__('Re-run Setup Wizard', 'zencommunity')}
					desc={__('Redo the guided setup — community details, your first Space, and settings.', 'zencommunity')}
					page="zencommunity-setup"
					hardNav
				/>
			</div>

			{/* Explicit keys, matching this section's own current lineup - so it
			keeps showing exactly this set as PRODUCTS grows for other callers
			(e.g. the Setup Wizard's own Extend step) rather than silently
			picking up every new entry. */}
			<ExtendCommunity keys={['academy', 'ablocks', 'storeengine', 'gemcrm', 'gemboards', 'gameengine', 'gembooking', 'trueplayer']} />
		</div>
	);
};

export default Dashboard;
