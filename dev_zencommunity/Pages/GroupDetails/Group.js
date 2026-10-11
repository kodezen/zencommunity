import React, { useEffect, useRef, useState } from 'react';
import { Box, Flex, useBreakpointValue, Tabs } from '@chakra-ui/react';
import { __, sprintf } from '@wordpress/i18n';
import { API, namespace, mediaFileUploader, plugin_root_url, current_logged_user, community_visibility, current_user_can, sortingListArray, feed_default_sort_by, is_academy_active } from '@Utils/helper';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import ZenComLoader from '@Components/ZenComLoader';
import { deleteGroup, fetchGroupById, joinGroup, leaveGroup } from '@Redux/slices/groupSlice/groupSlice';
import { groupPermissions } from '@Redux/slices/authSlice/authSlice';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import InviteModal from './InviteModal';
import RecentActivities from './RecentActivities';
import Members from './Members';
import About from './About';
import Discussion from './Discussion';
import GroupHeader from './GroupHeader';
import PostCard from '@Components/PostCard/PostCard';
import useInfiniteLoader from '@Hooks/useInfiniteLoader';
import NoDataPost from '@Components/NoDataPost';
import { deleteFeedPost, reactToFeedPost, featureFeedPost, applyReactionToPost } from '@Redux/slices/feedSlice/feedSlice';
import { useStyles } from '../../utils/chakra';
import { groupDataSortBy } from './helper';
import PrivateGroupRequestView from './PrivateGroupRequestView';
import GroupCover from './GroupCover';
import GroupLoading from '@Components/ZenComLoader/Types/GroupLoading';
import GroupFeaturedPosts from './GroupFeaturedPosts';
import GroupMediaGallery from './GroupMediaGallery';
import PendingPosts from './PendingPosts';
import Events from './Events';
import GroupCourses from './GroupCourses';
import SinglePage from './SinglePage';
import ResourceLibrary from './ResourceLibrary';
import PlayerSpace from './PlayerSpace';
import { allowedTabsByType, orderOptionalTabs } from '@Utils/groupTabs';

const defaultSortBy = sortingListArray.includes(feed_default_sort_by) ? feed_default_sort_by : "created_at";

// The primary/default tab a Space opens on, based on its content type. Typed
// spaces (single-page/resource-library/audio/video) also restrict which tabs
// are shown.
const primaryTabByType = (type) => ({
    'single-page': 'page',
    'resource-library': 'resources',
    'event': 'events',
    'course': 'courses',
    'audio': 'player',
    'video': 'player',
}[type] || 'discussion');

const Group = () => {
    const { responsiveContent3 } = useStyles();
    const { id } = useParams();
    const group_permissions = useSelector(state => state.auth.group_permissions);
    const cover = plugin_root_url + "/assets/images/cover_placeholder.png";
    const profile = plugin_root_url + '/assets/images/person.svg';
    const [groupData, setGroupData] = useState({});
    const [groupFeeds, setGroupFeeds] = useState([]);
    const [groupActivities, setGroupActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('discussion');
    const [isOpen, setIsOpen] = useState(false);
    const [inviteModal, setInviteModal] = useState(false);
    const [requestStatus, setRequestStatus] = useState(null);
    const [isRequestLoading, setIsRequestLoading] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [pendingPostsCount, setPendingPostsCount] = useState(0);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Membership state (join/leave button, admin gating) is derived from
    // group_permissions, which the SPA <Layout> bootstraps. In Gutenberg (FSE)
    // render mode the content-outlet mounts routes WITHOUT <Layout>, so that
    // fetch never runs and the group always looks "not joined" (Join button
    // shows even for members). Fetch it here when it hasn't loaded yet — a no-op
    // in SPA mode where Layout already populated it.
    useEffect(() => {
        if (current_logged_user && !group_permissions) {
            dispatch(groupPermissions());
        }
    }, [current_logged_user, group_permissions, dispatch]);
    const isMobile = useBreakpointValue({ base: true, lg: false });
    const isAdmin = group_permissions?.[parseInt(id || groupData?.id)]?.role === 'admin' || group_permissions?.manage_everything;
    const isGroupModerator = group_permissions?.[parseInt(id || groupData?.id)]?.role === 'moderator';
    const canPostAsTeam = isAdmin || isGroupModerator;
    const featuredCount = groupFeeds.filter(p => Number(p.is_featured) === 1).length;
    const { events } = useSelector(state => state.events);
    const eventCount = events?.length ?? 0;
    const hasPermission = !!group_permissions?.[parseInt(id || groupData?.id)];
    const isNotLoggedAndGust = !current_logged_user && community_visibility === 'guest';
    const isUserExistsInGroup = group_permissions?.[parseInt(id || groupData?.id)];
    const canFetchEvents = groupData?.member_status === 'active' || current_user_can?.manage_options || groupData?.privacy === 'public';
    const spaceType = groupData?.type || 'discussion';

    const orderByRef = useRef(defaultSortBy || 'created_at');

    // External Link spaces don't render a view — they send the member to the URL.
    useEffect(() => {
        if (spaceType !== 'external-link') return;
        const url = groupData?.meta?.external_url;
        if (!url) return;
        if (groupData?.meta?.open_new_tab) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = url;
        }
    }, [spaceType, groupData?.id]);

    const fetchPage = async (page, isRefresh) => {
        try {
            let url = `${namespace}/group/${id}/feeds?page=${page}`;
            if (orderByRef.current && orderByRef.current !== 'from_followers') url += `&order_by=${orderByRef.current}`;
            if (orderByRef.current === 'from_followers') url += `&from_followers=true`;
            const { data: { records, pages, total } } = await API.get(url);
            page === 1 ? setGroupFeeds(records) : setGroupFeeds(prev => ([...prev, ...records]));
            return { hasMore: page < pages, total };
        } catch (err) {
            return null;
        }
    };

    const sortHandler = (order_by, from_followers = false) => {
        orderByRef.current = from_followers ? 'from_followers' : order_by;
        groupRefresh();
    };
    
    const handleDeleteGroupFeedPost = (id) => {
        dispatch(deleteFeedPost(id))
            .then(() => {
                setGroupFeeds(prev => {
                    return prev.filter(post => Number(post.id) !== Number(id));
                });
            })
    };

    const handleReactToPost = (id, reactType='like') => {
        // Snapshot the affected post so we can revert if the request fails.
        const prevPost = groupFeeds.find(post => Number(post.id) === Number(id));

        // Optimistic, complete update (react_type, is_liked, like_count, reaction_count).
        setGroupFeeds(prev =>
            prev.map(post =>
                Number(post.id) === Number(id) ? applyReactionToPost(post, reactType) : post
            )
        );

        dispatch(reactToFeedPost({ feedId: Number(id), reactType }))
            .unwrap()
            .catch(() => {
                if (!prevPost) return;
                setGroupFeeds(prev =>
                    prev.map(post => (Number(post.id) === Number(id) ? prevPost : post))
                );
            });
    };

    const handleFeaturePost = (feedId) => {
        dispatch(featureFeedPost({ feedId })).then((action) => {
            if (action.payload) {
                setGroupFeeds(prev =>
                    prev.map(post => Number(post.id) === Number(feedId) ? action.payload : post)
                );
            }
        });
    };

    const { renderContent: renderGroupContent, refresh: groupRefresh } = useInfiniteLoader({
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
                        deletePost: handleDeleteGroupFeedPost,
                        reactToPost: handleReactToPost,
                        featurePost: handleFeaturePost,
                    }}
                />
            </Box>
        ),
        renderSkeleton: () => <ZenComLoader noOfLines={2} />,
        fetchPage,
        data: groupFeeds,
    });

    const onSubmitHandler = async (values, actions, setSelectedTab) => {
        actions.setSubmitting(true);
        const isPendingApproval = groupData?.meta?.post_approval_required && !isAdmin;
        const submitValues = { ...values, status: isPendingApproval ? 'pending' : 'published' };
        await API.post(namespace + `/group/${values.group_id}/feeds`, { ...submitValues })
            .then((response) => {
                if (response.status === 200) {
                    if (values.scheduled_at) {
                        dispatch(showNotification({
                            message: sprintf(__("Your post has been scheduled for %s. Please find the scheduled post from your profile.", "zencommunity"), moment(values.scheduled_at).local().format("MMMM D, YYYY hh:mm A")),
                            isShow: true,
                            type: 'success',
                        }));
                    } else if (response.data?.status === 'pending') {
                        dispatch(showNotification({
                            message: __('Your post is pending approval.', 'zencommunity'),
                            isShow: true,
                            type: 'success',
                        }));
                        setGroupFeeds(prev => ([response.data, ...prev]));
                    } else {
                        dispatch(showNotification({
                            message: __('Post Created Successfully!', 'zencommunity'),
                            isShow: true,
                            type: 'success',
                        }));
                        setGroupFeeds(prev => ([response.data, ...prev]));
                    }
                    setSelectedTab?.(null);
                    actions.resetForm();
                }
            })
            .catch((err) => {
                dispatch(showNotification({
                    message: err?.response?.data?.message || __('Failed to create post.', 'zencommunity'),
                    isShow: true,
                    type: 'error',
                }));
            })
            .finally(() => {
                actions.setSubmitting(false);
            });
    };

    const handleTabNavigation = (tabValue) => {
        setSelectedTab(tabValue);
    };

    // Net-new content-type views, shown only for their space type.
    const typeTabs = [];
    if (spaceType === 'single-page') {
        typeTabs.push({ value: 'page', label: __("Page", "zencommunity"), component: <SinglePage groupData={groupData} />, showOnMobile: true });
    }
    if (spaceType === 'resource-library') {
        typeTabs.push({ value: 'resources', label: __("Resources", "zencommunity"), component: <ResourceLibrary groupData={groupData} />, showOnMobile: true });
    }
    if (spaceType === 'audio' || spaceType === 'video') {
        typeTabs.push({
            value: 'player',
            label: __("Player", "zencommunity"),
            component: (
                <PlayerSpace
                    groupData={groupData}
                    groupID={id}
                    onSubmitHandler={onSubmitHandler}
                    hasPermission={hasPermission}
                    isAdmin={isAdmin}
                    canPostAsTeam={canPostAsTeam}
                    groupFeeds={groupFeeds}
                    actions={{
                        deletePost: handleDeleteGroupFeedPost,
                        reactToPost: handleReactToPost,
                        featurePost: handleFeaturePost,
                    }}
                />
            ),
            showOnMobile: true,
        });
    }

    // Courses/Pending Posts additionally gate on "has content"/"approval
    // required" so an untouched group's tab bar doesn't change shape by
    // default. Once a group admin explicitly enables one of these two from
    // the Tabs settings panel, that opt-in overrides the content gate and
    // the tab shows (empty state included) — matching how the other four
    // optional tabs already work. Undisturbed groups (no saved meta.enabled_tabs
    // at all) see no change: enabledTabsMeta?.[key] is undefined, not true,
    // so the OR below falls through to the original content-based check.
    const enabledTabsMeta = groupData?.meta?.enabled_tabs;
    const isTabExplicitlyEnabled = (key) => enabledTabsMeta?.[key] === true;

    // Tabs a group admin can enable/disable and reorder from the group
    // settings panel (see @Utils/groupTabs). Discussion, Featured, typed
    // tabs, and Recent activities are permanent/out of scope and stay below,
    // outside this array.
    const optionalTabDefs = [
        {
            value: 'about',
            label: __("About", "zencommunity"),
            component: <About groupData={groupData} />,
            showOnMobile: true,
        },
        {
            value: 'members',
            label: __("Members", "zencommunity"),
            component: <Members isAdmin={isAdmin} groupData={groupData} isMobile={isMobile} isUserExistsInGroup={isUserExistsInGroup} id={id} type="tab" handleTabNavigation={handleTabNavigation} groupID={id} />,
            showOnMobile: true,
        },
        {
            value: 'events',
            label: __("Events", "zencommunity"),
            component: <Events groupId={id} isAdmin={isAdmin} onFeedRefresh={groupRefresh} canFetch={canFetchEvents} />,
            showOnMobile: true,
        },
        {
            value: 'media',
            label: __("Media", "zencommunity"),
            component: <GroupMediaGallery id={id} />,
            showOnMobile: true,
        },
        ...(is_academy_active && ((groupData?.courses?.courses?.length > 0) || (groupData?.courses?.category_ids?.length > 0) || isTabExplicitlyEnabled('courses')) ? [{
            value: 'courses',
            label: __("Courses", "zencommunity"),
            component: <GroupCourses groupId={id} />,
            showOnMobile: true,
        }] : []),
        ...(isAdmin && ((groupData?.meta?.post_approval_required || groupData?.meta?.post_approval_first_post_only) || isTabExplicitlyEnabled('pending-posts')) ? [{
            value: 'pending-posts',
            label: (
                <Flex alignItems="center" gap={1}>
                    {__("Pending Posts", "zencommunity")}
                    {pendingPostsCount > 0 && (
                        <Box
                            as="span"
                            color="var(--zencom-font-color)"
                            borderRadius="full"
                            border={'1px solid var(--zencom-primary-color)'}
                            fontSize="11px"
                            fontWeight="bold"
                            minW="18px"
                            h="18px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            px="4px"
                        >
                            {pendingPostsCount}
                        </Box>
                    )}
                </Flex>
            ),
            component: (
                <PendingPosts
                    groupId={id}
                    onCountChange={setPendingPostsCount}
                />
            ),
            showOnMobile: true,
        }] : []),
    ];

    const tabItems = [
        ...typeTabs,
        {
            value: 'discussion',
            label: __("Discussion", "zencommunity"),
            component: (
                <Discussion
                    id={id}
                    isMobile={isMobile}
                    isNotLoggedAndGust={isNotLoggedAndGust}
                    groupData={groupData}
                    renderInfiniteLoaderContent={renderGroupContent}
                    groupActivities={groupActivities}
                    loading={loading}
                    hasPermission={hasPermission}
                    isAdmin={isAdmin}
                    canPostAsTeam={canPostAsTeam}
                    onSubmitHandler={onSubmitHandler}
                    groupDataSortBy={groupDataSortBy}
                    handleTabNavigation={handleTabNavigation}
                    sortHandler={sortHandler}
                    featuredCount={featuredCount}
                    pendingCount={pendingPostsCount}
                    eventCount={eventCount}
                />
            ),
            showOnMobile: true,
        },
        {
            value: 'featured',
            label: __("Featured", "zencommunity"),
            component: <GroupFeaturedPosts id={id} groupFeeds={groupFeeds} />,
            showOnMobile: true,
        },
        ...orderOptionalTabs(optionalTabDefs, groupData?.meta),
        {
            value: 'recent-activities',
            label: __("Recent activities", "zencommunity"),
            component: <RecentActivities groupActivities={groupActivities} />,
            showOnMobile: true,
            mobileOnly: true,
        }
    ];

    const primaryTab = primaryTabByType(spaceType);

    const visibleTabs = (() => {
        let tabs = tabItems.filter(tab => (tab.mobileOnly ? isMobile : (tab.showOnMobile || !isMobile)));
        // Content-only types show a restricted tab set.
        const allow = allowedTabsByType[spaceType];
        if (allow) tabs = tabs.filter(tab => allow.includes(tab.value));
        // Open on the type's primary view.
        const primary = tabs.find(tab => tab.value === primaryTab);
        return primary ? [primary, ...tabs.filter(tab => tab.value !== primaryTab)] : tabs;
    })();

    const handleImageChange = async (event, type) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const res = await mediaFileUploader(type, file);
            if (res?.id) {
                const { data } = await API.post(namespace + `/group/${id}`, { name: groupData.name, media_ids: [res.id] });
                setGroupData({ ...groupData, ...data });
            }
        } catch (err) {
            console.error("Upload failed", err);
        }
    };

    useEffect(() => {
        groupRefresh();
    }, [id]);

    const fetchMembersActivities = async () => {
        if (current_logged_user && id) {
            try {
                const { data: { records: activitiesRecords } } = await API.get(`${namespace}/group/${id}/activities`);
                setGroupActivities(activitiesRecords);
            } catch (error) {
                console.error("Error fetching group data:", error);
            }
        }
    };

    useEffect(() => {
        fetchMembersActivities().finally(() => setLoading(false));
    }, [id, current_logged_user]);

    useEffect(() => {
        (async () => {
            const response = await dispatch(fetchGroupById(id));
            if (response.payload) {
                setGroupData(response.payload);
                // Open the Space on its content type's primary view.
                setSelectedTab(primaryTabByType(response.payload.type || 'discussion'));
            }
        })();
    }, [id]);

    useEffect(() => {
        if (!isAdmin || !id) return;
        (async () => {
            try {
                const { data } = await API.get(`${namespace}/group/${id}/pending-posts?per_page=1`);
                setPendingPostsCount(data?.total ?? 0);
            } catch (_) {}
        })();
    }, [isAdmin, id]);

    const handleDeleteGroup = async () => {
        await dispatch(deleteGroup(id)).then(() => {
            navigate("/groups");
        });
    };

    const handleRemoveCoverImg = async () => {
        const { data } = await API.put(namespace + `/group/${id}`, { remove_media: "group_cover" });
        setGroupData(data);
    };

    const handleLeaveGroup = () => {
        dispatch(leaveGroup(groupData.id)).then(res => {
            if (res.payload.success) {
                dispatch(showNotification({
                    message: __('You have left the group', 'zencommunity'),
                    isShow: true,
                    type: 'success',
                }));
                setRequestStatus(null);
            }
        });
    };

    const handleJoinGroup = async () => {
        if (!current_logged_user) {
            navigate('/signin');
            return;
        }

        setIsRequestLoading(true);
        await dispatch(joinGroup(groupData.id)).then(res => {
            if (res.payload.success) {
                if (groupData.privacy === 'private' && groupData.meta?.approval_required) {
                    setRequestStatus('pending');
                    dispatch(showNotification({
                        message: __('Your request to join has been sent for approval', 'zencommunity'),
                        isShow: true,
                        type: 'success',
                    }));
                } else {
                    dispatch(showNotification({
                        message: __('You have joined group successfully', 'zencommunity'),
                        isShow: true,
                        type: 'success',
                    }));
                    fetchMembersActivities();
                }
            }
        }).finally(() => {
            setIsRequestLoading(false);
        });
    };

    const viewGroup = (groupData?.member_status === "active" || current_user_can?.manage_options) || groupData.privacy === "public" || groupData.privacy === "hidden";

    return (
        <Box className="zencom-animate-fade" {...responsiveContent3}>  
            {loading ? (
                <GroupLoading />
            ) : spaceType === 'external-link' ? (
                <Flex direction="column" align="center" justify="center" gap={4} minH="40vh" textAlign="center" className="zencom-animate-fade">
                    <Box fontSize="18px" fontWeight="600" color="var(--zencom-font-color)">{groupData?.name}</Box>
                    <Box fontSize="14px" color="var(--zencom-font-muted)">
                        {groupData?.meta?.external_url ? __('Opening the external link…', 'zencommunity') : __('No link has been set for this Space.', 'zencommunity')}
                    </Box>
                    {groupData?.meta?.external_url && (
                        <a
                            href={groupData.meta.external_url}
                            target={groupData?.meta?.open_new_tab ? '_blank' : undefined}
                            rel="noreferrer"
                            style={{ background: 'var(--zencom-primary-color)', color: '#fff', borderRadius: '6px', padding: '8px 16px', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}
                        >
                            {__('Open link', 'zencommunity')}
                        </a>
                    )}
                </Flex>
            ) : (
                <>
                    {viewGroup ? (
                        <Flex direction="column" gap={10}>
                            <Tabs.Root defaultValue="discussion" variant="unstyled" value={selectedTab} onValueChange={(e) => handleTabNavigation(e.value)}>
                                <Box
                                    display="flex"
                                    flexDirection={"column"}
                                    gap={4}
                                    borderRadius="md"
                                    bg={"var(--zencom-background)"}
                                    position="relative"
                                    className='zencom-group-top'
                                >
                                    <GroupCover
                                        groupData={groupData}
                                        isAdmin={isAdmin}
                                        handleImageChange={handleImageChange}
                                        handleRemoveCoverImg={handleRemoveCoverImg}
                                        cover={cover}
                                    />

                                    <GroupHeader
                                        id={id}
                                        groupData={groupData}
                                        profile={profile}
                                        isAdmin={isAdmin}
                                        isUserExistsInGroup={isUserExistsInGroup}
                                        handleImageChange={handleImageChange}
                                        handleJoinGroup={handleJoinGroup}
                                        handleLeaveGroup={handleLeaveGroup}
                                        handleDeleteGroup={handleDeleteGroup}
                                        setInviteModal={setInviteModal}
                                        isOpen={isOpen}
                                        setIsOpen={setIsOpen}
                                        setGroupData={setGroupData}
                                        isShareOpen={isShareOpen}
                                        setIsShareOpen={setIsShareOpen}
                                    />

                                    <Tabs.List borderBottom="1px solid var(--zencom-border-color)" position="relative" overflowX="auto">
                                        {visibleTabs.map((tab) => (
                                            <Tabs.Trigger
                                                key={tab?.value}
                                                value={tab?.value}
                                                className="zc-tab"
                                                padding="2 !important"
                                                flex="none"
                                            >
                                                {tab?.label}
                                            </Tabs.Trigger>
                                        ))}
                                    </Tabs.List>
                                </Box>

                                {visibleTabs.map((tab) => (
                                    <Tabs.Content key={tab?.value} value={tab?.value}>
                                        {tab?.component}
                                    </Tabs.Content>
                                ))}
                            </Tabs.Root>
                        </Flex>
                    ) : (
                        <PrivateGroupRequestView
                            id={id}
                            handleJoinGroup={handleJoinGroup}
                            groupData={groupData}
                            requestStatus={requestStatus}
                            navigate={navigate}
                            cover={cover}
                            profile={profile}
                            isShareOpen={isShareOpen}
                            setIsShareOpen={setIsShareOpen}
                        />
                    )}

                    {inviteModal && (<InviteModal inviteModal={inviteModal} setInviteModal={setInviteModal} groupId={id || groupData?.id} />)}
                </>
            )}
        </Box>
    );
};

export default Group;
