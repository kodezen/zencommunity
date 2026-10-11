import React, { useContext, useEffect, useRef, useState } from 'react';
import EmojiPicker from '@Components/EmojiPicker';
import { Box, Button, Flex, Icon, Image, Input, Text, useBreakpointValue } from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { __ } from '@wordpress/i18n';
import { IoClose, IoCloseCircleSharp, IoChevronDown } from 'react-icons/io5';
import { MdSend } from 'react-icons/md';
import { FaRegFaceSmile } from 'react-icons/fa6';
import { GrAttachment } from 'react-icons/gr';
import { getSingleUserChat, sendMessageToUser, reactToMessage } from '@Redux/slices/chatSlice/privateMessageActions';
import { getGroupMessage, sendMessageToGroup, reactGroupMessage } from '@Redux/slices/chatSlice/groupActions';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import AudioAttachButton from '@Components/AudioRecoder';
import ImageFullScreenPreview from '@Components/ImageFullScreenPreview';
import SocketContext from '@Context/SocketContext';
import { useFetchData } from '@Hooks/useFetchData';
import { API, baseURL, current_logged_user, mediaFileUploader, namespace, site_url, media_url } from '@Utils/helper';
import { useUnsavedChangesGuard } from '@Hooks/useUnsavedChangesGuard';

const ChatHeadWindow = ({ user, onMinimize, onDismiss, position }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isMobile = useBreakpointValue({ base: true, md: false });
    const { isConnected } = useContext(SocketContext);
    const { privateMessages, groupMessages } = useSelector(state => state.chats);
    const messages = user.isGroup
        ? (groupMessages[user.id] || [])
        : (privateMessages[user.id] || []);

    const [inputText, setInputText] = useState('');
    const [mediaFiles, setMediaFiles] = useState({ audio: null, images: [] });
    const [showEmoji, setShowEmoji] = useState(false);
    const [showTextEmoji, setShowTextEmoji] = useState(false);
    // Fixed-position, viewport-space coordinates for whichever picker is open
    // (clamped to this window's own bounding box — see openPickerAt below).
    const [pickerPos, setPickerPos] = useState(null);
    const [profileCard, setProfileCard] = useState(null);
    const [showProfileCard, setShowProfileCard] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const bottomRef = useRef(null);
    const emojiRef = useRef(null);
    const messagesRef = useRef(null);
    const windowRef = useRef(null);

    const PICKER_W = 300;
    const PICKER_H = 280;

    // Both the per-message reaction picker and the composer's insert-emoji
    // picker used to be `position: absolute` offsets relative to whatever
    // trigger opened them (a message bubble, or the toolbar) — fine when
    // there's plenty of room, but this window is only ~480px tall, and a
    // trigger near either end left no room on one side. A simple up/down
    // flip wasn't enough either: the ~280px-tall picker could still overflow
    // past the window's own top or bottom regardless of which way it opened.
    // Computing a `position: fixed` point clamped to this window's own
    // bounding rect makes it impossible for the picker to render outside the
    // window no matter where its trigger sits.
    const openPickerAt = (triggerEl) => {
        const winRect = windowRef.current?.getBoundingClientRect();
        const trigRect = triggerEl.getBoundingClientRect();
        if (!winRect) return { top: trigRect.bottom + 6, left: trigRect.left };

        const margin = 8;
        const spaceBelow = winRect.bottom - trigRect.bottom;
        const openUp = spaceBelow < PICKER_H + margin;

        let top = openUp ? trigRect.top - PICKER_H - 6 : trigRect.bottom + 6;
        top = Math.min(Math.max(top, winRect.top + margin), winRect.bottom - PICKER_H - margin);

        let left = trigRect.left;
        left = Math.min(Math.max(left, winRect.left + margin), winRect.right - PICKER_W - margin);

        return { top, left };
    };

    const hasUnsavedInput = !!inputText?.trim() || mediaFiles.images.length > 0 || !!mediaFiles.audio;
    useUnsavedChangesGuard(hasUnsavedInput);
    // Minimize (chevron) drops this back to a bubble; dismiss (✕) removes the
    // conversation from the chat heads entirely. Either way this component
    // unmounts and the draft is lost, so both confirm first.
    const confirmDiscard = () =>
        !hasUnsavedInput || window.confirm(__('You have unsaved changes. Leave without sending this message?', 'zencommunity'));
    const handleMinimize = () => { if (confirmDiscard()) onMinimize(); };
    const handleDismiss = () => { if (confirmDiscard()) onDismiss(); };

    const mediaFilesRef = useRef(mediaFiles);
    useEffect(() => { mediaFilesRef.current = mediaFiles; }, [mediaFiles]);
    useEffect(() => {
        return () => mediaFilesRef.current.images.forEach(({ preview }) => URL.revokeObjectURL(preview));
    }, []);

    const displayName = user.isGroup
        ? (user.name || user.first_name || __('Group', 'zencommunity'))
        : [user.first_name, user.last_name].filter(Boolean).join(' ') || __('Unknown', 'zencommunity');

    const fetchMessages = () => {
        if (user.isGroup) {
            dispatch(getGroupMessage(user.id));
        } else {
            dispatch(getSingleUserChat(parseInt(user.id)));
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [user.id]);

    const { _ } = useFetchData({
        handler: fetchMessages,
        timer: 10000,
        immediate: false,
        isSocketActive: isConnected,
    });

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target)) {
                setShowEmoji(false);
                setShowTextEmoji(false);
                setPickerPos(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showEmoji, showTextEmoji]);

    const handleSendMessage = async () => {
        if (!inputText.trim() && mediaFiles.images.length === 0 && !mediaFiles.audio) return;
        setIsSending(true);
        try {
            const uploadPromises = [
                ...mediaFiles.images.map(item => mediaFileUploader('message_attachments', item.file, 'image')),
                ...(mediaFiles.audio ? [mediaFileUploader('message_attachments', mediaFiles.audio, 'audio')] : []),
            ];
            const mediaItemIds = (await Promise.all(uploadPromises)).map(res => res?.id).filter(Boolean);

            const payload = {
                id: Date.now(),
                message: inputText,
                sender_id: current_logged_user?.user_id,
                receiver_id: user.id,
                created_at: new Date().toISOString(),
                user_avatar_url: current_logged_user?.avatar_url,
                user_first_name: current_logged_user?.first_name,
                user_last_name: current_logged_user?.last_name,
                meta: {
                    attachments: {
                        message_attachments: [
                            ...mediaFiles.images.map(item => ({ type: 'image', url: item.preview, isLocal: true })),
                            ...(mediaFiles.audio ? [{ type: 'audio', url: URL.createObjectURL(mediaFiles.audio), isLocal: true }] : []),
                        ],
                    },
                },
            };

            if (user.isGroup) {
                dispatch(sendMessageToGroup({ groupId: user.id, message: payload, mediaIds: mediaItemIds }));
            } else {
                dispatch(sendMessageToUser({ userID: user.id, message: payload, mediaIds: mediaItemIds }));
            }
        } catch {}
        setInputText('');
        mediaFiles.images.forEach(({ preview }) => URL.revokeObjectURL(preview));
        setMediaFiles({ audio: null, images: [] });
        setIsSending(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleNameMouseEnter = async () => {
        if (user.isGroup) return;
        setShowProfileCard(true);
        if (profileCard) return;
        setProfileCard('loading');
        try {
            const { data } = await API.get(namespace + `/member/${user.id}`);
            setProfileCard({
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                avatar_url: data.avatar_url || null,
            });
        } catch { setProfileCard(null); }
    };

    return (
        <Box
            ref={windowRef}
            position="fixed"
            // Facebook's web chat panels sit flush against the bottom edge
            // (a docked drawer, not a floating card) — only the top corners
            // are rounded.
            bottom={isMobile ? "0" : "0"}
            // The bubble column occupies the rightmost ~76px (8px gap + 68px
            // circle) of the viewport — 70px here left a ~6px underlap where
            // the window's own rounded corner collided with the bubble.
            right={isMobile ? "16px" : `calc(84px + ${position} * 336px)`}
            width={isMobile ? "calc(100vw - 32px)" : "328px"}
            minWidth={!isMobile ? "300px" : undefined}
            minHeight="400px"
            height={isMobile ? "calc(100vh - 100px)" : "455px"}
            display="flex"
            flexDirection="column"
            bg="var(--zencom-background)"
            border="1px solid var(--zencom-border-color)"
            borderBottom={isMobile ? "1px solid var(--zencom-border-color)" : "none"}
            borderRadius="8px 8px 0 0"
            boxShadow="0 2px 12px rgba(0,0,0,0.18)"
            // See ChatHeadBubble.js — must out-rank ordinary in-page popovers
            // (z-index 100000), which otherwise render on top of this window.
            zIndex={100100}
            overflow="hidden"
        >
            {/* Header */}
            <Flex
                alignItems="center"
                justifyContent="space-between"
                padding="10px 12px"
                borderBottom="1px solid var(--zencom-border-color)"
                bg="var(--zencom-background)"
                flexShrink={0}
            >
                <Flex alignItems="center" gap={2}>
                    {/* variant="simple" suppresses the name text rendered by the default variant */}
                    <ZenComAvatar
                        variant="simple"
                        src={user.avatar_url}
                        userID={user.isGroup ? null : user.id}
                        groupID={user.isGroup ? user.id : null}
                        size="sm"
                        userName={displayName}
                    />
                    <Box position="relative">
                        <Text
                            fontSize="13px"
                            fontWeight="600"
                            color="var(--zencom-font-color)"
                            noOfLines={1}
                            cursor={user.isGroup ? 'default' : 'pointer'}
                            _hover={user.isGroup ? {} : { color: 'var(--zencom-primary-color)' }}
                            onClick={() => { if (!user.isGroup) navigate('/member/' + user.id); }}
                            onMouseEnter={handleNameMouseEnter}
                            onMouseLeave={() => setShowProfileCard(false)}
                        >
                            {displayName}
                        </Text>
                        {showProfileCard && profileCard && profileCard !== 'loading' && (
                            <Box
                                position="absolute"
                                top="100%"
                                left="0"
                                mt="4px"
                                bg="var(--zencom-background)"
                                border="1px solid var(--zencom-border-color)"
                                borderRadius="8px"
                                boxShadow="0 4px 16px rgba(0,0,0,0.15)"
                                p={3}
                                zIndex={10}
                                minW="180px"
                                pointerEvents="none"
                            >
                                <Flex alignItems="center" gap={2}>
                                    <ZenComAvatar
                                        variant="simple"
                                        src={profileCard.avatar_url}
                                        userID={user.id}
                                        size="sm"
                                        userName={[profileCard.first_name, profileCard.last_name].filter(Boolean).join(' ')}
                                    />
                                    <Text fontSize="13px" fontWeight="600" color="var(--zencom-font-color)" noOfLines={1}>
                                        {[profileCard.first_name, profileCard.last_name].filter(Boolean).join(' ')}
                                    </Text>
                                </Flex>
                            </Box>
                        )}
                    </Box>
                </Flex>
                <Flex alignItems="center" gap={1}>
                    {/* Minimize — collapses back to a bubble, conversation stays open */}
                    <Icon
                        as={IoChevronDown}
                        cursor="pointer"
                        color="var(--zencom-font-color)"
                        boxSize={5}
                        onClick={handleMinimize}
                        _hover={{ color: 'var(--zencom-primary-color)' }}
                    />
                    {/* Dismiss — removes this conversation from chat heads entirely */}
                    <Icon
                        as={IoClose}
                        cursor="pointer"
                        color="var(--zencom-font-color)"
                        boxSize={5}
                        onClick={handleDismiss}
                        _hover={{ color: 'var(--zencom-primary-color)' }}
                    />
                </Flex>
            </Flex>

            {/* Messages */}
            <Box
                ref={messagesRef}
                flex="1"
                overflowY="auto"
                padding="10px 12px"
                display="flex"
                flexDirection="column"
                gap="6px"
                onScroll={() => {
                    if (showEmoji !== false) { setShowEmoji(false); setPickerPos(null); }
                }}
            >
                {messages.map((msg, i) => {
                    const isOwn = parseInt(msg.sender_id) === parseInt(current_logged_user?.user_id);
                    const hasAttachments = msg?.meta?.attachments?.message_attachments?.length > 0;

                    return (
                        <Flex key={msg.id || i} justifyContent={isOwn ? 'flex-end' : 'flex-start'} mb={5}>
                            <Box
                                position="relative"
                                maxW="75%"
                                px="10px"
                                py="6px"
                                borderRadius="4px"
                                bg={isOwn ? '#2A3BEE' : '#F6F7F8'}
                                display="flex"
                                flexDirection="column"
                                gap="4px"
                            >
                                {msg.message && (
                                    <Text
                                        fontSize="13px"
                                        color={isOwn ? '#fff' : '#1A1A1A'}
                                        wordBreak="break-word"
                                    >
                                        {msg.message}
                                    </Text>
                                )}
                                {hasAttachments && (
                                    <Flex flexWrap="wrap" gap="6px" justifyContent="center">
                                        {msg.meta.attachments.message_attachments.map((a, idx) => {
                                            const isImage = a.type === 'image' || a.meta?.image;
                                            const isAudio = a.type === 'audio' || a.meta?.audio;
                                            if (isImage) return <ImageFullScreenPreview key={idx} attachment={a} idx={idx} />;
                                            if (isAudio) return (
                                                <audio key={idx} controls style={{ maxWidth: '200px' }}>
                                                    <source src={media_url(a.path)} type="audio/mpeg" />
                                                </audio>
                                            );
                                            return null;
                                        })}
                                    </Flex>
                                )}

                                {/* Reaction button — inside bubble, positioned below it */}
                                <Flex
                                    position="absolute"
                                    bottom="-12px"
                                    right={isOwn ? 'auto' : '-12px'}
                                    left={isOwn ? '-24px' : 'auto'}
                                    bg="white"
                                    px={2}
                                    py={1}
                                    borderRadius="md"
                                    boxShadow="md"
                                    gap={1}
                                    padding={0}
                                >
                                    {(!isOwn || (isOwn && msg?.reactions?.length > 0)) && (
                                        <Button
                                            padding="0"
                                            height="auto"
                                            minWidth="auto"
                                            borderRadius="full"
                                            bg="var(--zencom-secondary-color)"
                                            border="none"
                                            cursor={isOwn ? 'default' : 'pointer'}
                                            onClick={(e) => {
                                                if (!isOwn) {
                                                    const isClosing = parseInt(showEmoji) === parseInt(msg?.id);
                                                    setShowTextEmoji(false);
                                                    setShowEmoji(isClosing ? false : msg?.id);
                                                    setPickerPos(isClosing ? null : openPickerAt(e.currentTarget));
                                                }
                                            }}
                                        >
                                            {msg?.reactions?.length > 0
                                                ? msg.reactions[0]
                                                : <FaRegFaceSmile size={12} color="var(--zencom-font-color)" />}
                                        </Button>
                                    )}
                                </Flex>

                                {/* Reaction emoji picker — fixed position, clamped to this window */}
                                {parseInt(showEmoji) === parseInt(msg?.id) && !isOwn && pickerPos && (
                                    <Box ref={emojiRef} position="fixed" top={`${pickerPos.top}px`} left={`${pickerPos.left}px`} zIndex="9999">
                                        <EmojiPicker
                                            compact
                                            onSelect={(emoji) => {
                                                if (user.isGroup) {
                                                    dispatch(reactGroupMessage({ groupId: user.id, messageID: msg?.id, emoji }));
                                                } else {
                                                    dispatch(reactToMessage({ userID: user.id, messageID: msg?.id, emoji }));
                                                }
                                                setShowEmoji(false);
                                                setPickerPos(null);
                                            }}
                                        />
                                    </Box>
                                )}
                            </Box>
                        </Flex>
                    );
                })}
                <Box ref={bottomRef} />
            </Box>

            {/* Composer */}
            <Box borderTop="1px solid var(--zencom-border-color)" flexShrink={0}>
                {/* Image previews */}
                {mediaFiles.images.length > 0 && (
                    <Flex gap="6px" flexWrap="wrap" p="6px 10px" bg="var(--zencom-secondary-color)">
                        {mediaFiles.images.map((item, idx) => (
                            <Box key={idx} position="relative">
                                <Image
                                    src={item.preview}
                                    boxSize="56px"
                                    objectFit="cover"
                                    borderRadius="4px"
                                    border="1px solid var(--zencom-border-color)"
                                />
                                <Button
                                    size="xs"
                                    position="absolute"
                                    top="1px"
                                    right="1px"
                                    bg="transparent"
                                    padding="0"
                                    minW="auto"
                                    height="auto"
                                    onClick={() => {
                                        URL.revokeObjectURL(item.preview);
                                        setMediaFiles(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
                                    }}
                                >
                                    <Icon as={IoCloseCircleSharp} color="red" boxSize={3} />
                                </Button>
                            </Box>
                        ))}
                    </Flex>
                )}

                {/* Text input */}
                <Flex alignItems="center" gap={1} padding="6px 10px">
                    <Input
                        flex="1"
                        fontSize="13px"
                        placeholder={__('Write a message...', 'zencommunity')}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        border="1px solid var(--zencom-border-color)"
                        borderRadius="20px"
                        px={3}
                        height="32px"
                        color="var(--zencom-font-color)"
                        bg="var(--zencom-background)"
                        _focus={{ borderColor: 'var(--zencom-primary-color)', outline: 'none' }}
                    />
                </Flex>

                {/* Toolbar */}
                <Flex alignItems="center" justifyContent="space-between" px="10px" pb="6px">
                    <Flex alignItems="center" gap={3} position="relative">
                        {/* Emoji insert */}
                        <Button
                            bg="transparent" border="none" padding="0" size="sm" minWidth="20px" height="20px"
                            onClick={(e) => {
                                const isClosing = showTextEmoji;
                                setShowEmoji(false);
                                setShowTextEmoji(!isClosing);
                                setPickerPos(isClosing ? null : openPickerAt(e.currentTarget));
                            }}
                        >
                            <Icon as={FaRegFaceSmile} color="var(--zencom-font-color)" />
                        </Button>
                        {showTextEmoji && pickerPos && (
                            <Box ref={emojiRef} position="fixed" top={`${pickerPos.top}px`} left={`${pickerPos.left}px`} zIndex="9999">
                                <EmojiPicker
                                    compact
                                    onSelect={(emoji) => {
                                        setInputText((prev) => prev + emoji);
                                        setShowTextEmoji(false);
                                        setPickerPos(null);
                                    }}
                                />
                            </Box>
                        )}

                        {/* Image attachment */}
                        <Button
                            bg="transparent" border="none" padding="0" size="sm" minWidth="20px" height="20px"
                            onClick={() => document.getElementById(`chat-attach-${user.id}`).click()}
                        >
                            <Icon as={GrAttachment} color="var(--zencom-font-color)" />
                        </Button>
                        <input
                            id={`chat-attach-${user.id}`}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => {
                                const file = e.target.files[0];
                                if (file instanceof Blob) {
                                    const preview = URL.createObjectURL(file);
                                    setMediaFiles(prev => ({ ...prev, images: [...prev.images, { file, preview }] }));
                                }
                                e.target.value = '';
                            }}
                        />

                        {/* Audio */}
                        <AudioAttachButton
                            onAttachmentReady={file => setMediaFiles(prev => ({ ...prev, audio: file }))}
                        />
                    </Flex>

                    {/* Send */}
                    <Icon
                        as={MdSend}
                        boxSize={5}
                        cursor={(inputText.trim() || mediaFiles.images.length > 0 || mediaFiles.audio) && !isSending ? 'pointer' : 'default'}
                        color={(inputText.trim() || mediaFiles.images.length > 0 || mediaFiles.audio) ? 'var(--zencom-primary-color)' : 'var(--zencom-font-muted)'}
                        onClick={handleSendMessage}
                    />
                </Flex>
            </Box>
        </Box>
    );
};

export default ChatHeadWindow;
