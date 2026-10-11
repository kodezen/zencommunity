/** @type {import('tailwindcss').Config} */
module.exports = {
	// Mark every utility `!important` so Tailwind classes win wherever the app
	// renders. The old `#ZenCommunityAppElement` scope only matched the SPA mount
	// node, so in Gutenberg (FSE) render mode — where the React content mounts
	// inside FSE block wrappers instead — none of the utilities applied and the
	// Tailwind-based pages (course detail/learn/checkout) rendered unstyled. app.css
	// only loads on community pages and every utility is `tw-`-prefixed, so this
	// can't leak into or clobber the surrounding WordPress page. (Matches the
	// admin build, tailwind.admin.config.js.)
	important: true,
	// Prefix every utility with `tw-` so Tailwind classes can never collide with
	// existing Chakra/WordPress class names during the migration period.
	prefix: 'tw-',
	content: [
		'./dev_zencommunity/**/*.{js,jsx}',
	],
	// Preflight is Tailwind's global CSS reset — disabled so it can't clobber
	// the existing Chakra UI or WordPress theme styles.
	corePlugins: {
		preflight: false,
	},
	theme: {
		extend: {
			// Map the app's existing theme variables so Tailwind classes follow
			// the live light/dark theme automatically (no `dark:` variant needed).
			colors: {
				'zc-bg': 'var(--zencom-background)',
				'zc-body': 'var(--zencom-body-background)',
				'zc-fg': 'var(--zencom-font-color)',
				'zc-muted': 'var(--zencom-font-muted)',
				'zc-primary': 'var(--zencom-primary-color)',
				'zc-secondary': 'var(--zencom-secondary-color)',
				'zc-border': 'var(--zencom-border-color)',
				'zc-warning': 'var(--zencom-warning)',
				'zc-gray': 'var(--zencom-gray-color)',
				// Tints — the theme colors are full CSS-var values, so Tailwind's
				// `/opacity` modifier can't synthesize alpha from them. These
				// color-mix tokens give the soft backgrounds / hover shades instead.
				'zc-primary-soft': 'color-mix(in srgb, var(--zencom-primary-color) 12%, transparent)',
				'zc-primary-faint': 'color-mix(in srgb, var(--zencom-primary-color) 6%, transparent)',
				'zc-hover': 'color-mix(in srgb, var(--zencom-font-color) 7%, transparent)',
				'zc-skeleton': 'color-mix(in srgb, var(--zencom-border-color) 50%, transparent)',
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
