import React, { useState, useEffect, useContext, useRef } from "react";
import { Box, Flex, useBreakpointValue, } from "@chakra-ui/react";
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelector } from "react-redux";
import { fetchAllMembers } from "@Redux/slices/membersSlice/membersSlice";
import { joinGroupMessage, unreadGroupMessage } from "@Redux/slices/chatSlice/groupActions";
import { API, current_logged_user, namespace, playAudio, theme_settings, } from "@Utils/helper";
import { useFetchData } from "@Hooks/useFetchData";
import { showNotification } from "@Redux/slices/notificationSlice/notificationSlice";
import MessageLeftBar from "./components/MessageLeftBar";
import MessageRightDetailsBar from "./components/MessageRightDetailsBar";
import ChatContent from "./components/ChatContent";
import SocketContext from "@Context/SocketContext";
import { fetchAllGroups } from "@Redux/slices/groupSlice/groupSlice";
import {
    addNewMessageInChat,
    updateMessageInChat,
    removeReactionFromMessage,
    deleteMessageInChat,
    addReactionToMessage,
    addNewMessageInGroupChat,
    updateMessageInGroupChat,
    deleteMessageInGroupChat,
    addReactionToGroupMessage,
    removeReactionFromGroupMessage,
    markPrivateConversationSeen,
    markGroupConversationSeen
} from "@Redux/slices/chatSlice/chatSlice";
import { useLocation } from "react-router-dom";
import { unreadMessage } from "@Redux/slices/chatSlice/privateMessageActions";
import ZCLabel from "@Components/Chakra/Labels/ZCLabel";

const CommunityChat = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const [selectedUser, setSelectedUser] = useState(false);
    const [blockedUser, setBlockedUser] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [membersMessages, setMembersMessages] = useState(false);
    const [membersPagination, setMembersPagination] = useState({ page: 1, pages: 1 });
    const [messages, setMessages] = useState([]);
    const [messageableMembers, setMessageableMembers] = useState(false);
    const [searchText, setSearchText] = useState('');
    const { all: allMembers } = useSelector(state => state.members);
    const { data: allGroup } = useSelector(state => state.groups);
    const chats = useSelector(state => state.chats);
    const [dataLoading, setDataLoading] = useState(true);
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const isThemeDark = theme_settings?.theme_mode === "dark";
    const isLargeScreen = useBreakpointValue({ base: false, xl: true });
    const isMediumScreen = useBreakpointValue({ base: false, md: true, lg: false, xl: false });
    const isMobile = useBreakpointValue({ base: true, md: false });
    const { onMessage, isConnected } = useContext(SocketContext);

    // Mirror selectedUser in a ref so the WS handler reads the *current*
    // selection without re-subscribing (and without going stale after a switch).
    const selectedUserRef = useRef(selectedUser);
    selectedUserRef.current = selectedUser;

    useEffect(() => {
        if (allMembers?.length === 0) {
            setMembersLoading(true);
            fetchBlockedUsers()
            dispatch(fetchAllMembers()).then(() => {
                setMembersLoading(false);
            });
        }
        if (allGroup?.length === 0) {
            dispatch(fetchAllGroups())
        }
    }, [])

    const fetchMessages = (page = 1) => {
        return API.get(namespace + `/messages?page=${page}&per_page=15`).then(({ data }) => {
            const { records = [], pages = 1, page: respPage = page } = data;
            const groupData = records.filter((item) => !item.is_private);
            const memberData = records.filter((item) => item.is_private);
            const margeData = [...groupData.map(({ id, ...item }) => { return { ...item, isGroup: true, group_id: id } }), ...memberData];

            const keyOf = (i) => (i.isGroup ? `g${i.group_id}` : `u${i.id}`);

            setMembersMessages(prev => {
                const existing = Array.isArray(prev) ? prev : [];
                if (respPage > 1) {
                    // Older page → append conversations not already present.
                    const incoming = margeData.filter(m => !existing.some(e => keyOf(e) === keyOf(m)));
                    return [...existing, ...incoming];
                }
                // Page 1 (initial / poll) → fresh recent conversations first, keep
                // any older pages already loaded below them.
                const incomingKeys = new Set(margeData.map(keyOf));
                const olderKept = existing.filter(e => !incomingKeys.has(keyOf(e)));
                return [...margeData, ...olderKept];
            });

            // Track the deepest page loaded so a page-1 poll doesn't reset it.
            setMembersPagination(prev => ({ page: Math.max(prev?.page || 1, respPage), pages }));
        });
    }

    // Initial load + polling fallback + post-reconnect refetch are all handled
    // by useFetchData, so no separate mount fetch is needed here.
    const { _ } = useFetchData({
        handler: fetchMessages,
        timer: 10000,
        isSocketActive: isConnected,
    });

    useEffect(() => {
        const storageData = localStorage.getItem('zcui');
        if (storageData && typeof storageData === 'string') {
            try {
                const parsedData = JSON.parse(storageData);
                const localUserID = parsedData.includes('group_') ? parsedData.split('group_')[1] : parsedData;

                if (!parsedData.includes('group_') && localUserID && allMembers.length > 0) {
                    setSelectedUser(allMembers.find(item => parseInt(item.id) === parseInt(localUserID)));
                    return;
                }

                if (parsedData.includes('group_') && localUserID && allGroup.length > 0) {
                    const selectedGroupMember = allGroup.find(item => parseInt(item.id) === parseInt(localUserID));
                    if (selectedGroupMember) {
                        dispatch(joinGroupMessage(parseInt(localUserID)))
                        setSelectedUser({
                            ...selectedGroupMember,
                            isGroup: true,
                        });
                    }
                }
            } catch (error) {
                console.error('Error parsing localStorage data:', error);
            }
        }
    }, [allMembers, allGroup]);

    const fetchBlockedUsers = async () => {
        const { data } = await API.get(namespace + "/private/message/blocked-users");
        setBlockedUser(data.records)
    }

    useEffect(() => {
        const unsubscribe = onMessage((event) => {
            try {
                const { action: eventType, data, group_id } = event;
                const senderId = Number(data?.sender_id);
                const receiverId = Number(data?.receiver_id);
                const selectedUser = selectedUserRef.current;
                const selectedUserId = Number(selectedUser?.id);

                switch (eventType) {
                    case "new_msg": {
                        if (group_id) {
                            dispatch(addNewMessageInGroupChat({ groupId: group_id, message: data }));

                            if (selectedUser || Number(selectedUser?.id) === Number(group_id)) {
                                dispatch(unreadGroupMessage({ groupId: group_id, messageID: data.id }));
                            }

                            setMembersMessages(prev => {
                                const list = Array.isArray(prev) ? prev : [];
                                const newMessage = list.find(
                                    item => item.isGroup && Number(item.group.id) === Number(group_id)
                                );
                                const restMessages = list.filter(
                                    item => !(item.isGroup && Number(item.group.id) === Number(group_id))
                                );

                                return [
                                    {
                                        ...newMessage,
                                        ...data,
                                        message: data.message_rendered,
                                        message_rendered: data.message_rendered,
                                        is_seen: Number(selectedUser?.id) === Number(group_id) && data.group_id ? false : true
                                    },
                                    ...restMessages
                                ];
                            });

                            setMessageableMembers(prev =>
                                prev.length > 0 && prev.map(user =>
                                    Number(user.id) === Number(group_id)
                                        ? { ...user, message: data.message_rendered }
                                        : user
                                )
                            );
                        } else {
                            const isActiveChat = selectedUser && Number(senderId) === Number(selectedUser?.id);

                            const message = {
                                ...data,
                                user_avatar_url: isActiveChat ? selectedUser?.avatar_url : current_logged_user.avatar_url,
                                user_first_name: isActiveChat ? selectedUser?.first_name : current_logged_user.first_name,
                                user_last_name: isActiveChat ? selectedUser?.last_name : current_logged_user.last_name,
                            };

                            dispatch(addNewMessageInChat({ userID: senderId, message }));

                            if (isActiveChat) {
                                dispatch(unreadMessage({
                                    userID: senderId,
                                    messageID: data.id
                                }));
                            }

                            setMembersMessages(prev => {
                                const list = Array.isArray(prev) ? prev : [];
                                const newMessage = list.find(
                                    item => Number(item.other_user.id) === Number(senderId) && item.is_private
                                );
                                const restPrivateMessages = list.filter(
                                    item => Number(item.other_user.id) !== Number(senderId) && item.is_private
                                );
                                const restGroupMessages = list.filter(
                                    item => !item.is_private
                                );

                                return [
                                    { ...newMessage, ...data, other_user: data?.sender, is_seen: isActiveChat },
                                    ...restGroupMessages,
                                    ...restPrivateMessages,
                                ];
                            });

                            setMessageableMembers(prev =>
                                prev.length > 0 && prev.map(user =>
                                    Number(user.id) === Number(senderId)
                                        ? { ...user, message: data.message_rendered }
                                        : user
                                )
                            );
                        }

                        if (location.pathname.includes("/chat/") || location.pathname.includes("/chat")) {
                            playAudio("message");
                        } else {
                            dispatch(
                                showNotification({
                                    message: __("New Message", "zencommunity"),
                                    isShow: true,
                                    type: "notification",
                                })
                            );
                        }
                        break;
                    }

                    case "msg_updated":
                        if (data.group_id) {
                            dispatch(updateMessageInGroupChat({
                                groupId: data.group_id,
                                messageID: data.id,
                                newMessage: data
                            }));
                        } else {
                            if (selectedUser && (senderId === selectedUserId || receiverId === selectedUserId)) {
                                dispatch(updateMessageInChat({
                                    userID: senderId,
                                    messageID: data.id,
                                    newMessage: data
                                }));
                            } else {
                                const targetUserId = senderId === current_logged_user?.user_id ? receiverId : senderId;
                                dispatch(updateMessageInChat({
                                    userID: targetUserId,
                                    messageID: data.id,
                                    newMessage: data
                                }));
                            }
                        }
                        if (!location.pathname.includes("/chat")) {
                            dispatch(
                                showNotification({
                                    message: __('Message!', 'zencommunity'),
                                    isShow: true,
                                    type: 'notification',
                                })
                            );
                        } else {
                            playAudio('message')
                        }
                        break;

                    case "msg_deleted":
                        if (data.group_id) {
                            dispatch(deleteMessageInGroupChat({
                                groupId: data.group_id,
                                messageID: data.id
                            }));
                        } else {
                            dispatch(deleteMessageInChat({
                                userID: senderId,
                                messageID: data.id
                            }));
                        }
                        break;

                    case "reaction_added":
                        if (data.group_id) {
                            dispatch(addReactionToGroupMessage({
                                groupId: data.group_id,
                                messageID: data.id,
                                emoji: event.emoji
                            }));
                        } else {
                            dispatch(addReactionToMessage({
                                userID: receiverId,
                                messageID: data.id,
                                emoji: event.emoji
                            }));
                        }
                        if (!location.pathname.includes("/chat")) {
                            dispatch(
                                showNotification({
                                    message: __('New Reaction on Message', 'zencommunity'),
                                    isShow: true,
                                    type: 'notification',
                                })
                            );
                        } else {
                            playAudio('message')
                        }
                        break;

                    case "reaction_removed":
                        if (data.group_id) {
                            dispatch(removeReactionFromGroupMessage({
                                groupId: data.group_id,
                                messageID: data.id,
                                emoji: event.emoji
                            }));
                        } else {
                            dispatch(removeReactionFromMessage({
                                userID: receiverId,
                                messageID: data.id,
                                emoji: event.emoji
                            }));
                        }
                        break;

                    case "msg_read": {
                        // Only the original sender cares that their messages were seen.
                        if (Number(event?.receiver_id) !== Number(current_logged_user?.user_id)) break;
                        if (group_id) {
                            dispatch(markGroupConversationSeen({ groupId: group_id }));
                        } else if (event?.reader_id) {
                            dispatch(markPrivateConversationSeen({ userID: Number(event.reader_id) }));
                        }
                        break;
                    }

                    default:
                        break;
                }
            } catch (err) {
                console.error("WS message parse error:", err);
            }
        });

        return unsubscribe;
    }, [onMessage]);

    const isBlockedUser = (blockedUser?.length > 0 && selectedUser) ? blockedUser?.find(item => parseInt(item.id) === parseInt(selectedUser.id) ?? false) : false;

    const handleSearchChat = async (text) => {
        setSearchText(text);
        const response = await API.get(namespace + '/chat-partner-search?search=' + text);
        const messageable = response.data.records.map(item => {
            if (item.type === 'group') {
                return {
                    group_id: item.id,
                    id: item.id,
                    isGroup: true,
                    name: item.first_name,
                    last_name: null,
                    avatar_url: item.avatar_url || null,
                    joined: item.joined,
                    type: "group"
                };
            } else {
                return {
                    id: item.id,
                    username: item.username,
                    first_name: item.first_name,
                    last_name: item.last_name,
                    avatar_url: item.avatar_url,
                    type: "member"
                };
            }
        });

        setMessageableMembers(messageable);
    };

    useEffect(() => {
        if (isLargeScreen) {
            setLeftSidebarOpen(true);
        } else if (isMediumScreen) {
            if (selectedUser) {
                setLeftSidebarOpen(false);
            } else {
                setLeftSidebarOpen(true);
            }
        } else {
            if (selectedUser) {
                setLeftSidebarOpen(false);
            } else {
                setLeftSidebarOpen(true);
            }
        }
    }, [isLargeScreen, isMediumScreen, isMobile, selectedUser]);

    const handleSelectUser = (user) => {
        const dataID = user.isGroup ? `group_${user.id}` : user.id;
        setSelectedUser(user);
        localStorage.setItem("zcui", JSON.stringify(dataID));
        if (user?.group_id && !user?.joined && !user?.member_status) {
            dispatch(joinGroupMessage(parseInt(user.group_id)))
        }
        setSearchText("");

        if (isMobile || isMediumScreen) {
            setLeftSidebarOpen(false);
        }
    };

    const handleBackToUsers = () => {
        setSelectedUser(false);
        localStorage.removeItem("zcui");

        if (isMobile || isMediumScreen) {
            setLeftSidebarOpen(true);
        }
    };

    useEffect(() => {
        if (selectedUser) {
            setDataLoading(false);
        }
    }, [selectedUser]);

    // Same "unread" predicate MessageLeftBar uses per-row, aggregated for the
    // sidebar badge and the browser tab title.
    const unreadCount = Array.isArray(membersMessages)
        ? membersMessages.filter((user) => {
            const currentUserId = Number(current_logged_user?.user_id);
            const receiverId = user?.receiver_id ?? user?.receiver?.id;
            const isUnread = user?.is_seen === false || user?.is_seen === 0;
            const isReceiverCurrent = !user?.group && receiverId ? Number(receiverId) === currentUserId : false;
            return isUnread && isReceiverCurrent;
        }).length
        : 0;

    // Remember the page's own title once, so we can restore it (rather than
    // stacking prefixes) as the unread count changes or the page unmounts.
    const baseTitleRef = useRef(document.title);
    useEffect(() => {
        document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitleRef.current}` : baseTitleRef.current;
        return () => { document.title = baseTitleRef.current; };
    }, [unreadCount]);

    return (
        <Flex direction="row" gap="24px" justifyContent="space-around" alignItems="flex-start" className="zencom-chat">
            <Box
                minWidth={{ base: "100%", md: "300px", xl: "360px" }}
                width={{ base: "100%", md: "300px", xl: "360px" }}
                borderRight={{ base: "none", md: "1px solid var(--zencom-border-color)" }}
                display={{ base: leftSidebarOpen ? "flex" : "none", md: "flex" }}
                flexDirection="column"
                overflow="hidden"
                zIndex={{ base: 10, md: 0 }}
                height="calc(100vh - 57px)"
                background="var(--zencom-background)"
                position='fixed' left="0" top="55px"
                className="zencom-chat__conversations"
            >
                <MessageLeftBar
                    unreadCount={unreadCount}
                    searchText={searchText}
                    setSearchText={setSearchText}
                    messageableMembers={messageableMembers}
                    handleSelectUser={handleSelectUser}
                    membersLoading={membersLoading}
                    membersMessages={membersMessages}
                    membersPagination={membersPagination}
                    fetchMoreMembers={fetchMessages}
                    leftSidebarOpen={leftSidebarOpen}
                    selectedUser={selectedUser}
                    handleSearchChat={handleSearchChat}
                    isThemeDark={isThemeDark}
                />
            </Box>

            {selectedUser ? (
                <Flex
                    direction="column"
                    width="100%"
                    // The left list and right details panel are both
                    // `position: fixed`, which takes them out of flex
                    // layout entirely — they don't push or shrink this
                    // column, they just paint over it. So instead of
                    // computing this column's width as "100% minus the
                    // sidebars" (which silently drifts out of sync
                    // whenever a sidebar's own width changes), give it
                    // the sidebars' exact widths as margins so it's
                    // always inset by precisely as much space as they occupy.
                    marginLeft={{ base: "0", md: "300px", xl: "360px" }}
                    marginRight={{ base: "0", xl: "360px" }}
                    display={{
                        base: selectedUser ? "flex" : "none",
                        md: "flex"
                    }}
                    position="relative"
                    overflow="hidden"
                    className="zencom-chat__messages"
                >
                    <ChatContent
                        isLargeScreen={isLargeScreen}
                        isMediumScreen={isMediumScreen}
                        isMobile={isMobile}
                        selectedUser={selectedUser}
                        fetchBlockedUsers={fetchBlockedUsers}
                        isBlockedUser={isBlockedUser}
                        blockedUser={blockedUser}
                        setBlockedUser={setBlockedUser}
                        handleBackToUsers={handleBackToUsers}
                        dataLoading={dataLoading}
                        messages={messages}
                        setMessages={setMessages}
                        setMembersMessages={setMembersMessages}
                        fetchMessages={fetchMessages}
                    />
                </Flex>
            ) : (
                <Flex
                    h="100vh"
                    justify="center"
                    align="center"
                >
                    <Box w="fit-content">
                        <ZCLabel
                            type="heading"
                            label={__("Please Select Someone to send Message!", "zencommunity")}
                            textAlign="center"
                        />
                    </Box>
                </Flex>
            )}

            <Box
                bg="var(--zencom-background)"
                position='fixed'
                right="0"
                top="55px"
                display={{
                    base: "none",
                    xl: selectedUser ? "block" : "none",
                }}
                width={{ xl: "360px" }}
                height="calc(100vh - 57px)"
                borderLeft="1px solid var(--zencom-border-color)"
                className="zencom-chat__user"
            >
                {isLargeScreen && selectedUser && (
                    <MessageRightDetailsBar
                        dataLoading={dataLoading}
                        selectedUser={selectedUser}
                    />
                )}
            </Box>
        </Flex>
    );
};

export default CommunityChat;
