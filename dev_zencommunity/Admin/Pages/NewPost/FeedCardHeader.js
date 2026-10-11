import React from 'react';
import { __ } from '@wordpress/i18n';

// Same idea as the SPA's avatar fallback (Components/Chakra/ZenComAvatar/PostCardAvatar.js
// getInitials/getAvatarBg): a deterministic color + initials per name, since
// the admin preview has no real avatar image to show.
const AVATAR_COLORS = ['#F97066', '#F79009', '#F04438', '#12B76A', '#2E90FA', '#7A5AF8', '#EE46BC', '#EAAA08'];

const colorForName = (name) => {
	const str = name || '?';
	let hash = 0;
	for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
	return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const initials = (name) =>
	(name || '?')
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase())
		.join('') || '?';

/**
 * Header row of a feed card — avatar, author name (or "Anonymous member"),
 * "Just now" + Space — mirroring the real feed card's header
 * (Components/PostCard/PostCard.js + PostCardAvatar.js), simplified to what
 * an unpublished draft can actually show (no real avatar/timestamp yet).
 */
const FeedCardHeader = ({ name, anonymous, spaceLabel }) => {
	const displayName = anonymous ? __('Anonymous member', 'zencommunity') : name || __('You', 'zencommunity');
	return (
		<div className="tw-flex tw-items-center tw-gap-2.5">
			<div
				className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-text-sm tw-font-semibold tw-text-white"
				style={{ background: anonymous ? '#94A3B8' : colorForName(displayName) }}
			>
				{anonymous ? '?' : initials(displayName)}
			</div>
			<div className="tw-min-w-0">
				<p className="tw-m-0 tw-truncate tw-text-sm tw-font-semibold tw-text-zc-fg">{displayName}</p>
				<p className="tw-m-0 tw-text-sm tw-text-zc-muted">
					{__('Just now', 'zencommunity')}
					{spaceLabel ? ` · ${spaceLabel}` : ''}
				</p>
			</div>
		</div>
	);
};

export default FeedCardHeader;
