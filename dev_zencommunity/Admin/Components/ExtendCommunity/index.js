import React, { useState, useCallback } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { useDispatch } from 'react-redux';
import { LuCheck, LuLoaderCircle, LuShieldCheck, LuExternalLink } from 'react-icons/lu';
import {
	API, plugin_root_url,
	is_academy_installed, is_academy_active, academy_plugin_file,
	is_ablocks_installed, is_ablocks_active, ablocks_plugin_file,
	is_storeengine_installed, is_storeengine_active, storeengine_plugin_file,
	is_gemcrm_installed, is_gemcrm_active, gemcrm_plugin_file,
	is_gemboards_installed, is_gemboards_active, gemboards_plugin_file,
	is_gameengine_installed, is_gameengine_active, gameengine_plugin_file,
	is_gembooking_installed, is_gembooking_active, gembooking_plugin_file,
	is_zaplane_installed, is_zaplane_active, zaplane_plugin_file,
	is_gemsecurity_installed, is_gemsecurity_active, gemsecurity_plugin_file,
	is_trueplayer_installed, is_trueplayer_active, trueplayer_plugin_file,
} from '@Utils/helper';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { PrimaryButton } from '../ui';

// Installed/active state + the resolved "folder/file.php" identifier are
// computed server-side per product (Assets::extend_product_status(), exposed
// via ZencommunityGlobal) rather than detected with a client-side
// /wp/v2/plugins REST call - that call requires the current user to have
// install_plugins/activate_plugins caps to even succeed, and matching by
// slug from a full plugin list proved unreliable for the two products that
// aren't on WordPress.org. WordPress.org-hosted products install via core's
// own /wp/v2/plugins REST route (by slug), only when the admin clicks
// Install. Products not hosted on WordPress.org use `source: 'link'`: their
// "not installed" state opens the product page on the vendor's site, and
// nothing is downloaded by this plugin; once
// the plugin is actually present (installed: true, e.g. downloaded by hand),
// Activate works exactly like every other product, since that path only
// ever needs the resolved plugin file, never a URL.
const PRODUCTS = [
	{
		key: 'academy',
		name: 'Academy LMS',
		tagline: __('Share your knowledge by launching an online course.', 'zencommunity'),
		icon: 'academy-lms.svg',
		source: 'wporg',
		slug: 'academy',
		installed: !!is_academy_installed,
		active: !!is_academy_active,
		pluginFile: academy_plugin_file || null,
	},
	{
		key: 'ablocks',
		name: 'aBlocks',
		tagline: __('Create beautiful websites with customizable Gutenberg blocks.', 'zencommunity'),
		icon: 'ablocks.svg',
		source: 'wporg',
		slug: 'ablocks',
		installed: !!is_ablocks_installed,
		active: !!is_ablocks_active,
		pluginFile: ablocks_plugin_file || null,
	},
	{
		key: 'storeengine',
		name: 'StoreEngine',
		tagline: __('Powerful WordPress eCommerce for payments, memberships, affiliates & more.', 'zencommunity'),
		icon: 'storeengine.svg',
		source: 'wporg',
		slug: 'storeengine',
		installed: !!is_storeengine_installed,
		active: !!is_storeengine_active,
		pluginFile: storeengine_plugin_file || null,
	},
	{
		key: 'gemcrm',
		name: 'GemCRM',
		tagline: __('A lightweight CRM to track leads, contacts, and sales.', 'zencommunity'),
		icon: 'gemcrm.svg',
		source: 'wporg',
		slug: 'gemcrm',
		installed: !!is_gemcrm_installed,
		active: !!is_gemcrm_active,
		pluginFile: gemcrm_plugin_file || null,
	},
	{
		key: 'gemboards',
		name: 'GemBoards',
		tagline: __('Project management software.', 'zencommunity'),
		icon: 'gemboards.svg',
		source: 'wporg',
		slug: 'gemboards',
		installed: !!is_gemboards_installed,
		active: !!is_gemboards_active,
		pluginFile: gemboards_plugin_file || null,
	},
	{
		key: 'gameengine',
		name: 'GameEngine',
		tagline: __('Award points, achievements, and ranks to boost engagement.', 'zencommunity'),
		icon: 'gameengine.svg',
		source: 'wporg',
		slug: 'gameengine',
		installed: !!is_gameengine_installed,
		active: !!is_gameengine_active,
		pluginFile: gameengine_plugin_file || null,
	},
	{
		key: 'gembooking',
		name: 'GemBooking',
		tagline: __('All-in-one booking, scheduling & event ticketing for WordPress.', 'zencommunity'),
		icon: 'gembooking.svg',
		source: 'wporg',
		slug: 'gembooking',
		installed: !!is_gembooking_installed,
		active: !!is_gembooking_active,
		pluginFile: gembooking_plugin_file || null,
	},
	{
		key: 'zaplane',
		name: 'Zaplane',
		tagline: __('Visual, no-code automation - connect triggers and actions across your site.', 'zencommunity'),
		icon: 'zaplane.svg',
		source: 'wporg',
		slug: 'zaplane',
		installed: !!is_zaplane_installed,
		active: !!is_zaplane_active,
		pluginFile: zaplane_plugin_file || null,
	},
	{
		key: 'gemsecurity',
		name: 'GemSecurity',
		tagline: __('Firewall, login protection, and malware scanning for your site.', 'zencommunity'),
		// No zencommunity-local logo asset exists for this product yet
		// (Academy's own cross-sell catalog uses a generic lock glyph for it
		// too) - `icon` stays unset and the card falls back to LuShieldCheck
		// rather than pointing at an image that doesn't exist.
		source: 'link',
		url: 'https://store.kodezen.com/product/gemsecurity/',
		installed: !!is_gemsecurity_installed,
		active: !!is_gemsecurity_active,
		pluginFile: gemsecurity_plugin_file || null,
	},
	{
		key: 'trueplayer',
		name: 'TruePlayer',
		tagline: __('Add a watch-verified video & audio player to your community.', 'zencommunity'),
		icon: 'trueplayer.svg',
		source: 'link',
		url: 'https://store.kodezen.com/product/trueplayer/',
		installed: !!is_trueplayer_installed,
		active: !!is_trueplayer_active,
		pluginFile: trueplayer_plugin_file || null,
	},
];

const productStatus = (p) => (p.active ? 'active' : p.installed ? 'inactive' : 'not-installed');

/**
 * `keys`: an optional, ordered subset of PRODUCTS to render (by `key`) -
 * lets a caller (e.g. the Setup Wizard's own Extend step) curate a shorter
 * list without forking this component or its install/activate logic. Left
 * unset, every product renders - the Dashboard's own call site passes its
 * current full list explicitly so it keeps showing exactly what it always
 * has as this catalog grows.
 *
 * `columns`: cards per row on large screens (the Dashboard's full-width
 * page fits 4; the Setup Wizard's narrower column uses 3).
 *
 * `title`: the section heading; pass null to hide it (the wizard's own step
 * header already introduces the list).
 */
const GRID_COLUMNS = { 3: 'lg:tw-grid-cols-3', 4: 'lg:tw-grid-cols-4' };

const ExtendCommunity = ({ keys, columns = 4, title = __('One Ecosystem, Endless Possibilities', 'zencommunity') } = {}) => {
	const dispatch = useDispatch();
	const products = keys ? keys.map((k) => PRODUCTS.find((p) => p.key === k)).filter(Boolean) : PRODUCTS;
	const [status, setStatus] = useState(() =>
		Object.fromEntries(PRODUCTS.map((p) => [p.key, productStatus(p)]))
	);

	const handleInstall = useCallback(async (product) => {
		setStatus((prev) => ({ ...prev, [product.key]: 'installing' }));
		try {
			const res = await API.post('wp/v2/plugins', { slug: product.slug, status: 'active' });
			setStatus((prev) => ({ ...prev, [product.key]: 'active' }));
			dispatch(showNotification({
				message: res?.data?.message || sprintf(__('%s installed and activated.', 'zencommunity'), product.name),
				isShow: true,
				type: 'success',
			}));
		} catch (e) {
			setStatus((prev) => ({ ...prev, [product.key]: 'not-installed' }));
			dispatch(showNotification({
				message: e?.response?.data?.message || __('Installation failed.', 'zencommunity'),
				isShow: true,
				type: 'error',
			}));
		}
	}, [dispatch]);

	const handleActivate = useCallback(async (product) => {
		setStatus((prev) => ({ ...prev, [product.key]: 'activating' }));
		try {
			// The /wp/v2/plugins/{plugin} route's own resource shape strips the
			// trailing ".php" from the file identifier (and re-appends it
			// server-side when parsing the URL) - a literal "." in the path
			// doesn't match the route's regex at all, so it must come off here.
			const pluginFile = (product.pluginFile || product.slug).replace(/\.php$/, '');
			await API.put(`wp/v2/plugins/${pluginFile}`, { status: 'active' });
			setStatus((prev) => ({ ...prev, [product.key]: 'active' }));
		} catch (e) {
			setStatus((prev) => ({ ...prev, [product.key]: 'inactive' }));
			dispatch(showNotification({
				message: e?.response?.data?.message || __('Activation failed.', 'zencommunity'),
				isShow: true,
				type: 'error',
			}));
		}
	}, [dispatch]);

	return (
		<div className={title ? 'tw-mt-10' : ''}>
			{title && (
				<p className="!tw-mb-4 tw-text-[12px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-zc-muted/80">
					{title}
				</p>
			)}
			<div className={`tw-grid tw-grid-cols-1 tw-gap-5 sm:tw-grid-cols-2 ${GRID_COLUMNS[columns] || GRID_COLUMNS[4]}`}>
				{products.map((product) => {
					const s = status[product.key];
					const busy = s === 'installing' || s === 'activating';

					return (
						<div
							key={product.key}
							className="tw-flex tw-flex-col tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-white tw-p-6"
						>
							<div className="tw-mb-3 tw-flex tw-items-center tw-gap-2">
								{product.icon ? (
									<img
										src={plugin_root_url + '/assets/images/addons/' + product.icon}
										alt=""
										className="tw-h-[30px] tw-w-[30px] tw-shrink-0 tw-rounded-sm tw-object-contain"
									/>
								) : (
									// No shipped logo asset for this product yet (see its
									// PRODUCTS entry) - a generic icon beats a broken <img>.
									<span className="tw-flex tw-h-[30px] tw-w-[30px] tw-shrink-0 tw-items-center tw-justify-center tw-rounded-sm tw-bg-zc-bg tw-text-zc-primary">
										<LuShieldCheck size={18} />
									</span>
								)}
								<span className="tw-text-sm tw-font-semibold tw-text-zc-fg">{product.name}</span>
							</div>
							<p className="tw-m-0 tw-mb-4 tw-min-h-[32px] tw-text-sm tw-text-zc-muted">{product.tagline}</p>

							{/* Pinned to the card's bottom so actions line up across a row. */}
							<div className="tw-mt-auto">
							{s === 'active' ? (
								// Active = a plain status label (green check, no border/bg/padding)
								// so it reads as a state, not a clickable button.
								<span className="tw-inline-flex tw-min-h-[36px] tw-w-fit tw-items-center tw-gap-1.5 tw-text-sm tw-font-medium tw-text-[#00AD6B]">
									<LuCheck size={16} /> {__('Activated', 'zencommunity')}
								</span>
							) : s === 'inactive' ? (
								<PrimaryButton className="tw-w-fit" onClick={() => handleActivate(product)} disabled={busy}>
									{busy && <LuLoaderCircle size={14} className="tw-animate-spin" />}
									{__('Activate', 'zencommunity')}
								</PrimaryButton>
							) : product.source === 'link' ? (
								// No confirmed automated free-download source - a real link
								// to the product's own page beats guessing a download URL.
								// GhostButton is a plain <button> (no polymorphic `as`), so
								// this is a real <a>, styled to match it, instead of an
								// inert href on a non-anchor element.
								<a
									href={product.url}
									target="_blank"
									rel="noreferrer"
									className="tw-inline-flex tw-w-fit tw-cursor-pointer tw-items-center tw-gap-1.5 tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-transparent tw-px-3 tw-py-1.5 tw-text-sm tw-font-medium tw-text-zc-fg tw-no-underline hover:tw-bg-zc-hover"
								>
									{sprintf(__('Get %s', 'zencommunity'), product.name)}
									<LuExternalLink size={14} />
								</a>
							) : (
								<PrimaryButton className="tw-w-fit" onClick={() => handleInstall(product)} disabled={busy}>
									{busy && <LuLoaderCircle size={14} className="tw-animate-spin" />}
									{s === 'installing' ? __('Installing…', 'zencommunity') : __('Install & Activate', 'zencommunity')}
								</PrimaryButton>
							)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default ExtendCommunity;
