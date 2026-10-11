import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { updateCommunitySettings } from '@Redux/slices/settingsSlice/settingsSlice';
import { API, namespace } from '@Utils/helper';
import { RowCard, Field, Checkbox, Toggle, PrimarySelect, PrimaryButton, Separator, Skeleton } from '../../../../Components/ui';

/**
 * Enable/target-post-types/default-Space/default-author — the same four
 * fields the classic admin.php?page=zenc-wp-content-sync page exposes,
 * rebuilt against this SPA's own component kit. Post types + groups + the
 * eligible-authors list are all addon-owned REST resources fetched
 * directly (Badges' pattern), not routed through shared Redux slices meant
 * for other screens' state.
 */
const General = () => {
	const dispatch = useDispatch();
	const settings = useSelector((state) => state.settings.data.settings) ?? {};

	const [postTypes, setPostTypes] = useState([]);
	const [groups, setGroups] = useState([]);
	const [authors, setAuthors] = useState([]);
	const [loaded, setLoaded] = useState(false);
	const [saving, setSaving] = useState(false);

	const [values, setValues] = useState({
		wp_sync_enabled: false,
		wp_sync_post_types: ['post'],
		wp_sync_default_group_id: 0,
		wp_sync_author_strategy: 'post_author',
		wp_sync_default_author_id: 0,
	});

	useEffect(() => {
		Promise.all([
			API.get(`${namespace}/wp-content-sync/meta`),
			API.get(`${namespace}/groups`, { params: { per_page: 100 } }),
			API.get(`${namespace}/wp-content-sync/eligible-authors`),
		]).then(([meta, groupsRes, authorsRes]) => {
			setPostTypes(meta.data?.post_types ?? []);
			setGroups(groupsRes.data?.records ?? groupsRes.data ?? []);
			setAuthors(authorsRes.data ?? []);
		}).catch(() => {
			// Leave the lists empty rather than throwing an unhandled rejection
			// (e.g. the add-on's routes aren't registered yet).
		}).finally(() => setLoaded(true));
	}, []);

	useEffect(() => {
		if (!settings || Object.keys(settings).length === 0) return;
		setValues({
			wp_sync_enabled: !!settings.wp_sync_enabled,
			wp_sync_post_types: settings.wp_sync_post_types ?? ['post'],
			wp_sync_default_group_id: settings.wp_sync_default_group_id ?? 0,
			wp_sync_author_strategy: settings.wp_sync_author_strategy ?? 'post_author',
			wp_sync_default_author_id: settings.wp_sync_default_author_id ?? 0,
		});
	}, [settings]);

	const set = (key) => (val) => setValues((prev) => ({ ...prev, [key]: val }));

	const togglePostType = (name, checked) => {
		setValues((prev) => ({
			...prev,
			// includes() guard: defensive de-dupe, not load-bearing for
			// correctness (the real fix is the settings-save merge in core
			// PHP no longer leaving stale array entries behind), but a
			// toggle should still never be able to add the same value twice.
			wp_sync_post_types: checked
				? (prev.wp_sync_post_types.includes(name) ? prev.wp_sync_post_types : [...prev.wp_sync_post_types, name])
				: prev.wp_sync_post_types.filter((p) => p !== name),
		}));
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await dispatch(updateCommunitySettings({ ...settings, ...values })).unwrap();
		} finally {
			setSaving(false);
		}
	};

	const groupOptions = [
		{ value: 0, label: __('No default Space', 'zencommunity') },
		...groups.map((g) => ({ value: Number(g.id), label: g.name })),
	];

	const authorOptions = [
		{ value: 0, label: __('Select an account', 'zencommunity') },
		...authors.map((u) => ({ value: Number(u.id), label: u.name })),
	];

	if (!loaded) {
		return (
			<div className="tw-flex tw-flex-col tw-gap-4">
				<div className="tw-flex tw-items-center tw-justify-end">
					<Skeleton className="tw-h-9 tw-w-32 tw-rounded-md" />
				</div>
				<RowCard>
					<div className="tw-flex tw-w-full tw-flex-col tw-gap-5">
						<Skeleton className="tw-h-5 tw-w-24 tw-rounded-full" />
						<Skeleton className="tw-h-3.5 tw-w-2/3" />
						<Separator />
						<Skeleton className="tw-h-3.5 tw-w-32" />
						<div className="tw-flex tw-flex-wrap tw-gap-x-6 tw-gap-y-2">
							<Skeleton className="tw-h-4 tw-w-20" />
							<Skeleton className="tw-h-4 tw-w-20" />
							<Skeleton className="tw-h-4 tw-w-20" />
						</div>
						<Skeleton className="tw-h-3.5 tw-w-28" />
						<Skeleton className="tw-h-9 tw-w-full tw-rounded" />
						<Skeleton className="tw-h-3.5 tw-w-40" />
						<Skeleton className="tw-h-9 tw-w-full tw-rounded" />
					</div>
				</RowCard>
			</div>
		);
	}

	return (
		<div className="tw-flex tw-flex-col tw-gap-4">
			<div className="tw-flex tw-items-center tw-justify-end">
				<PrimaryButton onClick={handleSave} disabled={saving}>
					{saving ? __('Saving…', 'zencommunity') : __('Save changes', 'zencommunity')}
				</PrimaryButton>
			</div>

			<RowCard>
				<div className="tw-flex tw-w-full tw-flex-col tw-gap-5">
					{/* Title + caption on the left, switch on the right, then a rule
					    with no extra margin (wp-admin's own <hr> margin was doubling
					    the flex gap into a large blank band here). */}
					<div className="tw-flex tw-items-start tw-justify-between tw-gap-4">
						<div className="tw-flex tw-flex-col tw-gap-1">
							<span className="tw-text-[14px] tw-font-medium tw-text-zc-fg">{__('Enable', 'zencommunity')}</span>
							<span className="tw-text-sm tw-text-zc-muted">
								{__('Replace WordPress comments with ZenCommunity discussions.', 'zencommunity')}
							</span>
						</div>
						<Toggle
							checked={values.wp_sync_enabled}
							onChange={set('wp_sync_enabled')}
						/>
					</div>

					<Separator className="tw-m-0" />

					<Field label={__('Target post types', 'zencommunity')} hint={__('Which content types get the new discussions.', 'zencommunity')}>
						<div className="tw-flex tw-flex-wrap tw-gap-x-6 tw-gap-y-2">
							{postTypes.map((pt) => (
								<Checkbox
									key={pt.name}
									label={pt.label}
									checked={values.wp_sync_post_types.includes(pt.name)}
									onChange={(checked) => togglePostType(pt.name, checked)}
								/>
							))}
						</div>
					</Field>

					<Field label={__('Default Space', 'zencommunity')} hint={__('Used if no assignment rule matches.', 'zencommunity')}>
						<PrimarySelect
							value={values.wp_sync_default_group_id}
							onChange={(v) => set('wp_sync_default_group_id')(Number(v))}
							options={groupOptions}
							menuPlacement="auto"
						/>
					</Field>

					<Field
						label={__('Default comment author', 'zencommunity')}
						hint={__('Owner of the community discussion created for each post. Lists anyone who can publish content — not just administrators.', 'zencommunity')}
					>
						<PrimarySelect
							value={values.wp_sync_author_strategy}
							onChange={set('wp_sync_author_strategy')}
							options={[
								{ value: 'post_author', label: __("The post's own author", 'zencommunity') },
								{ value: 'fixed_user', label: __('A specific account', 'zencommunity') },
							]}
							isSearchable={false}
							menuPlacement="auto"
						/>
					</Field>

					{values.wp_sync_author_strategy === 'fixed_user' && (
						<Field label={__('Author account', 'zencommunity')}>
							<PrimarySelect
								value={values.wp_sync_default_author_id}
								onChange={(v) => set('wp_sync_default_author_id')(Number(v))}
								options={authorOptions}
								menuPlacement="auto"
							/>
						</Field>
					)}
				</div>
			</RowCard>
		</div>
	);
};

export default General;
