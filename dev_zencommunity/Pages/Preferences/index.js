import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { API, namespace } from '@Utils/helper';

/**
 * Member self-service preferences. Currently exposes per-user notification
 * preferences. Built with Tailwind (the app is migrating off Chakra) and themed
 * via the existing --zencom-* CSS variables so light/dark just works.
 */

const Toggle = ({ checked, onChange, label, id }) => (
	<button
		type="button"
		role="switch"
		id={id}
		aria-checked={checked}
		aria-label={label}
		onClick={() => onChange(!checked)}
		className={[
			'tw-relative tw-inline-flex tw-h-6 tw-w-11 tw-flex-shrink-0 tw-items-center tw-rounded-full',
			'tw-transition-colors tw-duration-200 focus:tw-outline-none',
			checked ? 'tw-bg-zc-primary' : 'tw-bg-zc-border',
		].join(' ')}
	>
		<span
			className={[
				'tw-inline-block tw-h-4 tw-w-4 tw-transform tw-rounded-full tw-bg-white tw-shadow',
				'tw-transition-transform tw-duration-200',
				checked ? 'tw-translate-x-6' : 'tw-translate-x-1',
			].join(' ')}
		/>
	</button>
);

const Preferences = () => {
	const [categories, setCategories] = useState({});
	const [prefs, setPrefs] = useState({});
	const [digestFrequencies, setDigestFrequencies] = useState({});
	const [digestFrequency, setDigestFrequency] = useState('instant');
	const [loading, setLoading] = useState(true);
	const [savingKey, setSavingKey] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		let active = true;
		API.get(namespace + '/member/notification-preferences')
			.then(({ data }) => {
				if (!active) return;
				setCategories(data?.categories || {});
				setPrefs(data?.preferences || {});
				setDigestFrequencies(data?.digest_frequencies || {});
				setDigestFrequency(data?.digest_frequency || 'instant');
			})
			.catch(() => active && setError(__('Could not load your preferences.', 'zencommunity')))
			.finally(() => active && setLoading(false));
		return () => { active = false; };
	}, []);

	const handleToggle = async (key, value) => {
		const previous = prefs;
		const next = { ...prefs, [key]: value };
		setPrefs(next); // optimistic
		setSavingKey(key);
		setError(null);
		try {
			const { data } = await API.post(namespace + '/member/notification-preferences', {
				preferences: next,
			});
			if (data?.preferences) setPrefs(data.preferences);
		} catch (e) {
			setPrefs(previous); // rollback
			setError(__('Could not save that change. Please try again.', 'zencommunity'));
		} finally {
			setSavingKey(null);
		}
	};

	const handleDigestChange = async (value) => {
		const previous = digestFrequency;
		setDigestFrequency(value); // optimistic
		setSavingKey('__digest_frequency');
		setError(null);
		try {
			const { data } = await API.post(namespace + '/member/notification-preferences', {
				digest_frequency: value,
			});
			if (data?.digest_frequency) setDigestFrequency(data.digest_frequency);
		} catch (e) {
			setDigestFrequency(previous); // rollback
			setError(__('Could not save that change. Please try again.', 'zencommunity'));
		} finally {
			setSavingKey(null);
		}
	};

	return (
		<div className="tw-mx-auto tw-w-full tw-max-w-2xl tw-p-4 md:tw-p-6">
			<div className="tw-mb-6">
				<h1 className="tw-text-2xl tw-font-semibold tw-text-zc-fg">
					{__('Preferences', 'zencommunity')}
				</h1>
				<p className="tw-mt-1 tw-text-sm tw-text-zc-muted">
					{__('Control which notifications you receive.', 'zencommunity')}
				</p>
			</div>

			<div className="tw-rounded-sm tw-border tw-border-zc-border tw-bg-zc-bg tw-border tw-border-solid tw-border-zc-border">
				<div className="tw-border-b tw-border-zc-border tw-px-5 tw-py-4">
					<h2 className="tw-text-base tw-font-medium tw-text-zc-fg">
						{__('Notifications', 'zencommunity')}
					</h2>
				</div>

				{error && (
					<div className="tw-mx-5 tw-mt-4 tw-rounded-md tw-border tw-border-zc-warning tw-bg-zc-warning/10 tw-px-3 tw-py-2 tw-text-sm tw-text-zc-warning">
						{error}
					</div>
				)}

				{loading ? (
					<div className="tw-divide-y tw-divide-zc-border">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="tw-flex tw-items-center tw-justify-between tw-px-5 tw-py-4">
								<div className="tw-h-4 tw-w-48 tw-animate-pulse tw-rounded tw-bg-zc-border" />
								<div className="tw-h-6 tw-w-11 tw-animate-pulse tw-rounded-full tw-bg-zc-border" />
							</div>
						))}
					</div>
				) : (
					<ul className="tw-divide-y tw-divide-zc-border tw-p-0 tw-m-0" >
						{Object.entries(categories).map(([key, label]) => (
							<li key={key} className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-px-5 tw-py-4">
								<label htmlFor={`notif-${key}`} className="tw-cursor-pointer tw-text-sm tw-text-zc-fg">
									{label}
								</label>
								<div className="tw-flex tw-items-center tw-gap-2">
									{savingKey === key && (
										<span className="tw-text-xs tw-text-zc-muted">{__('Saving…', 'zencommunity')}</span>
									)}
									<Toggle
										id={`notif-${key}`}
										label={label}
										checked={prefs[key] !== false}
										onChange={(v) => handleToggle(key, v)}
									/>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="tw-mt-6 tw-rounded-sm tw-border tw-border-zc-border tw-bg-zc-bg tw-border tw-border-solid tw-border-zc-border">
				<div className="tw-border-b tw-border-zc-border tw-px-5 tw-py-4">
					<h2 className="tw-text-base tw-font-medium tw-text-zc-fg">
						{__('Email delivery', 'zencommunity')}
					</h2>
					<p className="tw-mt-1 tw-text-xs tw-text-zc-muted">
						{__('Choose how often we email you about the notifications above — right away, or batched into one digest.', 'zencommunity')}
					</p>
				</div>

				{loading ? (
					<div className="tw-px-5 tw-py-4">
						<div className="tw-h-8 tw-w-48 tw-animate-pulse tw-rounded tw-bg-zc-border" />
					</div>
				) : (
					<div className="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-px-5 tw-py-4">
						<label htmlFor="digest-frequency" className="tw-text-sm tw-text-zc-fg">
							{__('Email frequency', 'zencommunity')}
						</label>
						<div className="tw-flex tw-items-center tw-gap-2">
							{savingKey === '__digest_frequency' && (
								<span className="tw-text-xs tw-text-zc-muted">{__('Saving…', 'zencommunity')}</span>
							)}
							<select
								id="digest-frequency"
								value={digestFrequency}
								onChange={(e) => handleDigestChange(e.target.value)}
								className="tw-appearance-none tw-rounded-md tw-border tw-border-zc-border tw-bg-zc-bg tw-bg-[length:1rem] tw-bg-[right_0.6rem_center] tw-bg-no-repeat tw-py-1.5 tw-pl-3 tw-pr-8 tw-text-sm tw-text-zc-fg tw-bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20stroke%3D%22%23808080%22%20stroke-width%3D%221.5%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')]"
							>
								{Object.entries(digestFrequencies).map(([value, label]) => (
									<option key={value} value={value}>{label}</option>
								))}
							</select>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default Preferences;
