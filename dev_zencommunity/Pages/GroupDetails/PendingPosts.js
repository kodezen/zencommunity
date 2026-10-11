import React, { useEffect, useState } from 'react';
import { Box, Flex, Text, Button, Spinner } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { API, namespace } from '@Utils/helper';
import { useDispatch } from 'react-redux';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import moment from 'moment';
import MentionParser from '@Components/Mention/MentionParser';
import NoDataPost from '@Components/NoDataPost';
import { useStyles } from '../../utils/chakra';

const PendingPosts = ({ groupId, onCountChange }) => {
    const { primaryBtnInsideContent } = useStyles();
    const dispatch = useDispatch();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchPendingPosts = async () => {
        setLoading(true);
        try {
            const { data: { records } } = await API.get(`${namespace}/group/${groupId}/pending-posts`);
            setPosts(records || []);
            onCountChange?.(records?.length ?? 0);
        } catch (err) {
            setPosts([]);
            onCountChange?.(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingPosts();
    }, [groupId]);

    const handleApprove = async (feedId) => {
        setActionLoading(feedId + '-approve');
        try {
            await API.post(`${namespace}/feed/${feedId}/approve`);
            const updated = posts.filter(p => p.id !== feedId);
            setPosts(updated);
            onCountChange?.(updated.length);
            dispatch(showNotification({ message: __('Post approved.', 'zencommunity'), isShow: true, type: 'success' }));
        } catch (err) {
            dispatch(showNotification({ message: __('Failed to approve post.', 'zencommunity'), isShow: true, type: 'error' }));
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (feedId) => {
        setActionLoading(feedId + '-reject');
        try {
            await API.post(`${namespace}/feed/${feedId}/reject`);
            const updated = posts.filter(p => p.id !== feedId);
            setPosts(updated);
            onCountChange?.(updated.length);
            dispatch(showNotification({ message: __('Post rejected.', 'zencommunity'), isShow: true, type: 'success' }));
        } catch (err) {
            dispatch(showNotification({ message: __('Failed to reject post.', 'zencommunity'), isShow: true, type: 'error' }));
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <Flex justifyContent="center" alignItems="center" py={10}>
                <Spinner color="var(--zencom-primary-color)" />
            </Flex>
        );
    }

    if (!posts.length) {
        return <NoDataPost title={__('No pending posts', 'zencommunity')} />;
    }

    return (
        <Flex direction="column" gap={4}>
            {posts.map(post => (
                <Box
                    key={post.id}
                    bg="var(--zencom-background)"
                    borderRadius="md"
                    p={5}
                >
                    <ZenComAvatar
                        userID={post?.user_id}
                        size='sm'
                        variant="comments"
                        userTitle={post?.author_role?.role ?? post?.user_username}
                        userName={post?.user_first_name + " " + post?.user_last_name}
                        src={post?.user_avatar_url}
                        time={moment(post?.created_at).format('MMMM D, YYYY')}
                    />

                    <Box mt={3} mb={4}>
                        <MentionParser
                            htmlString={post.rendered || post.content}
                            fontSize="14px"
                            isShowMoreOption={false}
                        />
                    </Box>

                    <Flex gap={3}>
                        <Button
                            variant="plain"
                            {...primaryBtnInsideContent}
                            onClick={() => handleApprove(post.id)}
                            loading={actionLoading === post.id + '-approve'}
                        >
                            {__('Approve', 'zencommunity')}
                        </Button>
                        <Button
                            variant="plain"
                            size="sm"
                            border="1px solid"
                            borderColor="var(--zencom-danger-color, #ef4444)"
                            color="var(--zencom-danger-color, #ef4444)"
                            bg="transparent"
                            _hover={{ bg: 'var(--zencom-danger-color, #ef4444)', color: 'white' }}
                            onClick={() => handleReject(post.id)}
                            loading={actionLoading === post.id + '-reject'}
                        >
                            {__('Reject', 'zencommunity')}
                        </Button>
                    </Flex>
                </Box>
            ))}
        </Flex>
    );
};

export default PendingPosts;
