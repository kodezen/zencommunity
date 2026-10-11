import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import NoDataPost from '@Components/NoDataPost';
import Posts from '@Components/Posts';
import PostCard from '@Components/PostCard/PostCard';
import { current_user_can } from '@Utils/helper';
import { useTruePlayerEmbed } from '@Hooks/useTruePlayerEmbed';

/**
 * "Audio"/"Video" space view. Mirrors how an Event-type Space's primary
 * (Events) tab works: a "+ Create" affordance plus a live list that a new
 * item joins immediately — here, every Feed post of this group's own media
 * type (see Components/Posts/Steps/Player.js), not a single static item.
 *
 * Unlike SinglePage/ResourceLibrary, the admin-pinned video (meta.
 * trueplayer_video_id, set from the Space's own settings) doesn't just
 * inject static HTML — TruePlayer's own player needs its frontend script to
 * actually run against the markup, and that script was never enqueued
 * through WordPress's normal page-load pipeline (this is a client-routed
 * SPA, fed by a REST response — see SpaceType::resolve_trueplayer_embed()
 * for why the server hands over raw script URLs + localized data instead of
 * relying on that pipeline). See useTruePlayerEmbed() for how those are
 * actually loaded/mounted.
 */
const PlayerSpace = ({ groupData, groupID, onSubmitHandler, hasPermission, isAdmin, canPostAsTeam, groupFeeds = [], actions }) => {
	const mediaType = groupData?.type === 'audio' ? 'audio' : 'video';
	const embed = groupData?.meta?.trueplayer_embed;
	const hasVideoSelected = !!groupData?.meta?.trueplayer_video_id;
	const posts = groupFeeds.filter((post) => post?.type === mediaType);

	useTruePlayerEmbed(embed);

	return (
		<Box className="zencom-animate-fade" mb={{ base: '50px', lg: '4' }}>
			{/* Posting into this group's feed directly from its own primary view —
				mirrors the "+ Create Event" affordance Event-type Spaces already
				have on their primary (Events) tab. */}
			{(hasPermission || isAdmin) && onSubmitHandler && (
				<Posts
					onSubmitHandler={onSubmitHandler}
					groupID={groupID}
					isGroupDisabled={true}
					canPostAsTeam={canPostAsTeam}
					fixedTab={mediaType}
				/>
			)}

			{hasVideoSelected && (
				<Box borderRadius="6px" bg="var(--zencom-background)" overflow="hidden" mb="20px">
					<ZCLabel
						fontSize="18px"
						color="var(--zencom-font-color)"
						fontWeight="500"
						padding="12px 16px"
						label={groupData?.name || __('Player', 'zencommunity')}
					/>

					{embed?.html ? (
						<Box p="16px" pt="0" dangerouslySetInnerHTML={{ __html: embed.html }} />
					) : (
						<NoDataPost
							title={__("This community's video player isn't available right now", 'zencommunity')}
							subTitle={current_user_can?.manage_options ? __('TruePlayer needs to be installed and active — check Extend your Community.', 'zencommunity') : ''}
							subTitleWrap="nowrap"
						/>
					)}
				</Box>
			)}

			{posts.length > 0 ? (
				<Flex direction="column" gap="16px">
					{posts.map((post) => (
						<PostCard
							key={post.id}
							author={post?.user_usernames}
							content={post?.content}
							renderedContent={post?.rendered}
							avatar_url={post?.user_avatar_url}
							feedItemData={post}
							actions={actions}
						/>
					))}
				</Flex>
			) : !hasVideoSelected ? (
				// Only an empty-state when there's truly nothing on this tab —
				// a group with just the pinned track above isn't "empty", so
				// showing both at once would read as a contradiction.
				<div style={{ background: 'var(--zencom-background)' }}>
					<NoDataPost
						title={mediaType === 'audio' ? __('No audio posted yet', 'zencommunity') : __('No videos posted yet', 'zencommunity')}
						subTitle={(hasPermission || isAdmin) ? __('Use the box above to post one.', 'zencommunity') : ''}
						subTitleWrap="nowrap"
					/>
				</div>
			) : null}
		</Box>
	);
};

export default PlayerSpace;
