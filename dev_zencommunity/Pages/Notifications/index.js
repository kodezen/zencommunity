import React, { useCallback, useEffect, useRef, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { useDispatch } from 'react-redux';
import { API, baseURL, getInitials, namespace, site_url } from '@Utils/helper';
import { generatePath } from '@Components/UserNotification/helper';
import { markNotificationAsRead } from '@Redux/slices/userNotificationSlice/userNotificationSlice';

/**
 * Full notification center. Replaces the "only a capped dropdown" experience:
 * paginated, load-more, per-item + bulk mark-as-read, filterable. Tailwind UI
 * (app is migrating off Chakra), themed via --zencom-* variables.
 */

const PER_PAGE = 20;

// helper.js's getAvatarBg returns Chakra theme tokens (e.g. "blue.500"), which
// are only valid inside a Chakra `bg` prop. This page is plain HTML/Tailwind,
// so a raw `style.background` here needs an actual CSS color — hence a local
// hex palette instead of reusing that helper.
const AVATAR_HEX_COLORS = ['#3182CE', '#38A169', '#805AD5', '#DD6B20', '#319795', '#E53E3E'];
const getAvatarHexBg = (userName) => {
	if (!userName || typeof userName !== 'string') return '#A0AEC0';
	const firstChar = userName.trim().charAt(0).toUpperCase();
	if (!firstChar.match(/[A-Z]/)) return '#A0AEC0';
	const charCode = firstChar.charCodeAt(0) - 65;
	return AVATAR_HEX_COLORS[charCode % AVATAR_HEX_COLORS.length];
};

const Notifications = () => {
	const [items, setItems] = useState([]);
	const [page, setPage] = useState(1);
	const [pages, setPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [filter, setFilter] = useState('all'); // all | unread
	const inFlight = useRef(false);
	const dispatch = useDispatch();

	const fetchPage = useCallback(async (pageToLoad, replace) => {
		if (inFlight.current) return;
		inFlight.current = true;
		if (pageToLoad === 1) setLoading(true); else setLoadingMore(true);
		try {
			let url = `${namespace}/member/notifications?page=${pageToLoad}&per_page=${PER_PAGE}`;
			if (filter === 'unread') url += `&status=0`;
			const { data } = await API.get(url);
			const records = data?.records || [];
			setPages(data?.pages || 1);
			setPage(data?.page || pageToLoad);
			setItems((prev) => (replace ? records : [...prev, ...records]));
		} catch (e) {
			// leave current list as-is
		} finally {
			inFlight.current = false;
			setLoading(false);
			setLoadingMore(false);
		}
	}, [filter]);

	useEffect(() => {
		fetchPage(1, true);
	}, [fetchPage]);

	const markOne = async (item) => {
		const nextRead = item?.is_read === '1' ? 0 : 1;
		setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: `${nextRead}` } : n)));
		try {
			await API.post(`${namespace}/member/notifications`, { notification_id: parseInt(item.id), is_read: nextRead });
		} catch (e) {
			setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: item.is_read } : n)));
		}
	};

	// Marks a single notification read when the user opens it (as opposed to
	// `markOne`, which is the explicit toggle button and can flip either way).
	// Dispatched through Redux so the header bell badge (`state.userNotifications.unread`)
	// stays in sync immediately, instead of waiting for its next poll.
	const markReadOnOpen = (item) => {
		if (item?.is_read === '1') return;
		setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: '1' } : n)));
		dispatch(markNotificationAsRead({ notification_id: parseInt(item.id), is_read: 1 }));
	};

	const markAll = async () => {
		setItems((prev) => prev.map((n) => ({ ...n, is_read: '1' })));
		try {
			await API.post(`${namespace}/member/notifications`, { notification_id: 0, is_read: 1 });
		} catch (e) {
			fetchPage(1, true);
		}
	};

	const relTime = (createdAt) => {
		const m = moment.utc(createdAt, 'YYYY-MM-DD HH:mm:ss').local();
		return moment().diff(m, 'days') > 2 ? m.format('MMM D, YYYY, h:mm a') : m.fromNow();
	};

	return (
		<div className="tw-mx-auto tw-w-full tw-max-w-3xl tw-p-4 md:tw-p-6">
			<div className="tw-mb-4 tw-flex tw-items-center tw-justify-between tw-gap-4">
				<h1 className="tw-text-2xl tw-font-semibold tw-text-zc-fg">{__('Notifications', 'zencommunity')}</h1>
				<button
					type="button"
					onClick={markAll}
					className="tw-rounded-md tw-border tw-border-zc-border tw-p-1.5 tw-text-sm tw-text-zc-fg hover:tw-bg-zc-hover"
				>
					{__('Mark all as read', 'zencommunity')}
				</button>
			</div>

			<div className="tw-mb-4 tw-flex tw-gap-2">
				{['all', 'unread'].map((f) => (
					<button
						key={f}
						type="button"
						onClick={() => setFilter(f)}
						className={[
							'tw-rounded-full tw-px-3 tw-py-1 tw-text-sm tw-transition-colors',
							filter === f
								? 'tw-bg-zc-primary tw-text-white'
								: 'tw-border tw-border-zc-border tw-text-zc-fg hover:tw-bg-zc-hover',
						].join(' ')}
					>
						{f === 'all' ? __('All', 'zencommunity') : __('Unread', 'zencommunity')}
					</button>
				))}
			</div>

			<div className="tw-overflow-hidden tw-rounded-lg tw-border tw-border-zc-border tw-bg-zc-bg tw-border tw-border-solid tw-border-zc-border">
				{loading ? (
					<ul className="tw-divide-y tw-divide-zc-border">
						{[1, 2, 3, 4, 5].map((i) => (
							<li key={i} className="tw-flex tw-items-center tw-gap-3 tw-px-4 tw-py-3">
								<div className="tw-h-10 tw-w-10 tw-flex-shrink-0 tw-animate-pulse tw-rounded-full tw-bg-zc-border" />
								<div className="tw-flex-1 tw-space-y-2">
									<div className="tw-h-3 tw-w-1/3 tw-animate-pulse tw-rounded tw-bg-zc-border" />
									<div className="tw-h-3 tw-w-2/3 tw-animate-pulse tw-rounded tw-bg-zc-border" />
								</div>
							</li>
						))}
					</ul>
				) : items.length === 0 ? (
					<div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-py-16 tw-text-center">
						<p className="tw-text-base tw-font-medium tw-text-zc-fg">{__('No notifications', 'zencommunity')}</p>
						<p className="tw-text-sm tw-text-zc-muted">{__('Notifications will show up here.', 'zencommunity')}</p>
					</div>
				) : (
					<ul className="tw-divide-y tw-divide-zc-border tw-m-0 tw-p-0">
						{items.map((item) => {
							const user = item?.meta?.user || item?.from_user;
							const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
							const avatarUrl = user?.avatar_url ? site_url + '/' + user?.avatar_url : '';
							const unread = item?.is_read !== '1';
							return (
								<li
									key={item.id}
									className={['tw-flex tw-items-start tw-gap-3 tw-px-4 tw-py-3', unread ? 'tw-bg-zc-primary-faint' : ''].join(' ')}
								>
									<div className="tw-flex tw-h-10 tw-w-10 tw-flex-shrink-0 tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-full tw-text-sm tw-font-medium tw-text-white" style={{ background: getAvatarHexBg(name || '?') }}>
										{avatarUrl ? <img src={avatarUrl} alt="" className="tw-h-full tw-w-full tw-object-cover" /> : getInitials(name || '?')}
									</div>

									<Link
										to={baseURL(generatePath(item?.meta, item?.event_type))}
										onClick={() => markReadOnOpen(item)}
										className="tw-min-w-0 tw-flex-1 tw-no-underline"
									>
										{name && <p className="tw-text-sm tw-font-medium tw-text-zc-fg">{name}</p>}
										<p className="tw-text-sm tw-text-zc-fg">{item?.message}</p>
										<p className="tw-mt-0.5 tw-text-xs tw-text-zc-primary">{relTime(item?.created_at)}</p>
									</Link>

									<button
										type="button"
										aria-label={unread ? __('Mark as read', 'zencommunity') : __('Mark as unread', 'zencommunity')}
										title={unread ? __('Mark as read', 'zencommunity') : __('Mark as unread', 'zencommunity')}
										onClick={() => markOne(item)}
										className={[
											'tw-mt-1 tw-h-3 tw-w-3 tw-flex-shrink-0 tw-rounded-full tw-border-2',
											unread ? 'tw-border-zc-primary tw-bg-zc-primary' : 'tw-border-zc-border tw-bg-transparent',
										].join(' ')}
									/>
								</li>
							);
						})}
					</ul>
				)}
			</div>

			{!loading && page < pages && (
				<div className="tw-mt-4 tw-text-center">
					<button
						type="button"
						disabled={loadingMore}
						onClick={() => fetchPage(page + 1, false)}
						className="tw-rounded-md tw-border tw-border-zc-border tw-px-4 tw-py-2 tw-text-sm tw-text-zc-fg hover:tw-bg-zc-hover disabled:tw-opacity-60"
					>
						{loadingMore ? __('Loading…', 'zencommunity') : __('Load more', 'zencommunity')}
					</button>
				</div>
			)}
		</div>
	);
};

export default Notifications;
