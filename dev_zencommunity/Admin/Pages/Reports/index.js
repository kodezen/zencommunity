import React from 'react';
import { __ } from '@wordpress/i18n';
import { applyFilters } from '@wordpress/hooks';
import { LuChartBar } from 'react-icons/lu';
import { PageHeader } from '../../Components/ui';
import ProLockedPanel from '../../Components/ProLockedPanel';
import UpgradeMessage from '../../Components/UpgradeMessage';

/**
 * Reports admin page slot. The analytics screen itself ships with
 * ZenCommunity Pro, which registers it through the
 * `zencommunity.admin.reportsPage` filter; without it this page only
 * describes the feature.
 */
const Reports = () => {
	const ReportsPage = applyFilters('zencommunity.admin.reportsPage', null);
	if (ReportsPage) {
		return <ReportsPage />;
	}

	return (
		<div className="tw-pb-[100px]">
			<PageHeader icon={LuChartBar} title={__('Reports', 'zencommunity')} subtitle={__('Community engagement & growth analytics', 'zencommunity')} />
			<ProLockedPanel
				title={__('Reports is a Pro feature', 'zencommunity')}
				description={__('See how your community grows and where members engage — all in one dashboard.', 'zencommunity')}
				features={[
					__('Member growth over time', 'zencommunity'),
					__('Engagement trends', 'zencommunity'),
					__('Space-level analytics', 'zencommunity'),
					__('Top contributors leaderboards', 'zencommunity'),
				]}
			/>
			<UpgradeMessage />
		</div>
	);
};

export default Reports;
