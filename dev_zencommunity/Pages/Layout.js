import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { __ } from '@wordpress/i18n';
import Header from '@Components/Header';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllMenus } from '@Redux/slices/MenuSlice/MenuSlice';
import { community_visibility, current_logged_user, isLoggedIn, is_pro_active, sliceString, } from '@Utils/helper';
import { groupPermissions } from '@Redux/slices/authSlice/authSlice';
import { useFetchData } from '@Hooks/useFetchData';
import { handleTicker } from '@Redux/slices/tickerSlice/tickerSlice';
import useWebSocket from '@Hooks/useWebSocket';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { feedPostLikeSocket } from '@Redux/slices/feedSlice/feedSlice';
import SocketContext from '@Context/SocketContext';
import { addChatHead as addChatHeadAction } from '@Redux/slices/chatHeadSlice/chatHeadSlice';
import { fetchAllMembers } from '@Redux/slices/membersSlice/membersSlice';
import { socketNotification } from '@Redux/slices/userNotificationSlice/userNotificationSlice';
import { fetchActiveAddon } from '@Redux/slices/addons/addonsSlice';
import UpgradeMessage from '@Components/UpgradeToPro';
import { fetchWelcomeBannerSettings } from '@Redux/slices/settingsSlice/settingsSlice';
import Notification from '@Components/Notification';
import ChatHead from '@Pages/CommunityChat/ChatHead';

const Layout = () => {
  const {
    isConnected,
    connectionError,
    connectSocket,
    forceReconnect,
    sendMessage,
    onMessage
  } = useWebSocket();

  const { _ } = useFetchData({
    handler: () => dispatch(handleTicker()),
    timer: 10000,
    isSocketActive: isConnected,
  });

  const location = useLocation();
  const dispatch = useDispatch();
  const loggedIn = isLoggedIn;
  const isLoginPage = location.pathname === "/signin/" || location.pathname === "/signin";
  const bannerSettings = useSelector(state => state.settings.welcome_banner);
  const allMembers = useSelector(state => state.members?.all || []);

  // Always show the global top bar (incl. ticket list + ticket details) so
  // notifications and primary nav stay reachable everywhere.

  // ── ChatHead state ───────────────────────────────────────────────────────────
  // Lives in Redux (redux/slices/chatHeadSlice), not local state/Context, so the
  // FSE header island (a separate React root — see fse/blockRegistry.js's
  // `header` -> Components/Header mapping) and this SPA layout share the same
  // panel/bubbles state instead of each having their own disconnected copy.
  // localStorage hydration/persistence lives in ChatHead/index.js itself now
  // (mounted below, and identically as its own FSE island), not here.
  const addChatHead = (conv) => {
    if (location.pathname.includes('/chat')) return;
    dispatch(addChatHeadAction(conv));
  };

  // Stable ref so socket closure always calls the latest addChatHead
  const addChatHeadRef = useRef(addChatHead);
  useEffect(() => { addChatHeadRef.current = addChatHead; });

  // ── Socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onMessage((data) => {
      handleSocketMessage(data);
    });
    return unsubscribe;
  }, [onMessage]);

  useEffect(() => {
    if (location.pathname === '/signin' || location.pathname === '/signin/') return;
    if (!is_pro_active) return;
    if (bannerSettings?.logged_users && bannerSettings?.guest_users) return;
    dispatch(fetchWelcomeBannerSettings());
  }, [is_pro_active, bannerSettings, location.pathname]);

  useEffect(() => {
    document.querySelectorAll('.zencommunity-livechat-container').forEach(el => el.remove());
  }, [])

  const handleSocketMessage = (event) => {
    const { action: eventType, data, group_id } = event ?? {};
    if (!data) return;
    if (eventType === 'notification') {
      const message = sliceString(data.message ?? '', 40, '...');
      const linkTo = data.feed_id ? `feed/${data.feed_id}` : undefined;
      switch (data.event_type) {
        case "feed_liked":
          if (data.feed_id) dispatch(feedPostLikeSocket(data.feed_id));
          dispatch(socketNotification(data))
          dispatch(
            showNotification({
              message,
              isShow: true,
              type: 'notification',
              linkTo,
            })
          );
          break;

        case "feed_posted":
        case "feed_comment":
        case "comment_liked":
        case "mentioned_in_feed":
        case "mentioned_in_comment":
        case "user_added_in_group":
        case "user_role_changed_in_group":
        case "group_join_request":
          dispatch(socketNotification(data))
          dispatch(
            showNotification({
              message,
              isShow: true,
              type: 'notification',
              linkTo,
            })
          );
          break;

        default:
          console.warn('Unhandled event type:', data?.event_type);
          break;
      }
    } else if (location.pathname !== "/chat/" || location.pathname !== "/chat") {
      switch (eventType) {
        case "new_msg": {
          // Spawn a chat head for the sender
          const senderId = data?.sender_id;
          const isGroup = !!group_id;
          if (senderId && Number(senderId) !== Number(current_logged_user?.user_id)) {
            // The event carries who sent it; the directory is only consulted
            // when it happens to be loaded already. It used to be fetched here
            // on every page — a hundred members, 49 KB and half a second — to
            // fill in a name this payload almost always has.
            const sender = allMembers.find(m => Number(m.id) === Number(senderId));
            addChatHeadRef.current({
              id: isGroup ? group_id : senderId,
              isGroup,
              first_name: sender?.first_name || data?.sender?.first_name || '',
              last_name: sender?.last_name || data?.sender?.last_name || '',
              name: isGroup ? (data?.group?.name || '') : null,
              avatar_url: sender?.avatar_url || null,
              unread: 1,
            });
          }
          dispatch(
            showNotification({
              message: __('New Message', 'zencommunity'),
              isShow: true,
              type: 'notification',
            })
          );
          break;
        }
        case "reaction_added":
          dispatch(
            showNotification({
              message: __('New Reaction on Message', 'zencommunity'),
              isShow: true,
              type: 'notification',
            })
          );
          break;

        default:
          break;
      }
    }
  };

  useEffect(() => {
    if (current_logged_user?.user_id || community_visibility === "guest") {
      dispatch(fetchAllMenus());
      dispatch(fetchActiveAddon());
    }
    if (current_logged_user?.user_id) {
      dispatch(groupPermissions());
    }
  }, [current_logged_user]);

  if (
    !isLoggedIn &&
    community_visibility !== 'guest' &&
    !location.pathname.startsWith('/signin')
  ) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        connectionError,
        connectSocket,
        forceReconnect,
        sendMessage,
        onMessage
      }}
    >
      <Notification />

      <UpgradeMessage />

      <Header loggedIn={loggedIn} isLoginPage={isLoginPage} />

      <Outlet />

      {/* Always mounted so the header's message icon can still open the
      quick Messages panel on /chat too — ChatHead itself suppresses the
      redundant floating bubbles/mini-windows there (see ChatHead/index.js). */}
      {current_logged_user?.user_id && <ChatHead />}
    </SocketContext.Provider>
  )
}

export default Layout;
