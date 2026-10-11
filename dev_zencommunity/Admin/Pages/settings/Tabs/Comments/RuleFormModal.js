import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { IoClose } from 'react-icons/io5';
import { API, namespace } from '@Utils/helper';
import { Modal, Field, TextField, PrimarySelect, GhostButton, PrimaryButton, IconButton } from '../../../../Components/ui';

const REST_BASE = `${namespace}/wp-content-sync`;

const emptyCondition = (postTypes) => ({
	type: 'post_type',
	post_type: postTypes[0]?.name ?? 'post',
	taxonomy: '',
	term_id: 'all',
});

/**
 * A condition row's "value" side depends on its type — post type is a flat
 * select, taxonomy needs a second (taxonomy) + third (term, "any term" by
 * default) select, with terms fetched lazily per taxonomy so switching a
 * row's taxonomy doesn't require the parent to have pre-loaded every
 * taxonomy's full term list up front.
 */
const ConditionRow = ({ condition, postTypes, taxonomies, onChange, onRemove }) => {
	const [terms, setTerms] = useState([]);

	useEffect(() => {
		if (condition.type !== 'taxonomy' || !condition.taxonomy) {
			setTerms([]);
			return;
		}
		API.get(`${REST_BASE}/terms`, { params: { taxonomy: condition.taxonomy } }).then(({ data }) => {
			setTerms(Array.isArray(data) ? data : []);
		});
	}, [condition.type, condition.taxonomy]);

	const isTaxonomy = condition.type === 'taxonomy';

	// One grid row per condition: equal-width notched selects (labels rest on
	// the border, float up on focus — rows are spaced to leave room for that)
	// and the remove button vertically centred on the boxes.
	return (
		<div className={`tw-grid tw-items-end tw-gap-3 ${isTaxonomy ? 'tw-grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]' : 'tw-grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'}`}>
			<PrimarySelect
				label={__('Condition', 'zencommunity')}
				value={condition.type}
				onChange={(type) => onChange(type === 'post_type'
					? { type, post_type: postTypes[0]?.name ?? 'post', taxonomy: '', term_id: 'all' }
					: { type, post_type: '', taxonomy: taxonomies[0]?.name ?? '', term_id: 'all' })}
				options={[
					{ value: 'post_type', label: __('Post Type', 'zencommunity') },
					{ value: 'taxonomy', label: __('Taxonomy', 'zencommunity') },
				]}
				isSearchable={false}
				menuPlacement="auto"
			/>

			{isTaxonomy ? (
				<>
					<PrimarySelect
						label={__('Taxonomy', 'zencommunity')}
						value={condition.taxonomy}
						onChange={(taxonomy) => onChange({ ...condition, taxonomy, term_id: 'all' })}
						options={taxonomies.map((t) => ({ value: t.name, label: t.label }))}
						menuPlacement="auto"
					/>
					<PrimarySelect
						label={__('Term', 'zencommunity')}
						value={condition.term_id}
						onChange={(term_id) => onChange({ ...condition, term_id: term_id === 'all' ? 'all' : Number(term_id) })}
						options={[
							{ value: 'all', label: __('Any term', 'zencommunity') },
							...terms.map((t) => ({ value: t.id, label: t.name })),
						]}
						menuPlacement="auto"
					/>
				</>
			) : (
				<PrimarySelect
					label={__('Value', 'zencommunity')}
					value={condition.post_type}
					onChange={(post_type) => onChange({ ...condition, post_type })}
					options={postTypes.map((pt) => ({ value: pt.name, label: pt.label }))}
					menuPlacement="auto"
				/>
			)}

			<IconButton aria-label={__('Remove condition', 'zencommunity')} onClick={onRemove} className="tw-mb-[5px]">
				<IoClose size={16} />
			</IconButton>
		</div>
	);
};

const RuleFormModal = ({ rule, groups, onSave, onClose }) => {
	const [postTypes, setPostTypes] = useState([]);
	const [taxonomies, setTaxonomies] = useState([]);
	const [name, setName] = useState(rule?.name ?? '');
	const [groupId, setGroupId] = useState(rule?.group_id ?? groups[0]?.id ?? 0);
	const [operator, setOperator] = useState(rule?.operator ?? 'all');
	const [conditions, setConditions] = useState(rule?.conditions ?? []);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		API.get(`${REST_BASE}/meta`).then(({ data }) => {
			setPostTypes(data?.post_types ?? []);
			setTaxonomies(data?.taxonomies ?? []);
			setConditions((prev) => (prev.length ? prev : [emptyCondition(data?.post_types ?? [])]));
		});
	}, []);

	const updateCondition = (idx, next) => {
		setConditions((prev) => prev.map((c, i) => (i === idx ? next : c)));
	};

	const removeCondition = (idx) => {
		setConditions((prev) => prev.filter((_, i) => i !== idx));
	};

	const handleSubmit = async () => {
		setError('');
		if (!name.trim()) {
			setError(__('Rule name is required.', 'zencommunity'));
			return;
		}
		if (!groupId) {
			setError(__('Target space is required.', 'zencommunity'));
			return;
		}
		if (!conditions.length) {
			setError(__('A rule needs at least one condition.', 'zencommunity'));
			return;
		}

		setSaving(true);
		try {
			await onSave({ name, group_id: Number(groupId), operator, conditions });
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal title={__('Rule Builder', 'zencommunity')} onClose={onClose} size="lg" footer={
			<>
				<GhostButton onClick={onClose}>{__('Cancel', 'zencommunity')}</GhostButton>
				<PrimaryButton onClick={handleSubmit} disabled={saving}>
					{saving ? __('Saving…', 'zencommunity') : __('Apply Rule', 'zencommunity')}
				</PrimaryButton>
			</>
		}>
			<Field label={__('Rule Name', 'zencommunity')} required>
				<TextField value={name} onChange={setName} placeholder={__('e.g., Featured News Rule', 'zencommunity')} autoFocus />
			</Field>

			<Field label={__('Target Space', 'zencommunity')} required>
				<PrimarySelect
					value={groupId}
					onChange={(v) => setGroupId(Number(v))}
					menuPlacement="auto"
					options={[
						{ value: 0, label: __('-- Select a space --', 'zencommunity') },
						...groups.map((g) => ({ value: Number(g.id), label: g.name })),
					]}
				/>
			</Field>

			<Field label={__('Evaluation Logic', 'zencommunity')}>
				<PrimarySelect
					value={operator}
					onChange={setOperator}
					isSearchable={false}
					menuPlacement="auto"
					options={[
						{ value: 'all', label: __('Match ALL conditions (AND)', 'zencommunity') },
						{ value: 'any', label: __('Match ANY condition (OR)', 'zencommunity') },
					]}
				/>
			</Field>

			<div className="tw-flex tw-flex-col tw-gap-5">
				<span className="tw-text-[14px] tw-font-medium tw-text-zc-fg">{__('Conditions', 'zencommunity')}</span>
				{conditions.map((condition, idx) => (
					<ConditionRow
						key={idx}
						condition={condition}
						postTypes={postTypes}
						taxonomies={taxonomies}
						onChange={(next) => updateCondition(idx, next)}
						onRemove={() => removeCondition(idx)}
					/>
				))}
				<div className="tw--mt-1">
					<GhostButton onClick={() => setConditions((prev) => [...prev, emptyCondition(postTypes)])}>
						+ {__('Add Condition', 'zencommunity')}
					</GhostButton>
				</div>
			</div>

			{error && <span className="tw-text-sm tw-text-red-500">{error}</span>}
		</Modal>
	);
};

export default RuleFormModal;
