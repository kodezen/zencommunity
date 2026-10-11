import { useEffect } from 'react';

const STYLE_ELEMENT_ID = 'trueplayer-frontend-style';

/**
 * Mounts a TruePlayer embed payload (see TruePlayerEmbed::resolve() on the
 * PHP side) into the current page. Shared by the Audio/Video Space view
 * (Pages/GroupDetails/PlayerSpace.js) and Audio/Video feed posts
 * (Components/PostCard/PostCard.js) — both hand this the same
 * `meta.trueplayer_embed` shape.
 *
 * TruePlayer's frontend bundle is built externalizing React to WordPress's
 * own core script handles (react, react-dom, react-jsx-runtime, wp-element,
 * wp-hooks, wp-i18n) rather than bundling its own copy — `embed.scripts` is
 * that real, ordered dependency chain resolved server-side via WP_Scripts,
 * with the player script itself last. Each dependency loads once and stays
 * loaded; only the final player script is re-appended fresh on every mount,
 * since it boots via a one-time DOMContentLoaded-era check with no
 * MutationObserver watching for later DOM changes, and mountPlayers() is
 * idempotent (skips nodes already marked booted) so a stale re-run is
 * harmless.
 */
export const useTruePlayerEmbed = (embed) => {
	useEffect(() => {
		if (!embed) return;
		let cancelled = false;
		let playerScript;

		const loadOnce = (src) =>
			new Promise((resolve, reject) => {
				if (document.querySelector(`script[src="${CSS.escape(src)}"]`)) {
					resolve();
					return;
				}
				const script = document.createElement('script');
				script.src = src;
				script.async = false;
				script.onload = () => resolve();
				script.onerror = () => reject(new Error(`Failed to load ${src}`));
				document.body.appendChild(script);
			});

		(async () => {
			if (embed.global_key && embed.global_data) {
				window[embed.global_key] = { ...(window[embed.global_key] || {}), ...embed.global_data };
			}

			if (embed.style_url && !document.getElementById(STYLE_ELEMENT_ID)) {
				const link = document.createElement('link');
				link.id = STYLE_ELEMENT_ID;
				link.rel = 'stylesheet';
				link.href = embed.style_url;
				document.head.appendChild(link);
			}

			const scripts = Array.isArray(embed.scripts) ? embed.scripts : [];
			if (!scripts.length) return;

			const deps = scripts.slice(0, -1);
			const playerSrc = scripts[scripts.length - 1]?.src;

			try {
				for (const dep of deps) {
					if (cancelled) return;
					await loadOnce(dep.src);
				}
				if (cancelled || !playerSrc) return;

				playerScript = document.createElement('script');
				playerScript.src = playerSrc;
				playerScript.async = false;
				document.body.appendChild(playerScript);
			} catch (e) {
				// A dependency failed to load — nothing to mount; the caller's
				// own empty state already covers "player not available".
			}
		})();

		return () => {
			cancelled = true;
			if (playerScript?.parentNode) playerScript.parentNode.removeChild(playerScript);
		};
	}, [embed]);
};
