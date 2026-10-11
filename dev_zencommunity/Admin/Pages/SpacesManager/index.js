import React, { useEffect, useMemo, useState } from 'react';
import { __, _n, sprintf } from '@wordpress/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { IoAdd } from 'react-icons/io5';
import { LuFolder, LuLayoutGrid, LuLock, LuPencil, LuShapes, LuTrash2 } from 'react-icons/lu';
import { generateSlug, API, namespace } from '@Utils/helper';
import { fetchAllGroups, createGroup, updateGroup, deleteGroup } from '@Redux/slices/groupSlice/groupSlice';
import { fetchAllCollection } from '@Redux/slices/collectionSlice/collectionSlice';
import { PageHeader, PrimaryButton, EmptyState, Table } from '../../Components/ui';
import { spaceTypes, spaceTypeLabel, spaceTypeIcon } from '../../Components/SpaceTypePicker';
import SpaceFormModal from './SpaceFormModal';

const EMPTY = {
	id: null, name: '', slug: '', description: '', privacy: 'public', category_id: '',
	type: 'discussion',
	external_url: '', open_new_tab: true,
	page_content: '',
	resources: [],
	trueplayer_video_id: null,
	// Settings parity with the frontend's Group Settings screen
	// (Pages/GroupDetails/GroupSettings.js) — see SpaceFormModal.js.
	members_visibility: 'members_only',
	approval_required: false,
	allow_anonymous_feed: false,
	post_approval_required: false,
	post_approval_first_post_only: false,
	group_chat_enabled: false,
	cover_img_url: '', coverMediaId: null,
	featured_img: '', featureMediaId: null,
	// LMS integrations (Admin/Pages/SpacesManager/IntegrationSettings) — only
	// hydrated with real data once editGroup()'s detail fetch resolves, since
	// the Spaces list endpoint doesn't include per-addon course/event data.
	course_ids: [], events: [], course_category_ids: [], course_settings: {},
	ld_course_ids: [], ld_events: [],
	tl_course_ids: [], tl_events: [],
	lp_course_ids: [], lp_events: [],
	llms_course_ids: [], llms_events: [],
	ms_course_ids: [], ms_events: [],
};

// Same shape the frontend's GroupSettings.js initialValues computes
// (lines 59-84) from a single-group detail response's addon extras.
const hydrateIntegrations = (groupData) => ({
	course_ids: groupData?.courses?.courses?.map((c) => `${c.id}`) || [],
	events: groupData?.courses?.events || [],
	course_category_ids: groupData?.courses?.category_ids?.map((id) => `${id}`) || [],
	course_settings: groupData?.courses?.settings || {},
	ld_course_ids: groupData?.ld_courses?.courses?.map((c) => `${c.id}`) || [],
	ld_events: groupData?.ld_courses?.events || [],
	tl_course_ids: groupData?.tutorlms_courses?.courses?.map((c) => `${c.id}`) || [],
	tl_events: groupData?.tutorlms_courses?.events || [],
	lp_course_ids: groupData?.lp_course?.courses?.map((c) => `${c.id}`) || [],
	lp_events: groupData?.lp_course?.events || [],
	llms_course_ids: groupData?.llms_course?.courses?.map((c) => `${c.id}`) || [],
	llms_events: groupData?.llms_course?.events || [],
	ms_course_ids: groupData?.ms_course?.courses?.map((c) => `${c.id}`) || [],
	ms_events: groupData?.ms_course?.events || [],
});

// Turn a saved group into the flat editing shape (hydrate type-specific meta).
const toEditing = (item) => ({
	...EMPTY,
	...item,
	category_id: String(item.category_id ?? item.category?.id ?? ''),
	type: item.type || 'discussion',
	external_url: item.meta?.external_url || '',
	open_new_tab: item.meta?.open_new_tab ?? true,
	page_content: item.meta?.page_content || '',
	resources: Array.isArray(item.meta?.resources) ? item.meta.resources : [],
	trueplayer_video_id: item.meta?.trueplayer_video_id || null,
	members_visibility: item.meta?.members_visibility || 'members_only',
	// Matches the SPA's own load-time behavior (GroupSettings.js) — always
	// derived from the current privacy, not read from stored meta.approval_required.
	approval_required: (item.privacy ?? 'public') !== 'public',
	allow_anonymous_feed: item.meta?.allow_anonymous_feed ?? false,
	post_approval_required: item.meta?.post_approval_required ?? false,
	post_approval_first_post_only: item.meta?.post_approval_first_post_only ?? false,
	group_chat_enabled: item.meta?.group_chat_enabled ?? false,
	cover_img_url: item.meta?.cover_img_url || '',
	coverMediaId: null,
	featured_img: item.featured_img || '',
	featureMediaId: null,
});

/**
 * wp-admin "Spaces" screen — create/edit/delete typed Spaces (SureDash-style:
 * each Space holds one content type) and assign each to a Collection.
 * Tailwind-only; reuses groupSlice/collectionSlice.
 */
const SpacesManager = () => {
	const dispatch = useDispatch();
	const groups = useSelector((state) => state.groups?.data) || [];
	const collections = useSelector((state) => state.collections?.data) || [];
	const currentPage = useSelector((state) => state.groups?.currentPage) || 1;
	const totalPages = useSelector((state) => state.groups?.totalPages) || 1;
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState(null);
	const [saving, setSaving] = useState(false);

	const set = (patch) => setEditing((p) => ({ ...p, ...patch }));

	// Opens immediately with the fields already in the list row, then fills in
	// the LMS integration fields once the single-group detail fetch resolves
	// (the Spaces list endpoint doesn't include per-addon course/event data,
	// only GET /group/{id} does — mirrors GroupSettings.js's own fetchGroupById
	// on mount). Calls the API directly rather than dispatching the
	// fetchGroupById thunk: that thunk's reducer replaces the *entire* groups
	// list (state.data = [payload]), which would wipe this screen's list.
	const editGroup = async (item) => {
		setEditing(toEditing(item));
		try {
			const res = await API.get(`${namespace}/group/${item.id}`);
			setEditing((prev) => (prev && prev.id === item.id ? { ...prev, ...hydrateIntegrations(res.data) } : prev));
		} catch (e) {
			// Base fields are already loaded; integration data is best-effort.
		}
	};

	const collectionOptions = useMemo(
		() => [
			{ label: __('Uncategorised', 'zencommunity'), value: '' },
			...collections.map((c) => ({ label: c.name, value: String(c.id) })),
		],
		[collections]
	);

	const collectionName = (id) =>
		collections.find((c) => String(c.id) === String(id))?.name || __('Uncategorised', 'zencommunity');

	// Search and the Type / Collection / Privacy filters all run on the API
	// (GET /groups?search=&type=&privacy=&category_id=), so pagination and
	// totals always reflect the filtered set. Any change goes back to page 1.
	const totalGroups = useSelector((state) => state.groups?.totalGroups) || 0;
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState({ type: '', collection: '', privacy: '' });
	const filtering = Object.values(filters).some(Boolean);

	const queryFor = (q, f) => ({
		search: q,
		type: f.type,
		privacy: f.privacy,
		category_id: f.collection === '' ? undefined : f.collection,
	});

	const loadGroups = (page = 1, { search: q = search, filters: f = filters } = {}) => {
		setLoading(true);
		dispatch(fetchAllGroups({ page, ...queryFor(q, f) })).finally(() => setLoading(false));
	};

	const setFilter = (key, value) => {
		const next = { ...filters, [key]: value };
		setFilters(next);
		loadGroups(1, { filters: next });
	};

	const resetFilters = () => {
		const cleared = { type: '', collection: '', privacy: '' };
		setSearch('');
		setFilters(cleared);
		loadGroups(1, { search: '', filters: cleared });
	};

	const toolbar = (
		<Table.Toolbar
			search={{
				value: search,
				placeholder: __('Search spaces…', 'zencommunity'),
				onChange: (q) => { setSearch(q); loadGroups(1, { search: q }); },
			}}
			filters={[
				{
					key: 'type',
					label: __('Type', 'zencommunity'),
					icon: LuShapes,
					options: spaceTypes().map((t) => ({ label: t.label, value: t.key })),
					value: filters.type,
					onChange: (v) => setFilter('type', v),
				},
				{
					key: 'collection',
					label: __('Collection', 'zencommunity'),
					icon: LuFolder,
					options: [
						{ label: __('Uncategorised', 'zencommunity'), value: '0' },
						...collections.map((c) => ({ label: c.name, value: String(c.id) })),
					],
					value: filters.collection,
					onChange: (v) => setFilter('collection', v),
				},
				{
					key: 'privacy',
					label: __('Privacy', 'zencommunity'),
					icon: LuLock,
					options: [
						{ label: __('Public', 'zencommunity'), value: 'public' },
						{ label: __('Private', 'zencommunity'), value: 'private' },
						{ label: __('Hidden', 'zencommunity'), value: 'hidden' },
					],
					value: filters.privacy,
					onChange: (v) => setFilter('privacy', v),
				},
			]}
			onReset={resetFilters}
			summary={!loading && (search || filtering)
				? sprintf(_n('%s result', '%s results', totalGroups, 'zencommunity'), totalGroups)
				: null}
		/>
	);

	const goToPage = (page) => {
		if (page < 1 || page > totalPages || page === currentPage) return;
		loadGroups(page);
	};

	useEffect(() => {
		dispatch(fetchAllCollection());
		loadGroups();
	}, []);

	// URL required only when the External Link type is chosen.
	const invalid = !editing?.name?.trim() || (editing?.type === 'external-link' && !editing?.external_url?.trim());

	// Returns a promise resolving to { created } so the modal can decide whether
	// to advance to its Integrations step (on create) or close (on update).
	const save = () => {
		if (invalid) return Promise.resolve({ created: false });
		setSaving(true);
		const {
			id, category_id, type, external_url, open_new_tab, page_content, resources, trueplayer_video_id,
			approval_required, members_visibility, allow_anonymous_feed, post_approval_required, post_approval_first_post_only, group_chat_enabled,
			coverMediaId, featureMediaId,
			course_ids, events, course_category_ids, course_settings,
			ld_course_ids, ld_events, tl_course_ids, tl_events, lp_course_ids, lp_events,
			llms_course_ids, llms_events, ms_course_ids, ms_events,
			...rest
		} = editing;

		const meta = { approval_required, members_visibility, allow_anonymous_feed, post_approval_required, post_approval_first_post_only };
		if (type === 'external-link') { meta.external_url = external_url.trim(); meta.open_new_tab = !!open_new_tab; }
		if (type === 'single-page') { meta.page_content = page_content; }
		if (type === 'resource-library') { meta.resources = (resources || []).filter((r) => (r.title || r.url)); }
		if (type === 'audio' || type === 'video') { meta.trueplayer_video_id = trueplayer_video_id || null; }

		const formData = {
			name: rest.name,
			slug: rest.slug || generateSlug(rest.name),
			description: rest.description,
			privacy: rest.privacy,
			type,
			meta,
			// Sent top-level (matching GroupSettings.js's actual submit shape),
			// even though it's read back from meta.group_chat_enabled.
			group_chat_enabled,
		};
		const mediaIds = [coverMediaId, featureMediaId].filter(Boolean);
		if (mediaIds.length) formData.media_ids = mediaIds;
		if (featureMediaId) formData.featured_img = featureMediaId;

		// LMS integrations only apply to an existing Space (same as the
		// frontend, which only ever shows this UI for an already-created
		// group) — sent verbatim/top-level, matching GroupSettings.js's own
		// submit shape (no meta wrapping, no transformation).
		if (id) {
			Object.assign(formData, {
				course_ids, events, course_category_ids, course_settings,
				ld_course_ids, ld_events, tl_course_ids, tl_events, lp_course_ids, lp_events,
				llms_course_ids, llms_events, ms_course_ids, ms_events,
			});
		}

		const isCreate = !id;
		const thunk = id ? updateGroup({ id, formData: { ...formData, category_id } }) : createGroup({ category_id, formData });
		return dispatch(thunk)
			.then((action) => {
				loadGroups(currentPage);
				// On a successful create, keep the modal open and switch it into
				// edit mode (id now set) so the Integrations step becomes available
				// — the user configures LMS integrations for the Space they just
				// created without reopening it.
				if (isCreate && !action.error && action.payload?.id) {
					setEditing(toEditing(action.payload));
					return { created: true };
				}
				setEditing(null);
				return { created: false };
			})
			.finally(() => setSaving(false));
	};

	// Cover/feature image removal is a real, immediate detach (mirrors the
	// SPA's own separate "Remove cover image" action, Pages/GroupDetails/Group.js:415-418)
	// rather than something deferred to the main Save button.
	const removeImage = (mediaType) => {
		if (!editing?.id) return;
		if (!window.confirm(__('Remove this image?', 'zencommunity'))) return;
		dispatch(updateGroup({ id: editing.id, formData: { remove_media: mediaType } })).then(() => {
			set(
				mediaType === 'group_cover'
					? { cover_img_url: '', coverMediaId: null }
					: { featured_img: '', featureMediaId: null }
			);
			loadGroups(currentPage);
		});
	};

	const remove = (item) => {
		if (!window.confirm(__('Delete this Space? This cannot be undone.', 'zencommunity'))) return;
		// Deleting the last row on a later page steps back a page instead of landing on an empty one.
		dispatch(deleteGroup(item.id)).finally(() => loadGroups(groups.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage));
	};

	return (
		<div className="tw-pb-[100px]">
			<PageHeader icon={LuLayoutGrid}
				title={__('Spaces', 'zencommunity')}
				subtitle={__('Create and manage Spaces — each holds one type of content.', 'zencommunity')}
				action={
					<PrimaryButton onClick={() => setEditing({ ...EMPTY })}>
						<IoAdd size={16} /> {__('Add Space', 'zencommunity')}
					</PrimaryButton>
				}
			/>

			{!loading && groups.length === 0 && !search && !filtering ? (
				<EmptyState>{__('No spaces yet. Create your first Space.', 'zencommunity')}</EmptyState>
			) : (
				<Table.Root toolbar={toolbar}>
					<Table.Header>
						<Table.Row>
							<Table.ColumnHeader className="tw-w-[38%]">{__('Name', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader>{__('Collection', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader>{__('Privacy', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader className="tw-text-right">{__('Action', 'zencommunity')}</Table.ColumnHeader>
						</Table.Row>
					</Table.Header>
					{loading ? (
						<Table.Body>
							<Table.Loading colSpan={4} />
						</Table.Body>
					) : groups.length === 0 ? (
						<Table.Body>
							<Table.Empty colSpan={4} searching title={__('No spaces found', 'zencommunity')} description={__('Try a different search, or clear the filters.', 'zencommunity')} />
						</Table.Body>
					) : (
						<Table.Body>
							{groups.map((item) => {
								const Icon = spaceTypeIcon(item.type || 'discussion');
								const isPublic = (item.privacy || 'public') === 'public';
								return (
									<Table.Row key={item.id}>
										<Table.Cell>
											<div className="tw-flex tw-items-center tw-gap-3">
												<span className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-zc-primary-soft tw-text-zc-primary">
													<Icon size={16} />
												</span>
												<div className="tw-min-w-0">
													<p className="tw-m-0 tw-truncate tw-text-sm tw-font-semibold tw-text-zc-fg">
														{item.name || __('Untitled', 'zencommunity')}
													</p>
													<span className="tw-text-[11px] tw-font-medium tw-uppercase tw-tracking-wide tw-text-zc-muted">
														{spaceTypeLabel(item.type || 'discussion')}
													</span>
												</div>
											</div>
										</Table.Cell>
										<Table.Cell>
											<Table.Badge tone="neutral" icon={LuFolder}>
												{collectionName(item.category_id ?? item.category?.id)}
											</Table.Badge>
										</Table.Cell>
										<Table.Cell>
											<Table.Badge tone={isPublic ? 'success' : 'warning'} dot capitalize>
												{isPublic ? __('Public', 'zencommunity') : __('Private', 'zencommunity')}
											</Table.Badge>
										</Table.Cell>
										<Table.Cell className="tw-text-right">
											<Table.Actions>
												<Table.Action icon={LuPencil} label={__('Edit', 'zencommunity')} onClick={() => editGroup(item)} />
												<Table.Action icon={LuTrash2} tone="danger" label={__('Delete', 'zencommunity')} onClick={() => remove(item)} />
											</Table.Actions>
										</Table.Cell>
									</Table.Row>
								);
							})}
						</Table.Body>
					)}
				</Table.Root>
			)}

			<Table.Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} disabled={loading} />

			{editing && (
				<SpaceFormModal
					editing={editing}
					set={set}
					saving={saving}
					invalid={invalid}
					collectionOptions={collectionOptions}
					onSave={save}
					onClose={() => setEditing(null)}
					onRemoveImage={removeImage}
				/>
			)}
		</div>
	);
};

export default SpacesManager;
