import React, { useEffect, useRef, useState } from 'react';
import EmojiPicker from '@Components/EmojiPicker';
import { flushSync } from 'react-dom';
import { Box, Button, Flex, Icon, Image, Skeleton, SkeletonCircle, Text, } from '@chakra-ui/react';
import { useFetchData } from '@Hooks/useFetchData';
import { copyToClipboard, current_logged_user, mediaFileUploader, site_url, } from '@Utils/helper';
import { __, sprintf } from '@wordpress/i18n';
import { IoIosTrash } from 'react-icons/io';
import { FaRegCopy, FaRegFaceSmile, FaReply, FaStar } from 'react-icons/fa6';
import { useDispatch, useSelector } from 'react-redux';
import { AiTwotoneEdit } from 'react-icons/ai';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import { MdSend } from 'react-icons/md';
import { GrAttachment } from 'react-icons/gr';
import ZenComMenu from '@Components/ZenComMenu';
import ConfirmPopup from '@Components/ConfirmPopup';
import MessageSources, { formatMessageHtml } from '@Components/MessageBody';
import AudioAttachButton from '@Components/AudioRecoder';
import ImageFullScreenPreview from '@Components/ImageFullScreenPreview';
import FileAttachmentCard, { getPendingFileTypeConfig } from '@Components/FileAttachmentCard';
import { useContext } from 'react';
import SocketContext from '@Context/SocketContext';
import { IoCloseCircleSharp } from 'react-icons/io5';
import { deleteMessageFromSupportChat, fetchSingleUserNextPageChat, getSingleUserSupportChat, sendMessageToSupportUser, unreadSupportChatMessage, updateSupportChatMessage } from '@Redux/slices/supportLiveChatSlice/supportMessageActions';
import { useScrollFetchData } from '@Hooks/useScrollFetchData';
import PostTextWithMention from '@Components/PostTextWithMention';
import { useStyles } from '../../../utils/chakra';
import EditedBadge from '@Components/EditedBadge';
import CannedReplies from '@Components/CannedReplies';
import AiCompose from '@Components/AiCompose';
import NoDataPost from '@Components/NoDataPost';
import { LuMessageCircle, LuFile } from 'react-icons/lu';
import { useUnsavedChangesGuard } from '@Hooks/useUnsavedChangesGuard';

// `moment` is provided as a WordPress global script dependency (see other
// components, e.g. PostCard) rather than an npm import — there's no local
// `moment` package to import from.
/* global moment */

const SKELETON_SHAPES = [
    { width: '250px', lines: 1, side: 'visitor' },
    { width: '150px', lines: 2, side: 'agent' },
    { width: '210px', lines: 1, side: 'visitor' },
    { width: '180px', lines: 2, side: 'agent' },
    { width: '120px', lines: 1, side: 'visitor' },
    { width: '190px', lines: 2, side: 'agent' },
];

const ChatBox = ({
    selectedUser,
    isBlocked,
    setMembersMessages,
    membersMessages,
    fetchMessages: fetchSidebarMessages,
    isLargeScreen,
    isMediumScreen,
    isMobile
}) => {
    // Narrow selectors so this component doesn't re-render when unrelated parts
    // of the slice (e.g. the products list) change.
    const supportMessages = useSelector(state => state.supportLiveChat.supportMessages);
    const current_chat_last_unseen_msg_id = useSelector(state => state.supportLiveChat.current_chat_last_unseen_msg_id);
    const page = useSelector(state => state.supportLiveChat.page);
    const per_page = useSelector(state => state.supportLiveChat.per_page);
    const total = useSelector(state => state.supportLiveChat.total);
    const pages = useSelector(state => state.supportLiveChat.pages);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [mediaFiles, setMediaFiles] = useState({
        audio: null,
        images: [],
    });
    const [updateMessage, setUpdateMessage] = useState({
        isUpdating: false,
        data: false,
        updatedText: "",
        isSubmitting: false
    });
    const [showEmoji, setShowEmoji] = useState(false);
    const [showTextEmoji, setShowTextEmoji] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [sendError, setSendError] = useState(false);
    // Drives the compose box's focus-in/out expand transition — the rich-text
    // toolbar (and the editor's own height) stay collapsed to a plain single
    // line until the box is actually in use, then smoothly grow open.
    const [isComposeFocused, setIsComposeFocused] = useState(false);
    const [hoveredMessageId, setHoveredMessageId] = useState(null);
    const [confirmDeleteMsg, setConfirmDeleteMsg] = useState(null);
    const bottomRef = useRef(null);
    const dispatch = useDispatch();
    const emojiRef = useRef(null);
    const fileInputRef = useRef(null);
    const blockedUserName = isBlocked.first_name + " " + isBlocked.last_name;
    const { isConnected } = useContext(SocketContext);

    useUnsavedChangesGuard(!!messageText?.trim() || mediaFiles.images.length > 0 || !!mediaFiles.audio);

    const chatContainerRef = useRef(null)

    const fetchMessages = async (enableLoader = false) => {
        try {
            if (enableLoader) {
                setMessagesLoading(true)
            }
            await dispatch(getSingleUserSupportChat(parseInt(selectedUser?.id)))

        } catch (error) {
            console.error(error)
        } finally {
            setMessagesLoading(false)
        }
    }

    const { _ } = useFetchData({
        handler: fetchMessages,
        timer: 10000,
        immediate: false,
        isSocketActive: isConnected,
    });

    const fetchNext = async (page) => {
        const container = chatContainerRef.current;
        const previousScrollHeight = container?.scrollHeight;
        const previousScrollTop = container?.scrollTop;

        await dispatch(fetchSingleUserNextPageChat({ chatID: selectedUser?.id, page }));

        // Wait for DOM to update
        requestAnimationFrame(() => {
            const newScrollHeight = container?.scrollHeight;
            if (newScrollHeight && previousScrollHeight) {
                // Keep the user’s current viewport stable
                container.scrollTop = newScrollHeight - previousScrollHeight + previousScrollTop;
            }
        });
    };

    // Always call the hook, never inside an if
    useScrollFetchData(
        supportMessages?.[selectedUser?.id] || [],
        {
            page: page ?? 1,
            per_page: per_page ?? 15,
            total: total ?? 0,
            pages: pages ?? 1,
        },
        fetchNext,
        messagesLoading,
        chatContainerRef
    );

    // Depend on the chat id, not the selectedUser object reference (recreated on
    // unrelated renders → redundant full-thread refetches).
    useEffect(() => {
        if (selectedUser) {
            const hasCachedMessages = supportMessages?.[selectedUser?.id]?.length > 0;
            fetchMessages(!hasCachedMessages);
        }
    }, [selectedUser?.id])

    const handleUpdateMessage = async () => {
        dispatch(updateSupportChatMessage({ chatID: selectedUser?.id, messageID: updateMessage.data?.id, message: updateMessage.updatedText.replace(/\n/g, "<br />") })).then((res) => {
            const { data } = res.payload;
            setMembersMessages(prev => {
                if (!prev || prev.length === 0) {
                    return [{ id: selectedUser?.id, ...data, last_msg: { id: data?.id, message: data?.message, message_rendered: data?.message_rendered, is_seen: 0 } }];
                }

                const existingItem = prev.find(item => Number(item.id) === Number(selectedUser?.id));

                if (existingItem) {
                    const updatedItem = { ...existingItem, ...data, last_msg: { id: data?.id, message: data?.message, message_rendered: data?.message_rendered, is_seen: 0 } };
                    const filteredItems = prev.filter(item => Number(item.id) !== Number(selectedUser?.id));
                    return [updatedItem, ...filteredItems];
                }

                return [{ id: selectedUser?.id, ...data, last_msg: { id: data?.id, message: data?.message, message_rendered: data?.message_rendered, is_seen: 0 } }, ...prev];
            });
            setUpdateMessage({
                isUpdating: false,
                data: false,
                updatedText: "",
                isSubmitting: false
            })
            setMessageText("")
        })
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() && mediaFiles.images.length === 0 && !mediaFiles.audio) return;

        // Attachment-only messages go out with no text (the server accepts an
        // empty message when media is attached) rather than the file names.
        const textToSend = messageText;

        flushSync(() => {
            setMessageText("");
            setUpdateMessage({ ...updateMessage, isSubmitting: true });
        });

        try {
            let uploadPromises = [];

            if (mediaFiles.images.length > 0) {
                uploadPromises.push(
                    ...mediaFiles.images.map(item =>
                        handleImageChange(item, "live_chat_message_attachments", "image")
                    )
                );
            }

            if (mediaFiles.audio) {
                uploadPromises.push(
                    handleImageChange(mediaFiles.audio, "live_chat_message_attachments", "audio")
                );
            }

            const mediaItemIds = await Promise.all(uploadPromises);
            setUpdateMessage({ ...updateMessage, isSubmitting: true, data: textToSend.replace(/\n/g, "<br />") });
            await dispatch(
                sendMessageToSupportUser({
                    chatID: selectedUser?.id,
                    message: textToSend.replace(/\n/g, "<br />"),
                    mediaIds: mediaItemIds,
                    replyToId: replyTo?.id,
                })
            ).then(({ payload: { data, chatID } }) => {
                const chatIdNum = Number(chatID);

                // build the updated chat info
                const updatedLastMsg = {
                    id: data?.id,
                    message: data?.message,
                    message_rendered: data?.message_rendered,
                    is_seen: 0,
                    sent_at: data?.sent_at || new Date().toISOString(),
                };

                const currentitem = membersMessages.find(item => Number(item.id) === chatIdNum)
                const updatedChat = {
                    ...currentitem,
                    last_msg: updatedLastMsg,
                };
                const finalOutput = membersMessages.map(item => parseInt(item.id) === parseInt(updatedChat.id) ? { ...item, ...updatedChat } : item);
                setMembersMessages(finalOutput);
                setSendError(false);
            });
        } catch (error) {
            console.error("Send failed:", error);
            setMessageText(textToSend);
            setSendError(true);
        } finally {
            setMediaFiles({ audio: null, images: [] });
            if (fileInputRef.current) fileInputRef.current.value = '';
            setReplyTo(null);
            setUpdateMessage({
                isUpdating: false,
                data: false,
                updatedText: "",
                isSubmitting: false,
            });
        }
    };

    useEffect(() => {
        const ID = selectedUser?.id;
        if (!ID) return;

        const firstMessage = supportMessages?.[ID]?.[supportMessages?.[ID].length - 1];
        if (!firstMessage) return;

        const isFromOther = firstMessage.sender !== "agent";
        if (isFromOther && current_chat_last_unseen_msg_id) {
            dispatch(unreadSupportChatMessage({
                chatID: ID,
                messageID: current_chat_last_unseen_msg_id
            }));
            setMembersMessages(prev => prev.map(item => {
                if (parseInt(item?.id) === parseInt(ID)) {
                    return { ...item, last_msg: { ...item.last_msg, is_seen: 1 } };
                }
                return item;
            })
            );

        }
    }, [current_chat_last_unseen_msg_id]);

    // Scroll only when the active chat gains a message or on switch — not on
    // every supportMessages change (which includes other chats and poll ticks).
    const activeMessages = supportMessages?.[selectedUser?.id];
    const activeLastId = activeMessages?.[activeMessages.length - 1]?.id;

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [activeMessages?.length, activeLastId, messagesLoading, selectedUser?.id]);

    const handleClickOutside = (event) => {
        if (
            emojiRef.current &&
            !emojiRef.current.contains(event.target)
        ) {
            setShowEmoji(false);
            setShowTextEmoji(false)
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showEmoji]);

    const handleImageChange = async (file, type, filetype = 'image') => {
        if (!file) return;

        try {
            const res = await mediaFileUploader(type, file);
            return res?.id;
        } catch (err) {
            console.error("Upload failed", err);
        }
    };

    const { primaryBtn, isDark } = useStyles();

    // Stays open on its own — not just while focused — whenever there's a
    // reason to: a draft in progress, a reply queued, attachments picked, or
    // an active edit. Otherwise it collapses the instant focus leaves, which
    // would be jarring mid-task.
    const isComposeExpanded = isComposeFocused
        || !!messageText.trim()
        || !!replyTo
        || mediaFiles.images.length > 0
        || !!mediaFiles.audio
        || updateMessage.isUpdating;

    return (
        <Flex
            direction="column"
            w="100%"
            overflow="hidden"
            height="calc(100vh - 122px)"
        >
            {messagesLoading ? (
                <Box flex="1" minH={0} p={4} overflowY="auto">
                    {SKELETON_SHAPES.map((shape, idx) => {
                        const isAgent = shape.side === 'agent';
                        const secondLineWidth = `${parseInt(shape.width) * 0.7}%`;
                        return (
                            <Flex
                                key={idx}
                                gap="10px"
                                direction={isAgent ? "row-reverse" : "row"}
                                alignItems="flex-end"
                                mb={5}
                            >
                                <SkeletonCircle size="8" />

                                <Flex
                                    direction="column"
                                    alignItems={isAgent ? "flex-end" : "flex-start"}
                                    gap="4px"
                                >
                                    <Skeleton
                                        height="10px"
                                        width="80px"
                                        mb={1}
                                        startColor="gray.100"
                                        endColor="gray.300"
                                        borderRadius="4px"
                                    />
                                    <Skeleton
                                        height="44px"
                                        width={shape.width}
                                        startColor="gray.100"
                                        endColor="gray.300"
                                        borderRadius="4px"
                                    />
                                    {shape.lines === 2 && (
                                        <Skeleton
                                            height="32px"
                                            width={secondLineWidth}
                                            startColor="gray.100"
                                            endColor="gray.300"
                                            borderRadius="4px"
                                        />
                                    )}
                                </Flex>
                            </Flex>
                        );
                    })}
                </Box>
            ) : (
                <Box
                    flex="1"
                    minH={0}
                    p={4}
                    css={{
                        '&::-webkit-scrollbar': {
                            width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            width: '8px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: "#CBD1D7",
                            borderRadius: '9999px',
                        },
                    }}
                    overflowY="auto"
                    display="flex"
                    flexDirection="column"
                    ref={chatContainerRef}
                >
                    <Box marginTop="auto">
                    {!supportMessages?.[selectedUser?.id]?.length && !updateMessage.isSubmitting && (
                        <NoDataPost
                            icon={LuMessageCircle}
                            title={__('No messages yet', 'zencommunity')}
                            subTitle={__('Start the conversation by sending a message.', 'zencommunity')}
                        />
                    )}
                    {(supportMessages && supportMessages[selectedUser?.id])?.map((msg, idx, arr) => {
                        const isCurrentUser = msg?.sender === 'agent';
                        const hasImage = msg?.meta?.attachments && msg?.meta?.attachments?.live_chat_message_attachments?.length > 0;
                        const isFirst = idx === 0;
                        const isLast = idx === arr.length - 1;
                        const agentUrl = msg.is_ai_generated ? msg.agent?.avatar_url : (msg.agent && Number(msg.agent.id) === Number(msg.agent_id) ? msg.agent.avatar_url : current_logged_user?.avatar_url);
                        const userAvatar = isCurrentUser ? agentUrl : selectedUser?.avatar;
                        const agentName = msg.is_ai_generated ? msg.agent?.first_name : (msg?.agent?.id ? msg?.agent?.first_name + " " + msg?.agent?.last_name : current_logged_user?.first_name + " " + current_logged_user?.last_name);

                        const messageKey = msg.id ?? idx;

                        // Post-close CSAT reply — rendered as its own centered
                        // rating card rather than a chat bubble, so it reads
                        // as a system event in the thread, not something
                        // either party "said".
                        if (msg?.type === 'user_feedback') {
                            return (
                                <Flex
                                    key={idx}
                                    direction="column"
                                    align="center"
                                    mb={5}
                                    data-first-item={isFirst}
                                >
                                    <Box
                                        bg="var(--zencom-secondary-color)"
                                        borderRadius="8px"
                                        px={5}
                                        py={3}
                                        maxW="80%"
                                        textAlign="center"
                                    >
                                        <Text fontSize="12px" color="var(--zencom-font-color)" opacity={0.7} mb={2}>
                                            {sprintf(__('%s rated this conversation', 'zencommunity'), selectedUser?.name || __('Visitor', 'zencommunity'))}
                                        </Text>
                                        <Flex justify="center" gap="1" mb={msg?.message_rendered ? 2 : 0}>
                                            {[1, 2, 3, 4, 5].map((n) => (
                                                <Icon
                                                    key={n}
                                                    as={FaStar}
                                                    boxSize={4}
                                                    color={n <= (msg?.rating || 0) ? 'var(--zencom-primary-color)' : 'var(--zencom-border-color)'}
                                                />
                                            ))}
                                        </Flex>
                                        {msg?.message_rendered && (
                                            <Text
                                                fontSize="14px"
                                                color="var(--zencom-font-color)"
                                                dangerouslySetInnerHTML={{ __html: formatMessageHtml(msg.message_rendered) }}
                                            />
                                        )}
                                    </Box>
                                </Flex>
                            );
                        }

                        // Relative timestamp shown above every bubble (e.g. "5 minutes
                        // ago"), matching the reference pattern's header line instead
                        // of the old below-the-last-bubble "Sent · date" stamp.
                        const relativeTime = msg?.sent_at ? moment.utc(msg.sent_at).local().fromNow() : '';

                        return (
                            <Flex
                                key={idx}
                                direction="column"
                                alignItems={isCurrentUser ? "flex-end" : "flex-start"}
                                mb={5}
                                data-first-item={isFirst}
                                onMouseEnter={() => setHoveredMessageId(messageKey)}
                                onMouseLeave={() => setHoveredMessageId(null)}
                            >
                                {isCurrentUser ? (
                                    <Flex align="center" gap="8px" mb="6px">
                                        <Text fontSize="12px" color="var(--zencom-font-color)" opacity={0.6}>
                                            {agentName}{agentName && relativeTime ? ' · ' : ''}{relativeTime}
                                        </Text>
                                        <ZenComAvatar
                                            variant="simple"
                                            size="2xs"
                                            userID={current_logged_user?.user_id}
                                            userName={agentName}
                                            src={userAvatar ? `${userAvatar.includes('https://') ? "" : site_url}${userAvatar}` : ""}
                                        />
                                    </Flex>
                                ) : (
                                    <Flex align="center" gap="8px" mb="6px">
                                        <ZenComAvatar
                                            variant="simple"
                                            size="2xs"
                                            userID={selectedUser?.id}
                                            userName={selectedUser?.name}
                                            src={userAvatar ? `${userAvatar.includes('https://') ? "" : site_url}${userAvatar}` : ""}
                                        />
                                        <Text fontSize="13px" color="var(--zencom-font-color)" opacity={0.7}>
                                            {selectedUser?.name}{selectedUser?.name && relativeTime ? ', ' : ''}{relativeTime}
                                        </Text>
                                    </Flex>
                                )}

                                <Flex
                                    direction="column"
                                    alignItems={isCurrentUser ? "flex-end" : "flex-start"}
                                    maxW={'80%'}
                                >
                                    {msg?.reply_to && (
                                        <Text fontSize="11px" color="gray.400" mb="3px" alignSelf={isCurrentUser ? "flex-end" : "flex-start"}>
                                            ↩ Replied to {msg.reply_to.sender_name || ''}
                                        </Text>
                                    )}

                                    {/* Bubble + three-dot menu kept together so the menu sits
                                        immediately beside the message bubble. */}
                                    <Flex
                                        direction={isCurrentUser ? "row-reverse" : "row"}
                                        alignItems={"center"}
                                        gap={'4px'}
                                    >
                                        <Box
                                            position="relative"
                                            bg={isCurrentUser ? (isDark ? "var(--zencom-secondary-color)" : "var(--zencom-primary-color)") : "var(--zencom-secondary-color)"}
                                            fontSize={"16px"}
                                            fontWeight={"500"}
                                            color={isCurrentUser ? (isDark ? "var(--zencom-font-color)" : "#fff") : "var(--zencom-font-color)"}
                                            px={4}
                                            py={2}
                                            // Uniformly rounded — the sender is now identified by the
                                            // header line above the bubble, not by a tail corner
                                            // pointing at an adjacent avatar.
                                            // borderRadius="16px"
                                            borderRadius={isCurrentUser ? "6px 0px 6px 6px" : "0px 6px 6px 6px"}
                                            display="flex"
                                            flexDirection={'column'}
                                            alignItems={isCurrentUser ? 'flex-end' : 'flex-start'}
                                            gap="4px"
                                        >
                                            {msg?.reply_to && (
                                                <Box
                                                    borderLeft="4px solid"
                                                    borderColor={isCurrentUser ? "rgba(255,255,255,0.6)" : "var(--zencom-background)"}
                                                    bg={isCurrentUser ? "var(--zencom-secondary-color)" : "var(--zencom-primary-color)"}
                                                    borderRadius="4px"
                                                    px={3}
                                                    py={1.5}
                                                    mb={2}
                                                    width="100%"
                                                >
                                                    <Text fontSize="12px" noOfLines={2} color={isCurrentUser ? "var(--zencom-font-color)" : "var(--zencom-background)"}>
                                                        {(msg.reply_to.message_rendered || msg.reply_to.message || '').replace(/<[^>]*>/g, '').trim()}
                                                    </Text>
                                                </Box>
                                            )}
                                            <Box>
                                                <Text
                                                    fontSize="16px"
                                                    style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}
                                                    dangerouslySetInnerHTML={{
                                                        __html: formatMessageHtml(msg?.message_rendered)
                                                    }}
                                                >
                                                </Text>
                                                <MessageSources sources={msg?.meta?.sources} />
                                            </Box>

                                            {hasImage && (
                                                <Flex flexWrap={'wrap'} gap={'8px'} justifyContent={'center'}>
                                                    {msg?.meta?.attachments?.live_chat_message_attachments.map((attachment, index) => {
                                                        if (attachment?.meta?.image) {
                                                            return (
                                                                <ImageFullScreenPreview attachment={attachment} idx={index} key={index} />
                                                            )
                                                        } else if (attachment?.meta?.type === 'audio') {
                                                            return (
                                                                <audio key={index} controls>
                                                                    <source src={site_url + attachment?.path} type="audio/mpeg" />
                                                                    Your browser does not support the audio element.
                                                                </audio>
                                                            )
                                                        } else {
                                                            return (
                                                                <FileAttachmentCard key={index} attachment={attachment} />
                                                            )
                                                        }
                                                    })}
                                                </Flex>
                                            )}

                                            {/* <EditedBadge item={msg} className="tw-self-end" /> */}
                                        </Box>

                                        <Box
                                            display={'flex'}
                                            alignItems={'center'}
                                            height={'auto'}
                                            color="var(--zencom-font-color)"
                                            visibility={hoveredMessageId === messageKey ? 'visible' : 'hidden'}
                                        >
                                            <ZenComMenu
                                                variant="transparent"
                                                options={[
                                                    {
                                                        label: __("Reply", "zencommunity"),
                                                        icon: FaReply,
                                                        type: "button",
                                                        onClick: () => setReplyTo({ id: msg.id, message: msg.message, senderName: msg.user_first_name || msg.sender_name || (isCurrentUser ? __('You', 'zencommunity') : selectedUser?.name || '') }),
                                                    },
                                                    ...(isCurrentUser ? [
                                                        {
                                                            label: __("Update", "zencommunity"),
                                                            icon: AiTwotoneEdit,
                                                            type: "button",
                                                            onClick: () => {
                                                                setUpdateMessage({ isUpdating: true, data: msg, updatedText: msg.message })
                                                                setMessageText(msg.message)
                                                            },
                                                        },
                                                        {
                                                            label: __("Copy Text", "zencommunity"),
                                                            icon: FaRegCopy,
                                                            type: "button",
                                                            onClick: () => copyToClipboard(msg.message),
                                                        },
                                                        {
                                                            label: __("Delete", "zencommunity"),
                                                            icon: IoIosTrash,
                                                            type: "button",
                                                            onClick: () => setConfirmDeleteMsg(msg),
                                                            textColor: "red",
                                                            iconColor: "red",
                                                        },
                                                    ] : []),
                                                ]}
                                                suffix="chat-user-menu"
                                            />
                                        </Box>
                                    </Flex>

                                    {/* Sent/Seen shown under the message in a light color, last message only. */}
                                    {isCurrentUser && isLast && (
                                        <Text fontSize="10px" color="gray.400" mt="2px" alignSelf="flex-end">
                                            {msg?.is_seen ? `✓✓ ${__('Seen', 'zencommunity')}` : `✓ ${__('Sent', 'zencommunity')}`}
                                            {msg?.sent_at ? ` · ${moment.utc(msg.sent_at).local().format('MMM D, h:mm A')}` : ''}
                                        </Text>
                                    )}
                                </Flex>

                            </Flex>
                        )
                    })}

                    {updateMessage.isSubmitting && (
                        <Flex
                            gap={"10px"}
                            direction={"row-reverse"}
                            alignItems={"flex-end"}
                            mb={5}
                            className='zencom-chat-box'
                        >
                            <ZenComAvatar
                                variant="simple"
                                userID={current_logged_user?.user_id}
                                userName={updateMessage?.data.user_first_name + " " + updateMessage?.data.user_last_name}
                                src={updateMessage?.data.user_avatar_url ? `${site_url}${updateMessage?.data.user_avatar_url}` : ""}
                            />

                            <Box
                                bg={'gray.400'}
                                pointerEvents={'none'}
                                opacity={'0.5'}
                                fontSize={"16px"}
                                fontWeight={"500"}
                                color={"var(--zencom-font-color)"}
                                px={4}
                                py={2}
                                borderRadius="4px"
                                maxW="75%"
                            >
                                <Text
                                    fontSize="16px"
                                    fontWeight="24px"
                                    dangerouslySetInnerHTML={{ __html: updateMessage?.data.message ?? updateMessage?.data }}
                                />
                            </Box>
                        </Flex>
                    )}
                    <div ref={bottomRef} />
                    </Box>
                </Box>
            )}

            <Flex p={3} >
                {isBlocked ? (
                    <Box display={'flex'} flexDirection={'column'} gap={'8px'} alignItems={'center'} w={"100%"}>
                        <Text fontSize={'14px'} color={'var(--zencom-font-color)'} >
                            {sprintf(__("You blocked messages from %s's account", "zencommunity"), blockedUserName)}
                        </Text>
                        <Text fontSize={'14px'} color={'var(--zencom-font-color)'} >
                            {__("You can't message them in this chat, and you won't receive their messages.", "zencommunity")}
                        </Text>
                    </Box>
                ) : (
                    <Flex direction="column" position="relative" width="100%" bg="var(--zencom-background)">
                        <Box
                            size="lg"
                            borderRadius="4px"
                            border="1px solid var(--zencom-border-color)"
                            bg="var(--zencom-background)"
                            color={'var( --zencom-font-color)'}
                            _active={{ borderColor: "var(--zencom-primary-color)" }}
                            _focus={{ borderColor: "var(--zencom-primary-color)" }}
                            style={{ caretColor: "var(--zencom-primary-color)" }}
                            width="100%"
                            padding={'10px 14px'}
                            transition="border-color 0.2s ease"
                        >
                            {replyTo && (
                                <Flex
                                    align="center"
                                    justify="space-between"
                                    bg="var(--zencom-secondary-color)"
                                    borderLeft="3px solid var(--zencom-primary-color)"
                                    borderRadius="8px"
                                    px={3}
                                    py={2}
                                    mb={1}
                                    gap={2}
                                >
                                    <Box flex="1" overflow="hidden">
                                        <Text fontSize="12px" fontWeight="600" color="var(--zencom-primary-color)" noOfLines={1}>{replyTo.senderName}</Text>
                                        <Text fontSize="13px" color="var(--zencom-font-color)" noOfLines={1}>{replyTo.message?.replace(/<[^>]*>/g, '')}</Text>
                                    </Box>
                                    <Button
                                        background="transparent"
                                        padding="0"
                                        minWidth="auto"
                                        height="auto"
                                        onClick={() => setReplyTo(null)}
                                    >
                                        <Icon as={IoCloseCircleSharp} color="gray.400" />
                                    </Button>
                                </Flex>
                            )}
                            {mediaFiles.images.length > 0 && (
                                <Flex
                                    gap="8px"
                                    flexWrap="wrap"
                                    mb={2}
                                    p={2}
                                    border="1px solid var(--zencom-border-color)"
                                    borderRadius="6px"
                                    bg="var(--zencom-secondary-color)"
                                >
                                    {mediaFiles.images.map((file, idx) => {
                                        const isImage = file?.type?.startsWith('image/');
                                        const fileConfig = !isImage ? getPendingFileTypeConfig(file) : null;
                                        return (
                                            <Box key={idx} position="relative">
                                                {isImage ? (
                                                    <Image
                                                        src={URL.createObjectURL(file)}
                                                        alt={`preview-${idx}`}
                                                        boxSize="80px"
                                                        objectFit="cover"
                                                        borderRadius="4px"
                                                        border="1px solid var(--zencom-border-color)"
                                                    />
                                                ) : (
                                                    <Flex
                                                        align="center"
                                                        gap="8px"
                                                        boxSize="80px"
                                                        padding="8px"
                                                        borderRadius="4px"
                                                        border="1px solid var(--zencom-border-color)"
                                                        background="var(--zencom-background)"
                                                        direction="column"
                                                        justify="center"
                                                    >
                                                        <Icon as={fileConfig?.icon || LuFile} boxSize="20px" color="var(--zencom-primary-color)" />
                                                        <Text fontSize="10px" color="var(--zencom-font-color)" truncate width="100%" textAlign="center">
                                                            {file?.name}
                                                        </Text>
                                                    </Flex>
                                                )}
                                                <Button
                                                    size="xs"
                                                    position="absolute"
                                                    top="2px"
                                                    right="2px"
                                                    background='transparent'
                                                    padding='0px'
                                                    minW="auto"
                                                    height="auto"
                                                    onClick={() => {
                                                        setMediaFiles(prev => ({
                                                            ...prev,
                                                            images: prev.images.filter((_, i) => i !== idx)
                                                        }));
                                                    }}
                                                >
                                                    <Icon as={IoCloseCircleSharp} color={'red'} />
                                                </Button>
                                            </Box>
                                        );
                                    })}
                                </Flex>
                            )}
                            <PostTextWithMention
                                value={updateMessage.isUpdating ? updateMessage?.updatedText : messageText}
                                onChangeHandler={(textValue) => {
                                    const val = textValue;
                                    if (updateMessage.isUpdating) {
                                        setUpdateMessage({ ...updateMessage, updatedText: val });
                                    } else {
                                        setMessageText(val);
                                    }
                                }}
                                placeholder={updateMessage.isSubmitting ? __("Sending…", "zencommunity") : __("Write message...", "zencommunity")}
                                minHeight={isComposeExpanded ? "80px" : "24px"}
                                maxHeight="30vh"
                                padding="8px 0px"
                                showToolbar={true}
                                toolbarCollapsed={!isComposeExpanded}
                                onFocus={() => setIsComposeFocused(true)}
                                onBlur={() => setIsComposeFocused(false)}
                                contentBg={false}
                                marginBottom="0"
                            />

                            {sendError && <Text color="red.500" fontSize="12px" mt="4px">{__('Failed to send. Please try again.', 'zencommunity')}</Text>}

                            <Flex
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                mt={4}
                            >
                                <Flex alignItems="center" gap={4}>
                                    <CannedReplies
                                        currentValue={messageText}
                                        onInsert={(body) => setMessageText(messageText ? `${messageText}\n${body}` : body)}
                                    />
                                    <AiCompose
                                        currentValue={messageText}
                                        context={(supportMessages?.[selectedUser?.id] || [])
                                            .slice(-8)
                                            .map((m) => `${(m.agent_id || m.is_ai_generated) ? 'AGENT' : 'USER'}: ${String(m.message || '').replace(/<[^>]+>/g, ' ').trim()}`)
                                            .join('\n')}
                                        onResult={(text) => setMessageText(text)}
                                    />
                                    <Button
                                        onClick={() => setShowTextEmoji(!showTextEmoji)}
                                        background={'transparent'}
                                        border={'none'}
                                        outline={'none'}
                                        padding={"0px"}
                                        size={'sm'}
                                        minWidth={"20px"}
                                        height={"20px"}
                                    >
                                        <Icon size="sm" cursor={'pointer'} as={FaRegFaceSmile} color={'var(--zencom-font-color)'} />
                                    </Button>

                                    {showTextEmoji && (
                                        <Box ref={emojiRef} position="absolute" bottom="50px" left="20px" zIndex="9999">
                                            <EmojiPicker
                                                onSelect={(emoji) => {
                                                    if (updateMessage.isUpdating) {
                                                        setUpdateMessage({ ...updateMessage, updatedText: updateMessage.updatedText + emoji });
                                                    } else {
                                                        setMessageText(messageText + emoji);
                                                    }
                                                    setShowTextEmoji(false);
                                                }}
                                            />
                                        </Box>
                                    )}

                                    <Button
                                        onClick={() => document.getElementById('upload-attachment').click()}
                                        background={'transparent'}
                                        border={'none'}
                                        outline={'none'}
                                        padding={"0px"}
                                        size={'sm'}
                                        minWidth={"20px"}
                                        height={"20px"}
                                    >
                                        <Icon size="sm" as={GrAttachment} color={'var(--zencom-font-color)'} />
                                    </Button>

                                    <input
                                        ref={fileInputRef}
                                        id="upload-attachment"
                                        type="file"
                                        accept="image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.csv,text/csv,.zip,application/zip,.json,application/json"
                                        style={{ display: 'none' }}
                                        onChange={(e) => setMediaFiles({
                                            ...mediaFiles,
                                            images: [...mediaFiles.images, e.target.files[0]]
                                        })}
                                    />

                                    <AudioAttachButton
                                        onAttachmentReady={(file) => setMediaFiles({
                                            ...mediaFiles,
                                            audio: file
                                        })}
                                    />
                                </Flex>

                                <Button
                                    {...primaryBtn}
                                    onClick={() => {
                                        if (updateMessage.isUpdating) {
                                            handleUpdateMessage()
                                        } else {
                                            handleSendMessage()
                                            setUpdateMessage({
                                                ...updateMessage,
                                                isSubmitting: true,
                                                data: {
                                                    message: messageText,
                                                }
                                            })
                                        }
                                    }}
                                    minWidth="auto"
                                    disabled={(!messageText && !updateMessage?.isUpdating && mediaFiles.images.length === 0 && !mediaFiles.audio) || updateMessage.isSubmitting}
                                >
                                    <MdSend />
                                </Button>
                            </Flex>
                        </Box>
                    </Flex>
                )}
            </Flex>

            <ConfirmPopup
                isOpen={!!confirmDeleteMsg}
                onClose={() => setConfirmDeleteMsg(null)}
                onConfirm={() => {
                    dispatch(deleteMessageFromSupportChat({ chatID: selectedUser?.id, messageID: confirmDeleteMsg.id }));
                }}
                title={__('Delete message', 'zencommunity')}
                message={__('Are you sure you want to delete this message? This action cannot be undone.', 'zencommunity')}
                confirmLabel={__('Delete', 'zencommunity')}
            />
        </Flex>
    );
};

export default ChatBox;
