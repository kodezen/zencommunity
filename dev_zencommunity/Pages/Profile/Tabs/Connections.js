import React, { useState, useEffect } from 'react';
import { Box, Flex, Stack, Button, Skeleton, SkeletonCircle } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { __ } from '@wordpress/i18n';
import { API, namespace, site_url, media_url, current_logged_user, getDisplayName } from '@Utils/helper';
import NoDataPost from '@Components/NoDataPost';
import { useDispatch } from 'react-redux';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { useStyles } from '@Utils/chakra';

// Followers and Following merged into a single tab with a Followers/Following
// switcher, so the profile doesn't need two separate top-level tabs for what
// is really one "connections" concept. Each side is gated by the profile
// owner's own follow-list privacy choice (see EditAbout.js), instead of the
// single site-wide setting this used to be.
const CONNECTION_TYPES = {
  followers: {
    label: __('Followers', 'zencommunity'),
    query: (id) => `followers_by_user=${id}`,
    filterList: (list) => list,
    emptyTitle: __('No followers found!', 'zencommunity'),
    emptySubtitle: __('Users who follow this profile will appear here.', 'zencommunity'),
  },
  following: {
    label: __('Following', 'zencommunity'),
    query: (id) => `folowings_by_user=${id}`,
    filterList: (list, id) => list.filter(u => u.user_id !== Number(id) && u.is_following === true),
    emptyTitle: __('No following found!', 'zencommunity'),
    emptySubtitle: __('Users this profile follows will appear here.', 'zencommunity'),
  },
};

// Resolves the owner's privacy choice for a given list ('everyone' by
// default) against the current viewer.
const canView = (profileData, type, isCurrentUser) => {
  const setting = profileData?.meta?.follow_privacy?.[type] || 'everyone';
  if (setting === 'profile_owner') return isCurrentUser;
  if (setting === 'logged_user') return !!current_logged_user;
  return true;
};

const Connections = ({ profileData }) => {
  const { id } = useParams();
  const profileUserID = id ? Number(id) : current_logged_user?.user_id;
  const isCurrentUser = !id || Number(id) === Number(current_logged_user?.user_id);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { primaryBtnInsideContent, primaryBtnInsideContentTrans } = useStyles();

  const [activeType, setActiveType] = useState('followers');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingState, setFollowingState] = useState({});

  const config = CONNECTION_TYPES[activeType];
  const isAllowed = canView(profileData, activeType, isCurrentUser);

  useEffect(() => {
    if (!profileUserID || !isAllowed) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const fetchList = async () => {
      setLoading(true);
      try {
        const response = await API.get(`${namespace}/members?${config.query(profileUserID)}`);
        const list = response?.data?.records || response?.data?.data || [];
        const filtered = config.filterList(list, profileUserID);

        setUsers(filtered);

        const state = {};
        filtered.forEach(u => { state[u.user_id] = !!u.is_following; });
        setFollowingState(state);
      } catch (err) {
        console.error(`Failed to fetch ${activeType}`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [profileUserID, activeType, isAllowed]);

  const handleFollow = async (userId) => {
    if (!current_logged_user) return;

    try {
      const res = followingState[userId]
        ? await API.post(`${namespace}/unfollow/${userId}`)
        : await API.post(`${namespace}/follow/${userId}`);

      const isFollowing = res?.data?.is_following ?? !followingState[userId];
      setFollowingState(prev => ({ ...prev, [userId]: isFollowing }));

      dispatch(showNotification({
        message: isFollowing ? __('Followed successfully!', 'zencommunity') : __('Unfollowed successfully!', 'zencommunity'),
        isShow: true,
        type: 'success'
      }));
    } catch (err) {
      dispatch(showNotification({
        message: err?.response?.data?.message || __('Failed to update follow', 'zencommunity'),
        isShow: true,
        type: 'error'
      }));
      console.error(err);
    }
  };

  return (
    <Box width="100%" mt="24px" className="zencom-animate-fade" minH="475px">
      <Flex gap="8px" mb="20px">
        {Object.entries(CONNECTION_TYPES).map(([type, cfg]) => (
          <Button
            key={type}
            size="sm"
            {...(activeType === type ? primaryBtnInsideContent : primaryBtnInsideContentTrans)}
            onClick={() => setActiveType(type)}
          >
            {cfg.label}
          </Button>
        ))}
      </Flex>

      {!isAllowed ? (
        <NoDataPost
          title={__('This list is private', 'zencommunity')}
          subTitle={__('The profile owner has limited who can see this.', 'zencommunity')}
          padding="16px"
          background="var(--zencom-background)"
          margin='0 0 20px 0'
          borderRadius='4px'
        />
      ) : loading ? (
        [...Array(5)].map((_, idx) => (
          <Flex key={idx} alignItems="center" gap="5px" justifyContent="space-between" w="full" mb="4">
            <SkeletonCircle size="10" />
            <Flex flexDirection="column" gap="8px" flex="1">
              <Skeleton height="12px" width="100%" maxW="220px" />
              <Skeleton height="10px" width="80px" />
            </Flex>
          </Flex>
        ))
      ) : users.length > 0 ? (
        users.map((user) => (
          <Flex key={user.user_id} alignItems="center" gap="8px" mb="16px" padding="16px" borderRadius={4} background="var(--zencom-background)">
            <ZenComAvatar
                userID={user.user_id}
              variant="simple"
              userName={getDisplayName(user)}
              src={media_url(user.avatar_url)}
              onClick={() => navigate(`/profile/${user.user_id}`)}
              cursor="pointer"
            />
            <Stack flex="1" gap="0">
              <ZCLabel type="basic" label={getDisplayName(user)} />
              <ZCLabel type="simpleLight" label={'@' + user.username} />
            </Stack>

            {user.user_id !== current_logged_user?.user_id && (
              <Button
                size="sm"
                bg={followingState[user.user_id] ? "transparent" : "var(--zencom-primary-color)"}
                color={followingState[user.user_id] ? "var(--zencom-font-color)" : "#fff"}
                border={followingState[user.user_id] ? "1px solid var(--zencom-border-color)" : "none"}
                onClick={() => handleFollow(user.user_id)}
              >
                {followingState[user.user_id] ? __('Unfollow', 'zencommunity') : __('Follow', 'zencommunity')}
              </Button>
            )}
          </Flex>
        ))
      ) : (
        <NoDataPost
          title={config.emptyTitle}
          subTitle={config.emptySubtitle}
          padding="16px"
          background="var(--zencom-background)"
          margin='0 0 20px 0'
          borderRadius='4px'
        />
      )}
    </Box>
  );
};

export default Connections;
