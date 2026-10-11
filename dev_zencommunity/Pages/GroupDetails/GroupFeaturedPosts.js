import React from 'react';
import { Flex } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import PostCard from '@Components/PostCard/PostCard';
import NoDataPost from '@Components/NoDataPost';
import { useDispatch } from 'react-redux';
import { deleteFeedPost, reactToFeedPost } from '@Redux/slices/feedSlice/feedSlice';

const GroupFeaturedPosts = ({ id, groupFeeds = [] }) => {
    const dispatch = useDispatch();
    const posts = groupFeeds.filter(p => Number(p.is_featured) === 1);

    if (!posts.length) return (
        <div style={{ background: 'var(--zencom-background)' }}>
            <NoDataPost
                title={__('No featured posts yet', 'zencommunity')}
                subTitle={__('Group admins can feature posts from the Discussion tab.', 'zencommunity')}
            />
        </div>
    );

    return (
        <Flex direction="column" gap="16px">
            {posts.map((post, i) => (
                <PostCard
                    key={post.id || i}
                    content={post.content}
                    renderedContent={post.rendered}
                    avatar_url={post.user_avatar_url}
                    feedItemData={post}
                    actions={{
                        deletePost: (feedId) => dispatch(deleteFeedPost(feedId)),
                        reactToPost: (payload) => dispatch(reactToFeedPost(payload)),
                    }}
                />
            ))}
        </Flex>
    );
};

export default GroupFeaturedPosts;
