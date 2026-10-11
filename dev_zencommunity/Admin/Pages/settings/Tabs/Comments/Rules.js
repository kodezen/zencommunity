import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useDispatch } from 'react-redux';
import { LuCircleDot, LuGitBranch, LuLayoutGrid, LuPencil, LuTrash2 } from 'react-icons/lu';
import { API, namespace } from '@Utils/helper';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { EmptyState, PrimaryButton, Toggle, Table } from '../../../../Components/ui';
import RuleFormModal from './RuleFormModal';

const REST_BASE = `${namespace}/wp-content-sync`;

const conditionsSummary = (rule) => {
	if (!rule.conditions?.length) return '—';
	return rule.conditions.map((c) => (
		c.type === 'post_type'
			? __('Post type', 'zencommunity') + `: ${c.post_type}`
			: __('Taxonomy', 'zencommunity') + `: ${c.taxonomy}` + (c.term_id === 'all' ? ` (${__('any term', 'zencommunity')})` : ` (#${c.term_id})`)
	)).join(rule.operator === 'any' ? ` ${__('OR', 'zencommunity')} ` : ` ${__('AND', 'zencommunity')} `);
};

/**
 * CRUD for assignment rules — routes posts to a Space by post type or
 * taxonomy/term condition, ahead of the General tab's default Space.
 * Talks straight to RuleController (zencommunity-pro's own REST routes,
 * same `zencommunity/v1` namespace as everything else here).
 */
const Rules = () => {
	const dispatch = useDispatch();
	const [rules, setRules] = useState([]);
	const [groups, setGroups] = useState([]);
	const [loaded, setLoaded] = useState(false);
	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState(null);

	const notify = (message, type = 'success') => dispatch(showNotification({ message, isShow: true, type }));

	const fetchRules = () => {
		API.get(`${REST_BASE}/rules`).then(({ data }) => {
			setRules(data || []);
			setLoaded(true);
		});
	};

	useEffect(() => {
		fetchRules();
		API.get(`${namespace}/groups`, { params: { per_page: 100 } }).then(({ data }) => {
			setGroups(data?.records ?? data ?? []);
		});
	}, []);

	const groupName = (id) => groups.find((g) => Number(g.id) === Number(id))?.name ?? `#${id}`;

	// Rules come back in one request, so search/filter here on the page.
	const [query, setQuery] = useState('');
	const [stateFilter, setStateFilter] = useState('');
	const [spaceFilter, setSpaceFilter] = useState('');
	const visibleRules = rules.filter((rule) =>
		(!query || `${rule.name} ${conditionsSummary(rule)}`.toLowerCase().includes(query.toLowerCase())) &&
		(!stateFilter || (stateFilter === 'on') === !!rule.enabled) &&
		(!spaceFilter || String(rule.group_id) === spaceFilter)
	);

	const handleSave = async (payload) => {
		try {
			if (editing) {
				await API.put(`${REST_BASE}/rules/${editing.id}`, payload);
				notify(__('Rule updated.', 'zencommunity'));
			} else {
				await API.post(`${REST_BASE}/rules`, payload);
				notify(__('Rule created.', 'zencommunity'));
			}
			setFormOpen(false);
			fetchRules();
		} catch (error) {
			notify(error?.response?.data?.message || __('Could not save this rule.', 'zencommunity'), 'error');
		}
	};

	const handleDelete = async (rule) => {
		try {
			await API.delete(`${REST_BASE}/rules/${rule.id}`);
			setRules((prev) => prev.filter((r) => r.id !== rule.id));
			notify(__('Rule removed.', 'zencommunity'));
		} catch (error) {
			notify(error?.response?.data?.message || __('Could not remove this rule.', 'zencommunity'), 'error');
		}
	};

	const toggleEnabled = async (rule, enabled) => {
		setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled } : r)));
		try {
			await API.put(`${REST_BASE}/rules/${rule.id}`, { ...rule, enabled });
		} catch (error) {
			setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !enabled } : r)));
			notify(error?.response?.data?.message || __('Could not update this rule.', 'zencommunity'), 'error');
		}
	};

	return (
		<div className="tw-flex tw-flex-col tw-gap-4">
			<div className="tw-flex tw-items-center tw-justify-end">
				<PrimaryButton onClick={() => { setEditing(null); setFormOpen(true); }}>
					+ {__('Add Rule', 'zencommunity')}
				</PrimaryButton>
			</div>

			{!loaded ? (
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.ColumnHeader>{__('Status', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader>{__('Rule Name', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader>{__('Conditions', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader>{__('Target Space', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader className="tw-text-right">{__('Actions', 'zencommunity')}</Table.ColumnHeader>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						<Table.Loading colSpan={5} />
					</Table.Body>
				</Table.Root>
			) : rules.length === 0 ? (
				<EmptyState icon={LuGitBranch}>
					<p className="tw-m-0 tw-font-medium tw-text-zc-fg">{__('No rules yet', 'zencommunity')}</p>
					<p className="tw-m-0">{__('Posts route to the default Space. Add a rule to send specific content elsewhere.', 'zencommunity')}</p>
					<PrimaryButton className="tw-mt-2" onClick={() => { setEditing(null); setFormOpen(true); }}>
						+ {__('Add Rule', 'zencommunity')}
					</PrimaryButton>
				</EmptyState>
			) : (
				<Table.Root
					toolbar={
						<Table.Toolbar
							search={{ value: query, onChange: setQuery, placeholder: __('Search rules…', 'zencommunity') }}
							filters={[
								{
									key: 'state',
									label: __('Status', 'zencommunity'),
									icon: LuCircleDot,
									options: [
										{ label: __('Enabled', 'zencommunity'), value: 'on' },
										{ label: __('Disabled', 'zencommunity'), value: 'off' },
									],
									value: stateFilter,
									onChange: setStateFilter,
								},
								{
									key: 'space',
									label: __('Target Space', 'zencommunity'),
									icon: LuLayoutGrid,
									options: [...new Set(rules.map((r) => String(r.group_id)))].map((id) => ({ label: groupName(id), value: id })),
									value: spaceFilter,
									onChange: setSpaceFilter,
								},
							]}
							onReset={() => { setQuery(''); setStateFilter(''); setSpaceFilter(''); }}
						/>
					}
				>
					<Table.Header>
						<Table.Row>
							<Table.ColumnHeader>{__('Status', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader>{__('Rule Name', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader>{__('Conditions', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader>{__('Target Space', 'zencommunity')}</Table.ColumnHeader>
							<Table.ColumnHeader className="tw-text-right">{__('Actions', 'zencommunity')}</Table.ColumnHeader>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{visibleRules.length === 0 && (
							<Table.Empty colSpan={5} searching title={__('No rules found', 'zencommunity')} description={__('Try a different search, or clear the filters.', 'zencommunity')} />
						)}
						{visibleRules.map((rule) => (
							<Table.Row key={rule.id}>
								<Table.Cell>
									<Toggle checked={!!rule.enabled} onChange={(v) => toggleEnabled(rule, v)} />
								</Table.Cell>
								<Table.Cell><strong className="tw-font-medium tw-text-zc-fg">{rule.name}</strong></Table.Cell>
								<Table.Cell className="tw-text-zc-muted">{conditionsSummary(rule)}</Table.Cell>
								<Table.Cell>{groupName(rule.group_id)}</Table.Cell>
								<Table.Cell>
									<Table.Actions>
										<Table.Action icon={LuPencil} label={__('Edit rule', 'zencommunity')} onClick={() => { setEditing(rule); setFormOpen(true); }} />
										<Table.Action icon={LuTrash2} tone="danger" label={__('Delete rule', 'zencommunity')} onClick={() => handleDelete(rule)} />
									</Table.Actions>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Root>
			)}

			{formOpen && (
				<RuleFormModal
					rule={editing}
					groups={groups}
					onSave={handleSave}
					onClose={() => setFormOpen(false)}
				/>
			)}
		</div>
	);
};

export default Rules;
