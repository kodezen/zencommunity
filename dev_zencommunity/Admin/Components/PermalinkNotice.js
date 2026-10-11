import React from 'react';
import { __ } from '@wordpress/i18n';
import { RiErrorWarningLine } from 'react-icons/ri';
import { site_url, is_plain_permalink } from '@Utils/helper';

/**
 * In-app equivalent of the classic wp-admin "Plain" permalink warning
 * (zencommunity_configuration_check in includes/functions.php) — that PHP
 * notice never reaches ZenCommunity's own screens because
 * AdminMenu::suppress_foreign_notices() strips all admin_notices there for a
 * clean UI, so the misconfiguration must be flashed here instead.
 */
const PermalinkNotice = () => {
	if (!is_plain_permalink) return null;

	return (
		<div className="tw-flex tw-items-start tw-gap-2.5 tw-border-0 tw-border-b tw-border-solid tw-border-red-200 tw-bg-red-50 tw-px-6 tw-py-3 tw-text-sm tw-text-red-700">
			<RiErrorWarningLine size={18} className="tw-mt-0.5 tw-shrink-0" />
			<p className="tw-m-0">
				{__('Your permalink structure is set to "Plain", which will break ZenCommunity pages. Please select a different structure in', 'zencommunity')}{' '}
				<a
					href={`${site_url || ''}/wp-admin/options-permalink.php`}
					className="tw-font-semibold tw-text-red-700 tw-underline"
				>
					{__('Permalink Settings', 'zencommunity')}
				</a>
				.
			</p>
		</div>
	);
};

export default PermalinkNotice;
