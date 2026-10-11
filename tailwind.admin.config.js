/** @type {import('tailwindcss').Config} */
/**
 * Tailwind config — scoped to the admin settings panel (`dev_zencommunity/Admin/`)
 * only, mounted at `#ZenCommunitySettingsElement`, a completely separate webpack
 * entry/DOM root from the main app (`#ZenCommunityAppElement`, see
 * `tailwind.config.js`). Mirrors the same `@config`-directive pattern already
 * used by the `storeengine` plugin's `tailwind.admin.config.js` for the same
 * "second, independently-scoped Tailwind surface" problem.
 *
 * The two configs' `content` globs and `important` selectors are disjoint, so
 * they never produce overlapping or conflicting utility CSS, and neither
 * bundle is ever loaded on the same page as the other.
 */
module.exports = {
	important: '#ZenCommunitySettingsElement',
	prefix: 'tw-',
	content: [
		'./dev_zencommunity/Admin/**/*.{js,jsx}',
		// Pro's admin pages render inside this app and ship no CSS of their own.
		'../zencommunity-pro/dev_zencommunity/Admin/**/*.{js,jsx}',
	],
	// Preflight is Tailwind's global CSS reset — disabled so it can't clobber
	// the admin page's existing styles.
	corePlugins: {
		preflight: false,
	},
	theme: {
		extend: {
			// Map the same --zencom-* CSS variables the main app's config maps
			// (settings.scss defines these at :root for the admin page too), so
			// Admin's utilities automatically follow the live theme.
			colors: {
				'zc-bg': 'var(--zencom-background)',
				'zc-body': 'var(--zencom-body-background)',
				'zc-fg': 'var(--zencom-font-color)',
				'zc-muted': 'var(--zencom-font-muted)',
				'zc-primary': 'var(--zencom-primary-color)',
				// Tinted background for primary-colored badges/chips (space
				// type tags, active picker states, dashboard icon tiles) —
				// was referenced as `tw-bg-zc-primary-soft` in several
				// components without ever being mapped here, so it silently
				// resolved to no background at all.
				'zc-primary-soft': 'var(--zencom-primary-light)',
				'zc-secondary': 'var(--zencom-secondary-color)',
				'zc-border': 'var(--zencom-border-color)',
				'zc-warning': 'var(--zencom-warning)',
				'zc-gray': 'var(--zencom-gray-color)',
			},
			boxShadow: {
				zc: 'var(--zencom-shadow)',
			},
			fontFamily: {
				zc: 'var(--zencom-font)',
			},
		},
	},
	plugins: [],
};
