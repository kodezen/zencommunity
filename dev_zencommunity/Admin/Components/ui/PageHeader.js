import React from 'react';
import { __ } from '@wordpress/i18n';
import { LuChevronRight, LuHouse } from 'react-icons/lu';
import { useAdminRouter } from '../AdminRouter';

import './page-header.scss';

const HOME_PAGE = 'zencommunity-settings';

/**
 * Admin page header: breadcrumb trail, an optional icon tile, title + subtitle,
 * and actions on the right.
 *
 * `breadcrumbs` — [{ label, page }] between "ZenCommunity" and the current page
 * (e.g. Posts on the Edit Post screen). Each crumb with a `page` navigates
 * client-side through the AdminRouter and still works as a plain link.
 * The trail always starts at ZenCommunity and ends with `currentLabel`
 * (defaults to `title`) — e.g. Settings › General while the card says Settings.
 */
const PageHeader = ({ title, subtitle, action, icon: Icon, breadcrumbs = [], currentLabel }) => {
	const { navigate, page } = useAdminRouter();

	const trail = [
		...(page === HOME_PAGE ? [] : [{ label: __('ZenCommunity', 'zencommunity'), page: HOME_PAGE, home: true }]),
		...breadcrumbs,
		{ label: currentLabel || title },
	];
	if (page === HOME_PAGE) trail[0] = { ...trail[0], home: true };

	const go = (e, target) => {
		if (!target || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // let the browser open new tabs
		e.preventDefault();
		navigate(target);
	};

	return (
		<header className="zc-page-header">
			<nav className="zc-page-header__crumbs" aria-label={__('Breadcrumb', 'zencommunity')}>
				<ol>
					{trail.map((crumb, idx) => {
						const last = idx === trail.length - 1;
						return (
							<li key={`${crumb.label}-${idx}`}>
								{crumb.page && !last ? (
									<a href={`admin.php?page=${crumb.page}`} onClick={(e) => go(e, crumb.page)} className="zc-page-header__crumb">
										{crumb.home && <LuHouse size={13} aria-hidden="true" />}
										{crumb.label}
									</a>
								) : (
									<span className="zc-page-header__crumb is-current" aria-current={last ? 'page' : undefined}>
										{crumb.home && <LuHouse size={13} aria-hidden="true" />}
										{crumb.label}
									</span>
								)}
								{!last && <LuChevronRight size={13} className="zc-page-header__sep" aria-hidden="true" />}
							</li>
						);
					})}
				</ol>
			</nav>

			<div className="zc-page-header__card">
				<div className="zc-page-header__main">
					{Icon && (
						<span className="zc-page-header__icon" aria-hidden="true">
							<Icon size={22} />
						</span>
					)}
					<div className="zc-page-header__text">
						<h1 className="zc-page-header__title">{title}</h1>
						{subtitle && <p className="zc-page-header__subtitle">{subtitle}</p>}
					</div>
				</div>
				{action && <div className="zc-page-header__actions">{action}</div>}
			</div>
		</header>
	);
};

export default PageHeader;
