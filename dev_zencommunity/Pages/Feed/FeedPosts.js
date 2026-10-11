import React, { useState, useMemo, useRef } from 'react';
import { Box, Flex, Icon, HStack, Separator, } from "@chakra-ui/react";
import PostCard from '../../Components/PostCard/PostCard';
import { __ } from '@wordpress/i18n';
import Posts from '@Components/Posts';
import { useStyles } from '../../utils/chakra';
import PostCardLoader from '@Components/ZenComLoader/Types/PostCardLoader';
import { useDispatch } from 'react-redux';
import { createFeedPost, deleteFeedPost, fetchAllFeeds, reactToFeedPost, } from '@Redux/slices/feedSlice/feedSlice';
import { createTicket } from '@Redux/slices/ticketSlice/ticketSlice';
import useInfiniteLoader from '@Hooks/useInfiniteLoader';
import { useSelector } from 'react-redux';
import { LuLayoutList, LuColumns2 } from 'react-icons/lu';
import { current_logged_user, feed_default_sort_by, getAddonActiveStatus, is_pro_active, sortingListArray, theme_settings } from '@Utils/helper';
import Select from '@Components/ReactSelect';
import Banner from '@Components/Banner/Banner';
import classNames from 'classnames';
import { useParams } from 'react-router-dom';

const baseSortOptions = [
  { label: __("Latest", 'zencommunity'), value: "created_at" },
  { label: __("Title", 'zencommunity'), value: "title" },
  { label: __("Like", 'zencommunity'), value: "like_count" },
  { label: __("Comment", 'zencommunity'), value: "comment_count" },
  { label: __("Trending", 'zencommunity'), value: "trending" },
  // { label: __("From Followings", 'zencommunity'), value: "from_followers" }
  ...(is_pro_active ? [{ label: __("Top Ideas", 'zencommunity'), value: "vote_score" }] : []),
];

const defaultSortBy = sortingListArray.includes(feed_default_sort_by) ? feed_default_sort_by : "created_at";

const FeedPosts = ({ bookmarked = false }) => {
  const { id } = useParams();
  const member = location.pathname.includes(`/member/${id}`) || location.pathname.includes(`/member/${id}/`);
  const { responsiveContent, responsiveContent5 } = useStyles();
  const dispatch = useDispatch();
  const feeds = useSelector((state) => state.feeds);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('post-view') || 'grid');
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [selectedOrderby, setSelectedOrderby] = useState(defaultSortBy);
  const bannerSettings = useSelector(state => state.settings.welcome_banner);
  const activeAddons = useSelector(state => state?.addons?.activeAddons);
  const showFollow = getAddonActiveStatus(activeAddons, "FollowerAndBlocker") && !!current_logged_user;
  const groupDataSortBy = showFollow
    ? [
      ...baseSortOptions,
      { label: __("From Followings", 'zencommunity'), value: "from_followers" },
    ]
    : baseSortOptions;

  // const { onMessage } = useWebSocket();

  const orderByRef = useRef(selectedOrderby);

  const fetchPage = async (page, isRefresh) => {
    const params = {
      page,
      order_by: orderByRef.current !== 'from_followers' ? orderByRef.current : undefined,
      from_followers: orderByRef.current === 'from_followers' ? true : undefined,
      bookmarked: bookmarked ? 'yes' : undefined,
    };
    const { total, pages } = await dispatch(fetchAllFeeds(params)).unwrap();
    return { hasMore: page < pages, total };
  };

  const handleDeleteFeedPost = (id) => {
    dispatch(deleteFeedPost(Number(id)));
  };

  const handleReactToPost = (id, reactType = 'like') => {
    dispatch(reactToFeedPost({ feedId: Number(id), reactType }));
  };

  const handlePostClick = (postId) => {
    if (viewMode === 'list') {
      setExpandedPostId(expandedPostId === postId ? null : postId);
    }
  };

  const filteredFeeds = useMemo(() => {
    return feeds.data;
  }, [feeds.data]);

  const { renderContent, refresh } = useInfiniteLoader({
    refreshBtnLabel: __("🔄 Refresh Feed", "zencommunity"),
    emptyLabel: bookmarked ? __("You haven't bookmarked any posts yet", "zencommunity") : __("No posts found", "zencommunity"),
    noMoreLabel: __("No more posts", "zencommunity"),
    renderItem: (feedItem, itemRef) => (
      <Box key={feedItem.id} ref={itemRef}>
        <PostCard
          author={feedItem?.user_usernames}
          date={moment(feedItem?.created_at).format('MMMM Do YYYY, h:mm:ss a')}
          title={feedItem?.title}
          content={feedItem?.content}
          renderedContent={feedItem?.rendered}
          avatar_url={feedItem?.user_avatar_url}
          feedItemData={feedItem}
          actions={{
            deletePost: handleDeleteFeedPost,
            reactToPost: handleReactToPost,
          }}
          viewMode={viewMode}
          isExpanded={expandedPostId === feedItem.id}
          setExpandedPostId={setExpandedPostId}
          onPostClick={handlePostClick}
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
    data: filteredFeeds,
  });

  const onSubmitHandler = async (values, actions, setSelectedTab, selectedTab) => {
    try {
      actions.setSubmitting(true);
      let formData = {
        type: values.type,
        status: values.status,
        content: values.content,
        title: values.title,
        scheduled_at: values.scheduled_at ?? "",
        meta: {
          ...values.meta,
          is_anonymous: selectedTab === 'anonymous' ? true : false
        }
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
          scheduled_at: "",
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

  const showBanner = is_pro_active && (bannerSettings?.logged_users?.status || (!current_logged_user?.user_id && bannerSettings?.guest_users?.status));
  const isThemeDark = theme_settings?.theme_mode === "dark";

  const isRes = member ? responsiveContent5 : responsiveContent;

  return (
    <Box {...isRes} className='zencom-feed'>
      {!bookmarked && showBanner && (
        <Banner />
      )}
      {!bookmarked && current_logged_user?.user_id && <Posts onSubmitHandler={onSubmitHandler} />}

      <HStack mb={4}>
        <Separator flex="1" borderColor="var(--zencom-border-color)" />
        <Flex gap={2} justifyContent="flex-end">
          {!bookmarked && <Select
            options={groupDataSortBy}
            placeholder={__('Sort by', 'zencommunity')}
            className="zen-com-select zen-com-select--180"
            classNamePrefix="zen-com-select"
            value={groupDataSortBy.find(item => item.value === selectedOrderby)}
            onChange={option => {
              const value = option?.value ?? 'created_at';
              setSelectedOrderby(value);
              orderByRef.current = value;
              refresh();
            }}
          />}

          <button
            type="button"
            onClick={() => {
              setViewMode("grid");
              setExpandedPostId(null);
              localStorage.setItem("post-view", "grid");
            }}
            className={classNames(
              "zencom-top-menu",
              `zencom-top-menu--${isThemeDark ? "dark" : "light"}`,
              { "zencom-top-menu--active": viewMode === "grid" }
            )}
          >
            <Icon as={LuColumns2} boxSize="16px" color="var(--zencom-font-color)" />
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("list");
              localStorage.setItem("post-view", "list");
            }}
            className={classNames(
              "zencom-top-menu",
              `zencom-top-menu--${isThemeDark ? "dark" : "light"}`,
              { "zencom-top-menu--active": viewMode === "list" }
            )}
          >
            <Icon as={LuLayoutList} boxSize="16px" color="var(--zencom-font-color)" />
          </button>
        </Flex>
      </HStack>

      {renderContent()}
    </Box>
  );
};

export default FeedPosts;
