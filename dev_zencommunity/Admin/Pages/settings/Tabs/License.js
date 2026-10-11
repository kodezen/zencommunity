import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { useDispatch, useSelector } from 'react-redux';
import {
	LuExternalLink,
	LuKey,
	LuLink,
	LuRefreshCw,
	LuRotateCcw,
} from 'react-icons/lu';
import { fetchInsightsStatus, setInsightsOptIn } from '@Redux/slices/licenseSlice/licenseSlice';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { API, plugin_root_url } from '@Utils/helper';
import ZenComTopBar from '../../../Components/ZenComTopBar';
import Subtext from '../../../Components/Subtext';
import PrimaryButton from '../../../Components/ui/PrimaryButton';
import GhostButton from '../../../Components/ui/GhostButton';
import LoadingButton from '../../../Components/LoadingButton';
import Toggle from '../../../Components/ui/Toggle';

const getSdk = () => window?.ZencommunityGlobal?.SeSdk || {};

const defaultLicense = {
	license: '',
	status: 'inactive',
	device_id: '',
	slug: 0,
	product_id: 0,
	remaining: 0,
	activations: 0,
	limit: 1,
	unlimited: 0,
	expires: 0,
	updated_at: '',
};

const request = (endpoint, payload = {}) => API.post(getSdk().rest_url + endpoint, payload);
const getData = (endpoint, payload) => API.get(getSdk().rest_url + endpoint, { params: payload });

function compareVersions(a, b) {
	const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
	const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
	const len = Math.max(pa.length, pb.length);

	for (let i = 0; i < len; i++) {
		const ai = pa[i] || 0;
		const bi = pb[i] || 0;
		if (ai !== bi) return ai < bi ? -1 : 1;
	}

	return 0;
}

function timeAgo(unix) {
	if (!unix) return __('never', 'zencommunity');
	const seconds = Math.max(0, Math.floor(Date.now() / 1000 - unix));
	if (seconds < 60) return __('just now', 'zencommunity');
	if (seconds < 3600) return sprintf(__('%d min ago', 'zencommunity'), Math.floor(seconds / 60));
	if (seconds < 86400) return sprintf(__('%d hr ago', 'zencommunity'), Math.floor(seconds / 3600));
	return sprintf(__('%d days ago', 'zencommunity'), Math.floor(seconds / 86400));
}

function formatDate(value, fallback = __('N/A', 'zencommunity')) {
	if (!value) return fallback;
	const date = new Date(String(value).replace(' ', 'T') + 'Z');
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString();
}

function buildPurchaseUrl(base) {
	const sdk = getSdk();
	try {
		const url = new URL(base);
		url.searchParams.set('utm_source', 'storeengine-sdk');
		url.searchParams.set('utm_medium', 'license-form');
		url.searchParams.set('utm_campaign', 'license-activation-upsell');
		url.searchParams.set('utm_content', 'purchase-link');
		url.searchParams.set('utm_term', 'zencommunity');
		url.searchParams.set('locale', sdk?.locale || '');
		url.searchParams.set('wordpress', sdk?.wordpress || '');
		url.searchParams.set('sdk_version', sdk?.version || '');
		url.searchParams.set('instance', sdk?.device_id || '');
		return url.toString();
	} catch {
		return base;
	}
}

const License = () => {
	const dispatch = useDispatch();
	const insights = useSelector((state) => state.license);
	const sdk = getSdk();
	const supportsSdkRest = !!sdk?.rest_url;
	const [licenseKey, setLicenseKey] = useState('');
	const [licenseData, setLicenseData] = useState(sdk?.license || defaultLicense);
	const [optInData, setOptInData] = useState(sdk?.optin || { allowed: insights.allowed });
	const [isActivating, setIsActivating] = useState(false);
	const [isDeactivating, setIsDeactivating] = useState(false);
	const [isOptinLoading, setIsOptinLoading] = useState(false);
	const [isCheckingStatus, setIsCheckingStatus] = useState(false);
	const [updateState, setUpdateState] = useState(null);
	const [versions, setVersions] = useState(null);
	const [versionsLoading, setVersionsLoading] = useState(false);
	const [versionsError, setVersionsError] = useState(null);
	const [isChecking, setIsChecking] = useState(false);
	const [isInstalling, setIsInstalling] = useState(false);
	const [installLog, setInstallLog] = useState([]);
	const [confirmingBreaking, setConfirmingBreaking] = useState(null);
	const [savingBeta, setSavingBeta] = useState(false);

	const licenseStatus = licenseData?.status || '';
	const isFreePackage = licenseStatus === 'free' || !!sdk?.is_free;
	const supportsLicenseEndpoints = supportsSdkRest && !!sdk?.license && !isFreePackage;
	const isLicenseActive = licenseStatus === 'active' || (!licenseStatus && !!licenseData?.license);
	const isProductActive = isLicenseActive || !supportsLicenseEndpoints;
	const purchaseUrl = insights.purchaseUrl || buildPurchaseUrl('https://store.kodezen.com/product/zencommunity/');
	const packageName = insights.packageName || 'ZenCommunity';
	const packageVersion = insights.version || sdk?.package?.version || '';
	const deviceId = insights.deviceId || sdk?.device_id || licenseData?.device_id || '';

	useEffect(() => {
		dispatch(fetchInsightsStatus());
	}, [dispatch]);

	useEffect(() => {
		setOptInData((current) => ({ ...current, allowed: insights.allowed }));
	}, [insights.allowed]);

	const notifyError = useCallback((error, fallback) => {
		dispatch(showNotification({
			message: error?.response?.data?.message || error?.message || fallback,
			isShow: true,
			type: 'error',
		}));
	}, [dispatch]);

	const fetchStatus = useCallback(async () => {
		if (!supportsLicenseEndpoints) return;
		setIsCheckingStatus(true);
		try {
			const { data } = await getData('license/status', { force: true });
			setLicenseData(data);
		} catch (error) {
			notifyError(error, __('Failed to fetch license status.', 'zencommunity'));
		} finally {
			setIsCheckingStatus(false);
		}
	}, [notifyError, supportsLicenseEndpoints]);

	const refreshUpdateState = useCallback(async () => {
		if (!supportsSdkRest) return;
		try {
			const { data } = await getData('updates/status');
			setUpdateState(data);
		} catch (error) {
			// Older SDK builds may not expose update status. The license UI can continue without it.
		}
	}, [supportsSdkRest]);

	const refreshVersions = useCallback(async () => {
		if (!supportsSdkRest) return;
		setVersionsLoading(true);
		setVersionsError(null);
		try {
			const { data } = await getData('updates/versions');
			setVersions(data?.versions || []);
		} catch (error) {
			setVersions([]);
			setVersionsError({
				code: error?.response?.data?.code,
				message: error?.response?.data?.message || __('Failed to load version history.', 'zencommunity'),
			});
		} finally {
			setVersionsLoading(false);
		}
	}, [supportsSdkRest]);

	const refreshUpdateData = useCallback(() => {
		refreshUpdateState();
		refreshVersions();
	}, [refreshUpdateState, refreshVersions]);

	useEffect(() => {
		if (isProductActive && supportsSdkRest) refreshUpdateData();
	}, [isProductActive, supportsSdkRest, refreshUpdateData]);

	const handleActivate = async () => {
		if (!licenseKey.trim()) {
			dispatch(showNotification({ message: __('Please enter a license key.', 'zencommunity'), isShow: true, type: 'error' }));
			return;
		}
		setIsActivating(true);
		try {
			const { data: { license } } = await request('license/activate', { license: licenseKey.trim() });
			setLicenseData(license);
			setLicenseKey('');
			dispatch(showNotification({ message: __('License activated successfully.', 'zencommunity'), isShow: true, type: 'success' }));
			refreshUpdateData();
		} catch (error) {
			notifyError(error, __('Failed to activate license.', 'zencommunity'));
		} finally {
			setIsActivating(false);
		}
	};

	const handleDeactivate = async () => {
		setIsDeactivating(true);
		try {
			const { data: { license } } = await request('license/deactivate', {});
			setLicenseData(license);
			dispatch(showNotification({ message: __('License deactivated successfully.', 'zencommunity'), isShow: true, type: 'success' }));
		} catch (error) {
			notifyError(error, __('Failed to deactivate license.', 'zencommunity'));
		} finally {
			setIsDeactivating(false);
		}
	};

	const handleOptin = async (optin) => {
		setIsOptinLoading(true);
		try {
			if (supportsSdkRest) {
				const { data } = await request('insights/optin', { opt_in: optin });
				setOptInData(data);
			} else {
				await dispatch(setInsightsOptIn(optin)).unwrap();
			}
		} catch (error) {
			notifyError(error, __('Failed to update opt-in setting.', 'zencommunity'));
		} finally {
			setIsOptinLoading(false);
		}
	};

	const handleCheckNow = async () => {
		setIsChecking(true);
		try {
			const { data } = await request('updates/check-now', {});
			setUpdateState(data);
			dispatch(showNotification({
				message: data?.update_available
					? sprintf(__('Update available: v%s', 'zencommunity'), data.latest_version)
					: __("You're up to date.", 'zencommunity'),
				isShow: true,
				type: 'success',
			}));
		} catch (error) {
			notifyError(error, __('Could not check for updates.', 'zencommunity'));
		} finally {
			setIsChecking(false);
		}
	};

	const handleInstall = async (version) => {
		setIsInstalling(true);
		setInstallLog([{ level: 'info', message: __('Starting...', 'zencommunity'), time: Date.now() / 1000 }]);
		try {
			const { data } = await request('updates/install', version ? { version } : {});
			setInstallLog(data?.log || []);
			dispatch(showNotification({
				message: data?.is_rollback
					? sprintf(__('Rolled back to v%s', 'zencommunity'), data.target_version)
					: sprintf(__('Installed v%s', 'zencommunity'), data.target_version),
				isShow: true,
				type: 'success',
			}));
			setTimeout(() => window.location.reload(), 1500);
		} catch (error) {
			const log = error?.response?.data?.data?.log;
			if (log) setInstallLog(log);
			notifyError(error, __('Install failed.', 'zencommunity'));
			refreshUpdateState();
		} finally {
			setIsInstalling(false);
		}
	};

	const handleBeta = async (enabled) => {
		setSavingBeta(true);
		try {
			await request('settings/beta-channel', { enabled });
			setUpdateState((state) => ({ ...(state || {}), beta_enabled: enabled }));
			refreshUpdateState();
		} catch (error) {
			notifyError(error, __('Could not save beta setting.', 'zencommunity'));
		} finally {
			setSavingBeta(false);
		}
	};

	const updateAvailable = !!updateState?.update_available;
	const previousVersion = updateState?.previous_version;
	const autoUpdateOn = !!updateState?.auto_update_enabled;

	return (
		<div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[960px] tw-mx-auto tw-flex-col tw-gap-4 tw-p-3 tw-mb-[100px]">
			<ZenComTopBar
				isStickyScroll={true}
				title={__('License', 'zencommunity')}
				subtitle={__('Manage license, updates, and usage-data preferences for ZenCommunity.', 'zencommunity')}
			/>

			{isProductActive && supportsSdkRest && (
				<UpdatesPanel
					updateState={updateState}
					updateAvailable={updateAvailable}
					previousVersion={previousVersion}
					isChecking={isChecking}
					isInstalling={isInstalling}
					installLog={installLog}
					onCheck={handleCheckNow}
					onInstall={handleInstall}
				/>
			)}

			<div className="zencom-animate-fade tw-flex tw-flex-col tw-items-center tw-justify-center tw-rounded tw-bg-zc-bg tw-p-6 tw-text-center tw-border tw-border-solid tw-border-zc-border">
				{isLicenseActive && supportsLicenseEndpoints ? (
					<>
						<h2 className="tw-m-0 tw-mb-2 tw-border-none tw-p-0 tw-text-xl tw-font-medium tw-leading-[30px] tw-text-zc-fg">
							{__('ZenCommunity Pro - License Active', 'zencommunity')}
						</h2>
						<Subtext className="tw-block tw-max-w-[75%]">
							{__('You have access to automatic updates, priority support, and all pro tools.', 'zencommunity')}
						</Subtext>
						<BrandBadge />
						<div className="tw-mb-6 tw-flex tw-w-full tw-flex-wrap tw-items-center tw-justify-center tw-gap-4">
							<input
								type="text"
								className="tw-h-10 tw-min-w-[220px] tw-max-w-[360px] tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-4 tw-text-sm tw-text-zc-fg"
								value={licenseData?.license ?? ''}
								readOnly
							/>
							<LoadingButton
								loading={isDeactivating}
								onClick={handleDeactivate}
								className="tw-inline-flex tw-h-10 tw-cursor-pointer tw-items-center tw-rounded tw-border-0 tw-bg-red-600 tw-px-4 tw-text-sm tw-font-medium tw-text-white hover:tw-opacity-90 disabled:tw-cursor-not-allowed disabled:tw-opacity-50"
							>
								{isDeactivating ? __('Deactivating...', 'zencommunity') : __('Deactivate License', 'zencommunity')}
							</LoadingButton>
							{/* Store dashboard where the customer manages this license — comes
							from the SDK (store_dashboard_url, exposed as licenseData.storeDashboardUrl).
							Fall back to the SDK's default store dashboard, NOT a local admin page. */}
							<ExternalButton href={licenseData?.storeDashboardUrl || 'https://store.kodezen.com/dashboard/license-keys/'}>
								{__('Manage License', 'zencommunity')}
							</ExternalButton>
						</div>
					</>
				) : supportsLicenseEndpoints ? (
					<>
						<h2 className="tw-m-0 tw-mb-2 tw-border-none tw-p-0 tw-text-xl tw-font-medium tw-leading-[30px] tw-text-zc-fg">
							{__('Activate ZenCommunity Pro for updates & support.', 'zencommunity')}
						</h2>
						<Subtext className="tw-block tw-max-w-[75%]">
							{__('Activate ZenCommunity Pro to unlock automatic updates, priority support, and all premium features.', 'zencommunity')}
						</Subtext>
						<BrandBadge />
						<div className="tw-mb-6 tw-flex tw-w-full tw-flex-wrap tw-items-center tw-justify-center tw-gap-4">
							<input
								type="text"
								className="tw-h-10 tw-min-w-[220px] tw-max-w-[360px] tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-4 tw-text-sm tw-text-zc-fg"
								placeholder={__('Enter your license key', 'zencommunity')}
								value={licenseKey}
								onChange={(event) => setLicenseKey(event.target.value)}
							/>
							<LoadingButton
								loading={isActivating}
								onClick={handleActivate}
								className="tw-inline-flex tw-h-10 tw-cursor-pointer tw-items-center tw-rounded tw-border-0 tw-bg-zc-primary tw-px-4 tw-text-sm tw-font-medium tw-text-white hover:tw-opacity-90 disabled:tw-cursor-not-allowed disabled:tw-opacity-50"
							>
								{isActivating ? __('Activating...', 'zencommunity') : __('Activate License', 'zencommunity')}
							</LoadingButton>
						</div>
						<p className="tw-m-0 tw-text-sm tw-text-zc-muted">
							{__("Don't have a license key?", 'zencommunity')}{' '}
							<a className="tw-text-zc-primary" href={purchaseUrl} target="_blank" rel="noopener noreferrer">
								{__('Purchase one here', 'zencommunity')}
							</a>
						</p>
					</>
				) : (
					<>
						<h2 className="tw-m-0 tw-mb-2 tw-border-none tw-p-0 tw-text-xl tw-font-medium tw-leading-[30px] tw-text-zc-fg">
							{sprintf(__('%s - Free Edition', 'zencommunity'), packageName)}
						</h2>
						<Subtext className="tw-block tw-max-w-[75%]">
							{__('This installation does not require a license key. Upgrade to Pro when you need premium tools, updates, and priority support.', 'zencommunity')}
						</Subtext>
						<BrandBadge />
						<ExternalButton href={purchaseUrl} primary>
							{__('Upgrade to Pro', 'zencommunity')}
						</ExternalButton>
					</>
				)}

				<div className="tw-my-6 tw-flex tw-flex-col tw-items-center tw-gap-2">
					<Toggle
						label={__('Share usage data', 'zencommunity')}
						checked={!!optInData?.allowed}
						disabled={isOptinLoading || insights.status === 'saving'}
						onChange={handleOptin}
					/>
					<Subtext className="tw-block tw-max-w-[520px]">
						{__('Non-sensitive usage data only - WordPress/PHP versions, active theme, and feature usage. No personal data.', 'zencommunity')}
					</Subtext>
				</div>

				{isProductActive && supportsSdkRest && (
					<label className="tw-mb-6 tw-flex tw-cursor-pointer tw-select-none tw-items-center tw-gap-2 tw-text-sm tw-text-zc-muted">
						<input
							type="checkbox"
							className="tw-h-4 tw-w-4 tw-shrink-0 tw-cursor-pointer tw-accent-zc-primary disabled:tw-cursor-wait disabled:tw-opacity-60"
							checked={!!updateState?.beta_enabled}
							onChange={(event) => handleBeta(event.target.checked)}
							disabled={savingBeta}
						/>
						<span>{__('Receive beta updates, including pre-release versions.', 'zencommunity')}</span>
					</label>
				)}

				<span className="tw-mb-6 tw-block tw-w-full tw-border-0 tw-border-b tw-border-solid tw-border-zc-border" />

				<div className="tw-mx-auto tw-flex tw-max-w-[85%] tw-flex-wrap tw-justify-center tw-gap-6">
					<MetaItem label={__('Status:', 'zencommunity')} value={isFreePackage ? __('Free', 'zencommunity') : isLicenseActive ? __('Active', 'zencommunity') : supportsLicenseEndpoints ? licenseStatus || __('Inactive', 'zencommunity') : __('Free', 'zencommunity')} tone={isProductActive ? 'success' : 'muted'} />
					<MetaItem label={__('Version:', 'zencommunity')} value={packageVersion || updateState?.current_version || '-'} />
					<MetaItem label={__('Last Checked:', 'zencommunity')} value={formatDate(licenseData?.updated_at, __('Never', 'zencommunity'))} onRefresh={supportsLicenseEndpoints ? fetchStatus : null} refreshing={isCheckingStatus} />
					<MetaItem label={__('Expires:', 'zencommunity')} value={formatDate(licenseData?.expires)} />
					<MetaItem label={__('Activation Remaining:', 'zencommunity')} value={licenseData?.unlimited ? __('Unlimited', 'zencommunity') : supportsLicenseEndpoints ? sprintf(__('%1$d out of %2$s', 'zencommunity'), licenseData?.remaining, licenseData?.limit) : __('N/A', 'zencommunity')} />
					<MetaItem label={__('WP Auto-update:', 'zencommunity')} value={autoUpdateOn ? __('Enabled', 'zencommunity') : __('Disabled', 'zencommunity')} tone={autoUpdateOn ? 'success' : 'muted'} />
					<MetaItem label={__('Instance ID:', 'zencommunity')} value={deviceId ? `${deviceId.slice(0, 12)}...` : '-'} mono />
				</div>
			</div>

			{isProductActive && supportsSdkRest && (
				<VersionsCard
					versions={versions}
					loading={versionsLoading}
					error={versionsError}
					installing={isInstalling}
					current={updateState?.current_version}
					onRefresh={refreshVersions}
					onInstall={handleInstall}
					confirming={confirmingBreaking}
					setConfirming={setConfirmingBreaking}
				/>
			)}
		</div>
	);
};

const BrandBadge = () => (
	<div className="tw-my-6 tw-flex tw-items-center tw-gap-6 tw-rounded-full tw-border tw-border-solid tw-border-zc-border tw-px-6 tw-py-3">
		<img src={plugin_root_url + '/assets/images/icon_logo.png'} alt="ZenCommunity" className="tw-h-6 tw-w-6" />
		<LuLink size={20} className="tw-text-zc-muted" aria-hidden="true" />
		<LuKey size={20} className="tw-text-zc-muted" aria-hidden="true" />
	</div>
);

const ExternalButton = ({ href, primary = false, children }) => {
	const className = primary
		? 'tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded tw-bg-zc-primary tw-px-4 tw-text-sm tw-font-medium tw-text-white tw-no-underline hover:tw-opacity-90'
		: 'tw-inline-flex tw-h-10 tw-items-center tw-gap-1.5 tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-transparent tw-px-4 tw-text-sm tw-font-medium tw-text-zc-fg tw-no-underline hover:tw-bg-zc-hover';

	return (
		<a href={href} target="_blank" rel="noopener noreferrer" className={className}>
			{children}
			<LuExternalLink size={14} />
		</a>
	);
};

const MetaItem = ({ label, value, tone, mono, onRefresh, refreshing }) => {
	const toneClass = tone === 'success' ? 'tw-text-green-600' : tone === 'muted' ? 'tw-text-zc-muted' : 'tw-text-zc-fg';

	return (
		<div className="tw-flex tw-flex-col tw-items-center tw-gap-1">
			<span className="tw-text-sm tw-font-normal tw-text-zc-muted">{label}</span>
			<span className={`tw-flex tw-items-center tw-gap-1 tw-text-[14px] tw-font-semibold ${toneClass} ${mono ? 'tw-font-mono' : ''}`}>
				{value}
				{onRefresh && (
					<button
						type="button"
						className="tw-inline-flex tw-cursor-pointer tw-items-center tw-border-0 tw-bg-transparent tw-p-0 tw-text-inherit tw-opacity-60 hover:tw-opacity-100"
						onClick={onRefresh}
						aria-label={__('Refresh status', 'zencommunity')}
					>
						<LuRefreshCw size={14} className={refreshing ? 'tw-animate-spin' : ''} />
					</button>
				)}
			</span>
		</div>
	);
};

const UpdatesPanel = ({
	updateState,
	updateAvailable,
	previousVersion,
	isChecking,
	isInstalling,
	installLog,
	onCheck,
	onInstall,
}) => (
	<div className="tw-overflow-hidden tw-rounded tw-bg-zc-bg tw-border tw-border-solid tw-border-zc-border">
		<div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-px-6 tw-py-5">
			<div className="tw-flex tw-items-center tw-gap-6">
				<VersionStat label={__('Installed', 'zencommunity')} value={updateState?.current_version || '-'} />
				{updateAvailable && (
					<>
						<span className="tw-text-[26px] tw-leading-none tw-text-zc-border" aria-hidden="true">-&gt;</span>
						<VersionStat label={__('Latest', 'zencommunity')} value={updateState?.latest_version || '-'} accent />
					</>
				)}
			</div>
			<div className="tw-flex tw-items-center tw-gap-3">
				<span className="tw-text-sm tw-text-zc-muted">
					{sprintf(__('Checked %s', 'zencommunity'), timeAgo(updateState?.last_checked_at))}
				</span>
				<GhostButton onClick={onCheck} disabled={isChecking}>
					<LuRefreshCw size={14} className={isChecking ? 'tw-animate-spin' : ''} />
					{isChecking ? __('Checking...', 'zencommunity') : __('Check for updates', 'zencommunity')}
				</GhostButton>
			</div>
		</div>

		{updateAvailable && (
			<div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-border-0 tw-border-t tw-border-l-4 tw-border-solid tw-border-zc-border tw-border-l-zc-primary tw-bg-blue-50 tw-px-6 tw-py-4">
				<div className="tw-min-w-[220px] tw-flex-1">
					<div className="tw-mb-1 tw-text-[15px] tw-font-semibold tw-text-zc-fg">
						{sprintf(__('Version %s is available', 'zencommunity'), updateState?.latest_version)}
					</div>
					<p className="tw-m-0 tw-max-w-[65ch] tw-text-[14px] tw-text-zc-muted">
						{updateState?.changelog || __('Click update to install the latest release. Your settings and data stay intact.', 'zencommunity')}
					</p>
				</div>
				<PrimaryButton onClick={() => onInstall(null)} disabled={isInstalling}>
					{isInstalling ? __('Installing...', 'zencommunity') : sprintf(__('Update to %s', 'zencommunity'), updateState?.latest_version)}
				</PrimaryButton>
				{isInstalling && installLog.length > 0 && (
					<div className="tw-mt-3 tw-basis-full">
						<div className="tw-relative tw-mb-3 tw-h-1 tw-overflow-hidden tw-rounded-full tw-bg-black/10">
							<div className="tw-h-full tw-w-1/2 tw-animate-pulse tw-rounded-full tw-bg-zc-primary" />
						</div>
						<InstallLog messages={installLog} />
					</div>
				)}
			</div>
		)}

		{previousVersion && (
			<div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-4 tw-border-0 tw-border-t tw-border-l-4 tw-border-solid tw-border-zc-border tw-border-l-amber-600 tw-bg-amber-50 tw-px-6 tw-py-4">
				<div className="tw-min-w-[220px] tw-flex-1">
					<div className="tw-mb-1 tw-text-[15px] tw-font-semibold tw-text-zc-fg">
						{sprintf(__('Quick rollback to v%s', 'zencommunity'), previousVersion)}
					</div>
					<p className="tw-m-0 tw-max-w-[65ch] tw-text-[14px] tw-text-zc-muted">
						{__("If the latest update isn't working out, you can return to your previously installed version with one click.", 'zencommunity')}
					</p>
				</div>
				<GhostButton onClick={() => onInstall(previousVersion)} disabled={isInstalling}>
					<LuRotateCcw size={14} />
					{sprintf(__('Roll back to v%s', 'zencommunity'), previousVersion)}
				</GhostButton>
			</div>
		)}
	</div>
);

const VersionStat = ({ label, value, accent }) => (
	<div className="tw-flex tw-min-w-[90px] tw-flex-col tw-gap-1">
		<span className="tw-text-[14px] tw-font-medium tw-uppercase tw-tracking-[0.05em] tw-text-zc-muted">{label}</span>
		<span className={`tw-text-[22px] tw-font-semibold [font-variant-numeric:tabular-nums] ${accent ? 'tw-text-zc-primary' : 'tw-text-zc-fg'}`}>
			{value}
		</span>
	</div>
);

const InstallLog = ({ messages }) => {
	if (!messages || messages.length === 0) return null;

	return (
		<details className="tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-3 tw-text-left tw-text-sm tw-text-zc-fg">
			<summary className="tw-cursor-pointer tw-font-semibold">
				{sprintf(__('Install log (%d entries)', 'zencommunity'), messages.length)}
			</summary>
			<ul className="tw-mb-0 tw-mt-3 tw-flex tw-flex-col tw-gap-1 tw-pl-4">
				{messages.map((message, index) => (
					<li key={index} className={message.level === 'error' ? 'tw-text-red-600' : message.level === 'warning' ? 'tw-text-amber-700' : 'tw-text-zc-muted'}>
						<span className="tw-mr-2 tw-font-mono tw-uppercase">{message.level}</span>
						<span>{message.message}</span>
					</li>
				))}
			</ul>
		</details>
	);
};

const VersionsCard = ({
	versions,
	loading,
	error,
	installing,
	current,
	onRefresh,
	onInstall,
	confirming,
	setConfirming,
}) => {
	const header = (
		<div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3 tw-border-0 tw-border-b tw-border-solid tw-border-zc-border tw-px-6 tw-py-4">
			<div>
				<h3 className="tw-m-0 tw-text-base tw-font-semibold tw-text-zc-fg">{__('Version history', 'zencommunity')}</h3>
				<p className="tw-m-0 tw-mt-1 tw-text-[14px] tw-text-zc-muted">
					{__('Install or roll back to any released version of this plugin.', 'zencommunity')}
				</p>
			</div>
			<GhostButton onClick={onRefresh} disabled={loading || installing}>
				<LuRefreshCw size={14} className={loading ? 'tw-animate-spin' : ''} />
				{loading ? __('Refreshing...', 'zencommunity') : __('Refresh', 'zencommunity')}
			</GhostButton>
		</div>
	);

	const wrap = (inner) => (
		<div className="tw-rounded tw-bg-zc-bg tw-border tw-border-solid tw-border-zc-border">
			{header}
			<div className="tw-p-6">{inner}</div>
		</div>
	);

	if (loading && (!versions || versions.length === 0)) {
		return wrap(<p className="tw-m-0 tw-text-sm tw-text-zc-muted">{__('Loading version history...', 'zencommunity')}</p>);
	}

	if (!versions || versions.length === 0) {
		if (error?.code === 'sdk-server-version-list-unsupported') {
			return wrap(<EmptyVersions title={__("The license server doesn't support version history yet.", 'zencommunity')} message={error.message} />);
		}
		if (error) {
			return wrap(<EmptyVersions title={__('Could not load version history.', 'zencommunity')} message={error.message} />);
		}
		return wrap(<EmptyVersions title={__('No versions are available to install or roll back to yet.', 'zencommunity')} message={__("Once the vendor publishes additional released versions, they'll appear here with Install and Roll back buttons.", 'zencommunity')} />);
	}

	const onlyCurrent = versions.length === 1 && versions[0].is_current;

	return (
		<div className="tw-overflow-hidden tw-rounded tw-bg-zc-bg tw-border tw-border-solid tw-border-zc-border">
			{header}
			{onlyCurrent && (
				<div className="tw-p-6">
					<EmptyVersions message={__("You're on the only released version. Roll back will become available once an earlier release is published.", 'zencommunity')} />
				</div>
			)}
			<div className="tw-overflow-x-auto">
				<table className="tw-w-full tw-border-collapse tw-text-left tw-text-sm">
					<thead>
						<tr className="tw-border-0 tw-border-b tw-border-solid tw-border-zc-border tw-text-sm tw-uppercase tw-text-zc-muted">
							<th className="tw-px-6 tw-py-3">{__('Version', 'zencommunity')}</th>
							<th className="tw-px-6 tw-py-3">{__('Status', 'zencommunity')}</th>
							<th className="tw-px-6 tw-py-3">{__('Released', 'zencommunity')}</th>
							<th className="tw-px-6 tw-py-3"></th>
						</tr>
					</thead>
					<tbody>
						{versions.map((version) => (
							<Fragment key={version.id}>
								<tr className="tw-border-0 tw-border-b tw-border-solid tw-border-zc-border">
									<td className="tw-px-6 tw-py-4">
										<code>{version.version}</code>
										{version.is_current && <Pill tone="current">{__('current', 'zencommunity')}</Pill>}
									</td>
									<td className="tw-px-6 tw-py-4"><Pill tone={version.status}>{version.status}</Pill></td>
									<td className="tw-px-6 tw-py-4 tw-text-zc-muted">{version.deployed_at || '-'}</td>
									<td className="tw-px-6 tw-py-4 tw-text-right">
										<VersionAction version={version} current={current} installing={installing} onInstall={onInstall} setConfirming={setConfirming} />
									</td>
								</tr>
								{confirming && confirming.id === version.id && (
									<tr>
										<td colSpan={4} className="tw-px-6 tw-py-4">
											<div className="tw-rounded tw-border tw-border-solid tw-border-amber-300 tw-bg-amber-50 tw-p-4">
												<strong>{__('Breaking changes', 'zencommunity')}</strong>
												<p className="tw-mb-3 tw-mt-1">{confirming.breaking_changes}</p>
												<div className="tw-flex tw-gap-2">
													<PrimaryButton onClick={() => {
														const selectedVersion = confirming.version;
														setConfirming(null);
														onInstall(selectedVersion);
													}}>
														{__('I understand, continue', 'zencommunity')}
													</PrimaryButton>
													<GhostButton onClick={() => setConfirming(null)}>{__('Cancel', 'zencommunity')}</GhostButton>
												</div>
											</div>
										</td>
									</tr>
								)}
							</Fragment>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

const EmptyVersions = ({ title, message }) => (
	<div className="tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-hover tw-p-4 tw-text-sm tw-text-zc-muted">
		{title && <p className="tw-m-0 tw-font-semibold tw-text-zc-fg">{title}</p>}
		{message && <p className={title ? 'tw-mb-0 tw-mt-1' : 'tw-m-0'}>{message}</p>}
	</div>
);

const Pill = ({ tone, children }) => {
	const toneClass = tone === 'current' || tone === 'stable' || tone === 'active'
		? 'tw-bg-green-50 tw-text-green-700'
		: tone === 'beta'
			? 'tw-bg-blue-50 tw-text-blue-700'
			: 'tw-bg-zc-hover tw-text-zc-muted';

	return <span className={`tw-ml-2 tw-inline-flex tw-rounded-full tw-px-2 tw-py-0.5 tw-text-sm tw-font-semibold ${toneClass}`}>{children}</span>;
};

const VersionAction = ({ version, current, installing, onInstall, setConfirming }) => {
	if (version.is_current) {
		return <span className="tw-text-sm tw-text-zc-muted">{__('Installed', 'zencommunity')}</span>;
	}

	const isDowngrade = current && compareVersions(version.version, current) < 0;

	if (!version.allow_rollback && isDowngrade) {
		return (
			<span className="tw-text-sm tw-font-semibold tw-text-amber-700" title={__('Vendor disabled rollback to this version.', 'zencommunity')}>
				{__('Rollback blocked', 'zencommunity')}
			</span>
		);
	}

	return (
		<GhostButton
			onClick={() => {
				if (version.breaking_changes) {
					setConfirming(version);
				} else {
					onInstall(version.version);
				}
			}}
			disabled={installing}
		>
			{isDowngrade ? __('Roll back', 'zencommunity') : __('Install', 'zencommunity')}
		</GhostButton>
	);
};

export default License;
