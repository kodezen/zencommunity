import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import useZenTheme from '@Hooks/useZenTheme';
import { AuthProvider } from '../../Context/AuthContext';
import Settings from './settings';

// Applies the community's brand *colors* to :root inside wp-admin so the
// settings tabs are styled the same as the frontend — but always in light
// mode: autoApply:false stops it from also picking up whatever dark/light
// *mode* a visitor last toggled on the live community (localStorage is
// shared across the whole origin, wp-admin included), which would otherwise
// flip these settings screens dark for no reason a wp-admin user would expect.
const ThemeApplier = () => {
	useZenTheme(window.ZencommunityGlobal?.theme_settings, { autoApply: false });
	return null;
};

/**
 * The complete community/portal settings — every tab (General, Brand & Styles,
 * Privacy, Menu, Roles & Permissions, Users, Social Login, Email, LMS
 * integrations, AI Agent, Gamification, Add-ons, …) — mounted on the wp-admin
 * Settings screen. Tailwind-only, no Chakra.
 *
 * A MemoryRouter drives the LeftBar tab navigation (via ?tab= + useLocationQuery);
 * LeftBar also mirrors the active tab into the real wp-admin URL's ?tab= param
 * (via replaceState) so it survives a reload. The outer store Provider is
 * supplied by settings.js. Seed the active tab from ?tab= if present.
 */
const FullSettings = ({ section = 'settings' }) => {
	const initialTab = section === 'addons' ? 'add-ons' : new URLSearchParams(window.location.search).get('tab') || '';

	return (
		<AuthProvider>
			<ThemeApplier />
			<MemoryRouter initialEntries={[`/settings/?tab=${initialTab}`]}>
				<Settings section={section} />
			</MemoryRouter>
		</AuthProvider>
	);
};

export default FullSettings;
