import React, { useEffect, useState } from 'react';
import { __, _n, sprintf } from '@wordpress/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { IoAdd } from 'react-icons/io5';
import { LuFolders, LuPencil, LuTrash2 } from 'react-icons/lu';
import { generateSlug } from '@Utils/helper';
import {
	fetchAllCollection,
	cerateCollection,
	updateCollection,
	deleteCollection,
} from '@Redux/slices/collectionSlice/collectionSlice';
import { PageHeader, PrimaryButton, EmptyState, Table } from '../../Components/ui';
import CollectionFormModal from './CollectionFormModal';

const EMPTY = { id: null, name: '', slug: '', description: '' };

/**
 * wp-admin "Collections" screen — create/edit/delete the categories that group
 * Spaces. Tailwind-only; reuses collectionSlice for the REST calls and re-fetches
 * after each mutation so the list stays correct regardless of reducer shape.
 */
const CollectionsManager = () => {
	const dispatch = useDispatch();
	const collections = useSelector((state) => state.collections?.data) || [];
	const currentPage = useSelector((state) => state.collections?.currentPage) || 1;
	const totalPages = useSelector((state) => state.collections?.totalPages) || 1;
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState(null); // null = modal closed
	const [saving, setSaving] = useState(false);

	const set = (patch) => setEditing((p) => ({ ...p, ...patch }));

	const totalCollections = useSelector((state) => state.collections?.totalCollections ?? state.collections?.total) || 0;
	// Search runs on the API (GET /categories?search=), so paging reflects it.
	const [search, setSearch] = useState('');

	const load = (page = 1, q = search) => {
		setLoading(true);
		dispatch(fetchAllCollection({ page, search: q })).finally(() => setLoading(false));
	};

	const toolbar = (
		<Table.Toolbar
			search={{
				value: search,
				placeholder: __('Search collections…', 'zencommunity'),
				onChange: (q) => { setSearch(q); load(1, q); },
			}}
			onReset={() => { setSearch(''); load(1, ''); }}
			summary={!loading && search && totalCollections
				? sprintf(_n('%s result', '%s results', totalCollections, 'zencommunity'), totalCollections)
				: null}
		/>
	);

	const goToPage = (page) => {
		if (page < 1 || page > totalPages || page === currentPage) return;
		load(page);
	};

	useEffect(() => { load(); }, []);

	const invalid = !editing?.name?.trim();

	const save = () => {
		if (invalid) return;
		setSaving(true);
		const payload = { ...editing, slug: editing.slug || generateSlug(editing.name) };
		const thunk = editing.id ? updateCollection(payload) : cerateCollection(payload);
		dispatch(thunk).finally(() => {
			setSaving(false);
			setEditing(null);
			load(currentPage);
		});
	};

	const remove = (item) => {
		if (!window.confirm(__('Delete this collection? Spaces inside it become uncategorised.', 'zencommunity'))) return;
		// Deleting the last row on a later page steps back a page instead of landing on an empty one.
		dispatch(deleteCollection(item.id)).finally(() => load(collections.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage));
	};

	return (
		<div className="tw-pb-[100px]">
			<PageHeader icon={LuFolders}
				title={__('Collections', 'zencommunity')}
				subtitle={__('Categories that organise your community Spaces.', 'zencommunity')}
				action={
					<PrimaryButton onClick={() => setEditing({ ...EMPTY })}>
						<IoAdd size={16} /> {__('Add Collection', 'zencommunity')}
					</PrimaryButton>
				}
			/>

			{!loading && collections.length === 0 && !search ? (
				<EmptyState icon={LuFolders}>
					<p className="tw-m-0 tw-text-sm tw-font-medium tw-text-zc-fg">{__('No collections yet', 'zencommunity')}</p>
					<p className="tw-m-0 tw-max-w-[320px] tw-text-center tw-text-sm tw-text-zc-muted">
						{__('Create a Collection to group related Spaces together and help members find them.', 'zencommunity')}
					</p>
					<PrimaryButton onClick={() => setEditing({ ...EMPTY })}>
						<IoAdd size={16} /> {__('Add Collection', 'zencommunity')}
					</PrimaryButton>
				</EmptyState>
			) : (
				<Table.Root toolbar={toolbar}>
					<Table.Header>
						<Table.Row>
							<Table.ColumnHeader>{__('Name', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader>{__('Slug', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader className="tw-text-right">{__('Action', 'zencommunity')}</Table.ColumnHeader>
						</Table.Row>
					</Table.Header>
					{loading ? (
					<Table.Body>
						<Table.Loading colSpan={3} />
					</Table.Body>
					) : collections.length === 0 ? (
						<Table.Body>
							<Table.Empty colSpan={3} searching title={__('No collections found', 'zencommunity')} description={__('Try a different search term.', 'zencommunity')} />
						</Table.Body>
					) : (
					<Table.Body>
						{collections.map((item) => (
							<Table.Row key={item.id}>
								<Table.Cell className="tw-font-medium tw-text-zc-fg">
									{item.name || __('Untitled', 'zencommunity')}
								</Table.Cell>
								<Table.Cell className="tw-text-zc-muted">{item.slug ? `/${item.slug}` : '—'}</Table.Cell>
								<Table.Cell className="tw-text-right">
									<Table.Actions>
										<Table.Action icon={LuPencil} label={__('Edit', 'zencommunity')} onClick={() => setEditing({ ...EMPTY, ...item })} />
										<Table.Action icon={LuTrash2} tone="danger" label={__('Delete', 'zencommunity')} onClick={() => remove(item)} />
									</Table.Actions>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
					)}
				</Table.Root>
			)}

			<Table.Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} disabled={loading} />

			{editing && (
				<CollectionFormModal
					editing={editing}
					set={set}
					saving={saving}
					invalid={invalid}
					onSave={save}
					onClose={() => setEditing(null)}
				/>
			)}
		</div>
	);
};

export default CollectionsManager;
