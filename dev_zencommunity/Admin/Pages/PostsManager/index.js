import React, { useEffect, useState } from 'react';
import { __, _n, sprintf } from '@wordpress/i18n';
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';
import { IoAdd } from 'react-icons/io5';
import { LuCircleDot, LuFileText, LuLayoutGrid, LuPencil, LuTrash2 } from 'react-icons/lu';
import { fetchAllFeeds, deleteFeedPost } from '@Redux/slices/feedSlice/feedSlice';
import { fetchAllGroups } from '@Redux/slices/groupSlice/groupSlice';
import { PageHeader, PrimaryButton, Table } from '../../Components/ui';
import { useAdminRouter } from '../../Components/AdminRouter';
import { capitalizeName, media_url } from '@Utils/helper';

const excerpt = (html, n = 120) => {
	const text = String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
	return text.length > n ? `${text.slice(0, n)}…` : text;
};

// 'scheduled' is deliberately excluded from the backend's default (no status
// param) feed query so it never leaks into the public community feed — the
// admin Posts screen asks for it explicitly via the Status filter.
const STATUS_OPTIONS = [
	{ label: __('Published', 'zencommunity'), value: 'published' },
	{ label: __('Scheduled', 'zencommunity'), value: 'scheduled' },
	{ label: __('Draft', 'zencommunity'), value: 'draft' },
];

const STATUS_TONE = { published: 'success', scheduled: 'primary', draft: 'neutral' };
const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]));

/**
 * wp-admin "Posts" screen (SureDash-style): manage recent posts across all
 * Spaces without leaving wp-admin. "New Post" and "Edit" both hand off to the
 * same zencommunity-new-post page/route (create vs edit determined by whether
 * a post is passed via navigate(page, props)) rather than opening a modal.
 * Tailwind-only; reuses feedSlice/groupSlice.
 */
const PostsManager = () => {
	const dispatch = useDispatch();
	const { navigate } = useAdminRouter();
	const posts = useSelector((state) => state.feeds?.data) || [];
	const groups = useSelector((state) => state.groups?.data) || [];
	const currentPage = useSelector((state) => state.feeds?.currentPage) || 1;
	const totalPages = useSelector((state) => state.feeds?.totalPages) || 1;
	const [loading, setLoading] = useState(true);
	const totalPosts = useSelector((state) => state.feeds?.totalFeeds) || 0;
	// Search, Status and Space all run on the API (GET /feeds?search=&status=&group_id=),
	// so paging and totals reflect the filtered set. Changes go back to page 1.
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState({ status: 'published', space: '' });

	const spaceName = (id) => groups.find((g) => String(g.id) === String(id))?.name || '';

	// `replace: true` swaps the list in per page instead of the feedSlice's
	// default infinite-scroll append (feedSlice.js fetchAllFeeds.fulfilled).
	const load = (page = 1, { search: q = search, filters: f = filters } = {}) => {
		setLoading(true);
		dispatch(fetchAllFeeds({ page, search: q, status: f.status, group_id: f.space || undefined, replace: true }))
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		dispatch(fetchAllGroups({ per_page: 100 }));
		load();
	}, []);

	const setFilter = (key, value) => {
		const next = { ...filters, [key]: value };
		setFilters(next);
		load(1, { filters: next });
	};

	const resetFilters = () => {
		const cleared = { status: '', space: '' };
		setSearch('');
		setFilters(cleared);
		load(1, { search: '', filters: cleared });
	};

	const goToPage = (page) => {
		if (page < 1 || page > totalPages || page === currentPage) return;
		load(page);
	};

	const filtered = !!search || !!filters.status || !!filters.space;

	const toolbar = (
		<Table.Toolbar
			search={{
				value: search,
				placeholder: __('Search posts…', 'zencommunity'),
				onChange: (q) => { setSearch(q); load(1, { search: q }); },
			}}
			filters={[
				{
					key: 'status',
					label: __('Status', 'zencommunity'),
					icon: LuCircleDot,
					options: STATUS_OPTIONS,
					value: filters.status,
					onChange: (v) => setFilter('status', v),
				},
				{
					key: 'space',
					label: __('Space', 'zencommunity'),
					icon: LuLayoutGrid,
					options: groups.map((g) => ({ label: g.name, value: String(g.id) })),
					value: filters.space,
					onChange: (v) => setFilter('space', v),
				},
			]}
			onReset={resetFilters}
			summary={!loading && filtered ? sprintf(_n('%s result', '%s results', totalPosts, 'zencommunity'), totalPosts) : null}
		/>
	);

	const remove = (post) => {
		if (!window.confirm(__('Delete this post? This cannot be undone.', 'zencommunity'))) return;
		// Deleting the last row on a later page steps back a page instead of landing on an empty one.
		dispatch(deleteFeedPost(post.id)).finally(() => load(posts.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage));
	};

	return (
		<div className="tw-pb-[100px]">
			<PageHeader icon={LuFileText}
				title={__('Posts', 'zencommunity')}
				subtitle={__('Publish and manage posts across your community Spaces.', 'zencommunity')}
				action={
					<PrimaryButton onClick={() => navigate('zencommunity-new-post')}>
						<IoAdd size={16} /> {__('New Post', 'zencommunity')}
					</PrimaryButton>
				}
			/>

			<Table.Root toolbar={toolbar}>
				<Table.Header>
					<Table.Row>
						<Table.ColumnHeader>{__('Post', 'zencommunity')}</Table.ColumnHeader>
						<Table.ColumnHeader>{__('Space', 'zencommunity')}</Table.ColumnHeader>
						<Table.ColumnHeader>{__('Author', 'zencommunity')}</Table.ColumnHeader>
						<Table.ColumnHeader>{__('Status', 'zencommunity')}</Table.ColumnHeader>
						<Table.ColumnHeader className="tw-text-right">{__('Action', 'zencommunity')}</Table.ColumnHeader>
					</Table.Row>
				</Table.Header>
				{loading ? (
					<Table.Body>
						<Table.Loading colSpan={5} />
					</Table.Body>
				) : posts.length === 0 ? (
					<Table.Body>
						<Table.Empty colSpan={5} searching={filtered} title={filtered ? __('No posts found', 'zencommunity') : __('No posts yet', 'zencommunity')} description={filtered ? __('Try a different search, or clear the filters.', 'zencommunity') : __('Posts published in your Spaces will show up here.', 'zencommunity')} />
					</Table.Body>
				) : (
					<Table.Body>
						{posts.map((post) => (
							<Table.Row key={post.id}>
								<Table.Cell>
									<p className="tw-m-0 tw-max-w-[420px] tw-truncate tw-text-sm tw-text-zc-fg">
										{post.title ? <strong>{post.title}</strong> : null}
									</p>
								</Table.Cell>
								<Table.Cell>{post.group_name || spaceName(post.group_id ?? post.group?.id) || '—'}</Table.Cell>
								<Table.Cell>
									{/* The feeds API sends the author as user_* fields, not an `author` object. */}
									{(() => {
										const name = capitalizeName(`${post.user_first_name ?? ''} ${post.user_last_name ?? ''}`.trim() || post.user_username || '');
										if (!name) return '—';
										return (
											<span className="tw-inline-flex tw-items-center tw-gap-2">
												{post.user_avatar_url ? (
													<img src={media_url(post.user_avatar_url)} alt="" className="tw-h-7 tw-w-7 tw-rounded-full tw-object-cover" />
												) : (
													<span className="tw-inline-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-rounded-full tw-bg-zc-primary-soft tw-text-xs tw-font-semibold tw-text-zc-primary">
														{name.charAt(0)}
													</span>
												)}
												<span className="tw-text-sm tw-text-zc-fg">{name}</span>
											</span>
										);
									})()}
								</Table.Cell>
								<Table.Cell>
									<Table.Badge tone={STATUS_TONE[post.status] || 'neutral'} dot capitalize>
										{STATUS_LABEL[post.status] || STATUS_LABEL.published}
									</Table.Badge>
									{post.status === 'scheduled' && post.meta?.scheduled_at && (
										<p className="tw-m-0 tw-mt-1 tw-text-xs tw-text-zc-muted">
											{moment(post.meta.scheduled_at).local().format('MMM DD, YYYY hh:mm A')}
										</p>
									)}
								</Table.Cell>
								<Table.Cell className="tw-text-right">
									<Table.Actions>
										<Table.Action icon={LuPencil} label={__('Edit', 'zencommunity')} onClick={() => navigate('zencommunity-new-post', { post }, { id: post.id })} />
										<Table.Action icon={LuTrash2} tone="danger" label={__('Delete', 'zencommunity')} onClick={() => remove(post)} />
									</Table.Actions>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				)}
			</Table.Root>

			<Table.Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} disabled={loading} />
		</div>
	);
};

export default PostsManager;
