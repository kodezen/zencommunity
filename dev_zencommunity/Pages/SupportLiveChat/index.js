import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { Box, Flex, useBreakpointValue, } from "@chakra-ui/react";
import { __ } from '@wordpress/i18n';
import { useDispatch } from "react-redux";
import { API, namespace, playAudio, } from "@Utils/helper";
import { useFetchData } from "@Hooks/useFetchData";
import { showNotification } from "@Redux/slices/notificationSlice/notificationSlice";
import MessageLeftBar from "./components/MessageLeftBar";
import MessageRightDetailsBar from "./components/MessageRightDetailsBar";
import ChatContent from "./components/ChatContent";
import SocketContext from "@Context/SocketContext";
import { addNewMessageInSupportChat, updateMessageInSupportChat, deleteMessageInSupportChat } from "@Redux/slices/supportLiveChatSlice/supportLiveChatSlice";
import { useLocation } from "react-router-dom";
import { unreadSupportChatMessage } from "@Redux/slices/supportLiveChatSlice/supportMessageActions";
import { useSearchParams } from 'react-router-dom';
import ZCLabel from "@Components/Chakra/Labels/ZCLabel";

const SupportLiveChat = () => {
    const dispatch = useDispatch();
    const location = useLocation();
    const [selectedUser, setSelectedUser] = useState(false);
    const [blockedUser, setBlockedUser] = useState([]);
    const [membersLoading, setMembersLoading] = useState(true);
    const [membersMessages, setMembersMessages] = useState(false);
    const [messages, setMessages] = useState([]);
    const [messageableMembers, setMessageableMembers] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [dataLoading, setDataLoading] = useState(true);
    const [membersPagination, setMembersPagination] = useState({
        page: 1,
        page: 1,
        per_page: 15,
        total: 10
    });
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const isLargeScreen = useBreakpointValue({ base: false, xl: true });
    const isMediumScreen = useBreakpointValue({ base: false, md: true, lg: true, xl: false });
    const isMobile = useBreakpointValue({ base: true, md: true });
    const { onMessage, isConnected } = useContext(SocketContext);

    // Mirror selectedUser in a ref so the WS handler reads the *current*
    // selection without having to re-subscribe (and without going stale).
    const selectedUserRef = useRef(selectedUser);
    selectedUserRef.current = selectedUser;

    const [searchParams, setSearchParams] = useSearchParams();

    // Strip chat_id so the list endpoint always gets filter-only params,
    // not a conversation selector that returns a single-record response.
    const listSearchParams = useMemo(() => {
        const p = new URLSearchParams(searchParams);
        p.delete('chat_id');
        return p;
    }, [searchParams]);

    // Distinguishes "the filter/search/product selection changed" (the server
    // response is now the authoritative list — anything not in it must be
    // dropped) from "this is just a silent background refresh of the same
    // query" (merge in place so scroll position / DOM nodes are preserved).
    // Without this, switching filters merged the new results into the old
    // ones instead of replacing them, so chats that no longer matched the
    // filter kept lingering in the sidebar.
    const lastQuerySignatureRef = useRef(null);

    const fetchMessages = (qParams) => {
        let url = namespace + '/live-chat/index';
        const signature = qParams instanceof URLSearchParams ? qParams.toString() : '';
        if (qParams instanceof URLSearchParams) url += `?${signature}`;

        const isFreshQuery = signature !== lastQuerySignatureRef.current;
        lastQuerySignatureRef.current = signature;

        API.get(url).then(({ data: { records, ...rest } }) => {
            setMembersMessages(prev => {
                if (isFreshQuery || !Array.isArray(prev)) return records;
                // Update existing items in-place (preserves DOM nodes → no scroll jump)
                const freshById = Object.fromEntries(records.map(r => [r.id, r]));
                const updated = prev.map(item =>
                    freshById[item.id] ? { ...item, ...freshById[item.id] } : item
                );
                // Prepend any brand-new conversations not yet in the list
                const existingIds = new Set(prev.map(m => m.id));
                const brandNew = records.filter(r => !existingIds.has(r.id));
                return brandNew.length > 0 ? [...brandNew, ...updated] : updated;
            });
            // Seed server facts (pages/total/per_page) so infinite scroll works.
            // `page` is normally preserved across a same-query poll (it's the
            // loaded position owned by fetchNext) — but a fresh query resets
            // to whatever page the server just returned, since we're no
            // longer continuing the previous filter's scroll position.
            setMembersPagination(prev => ({
                ...rest,
                page: isFreshQuery ? rest.page : (prev?.page ?? rest.page),
            }));
            setMembersLoading(false);
        }).catch(() => {
            // A failed/errored request must still resolve the loading state —
            // otherwise the sidebar is stuck on the skeleton placeholder
            // forever instead of falling back to the empty-list message.
            setMembersMessages(prev => (Array.isArray(prev) ? prev : []));
            setMembersLoading(false);
        });
    }

    const { _ } = useFetchData({
        handler: () => fetchMessages(listSearchParams),
        timer: 10000,
        isSocketActive: isConnected,
        searchParams: listSearchParams,
    });

    // todo: if need to open previously visited chat window 
    // useEffect(() => {
    //     const storageData = localStorage.getItem('zcci');
    //     if (storageData && typeof storageData === 'string') {
    //         try {
    //             const parsedData = JSON.parse(storageData);
    //             const localUserID = parsedData.includes('group_') ? parsedData.split('group_')[1] : parsedData;

    //             if (!parsedData.includes('group_') && localUserID && allMembers.length > 0) {
    //                 setSelectedUser(allMembers.find(item => parseInt(item.id) === parseInt(localUserID)));
    //                 return;
    //             }
    //         } catch (error) {
    //             console.error('Error parsing localStorage data:', error);
    //         }
    //     }
    // }, [allMembers]);

    const fetchBlockedUsers = async () => {
        const { data } = await API.get(namespace + "/private/message/blocked-users");
        setBlockedUser(data.records)
    }

    useEffect(() => {
        const unsubscribe = onMessage((event) => {
            try {
                const { action: eventType, data, chat_info, msg_id } = event;
                const selectedUser = selectedUserRef.current;
                const messageID = data?.id ?? msg_id;
                const eventChatId = data?.chat_id;
                if (eventType === "new_live_chat_msg" && data?.sender === 'agent') return;

                switch (eventType) {
                    case "new_live_chat_msg": {
                        const isActiveChat = selectedUser && Number(data?.chat_id) === Number(selectedUser?.id);

                        dispatch(addNewMessageInSupportChat({ chatID: data?.chat_id, message: { ...data, ...chat_info, id: data.id } }));

                        if (isActiveChat) {
                            dispatch(unreadSupportChatMessage({
                                chatID: data?.chat_id,
                                messageID: data.id
                            }));
                        }

                        setMembersMessages(prev => {
                            const chatExists = prev.some(item => Number(item.id) === Number(data.chat_id));

                            const updatedChat = {
                                ...data,
                                last_msg: {
                                    id: data.id,
                                    message: data.message_rendered,
                                    is_seen: isActiveChat,
                                },
                                name: chat_info?.name,
                                email: chat_info.email,
                                id: data.chat_id, // keep chat id, not message id
                                avatar: chat_info.avatar,
                            };

                            if (chatExists) {
                                return prev.map(item =>
                                    Number(item.id) === Number(data.chat_id)
                                        ? { ...item, ...updatedChat, last_msg: updatedChat.last_msg }
                                        : item
                                );
                            } else {
                                return [updatedChat, ...prev];
                            }
                        });

                        setMessageableMembers(prev =>
                            prev.length > 0 && prev.map(user =>
                                Number(user.id) === Number(selectedUser?.id)
                                    ? { ...user, ...data, ...chat_info, id: data.id }
                                    : user
                            )
                        );

                        if (location.pathname.includes("/live-chat/") || location.pathname.includes("/live-chat")) {
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

                    case "live_chat_msg_updated": {
                        if (!eventChatId || !messageID) break;
                        dispatch(updateMessageInSupportChat({
                            chatID: eventChatId,
                            messageID,
                            newMessage: data,
                        }));

                        // Keep the conversation-list preview in sync.
                        setMembersMessages(prev =>
                            Array.isArray(prev)
                                ? prev.map(item =>
                                    Number(item.id) === Number(eventChatId)
                                        ? { ...item, last_msg: { ...item.last_msg, message: data?.message_rendered } }
                                        : item
                                )
                                : prev
                        );
                        break;
                    }

                    case "live_chat_msg_deleted": {
                        if (!eventChatId || !messageID) break;
                        dispatch(deleteMessageInSupportChat({
                            chatID: eventChatId,
                            messageID,
                        }));
                        break;
                    }

                    case "live_chat_msg_reacted": {
                        // The reacted event carries the updated message row, so
                        // merge it to pick up the new reaction state.
                        if (!eventChatId || !messageID) break;
                        dispatch(updateMessageInSupportChat({
                            chatID: eventChatId,
                            messageID,
                            newMessage: data,
                        }));
                        break;
                    }

                    case "live_chat_msg_read": {
                        if (!eventChatId || !messageID) break;
                        dispatch(updateMessageInSupportChat({
                            chatID: eventChatId,
                            messageID,
                            newMessage: { is_seen: 1 },
                        }));
                        break;
                    }
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
        const response = await API.get(namespace + '/live-chat/index?search=' + text);
        setMessageableMembers(response.data.records);
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
        searchParams.set('chat_id', user.id)
        setSearchParams(searchParams);
        const dataID = user.id;
        setSelectedUser(user);
        localStorage.setItem("zcci", JSON.stringify(dataID));
        setSearchText("");

        if (isMobile || isMediumScreen) {
            setLeftSidebarOpen(false);
        }

        // Mark as read immediately when an unread conversation is opened
        const isUnread = (user?.last_msg?.is_seen === false || user?.last_msg?.is_seen === 0) && !user?.last_msg?.agent_id;
        if (isUnread && user?.last_msg?.id) {
            API.post(namespace + `/live-chat/agent/message/${user.last_msg.id}/read`);
            setMembersMessages(prev => Array.isArray(prev) ? prev.map(item => {
                if (parseInt(item.id) === parseInt(user.id)) {
                    return { ...item, last_msg: { ...item.last_msg, is_seen: 1 } };
                }
                return item;
            }) : prev);
        }
    };

    useEffect(() => {
        let id = searchParams.get('chat_id')
        if (!id) return;
        API.get(`${namespace}/live-chat/${id}`).then(res => handleSelectUser(res.data))
    }, [])

    const handleBackToUsers = () => {
        setSelectedUser(false);
        localStorage.removeItem("zcci");

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
        ? membersMessages.filter((user) => (
            (user?.last_msg?.is_seen === false || user?.last_msg?.is_seen === 0) && !user?.last_msg?.agent_id
        )).length
        : 0;

    // Remember the page's own title once, so we can restore it (rather than
    // stacking prefixes) as the unread count changes or the page unmounts.
    const baseTitleRef = useRef(document.title);
    useEffect(() => {
        document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitleRef.current}` : baseTitleRef.current;
        return () => { document.title = baseTitleRef.current; };
    }, [unreadCount]);

    return (
        <>
            <Flex direction="row" gap="24px" justifyContent="space-around" alignItems="flex-start" className="zencom-support-chat">
                <Box
                    minWidth={{ base: "100%", md: "300px", xl: "360px" }}
                    width={{ base: "100%", md: "300px", xl: "360px" }}
                    borderRight={{ base: "none", md: "1px solid var(--zencom-border-color)" }}
                    display={{ base: leftSidebarOpen ? "block" : "none", md: "block" }}
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
                        setMembersMessages={setMembersMessages}
                        leftSidebarOpen={leftSidebarOpen}
                        selectedUser={selectedUser}
                        handleSearchChat={handleSearchChat}
                        membersPagination={membersPagination}
                        setMembersPagination={setMembersPagination}
                        setSelectedUser={setSelectedUser}
                        fetchMessages={fetchMessages}
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
                        // whenever a sidebar's own width changes, as
                        // happened when the left list went to 360px at xl
                        // while this still assumed 300px, spilling message
                        // avatars 30px under the right panel), give it the
                        // sidebars' exact widths as margins so it's always
                        // inset by precisely as much space as they occupy.
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
                            membersMessages={membersMessages}
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
                    borderRight="1px solid var(--zencom-border-color)"
                    className="zencom-chat__user"
                >
                    {isLargeScreen && selectedUser && (
                        <MessageRightDetailsBar
                            dataLoading={dataLoading}
                            selectedUser={selectedUser}
                            setSelectedUser={setSelectedUser}
                        />
                    )}
                </Box>
            </Flex>
        </>
    );
};

export default SupportLiveChat;
