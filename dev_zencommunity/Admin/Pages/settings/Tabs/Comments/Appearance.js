import React, { useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { updateCommunitySettings } from '@Redux/slices/settingsSlice/settingsSlice';
import { RowCard, Field, TextField, Toggle, PrimaryButton } from '../../../../Components/ui';

/**
 * Widget-facing settings for the compact comment embed WpComments
 * renders on the front end (see PHP ContentEmbed::append_embed()) — title,
 * how many comments show before "load more", and the Space link.
 *
 * Self-contained, like Badges/Migration/etc.: reads the shared settings
 * blob straight off Redux instead of the Formik context settings/index.js
 * wires around the "general" tab, since this tab renders outside that
 * wrapper. Saving spreads the full current settings object so unrelated
 * keys never get clobbered by this form's narrower payload.
 */
const Appearance = () => {
	const dispatch = useDispatch();
	const settings = useSelector((state) => state.settings.data.settings) ?? {};
	const [values, setValues] = useState({
		wp_sync_widget_title: settings.wp_sync_widget_title ?? __('Community Discussion', 'zencommunity'),
		wp_sync_comment_limit: settings.wp_sync_comment_limit ?? 0,
		wp_sync_show_space_link: settings.wp_sync_show_space_link ?? true,
	});
	const [saving, setSaving] = useState(false);

	const set = (key) => (val) => setValues((prev) => ({ ...prev, [key]: val }));

	const handleSave = async () => {
		setSaving(true);
		try {
			await dispatch(updateCommunitySettings({ ...settings, ...values })).unwrap();
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="tw-flex tw-flex-col tw-gap-4">
			<div className="tw-flex tw-items-center tw-justify-end">
				<PrimaryButton onClick={handleSave} disabled={saving}>
					{saving ? __('Saving…', 'zencommunity') : __('Save changes', 'zencommunity')}
				</PrimaryButton>
			</div>

			<RowCard>
				<div className="tw-flex tw-w-full tw-flex-col tw-gap-5">
					<Field label={__('Widget title', 'zencommunity')} hint={__('Heading shown above the embedded discussion.', 'zencommunity')}>
						<TextField
							value={values.wp_sync_widget_title}
							onChange={set('wp_sync_widget_title')}
							placeholder={__('e.g., Join the conversation', 'zencommunity')}
						/>
					</Field>

					<Field label={__('Comments display limit', 'zencommunity')} hint={__('Comments shown initially. 0 = default.', 'zencommunity')}>
						<TextField
							type="number"
							value={values.wp_sync_comment_limit}
							onChange={(v) => set('wp_sync_comment_limit')(Math.max(0, Number(v) || 0))}
						/>
					</Field>

					<Toggle
						label={__('Show Space link', 'zencommunity')}
						checked={!!values.wp_sync_show_space_link}
						onChange={set('wp_sync_show_space_link')}
					/>
				</div>
			</RowCard>
		</div>
	);
};

export default Appearance;
