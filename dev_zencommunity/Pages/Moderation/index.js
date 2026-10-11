import React, { useCallback, useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { API, baseURL, current_logged_user, namespace } from '@Utils/helper';

/**
 * Moderation queue (admins). Lists reported content and lets a moderator
 * dismiss or action a report. Tailwind UI, themed via --zencom-* vars.
 */

const STATUS_TABS = ['pending', 'reviewed', 'dismissed', 'actioned'];
const PER_PAGE = 20;

const reasonLabel = (r) => ({
	spam: __('Spam or scam', 'zencommunity'),
	harassment: __('Harassment', 'zencommunity'),
	hate_speech: __('Hate speech', 'zencommunity'),
	nudity: __('Nudity / sexual', 'zencommunity'),
	misinformation: __('False information', 'zencommunity'),
	other: __('Other', 'zencommunity'),
}[r] || r);

const contentLink = (report) => {
	if (report.object_type === 'feed') return baseURL(`/feed/${report.object_id}`);
	return null;
};

const Moderation = () => {
	const [items, setItems] = useState([]);
	const [status, setStatus] = useState('pending');
	const [page, setPage] = useState(1);
	const [pages, setPages] = useState(1);
	const [loading, setLoading] = useState(true);

	const isAdmin = !!current_logged_user?.is_site_admin;

	const load = useCallback(async (pageToLoad, replace) => {
		setLoading(replace);
		try {
			const { data } = await API.get(`${namespace}/reports?status=${status}&page=${pageToLoad}&per_page=${PER_PAGE}`);
			setPages(data?.pages || 1);
			setPage(data?.page || pageToLoad);
			setItems((prev) => (replace ? (data?.records || []) : [...prev, ...(data?.records || [])]));
		} catch (e) {
			// ignore
		} finally {
			setLoading(false);
		}
	}, [status]);

	useEffect(() => { load(1, true); }, [load]);

	const setReportStatus = async (report, newStatus) => {
		setItems((prev) => prev.filter((r) => r.id !== report.id)); // optimistic remove from current tab
		try {
			await API.post(`${namespace}/report/${report.id}/status`, { status: newStatus });
		} catch (e) {
			load(1, true);
		}
	};

	if (!isAdmin) {
		return (
			<div className="tw-mx-auto tw-max-w-3xl tw-p-6 tw-text-center tw-text-zc-muted">
				{__('You do not have access to the moderation queue.', 'zencommunity')}
			</div>
		);
	}

	return (
		<div className="tw-mx-auto tw-w-full tw-max-w-3xl tw-p-4 md:tw-p-6">
			<h1 className="tw-mb-4 tw-text-2xl tw-font-semibold tw-text-zc-fg">{__('Moderation', 'zencommunity')}</h1>

			<div className="tw-mb-4 tw-flex tw-flex-wrap tw-gap-2">
				{STATUS_TABS.map((s) => (
					<button
						key={s}
						type="button"
						onClick={() => setStatus(s)}
						className={[
							'tw-rounded-full tw-px-3 tw-py-1 tw-text-sm tw-capitalize tw-transition-colors',
							status === s ? 'tw-bg-zc-primary tw-text-white' : 'tw-border tw-border-zc-border tw-text-zc-fg hover:tw-bg-zc-hover',
						].join(' ')}
					>
						{s}
					</button>
				))}
			</div>

			<div className="tw-overflow-hidden tw-rounded-lg tw-border tw-border-zc-border tw-bg-zc-bg tw-border tw-border-solid tw-border-zc-border">
				{loading ? (
					<div className="tw-space-y-px">
						{[1, 2, 3].map((i) => (
							<div key={i} className="tw-h-20 tw-animate-pulse tw-bg-zc-hover" />
						))}
					</div>
				) : items.length === 0 ? (
					<div className="tw-py-16 tw-text-center tw-text-sm tw-text-zc-muted">
						{__('Nothing here. The queue is clear.', 'zencommunity')}
					</div>
				) : (
					<ul className="tw-divide-y tw-divide-zc-border">
						{items.map((r) => {
							const link = contentLink(r);
							const reporter = `${r.reporter_first_name || ''} ${r.reporter_last_name || ''}`.trim() || __('A member', 'zencommunity');
							return (
								<li key={r.id} className="tw-flex tw-flex-col tw-gap-2 tw-px-4 tw-py-3 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
									<div className="tw-min-w-0">
										<div className="tw-flex tw-items-center tw-gap-2">
											<span className="tw-rounded tw-bg-zc-warning/15 tw-px-2 tw-py-0.5 tw-text-xs tw-font-medium tw-text-zc-warning">{reasonLabel(r.reason)}</span>
											<span className="tw-text-xs tw-capitalize tw-text-zc-muted">{r.object_type} #{r.object_id}</span>
										</div>
										{r.note && <p className="tw-mt-1 tw-text-sm tw-text-zc-fg">{r.note}</p>}
										<p className="tw-mt-1 tw-text-xs tw-text-zc-muted">
											{__('Reported by', 'zencommunity')} {reporter} · {moment.utc(r.created_at, 'YYYY-MM-DD HH:mm:ss').local().fromNow()}
										</p>
									</div>

									<div className="tw-flex tw-flex-shrink-0 tw-items-center tw-gap-2">
										{link && (
											<Link to={link} className="tw-rounded-md tw-border tw-border-zc-border tw-px-2.5 tw-py-1 tw-text-xs tw-text-zc-fg tw-no-underline hover:tw-bg-zc-hover">
												{__('View', 'zencommunity')}
											</Link>
										)}
										{status === 'pending' && (
											<>
												<button type="button" onClick={() => setReportStatus(r, 'dismissed')} className="tw-rounded-md tw-border tw-border-zc-border tw-px-2.5 tw-py-1 tw-text-xs tw-text-zc-fg hover:tw-bg-zc-hover">
													{__('Dismiss', 'zencommunity')}
												</button>
												<button type="button" onClick={() => setReportStatus(r, 'actioned')} className="tw-rounded-md tw-bg-zc-warning tw-px-2.5 tw-py-1 tw-text-xs tw-text-white hover:tw-opacity-90">
													{__('Mark actioned', 'zencommunity')}
												</button>
											</>
										)}
										{status !== 'pending' && (
											<button type="button" onClick={() => setReportStatus(r, 'pending')} className="tw-rounded-md tw-border tw-border-zc-border tw-px-2.5 tw-py-1 tw-text-xs tw-text-zc-fg hover:tw-bg-zc-hover">
												{__('Reopen', 'zencommunity')}
											</button>
										)}
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</div>

			{!loading && page < pages && (
				<div className="tw-mt-4 tw-text-center">
					<button type="button" onClick={() => load(page + 1, false)} className="tw-rounded-md tw-border tw-border-zc-border tw-px-4 tw-py-2 tw-text-sm tw-text-zc-fg hover:tw-bg-zc-hover">
						{__('Load more', 'zencommunity')}
					</button>
				</div>
			)}
		</div>
	);
};

export default Moderation;
