import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useDispatch } from 'react-redux';
import Select from 'react-select';
import ZCLabel from '../../../../Components/Label';
import Subtext from '../../../../Components/Subtext';
import LoadingButton from '../../../../Components/LoadingButton';
import { Separator, Toggle, Skeleton } from '../../../../Components/ui';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { fetchAcademySettings, saveAcademySettings } from '@Pages/Courses/api';

const Row = ({ title, desc, children }) => (
	<div className="tw-flex tw-w-full tw-items-start tw-justify-between tw-gap-6">
		<div className="tw-flex tw-w-full tw-flex-col tw-gap-1">
			<ZCLabel type="basic" label={title} margin="0" />
			{desc && <Subtext>{desc}</Subtext>}
		</div>
		<div className="tw-shrink-0">{children}</div>
	</div>
);

const SectionTitle = ({ children }) => (
	<ZCLabel type="bold" label={children} margin="0" />
);

const PolicySettings = () => {
	const dispatch = useDispatch();
	const [settings, setSettings] = useState(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		fetchAcademySettings().then(setSettings).catch(() => {});
	}, []);

	if (!settings) {
		return (
			<div className="tw-mt-6 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
				<div className="tw-mb-5 tw-flex tw-items-center tw-justify-between">
					<div className="tw-flex tw-flex-col tw-gap-1">
						<Skeleton className="tw-h-4 tw-w-48" />
						<Skeleton className="tw-h-3.5 tw-w-64" />
					</div>
					<Skeleton className="tw-h-9 tw-w-32 tw-rounded-md" />
				</div>
				<div className="tw-flex tw-flex-col tw-gap-5">
					{[...Array(6)].map((_, idx) => (
						<div key={idx} className="tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-6">
							<Skeleton className="tw-h-3.5 tw-w-1/2" />
							<Skeleton className="tw-h-8 tw-w-[160px] tw-shrink-0 tw-rounded" />
						</div>
					))}
				</div>
			</div>
		);
	}

	const set = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

	const save = async () => {
		setSaving(true);
		try {
			const saved = await saveAcademySettings(settings);
			setSettings(saved);
			dispatch(showNotification({ isShow: true, type: 'success', message: __('Course settings saved.', 'zencommunity') }));
		} catch (e) {
			dispatch(showNotification({ isShow: true, type: 'error', message: __('Could not save settings.', 'zencommunity') }));
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="zencom-animate-fade tw-mt-6 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
			<div className="tw-mb-5 tw-flex tw-items-center tw-justify-between">
				<div className="tw-flex tw-flex-col tw-gap-1">
					<ZCLabel type="bold" label={__('Course access & behavior', 'zencommunity')} margin="0" />
					<Subtext>{__('Site-wide defaults. Each group can override the access rules.', 'zencommunity')}</Subtext>
				</div>
				<LoadingButton
					onClick={save}
					loading={saving}
					className="tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-1.5 tw-rounded tw-border-0 tw-bg-zc-primary tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white hover:tw-opacity-90 disabled:tw-cursor-not-allowed disabled:tw-opacity-50"
				>
					{__('Save changes', 'zencommunity')}
				</LoadingButton>
			</div>

			<div className="tw-flex tw-flex-col tw-gap-5">
				<SectionTitle>{__('Membership & access', 'zencommunity')}</SectionTitle>

				<Row title={__('Members get free course access', 'zencommunity')} desc={__('Active members of a course’s group can take it for free (paid courses become free for members).', 'zencommunity')}>
					<Toggle value={!!settings.membership_grants_access} onChange={() => set('membership_grants_access', !settings.membership_grants_access)} />
				</Row>
				<Row title={__('Auto-join community on enrollment', 'zencommunity')} desc={__('Enrolling in or buying a course adds the student to its linked community space(s).', 'zencommunity')}>
					<Toggle value={!!settings.auto_join_on_enroll} onChange={() => set('auto_join_on_enroll', !settings.auto_join_on_enroll)} />
				</Row>
				<Row title={__('Role when auto-joined', 'zencommunity')} desc={__('Which role new members get when added through a course.', 'zencommunity')}>
					<Select
						classNamePrefix="zen-com-select"
						className="zen-com-select zen-com-select--164"
						options={[{ value: 'member', label: __('Member', 'zencommunity') }, { value: 'moderator', label: __('Moderator', 'zencommunity') }]}
						value={[{ value: 'member', label: __('Member', 'zencommunity') }, { value: 'moderator', label: __('Moderator', 'zencommunity') }].find((o) => o.value === settings.auto_join_role) || null}
						onChange={(option) => set('auto_join_role', option ? option.value : '')}
					/>
				</Row>
				<Row title={__('Revoke access on leave / refund', 'zencommunity')} desc={__('Remove the auto-joined membership when a course is refunded or the student leaves.', 'zencommunity')}>
					<Toggle value={!!settings.revoke_on_leave} onChange={() => set('revoke_on_leave', !settings.revoke_on_leave)} />
				</Row>

				<Separator />

				<SectionTitle>{__('Purchase & enrollment flow', 'zencommunity')}</SectionTitle>

				<Row title={__('Checkout style', 'zencommunity')} desc={__('How the purchase screen opens from a course.', 'zencommunity')}>
					<Select
						classNamePrefix="zen-com-select"
						className="zen-com-select zen-com-select--200"
						options={[
							{ value: 'drawer', label: __('Slide-over (in community)', 'zencommunity') },
							{ value: 'redirect', label: __('Redirect to checkout', 'zencommunity') },
							{ value: 'new_tab', label: __('Open in new tab', 'zencommunity') },
						]}
						value={[
							{ value: 'drawer', label: __('Slide-over (in community)', 'zencommunity') },
							{ value: 'redirect', label: __('Redirect to checkout', 'zencommunity') },
							{ value: 'new_tab', label: __('Open in new tab', 'zencommunity') },
						].find((o) => o.value === settings.checkout_mode) || null}
						onChange={(option) => set('checkout_mode', option ? option.value : '')}
					/>
				</Row>
				<Row title={__('Allow one-click free enroll', 'zencommunity')} desc={__('Let members enroll in free courses directly from the community.', 'zencommunity')}>
					<Toggle value={!!settings.allow_free_enroll} onChange={() => set('allow_free_enroll', !settings.allow_free_enroll)} />
				</Row>
				<Row title={__('Require login before enroll / buy', 'zencommunity')} desc={__('Send guests to sign in before they can enroll or purchase.', 'zencommunity')}>
					<Toggle value={!!settings.require_login} onChange={() => set('require_login', !settings.require_login)} />
				</Row>

				<Separator />

				<SectionTitle>{__('Learning & visibility', 'zencommunity')}</SectionTitle>

				<Row title={__('Lesson player', 'zencommunity')} desc={__('Show lessons inside the community shell, or send students to the Academy page.', 'zencommunity')}>
					<Select
						classNamePrefix="zen-com-select"
						className="zen-com-select zen-com-select--200"
						options={[
							{ value: 'embed', label: __('Inside community', 'zencommunity') },
							{ value: 'redirect', label: __('Academy page', 'zencommunity') },
						]}
						value={[
							{ value: 'embed', label: __('Inside community', 'zencommunity') },
							{ value: 'redirect', label: __('Academy page', 'zencommunity') },
						].find((o) => o.value === settings.learn_mode) || null}
						onChange={(option) => set('learn_mode', option ? option.value : '')}
					/>
				</Row>
				<Row title={__('Show Courses catalog & menu', 'zencommunity')} desc={__('Expose the standalone Courses catalog and its menu item.', 'zencommunity')}>
					<Toggle value={!!settings.show_catalog} onChange={() => set('show_catalog', !settings.show_catalog)} />
				</Row>
				<Row title={__('Route Academy pages into the community', 'zencommunity')} desc={__('Redirect Academy’s own course archive / single pages to the in-community equivalents.', 'zencommunity')}>
					<Toggle value={!!settings.native_pages} onChange={() => set('native_pages', !settings.native_pages)} />
				</Row>
			</div>
		</div>
	);
};

export default PolicySettings;
