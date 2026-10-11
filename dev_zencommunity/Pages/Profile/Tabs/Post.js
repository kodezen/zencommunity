import React, { useState, useRef } from 'react';
import { Box, Button, Flex, Icon, Separator, Text } from '@chakra-ui/react';
import { __, sprintf } from '@wordpress/i18n';
import Posts from '@Components/Posts';
import { API, current_logged_user, feed_default_sort_by, namespace, sortingListArray, is_pro_active } from '@Utils/helper';
import Select from '@Components/ReactSelect';
import PostCard from '@Components/PostCard/PostCard';
import { useLocation, useParams } from 'react-router-dom';
import useInfiniteLoader from '@Hooks/useInfiniteLoader';
import { createFeedPost, deleteFeedPost, reactToFeedPost, applyReactionToPost } from '@Redux/slices/feedSlice/feedSlice';
import { useDispatch } from 'react-redux';
import { createTicket } from '@Redux/slices/ticketSlice/ticketSlice';
import { IoIosInformationCircleOutline } from 'react-icons/io';
import { useStyles } from '../../../utils/chakra';
import PostCardLoader from '@Components/ZenComLoader/Types/PostCardLoader';

const sortBy = [
    { label: __("Latest", 'zencommunity'), value: "created_at" },
    { label: __("Title", 'zencommunity'), value: "title" },
    { label: __("Like", 'zencommunity'), value: "like_count" },
    { label: __("Comment", 'zencommunity'), value: "comment_count" },
    { label: __("Trending", 'zencommunity'), value: "trending" },
    ...(is_pro_active ? [{ label: __("Top Ideas", 'zencommunity'), value: "vote_score" }] : []),
];

const defaultSortBy = sortingListArray.includes(feed_default_sort_by) ? feed_default_sort_by : "created_at";

const Post = ({ RecentActivities, activeSections, isCurrentUser, schedulePosts, setActiveTab }) => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const location = useLocation();
    const { state } = location;
    const userID = id ? id : current_logged_user?.user_id;
    const [profileFeeds, setProfileFeeds] = useState([]);
    const [selectedOrderby, setSelectedOrderby] = useState(defaultSortBy || "created_at");
    const { primaryBtn } = useStyles();
    const onSubmitHandler = async (values, actions, setSelectedTab, selectedTab) => {
        try {
            actions.setSubmitting(true);
            let formData = {
                type: values.type,
                status: values.status,
                content: values.content,
                title: values.title,
                scheduled_at: values.scheduled_at ?? "",
                meta: { ...values.meta, is_anonymous: selectedTab === 'anonymous' ? true : false }
            }

            if (values?.add_media_ids?.length > 0) {
                formData = {
                    ...formData,
                    add_media_ids: values?.add_media_ids
                }
            }

            if (selectedTab === "post" || selectedTab === 'anonymous' || selectedTab === 'poll' || selectedTab === 'video' || selectedTab === 'audio') {
                await dispatch(createFeedPost({ group_id: values.group_id, formData: formData })).unwrap();
                actions.setValues({
                    group_id: 0,
                    title: "",
                    content: "",
                    status: "published",
                    meta: {},
                });
            } else if (selectedTab === "tickets") {
                const payload = {
                    title: values.title,
                    content: values.content,
                    product_id: values.product_id,
                    type_id: values.type_id,
                    priority_id: values.priority_id,
                };

                await dispatch(createTicket(payload)).unwrap();
                actions.setValues({
                    title: "",
                    content: "",
                    product_id: 0,
                    type_id: 0,
                    priority_id: 0,
                });
            }
            actions.resetForm();
            setSelectedTab(null);
        } catch (error) {
            console.error("Form submission failed:", error);
        } finally {
            actions.setSubmitting(false);
        }
    };

    const orderByRef = useRef(selectedOrderby);

    const fetchPage = async (page, isRefresh) => {
        let url = `${namespace}/member/${userID}/feeds?page=${page}`;
        if (orderByRef.current) url += `&order_by=${orderByRef.current}`;
        const { data: { records, pages, total } } = await API.get(url);
        page === 1 ? setProfileFeeds(records) : setProfileFeeds(prev => ([...prev, ...records]));
        return { hasMore: page < pages, total };
    };

    const handleDeleteProfileFeedPost = (id) => {
        dispatch(deleteFeedPost(id))
            .then(() => {
                setProfileFeeds(prev => {
                    return prev.filter(post => Number(post.id) !== Number(id));
                });
            })
    };

    const handleReactToPost = (id, reactType = 'like') => {
        dispatch(reactToFeedPost({ feedId: Number(id), reactType }))
            .then(() => {
                setProfileFeeds(prev => {
                    return prev.map(post => {
                        if (Number(post.id) === Number(id)) {
                            return applyReactionToPost(post, reactType);
                        }
                        return post;
                    });
                });
            })
    }

    const { renderContent, refresh: profileRefresh } = useInfiniteLoader({
        refreshBtnLabel: __("🔄 Refresh Feed", "zencommunity"),
        emptyLabel: __("No posts found", "zencommunity"),
        noMoreLabel: __("No more posts", "zencommunity"),
        renderItem: (feedItem, itemRef) => (
            <Box key={feedItem.id} ref={itemRef} mb={6}>
                <PostCard
                    author={feedItem?.user_usernames}
                    date={moment(feedItem?.created_at).format('MMMM Do YYYY, h:mm:ss a')}
                    title={feedItem?.title}
                    content={feedItem?.content}
                    renderedContent={feedItem?.rendered}
                    avatar_url={feedItem?.user_avatar_url}
                    feedItemData={feedItem}
                    actions={{
                        deletePost: handleDeleteProfileFeedPost,
                        reactToPost: handleReactToPost
                    }}
                />
            </Box>
        ),
        renderSkeleton: () => (
            <>
                <PostCardLoader />
                <PostCardLoader />
                <PostCardLoader />
                <PostCardLoader />
                <PostCardLoader />
            </>
        ),
        fetchPage,
        data: profileFeeds,
    });

    return (
        <Flex mt="24px" gap={{ base: "0", md: "0", lg: "20px" }}>
            <Flex width={{ base: "100%", md: "100%", lg: "70%" }} direction={"column"} gap={"20px"}>
                <Box flex="1" maxWidth="100%">
                    {activeSections && (
                        <Flex flexDirection="column" gap={"16px"} borderRadius="4px" bg="var(--zencom-background)" p={"20px"} marginBottom={6} width={{ base: "100%", md: "100%", lg: "30%" }} display={{ base: "block", md: "block", lg: "none" }}>
                            <RecentActivities />
                        </Flex>
                    )}

                    {schedulePosts?.total > 0 && (
                        <Flex 
                            alignItems={'center'} 
                            border={'1px solid #f5a607'} 
                            borderRadius={'4px'}
                            padding={'12px 16px'} 
                            justifyContent={'space-between'}
                            marginBottom={'24px'}
                        >
                            <Flex alignItems={'center'} gap={"12px"}>
                                <Icon as={IoIosInformationCircleOutline} color={'#f5a607'} />
                                <Text
                                    fontSize={'14px'}
                                    fontWeight={'500'}
                                    lineHeight={'20px'}
                                    color={'var(--zencom-font-color)'}
                                >{sprintf(__("You have %s scheduled posts", "zencommunity"), schedulePosts?.total)}</Text>
                            </Flex>
                            <Button
                                {...primaryBtn}
                                fontSize={'14px'}
                                fontWeight={'500'}
                                lineHeight={'20px'}
                                padding={'16px'}
                                height={0}
                                onClick={() => setActiveTab('schedule-post')}
                            >
                                {__("View Posts", "zencommunity")}
                            </Button>
                        </Flex>
                    )}

                    {isCurrentUser && (<Posts onSubmitHandler={onSubmitHandler} />)}

                    <Box display={"flex"} marginBottom='10px' justifyContent={"space-between"} alignItems={"center"} gap="16px">
                        <Separator size={"md"} my={4} flex="1" borderColor="var(--zencom-border-color)" />

                        <Select
                            options={sortBy}
                            placeholder={__('Sort by', 'zencommunity')}
                            className="zen-com-select zen-com-select--180"
                            classNamePrefix="zen-com-select"
                            value={sortBy.find(item => item.value === selectedOrderby)}
                            onChange={option => {
                                const value = option?.value ?? 'created_at';
                                setSelectedOrderby(value);
                                orderByRef.current = value;
                                profileRefresh();
                            }}
                        />
                    </Box>
                    {renderContent()}
                </Box>
            </Flex>

            <Flex flexDirection="column" gap={"16px"} borderRadius="4px" bg="var(--zencom-background)" p={"20px"} height="fit-content" width={{ base: "100%", md: "100%", lg: "30%" }} display={{ base: "none", md: "none", lg: "block" }}>
                <RecentActivities />
            </Flex>
        </Flex>
    )
}

export default Post;
