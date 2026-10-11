import React, { useEffect, useRef, useState, useContext } from 'react';
import EmojiPicker from '@Components/EmojiPicker';
import { Box, Button, Flex, Icon, Image, Skeleton, SkeletonCircle, Text, Textarea } from '@chakra-ui/react';
import { useFetchData } from '@Hooks/useFetchData';
import { current_logged_user, site_url, mediaFileUploader, } from '@Utils/helper';
import { __, sprintf } from '@wordpress/i18n';
import { FaRegFaceSmile } from 'react-icons/fa6';
import { useDispatch, useSelector } from 'react-redux';
import { deleteMessageFromChat, getSingleUserChat, reactToMessage, sendMessageToUser, unreadMessage, updateUserMessage } from '@Redux/slices/chatSlice/privateMessageActions';
import { getGroupMessage, sendMessageToGroup, reactGroupMessage, unreadGroupMessage, updateGroupMessage } from '@Redux/slices/chatSlice/groupActions';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import { TbSend2 } from 'react-icons/tb';
import { useStyles } from '../../../utils/chakra';
import { GrAttachment } from 'react-icons/gr';
import ZenComMenu from '@Components/ZenComMenu';
import AudioAttachButton from '@Components/AudioRecoder';
import ImageFullScreenPreview from '@Components/ImageFullScreenPreview';
import SocketContext from '@Context/SocketContext';
import { IoCloseCircleSharp, IoTrashOutline } from 'react-icons/io5';
import { FaRegEdit, FaReply } from 'react-icons/fa';
import EditedBadge from '@Components/EditedBadge';
import { useScrollFetchData } from '@Hooks/useScrollFetchData';
import { useUnsavedChangesGuard } from '@Hooks/useUnsavedChangesGuard';
import NoDataPost from '@Components/NoDataPost';
import { LuMessageCircle } from 'react-icons/lu';
import LoadingButton from '@Components/LoadingButton';

const ChatBox = ({
    selectedUser,
    isBlocked,
    setMembersMessages,
    fetchMessages: fetchSidebarMessages,
    isLargeScreen,
    isMobile,
    isMediumScreen
}) => {
    // Narrow selectors: each only re-renders when its own slice changes, instead
    // of on every dispatch to the chats slice.
    const groupMessages = useSelector(state => state.chats.groupMessages);
    const privateMessages = useSelector(state => state.chats.privateMessages);
    const privatePagination = useSelector(state => state.chats.privatePagination);
    const groupPagination = useSelector(state => state.chats.groupPagination);
    const current_chat_last_unseen_msg_id = useSelector(state => state.chats.current_chat_last_unseen_msg_id);
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
    // Reaction picker opens upward for messages in the lower half of the screen,
    // so it isn't cut off by the bottom of the message list.
    const [emojiUp, setEmojiUp] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const bottomRef = useRef(null);
    const chatContainerRef = useRef(null);
    const dispatch = useDispatch();
    const emojiRef = useRef(null);
    const fileInputRef = useRef(null);
    const blockedUserName = isBlocked.first_name + " " + isBlocked.last_name;
    const { isConnected } = useContext(SocketContext);
    const { clearBtn, primaryBtnInsideContent, isDark } = useStyles();
    const [hoveredMessageId, setHoveredMessageId] = useState(null);
    const [sendError, setSendError] = useState(false);
    // Drives the compose box's focus-in/out expand transition, same as the
    // ticket reply box: collapsed to a plain single line until actually in
    // use, then smoothly grows open.
    const [isComposeFocused, setIsComposeFocused] = useState(false);
    const isComposeExpanded = isComposeFocused
        || !!messageText.trim()
        || !!updateMessage.updatedText.trim()
        || mediaFiles.images.length > 0
        || !!mediaFiles.audio
        || updateMessage.isSubmitting;

    useUnsavedChangesGuard(!!messageText?.trim() || mediaFiles.images.length > 0 || !!mediaFiles.audio);
    const fetchMessages = async (enableLoader = false) => {
        try {
            if (enableLoader) {
                setMessagesLoading(true)
            }
            if (selectedUser?.isGroup) {
                dispatch(getGroupMessage(selectedUser?.id))
            } else {
                dispatch(getSingleUserChat(parseInt(selectedUser?.id)))
            }
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

    // Depend on the conversation identity, not the selectedUser object reference
    // (which is recreated on unrelated renders → redundant full-thread refetches).
    useEffect(() => {
        if (selectedUser) {
            fetchMessages();
        }
    }, [selectedUser?.id, selectedUser?.isGroup])

    const handleUpdateMessage = async () => {
        if (!selectedUser.isGroup) {
            dispatch(updateUserMessage({ userID: selectedUser?.id, messageID: updateMessage.data?.id, message: updateMessage.updatedText })).then(() => {
                setUpdateMessage({
                    isUpdating: false,
                    data: false,
                    updatedText: "",
                    isSubmitting: false
                })
            })
        } else {
            dispatch(updateGroupMessage({ groupId: selectedUser?.id, messageID: updateMessage.data?.id, message: updateMessage.updatedText })).then(() => {
                setUpdateMessage({
                    isUpdating: false,
                    data: false,
                    updatedText: "",
                    isSubmitting: false
                })
            })
        }
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() && mediaFiles.images.length === 0 && !mediaFiles.audio) return;

        // Attachment-only messages go out with no text (the server accepts an
        // empty message when media is attached) rather than the file names.
        const textToSend = messageText;

        setUpdateMessage({ ...updateMessage, isSubmitting: true });
        setSendError(false);

        try {
            let uploadPromises = [];

            if (mediaFiles.images.length > 0) {
                uploadPromises.push(
                    ...mediaFiles.images.map(item =>
                        handleImageChange(item, "message_attachments", "image")
                    )
                );
            }

            if (mediaFiles.audio) {
                uploadPromises.push(
                    handleImageChange(mediaFiles.audio, "message_attachments", "audio")
                );
            }

            const mediaItemIds = await Promise.all(uploadPromises);

            const newMessage = {
                id: Date.now(),
                message: textToSend,
                sender_id: current_logged_user?.user_id,
                receiver_id: selectedUser.id,
                created_at: new Date().toISOString(),
                user_avatar_url: current_logged_user.avatar_url,
                user_first_name: current_logged_user.first_name,
                user_last_name: current_logged_user.last_name,
                meta: {
                    attachments: {
                        message_attachments: [
                            ...mediaFiles.images.map(file => ({
                                type: "image",
                                url: URL.createObjectURL(file),
                                isLocal: true
                            })),
                            mediaFiles.audio && {
                                type: "audio",
                                url: URL.createObjectURL(mediaFiles.audio),
                                isLocal: true
                            }
                        ].filter(Boolean)
                    }
                }
            };

            setUpdateMessage({ ...updateMessage, isSubmitting: true, data: newMessage });

            if (selectedUser?.isGroup) {
                await dispatch(
                    sendMessageToGroup({
                        groupId: selectedUser?.id ?? selectedUser?.group_id,
                        message: newMessage,
                        mediaIds: mediaItemIds,
                        replyToId: replyTo?.id,
                    })
                ).then(() => fetchSidebarMessages());
            } else {
                await dispatch(
                    sendMessageToUser({
                        userID: selectedUser?.id,
                        message: newMessage,
                        mediaIds: mediaItemIds,
                        replyToId: replyTo?.id,
                    })
                ).then(({ payload: { data, userID } }) => {
                    setMembersMessages(prev =>
                        prev.length > 0 && prev.map(item => {
                            if (item.is_private && Number(item.other_user?.id) === Number(userID)) {
                                return { ...item, ...data };
                            }
                            return item;
                        })
                    );
                });
            }
        } catch (error) {
            console.error("Send failed:", error);
            setSendError(true);
        } finally {
            setMessageText("");
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

        const firstMessage = selectedUser?.isGroup ? groupMessages?.[ID]?.[groupMessages?.[ID].length - 1] : privateMessages?.[ID]?.[privateMessages?.[ID].length - 1];
        if (!firstMessage) return;

        const isFromOther = Number(firstMessage.sender_id) !== Number(current_logged_user?.user_id);
        if (isFromOther && current_chat_last_unseen_msg_id) {
            setMembersMessages(prev =>
                prev.length > 0 && prev.map(item => {
                    const isPrivateMatch = item.is_private && Number(item.other_user?.id) === Number(ID);
                    const isGroupMatch = item.isGroup && Number(item.group?.id) === Number(ID);

                    if (isPrivateMatch || isGroupMatch) {
                        return { ...item, is_seen: true };
                    }
                    return item;
                })
            );

            if (selectedUser?.isGroup) {
                dispatch(unreadGroupMessage({
                    groupId: ID,
                    messageID: current_chat_last_unseen_msg_id
                }));
            } else {
                dispatch(unreadMessage({
                    userID: ID,
                    messageID: current_chat_last_unseen_msg_id
                }));
            }
        }
    }, [current_chat_last_unseen_msg_id]);

    // Only auto-scroll for the *active* conversation when it gains a message or
    // on switch — not on every chats-slice update (a message in another thread,
    // a reaction, a read receipt) which used to yank the viewport.
    const activeMessages = (selectedUser?.isGroup || selectedUser?.group_id)
        ? groupMessages[selectedUser?.id]
        : privateMessages[selectedUser?.id];
    const activeLastId = activeMessages?.[activeMessages.length - 1]?.id;

    // Scroll-up pagination: load older messages, preserving scroll position.
    const activePagination = ((selectedUser?.isGroup || selectedUser?.group_id)
        ? groupPagination[selectedUser?.id]
        : privatePagination[selectedUser?.id]) || { page: 1, pages: 1 };

    const fetchOlderMessages = async (page) => {
        const container = chatContainerRef.current;
        const prevScrollHeight = container?.scrollHeight ?? 0;
        const prevScrollTop = container?.scrollTop ?? 0;

        if (selectedUser?.isGroup || selectedUser?.group_id) {
            await dispatch(getGroupMessage({ groupId: selectedUser?.id, page }));
        } else {
            await dispatch(getSingleUserChat({ userID: parseInt(selectedUser?.id), page }));
        }

        // Keep the viewport stable after older messages prepend on top.
        requestAnimationFrame(() => {
            if (!container) return;
            container.style.scrollBehavior = 'auto';
            container.scrollTop = container.scrollHeight - prevScrollHeight + prevScrollTop;
            container.style.scrollBehavior = 'smooth';
        });
    };

    useScrollFetchData(activeMessages || [], activePagination, fetchOlderMessages, messagesLoading, chatContainerRef);

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

    return (
        <Flex
            direction="column"
            w="100%"
            overflow="hidden"
            height="calc(100vh - 122px)"
        >
            {messagesLoading ? (
                <Box flex="1" minH={0} p={4} overflowY="auto">
                    {[...Array(8)].map((_, idx) => {
                        const isCurrentUser = idx % 2 === 0;
                        return (
                            <Flex
                                key={idx}
                                gap="10px"
                                direction={isCurrentUser ? "row-reverse" : "row"}
                                alignItems="flex-end"
                            >
                                {/* Avatar */}
                                <SkeletonCircle size="10" />

                                {/* Message bubble */}
                                <Skeleton
                                    height="80px"
                                    width="60%"
                                    borderRadius="4px"
                                    mb={3}
                                    startColor="gray.100"
                                    endColor="gray.300"
                                />
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
                    ref={chatContainerRef}
                >
                    {!activeMessages?.length && !updateMessage.isSubmitting && (
                        <NoDataPost
                            icon={LuMessageCircle}
                            title={__('No messages yet', 'zencommunity')}
                            subTitle={__('Start the conversation by sending a message.', 'zencommunity')}
                        />
                    )}

                    {((selectedUser?.isGroup || selectedUser?.group_id) ? groupMessages[selectedUser?.id] : privateMessages[selectedUser?.id])?.map((msg, idx, arr) => {
                        const isCurrentUser = parseInt(msg?.sender_id) === parseInt(current_logged_user?.user_id);
                        const isLast = idx === arr.length - 1;
                        const hasImage = msg?.meta?.attachments && msg?.meta?.attachments?.message_attachments?.length > 0;
                        const userAvatar = isCurrentUser ? current_logged_user.avatar_url : msg?.user_avatar_url;
                        const messageKey = msg?.id ?? idx;

                        return (
                            <Flex
                                key={idx}
                                data-first-item={idx === 0}
                                gap={"10px"}
                                direction={isCurrentUser ? "row-reverse" : "row"}
                                alignItems={"flex-end"}
                                mb={5}
                                onMouseEnter={() => setHoveredMessageId(messageKey)}
                                onMouseLeave={() => setHoveredMessageId(null)}
                            >
                                <ZenComAvatar
                                    variant="simple"
                                    size="2xs"
                                    userID={isCurrentUser ? current_logged_user?.user_id : selectedUser?.id}
                                    userName={isCurrentUser ? current_logged_user?.first_name + " " + current_logged_user?.last_name : msg?.user_first_name + " " + msg?.user_last_name}
                                    src={userAvatar ? `${site_url}${userAvatar}` : ""}
                                />

                                <Flex
                                    direction={isCurrentUser ? "row-reverse" : "row"}
                                    alignItems={"center"}
                                    width={'100%'}
                                >
                                    <Box
                                        position="relative"
                                        bg={isCurrentUser ? (isDark ? "var(--zencom-secondary-color)" : "var(--zencom-primary-color)") : "var(--zencom-secondary-color)"}
                                        fontSize={"16px"}
                                        fontWeight={"500"}
                                        color={isCurrentUser ? (isDark ? "var(--zencom-font-color)" : "#fff") : "var(--zencom-font-color)"}
                                        px={4}
                                        py={2}
                                        borderRadius={isCurrentUser ? "6px 0px 6px 6px" : "0px 6px 6px 6px"}
                                        maxW="75%"
                                        display="flex"
                                        flexDirection={'column'}
                                        alignItems={'center'}
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
                                                <Text fontSize="11px" fontWeight="600" noOfLines={1} color={isCurrentUser ? "var(--zencom-font-color)" : "var(--zencom-background)"}>
                                                    {msg.reply_to.user_first_name || ''}
                                                </Text>
                                                <Text fontSize="13px" noOfLines={2} color={isCurrentUser ? "var(--zencom-font-color)" : "var(--zencom-background)"}>
                                                    <span dangerouslySetInnerHTML={{ __html: msg.reply_to.message_rendered || msg.reply_to.message || '' }} />
                                                </Text>
                                            </Box>
                                        )}
                                        <Box width={'100%'}>
                                            <Text fontSize="16px">
                                                {msg?.message}
                                            </Text>
                                        </Box>

                                        {hasImage && (
                                            <Flex flexWrap={'wrap'} gap={'8px'} justifyContent={'center'}>
                                                {msg?.meta?.attachments?.message_attachments.map((attachment, index) => {
                                                    const isImage = attachment?.type === "image" || attachment?.meta?.image;
                                                    const isAudio = attachment?.type === "audio" || attachment?.meta?.audio;
                                                    if (isImage) {
                                                        return (
                                                            <ImageFullScreenPreview attachment={attachment} idx={index} key={index} />
                                                        )
                                                    } if (isAudio) {
                                                        return (
                                                            <audio key={index} controls>
                                                                <source src={site_url + attachment?.path} type="audio/mpeg" />
                                                                Your browser does not support the audio element.
                                                            </audio>
                                                        )
                                                    }
                                                    return null;
                                                })}
                                            </Flex>
                                        )}

                                        <EditedBadge item={msg} className="tw-self-end" />

                                        {isCurrentUser && isLast && (
                                            <Text fontSize="10px" color="gray.400" mt="2px" alignSelf="flex-end">
                                                {msg?.is_seen ? `✓✓ ${__('Seen', 'zencommunity')}` : `✓ ${__('Sent', 'zencommunity')}`}
                                            </Text>
                                        )}

                                        <Flex
                                            position="absolute"
                                            bottom="-12px"
                                            right={isCurrentUser ? "auto" : "-12px"}
                                            left={isCurrentUser ? "-24px" : "auto"}
                                            bg="var(--zencom-background)"
                                            px={2}
                                            py={1}
                                            borderRadius="8px"
                                            boxShadow="var(--zencom-shadow)"
                                            gap={1}
                                            transition="all 0.2s ease"
                                            padding={0}
                                        >
                                            {(!isCurrentUser || (isCurrentUser && msg?.reactions?.length > 0)) && (
                                                <Button
                                                    {...clearBtn}
                                                    padding="0"
                                                    height={"auto"}
                                                    minWidth={'auto'}
                                                    borderRadius="full"
                                                    bg={'var(--zencom-secondary-color)'}
                                                    onClick={(e) => {
                                                        if (!isCurrentUser) {
                                                            setEmojiUp(e.currentTarget.getBoundingClientRect().top > window.innerHeight / 2);
                                                            parseInt(showEmoji) === parseInt(msg?.id) ? setShowEmoji(false) : setShowEmoji(msg?.id)
                                                        }
                                                    }}
                                                    cursor={isCurrentUser ? "default" : "pointer"}
                                                >
                                                    {msg?.reactions?.length > 0 ? msg?.reactions[0] : (<FaRegFaceSmile color='var(--zencom-font-color)' />)}
                                                </Button>
                                            )}

                                            {(parseInt(showEmoji) === parseInt(msg?.id) && !isCurrentUser) && (
                                                <Box ref={emojiRef} position="absolute" left="0" {...(emojiUp ? { bottom: "28px" } : { top: "24px" })} zIndex="9999">
                                                    <EmojiPicker
                                                        onSelect={(emoji) => {
                                                            if (selectedUser?.isGroup) {
                                                                dispatch(reactGroupMessage({ groupId: selectedUser?.id, messageID: msg?.id, emoji }));
                                                            } else {
                                                                dispatch(reactToMessage({ userID: selectedUser?.id, messageID: msg?.id, emoji }));
                                                            }
                                                            setShowEmoji(false);
                                                        }}
                                                    />
                                                </Box>
                                            )}
                                        </Flex>
                                    </Box>

                                    {isCurrentUser && <Box display={'flex'} alignItems={'center'} height={'auto'} visibility={hoveredMessageId === messageKey ? 'visible' : 'hidden'}>
                                        <ZenComMenu
                                            variant="transparent"
                                            options={[
                                                // {
                                                //     label: __("Reply", "zencommunity"),
                                                //     icon: FaReply,
                                                //     type: "button",
                                                //     onClick: () => setReplyTo({ id: msg.id, message: msg.message, senderName: msg.user_first_name || msg.sender?.first_name || '' }),
                                                // },
                                                ...(isCurrentUser ? [
                                                    {
                                                        label: __("Update", "zencommunity"),
                                                        icon: FaRegEdit,
                                                        type: "button",
                                                        onClick: () => setUpdateMessage({ isUpdating: true, data: msg, updatedText: msg.message }),
                                                    },
                                                    {
                                                        label: __("Delete", "zencommunity"),
                                                        icon: IoTrashOutline,
                                                        type: "button",
                                                        onClick: () => dispatch(deleteMessageFromChat({ userID: selectedUser?.id, messageID: msg.id })),
                                                        textColor: "red",
                                                        iconColor: "red",
                                                    },
                                                ] : []),
                                            ]}
                                            suffix="chat-user-menu"
                                        />
                                    </Box>}
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
                                >
                                    {updateMessage?.data.message}
                                </Text>
                            </Box>
                        </Flex>
                    )}
                    <div ref={bottomRef} />
                </Box>
            )}

            <Flex p={3}>
                {isBlocked ? (
                    <Box display={'flex'} flexDirection={'column'} gap={'8px'} alignItems={'center'} w={"100%"}>
                        <Text fontSize={'14px'} color={'var(--zencom-font-color)'}>
                            {sprintf(__("You blocked messages from %s's account", "zencommunity"), blockedUserName)}
                        </Text>
                        <Text fontSize={'14px'} color={'var(--zencom-font-color)'}>
                            {__("You can't message them in this chat, and you won't receive their messages.", "zencommunity")}
                        </Text>
                    </Box>
                ) : (
                    <Box width="100%">
                        <Flex direction="column" position="relative" width="100%">
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
                                    {mediaFiles.images.map((file, idx) => (
                                        <Box key={idx} position="relative">
                                            <Image
                                                src={URL.createObjectURL(file)}
                                                alt={`preview-${idx}`}
                                                boxSize="80px"
                                                objectFit="cover"
                                                borderRadius="4px"
                                                border="1px solid var(--zencom-border-color)"
                                            />
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
                                    ))}
                                </Flex>
                            )}

                            <Box
                                width="100%"
                                bg="var(--zencom-background)"
                                border="1px solid var(--zencom-border-color)"
                                borderRadius="4px"
                                transition="border-color 0.2s ease"
                                _focusWithin={{ borderColor: "var(--zencom-primary-color)" }}
                            >
                                <Textarea
                                    placeholder={updateMessage.isSubmitting ? __("Sending…", "zencommunity") : __("Write message...", "zencommunity")}
                                    border={'none'}
                                    value={
                                        updateMessage.isUpdating
                                            ? updateMessage.updatedText.replace(/<br\s*\/?>/g, "\n")
                                            : messageText.replace(/<br\s*\/?>/g, "\n")
                                    }
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (updateMessage.isUpdating) {
                                            setUpdateMessage({ ...updateMessage, updatedText: val });
                                        } else {
                                            setMessageText(val);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();

                                            const text = (updateMessage.isUpdating ? updateMessage.updatedText : messageText)
                                                .replace(/\n/g, "<br />");

                                            if (updateMessage.isUpdating) {
                                                handleUpdateMessage(text);
                                            } else {
                                                handleSendMessage(text);
                                                setUpdateMessage({
                                                    ...updateMessage,
                                                    isSubmitting: true,
                                                    data: {
                                                        message: text,
                                                        sender_id: current_logged_user?.user_id,
                                                        receiver_id: selectedUser.id,
                                                        created_at: new Date().toISOString(),
                                                        user_avatar_url: current_logged_user.avatar_url,
                                                        user_first_name: current_logged_user.first_name,
                                                        user_last_name: current_logged_user.last_name,
                                                    },
                                                });
                                                setMessageText("");
                                            }
                                        }
                                    }}
                                    onFocus={() => setIsComposeFocused(true)}
                                    onBlur={() => setIsComposeFocused(false)}
                                    borderRadius="4px"
                                    bg="var(--zencom-background)"
                                    color={'var(--zencom-font-color)'}
                                    _active={{ boxShadow: "none" }}
                                    _focus={{ boxShadow: "none" }}
                                    style={{ caretColor: "var(--zencom-primary-color)", outline: "none" }}
                                    outline="none"
                                    width="calc(100% - 16px)"
                                    margin="0 auto"
                                    fieldSizing="content"
                                    minHeight={isComposeExpanded ? "90px" : "24px"}
                                    maxHeight="30vh"
                                    transition="min-height 0.15s ease"
                                />

                                <Flex alignItems="center" justifyContent="space-between" gap={2} p="8px 16px">
                                    <Flex alignItems="center" gap={4}>
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
                                                            setUpdateMessage({ ...updateMessage, updatedText: updateMessage.text + emoji });
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
                                            accept="image/*"
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

                                    <LoadingButton
                                        {...primaryBtnInsideContent}
                                        height="auto"
                                        padding="8px 16px"
                                        loading={updateMessage.isSubmitting}
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
                                                        sender_id: current_logged_user?.user_id,
                                                        receiver_id: selectedUser.id,
                                                        created_at: new Date().toISOString(),
                                                        user_avatar_url: current_logged_user.avatar_url,
                                                        user_first_name: current_logged_user.first_name,
                                                        user_last_name: current_logged_user.last_name,
                                                    }
                                                })
                                            }
                                        }}
                                        disabled={((!messageText || messageText.trim() === "") && mediaFiles.images.length === 0 && !mediaFiles.audio) || (updateMessage.isUpdating && updateMessage.updatedText.trim() === "")}
                                    >
                                        <TbSend2 />
                                    </LoadingButton>
                                </Flex>
                            </Box>

                            {sendError && (
                                <Text color="red.500" fontSize="12px" mt="4px">
                                    {__('Failed to send. Please try again.', 'zencommunity')}
                                </Text>
                            )}
                        </Flex>
                    </Box>
                )}
            </Flex>
        </Flex>
    );
};

export default ChatBox;
