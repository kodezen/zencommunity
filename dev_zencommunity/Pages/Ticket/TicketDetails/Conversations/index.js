import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
    Box,
    Flex,
    Button,
    Text,
    Icon,
    SkeletonCircle,
    Skeleton,
    Separator,
    HStack,
} from "@chakra-ui/react";
import ZCLabel from "@Components/Chakra/Labels/ZCLabel";
import { __ } from "@wordpress/i18n";
import { useDispatch, useSelector } from "react-redux";
import {
    deleteTicketConversation,
    getAllTicketConversationReplies,
    togglePinConversation,
    updateTicketConversations,
    createTicketConversationReply,
    getTicketpaginatedConversations
} from "@Redux/slices/ticketSlice/ticketSlice";
import { API, current_logged_user, mediaFileUploader, plugin_root_url, site_url } from "@Utils/helper";
import { LuMessageCircleMore, LuPinOff } from "react-icons/lu";
import { MdOutlinePushPin } from "react-icons/md";
import { RiDeleteBinLine } from "react-icons/ri";
import { GrAttachment } from "react-icons/gr";
import { IoCloseCircleSharp } from "react-icons/io5";
import ZenComAvatar from "@Components/Chakra/ZenComAvatar";
import ZenComTooltip from "@Components/ZenComTooltip";
import { FiEdit2 } from "react-icons/fi";
import MessageSources, { formatMessageHtml } from '@Components/MessageBody';
import ImageFullScreenPreview from "@Components/ImageFullScreenPreview";
import FileAttachmentCard from "@Components/FileAttachmentCard";
import PostTextWithMention from "@Components/PostTextWithMention";
import LoadingButton from "@Components/LoadingButton";
import CannedReplies from "@Components/CannedReplies";
import AiCompose from "@Components/AiCompose";
import { wasEdited } from "@Utils/helper";
import TicketReplies from "@Components/ZenComLoader/TicketReplies";
import moment from "moment";
import { useScrollFetchData } from "@Hooks/useScrollFetchData";
import { showNotification } from "@Redux/slices/notificationSlice/notificationSlice";
import { useStyles } from "../../../../utils/chakra";
import MessageStatus from "@Components/MessageStatus";
import { attachmentLimitsHint, mergeAttachmentFiles } from "../../helper";

// Older attachment-only replies were saved with their file names as the text
// ("banner.jpg, photo.png"). That text is hidden when it's exactly the names
// of the reply's own attachments.
const isAttachmentNamesOnly = (content, attachments = []) => {
    const text = String(content || '').replace(/<[^>]*>/g, '').trim();
    if (!text || !attachments?.length) return false;
    const names = attachments.map((a) => a?.meta?.original_name).filter(Boolean);
    return names.length > 0 && text === names.join(', ');
};

// Images first, then other files, in one wrapping row.
const sortAttachments = (attachments = []) => [
    ...attachments.filter((a) => a?.meta?.type === 'img'),
    ...attachments.filter((a) => a?.meta?.type !== 'img'),
];

// A message only ever shows "Seen" for the LAST thing the current user sent -
// it's read against updatedSingleTicket.meta.last_viewed_by, which
// mark_viewed() (zencommunity-pro) stamps per user, not a single shared
// timestamp, since a ticket can have several staff viewers as well as the
// requester. "Seen" means some OTHER party viewed the ticket at or after
// this message went out — a sending/failed placeholder's own created_at
// can't match a real viewed_at, so no separate status check is needed here.
// Returns the viewed_at timestamp to show next to "Seen" (the most recent
// qualifying viewer, if several staff looked at it after this message went
// out), or null if no one else has seen it yet.
const getSeenAt = (message, lastViewedBy) => {
    if (!message?.created_at) return null;
    if (Number(message?.user_id) !== Number(current_logged_user?.user_id)) return null;
    const messageTime = moment.utc(message.created_at).valueOf();
    const seenTimestamps = Object.entries(lastViewedBy || {})
        .filter(([uid]) => Number(uid) !== Number(current_logged_user?.user_id))
        .map(([, viewedAt]) => viewedAt)
        .filter((viewedAt) => moment.utc(viewedAt).valueOf() >= messageTime);
    if (!seenTimestamps.length) return null;
    return seenTimestamps.reduce((latest, t) => (moment.utc(t).isAfter(moment.utc(latest)) ? t : latest));
};

const ReplyEditor = ({ value, onChange, onSubmit, onCancel, loading, files = [], onAddFiles, onRemoveFile }) => {
    const { primaryBtnInsideContent, primaryBtnInsideContentTrans } = useStyles();

    return (
        <Box mt={2} bg="var(--zencom-background)" p={3} borderRadius="md">
            <PostTextWithMention
                value={value}
                onChangeHandler={onChange}
                minHeight="50px"
                padding="8px 0px"
                showToolbar={true}
                imageType='ticket_discussion_attachments'
                placeholder={__("Write a reply...", "zencommunity")}
            />
            {/* A reply previously had no way to attach anything at all - only a
            brand-new top-level message could. This reuses the same picker as
            the edit form, just with nothing "existing" to remove. */}
            <EditAttachments
                existingAttachments={[]}
                removedMediaIds={[]}
                onRemoveExisting={() => {}}
                newFiles={files}
                onAddFiles={onAddFiles}
                onRemoveNewFile={onRemoveFile}
            />
            <Flex gap={2} justifyContent="flex-end" mt={2} alignItems="center">
                <Box mr="auto">
                    <Flex align="center" gap="12px">
                        <CannedReplies
                            currentValue={value}
                            onInsert={(body) => onChange(value ? `${value}\n${body}` : body)}
                        />
                        <AiCompose
                            currentValue={value}
                            onResult={(text) => onChange(text)}
                        />
                    </Flex>
                </Box>
                <Button
                    size="xs"
                    {...primaryBtnInsideContentTrans}
                    height="auto"
                    padding="8px 16px"
                    onClick={onCancel}
                >
                    {__('Cancel', 'zencommunity')}
                </Button>
                <LoadingButton
                    size="xs"
                    {...primaryBtnInsideContent}
                    height="auto"
                    padding="8px 16px"
                    onClick={onSubmit}
                    loading={loading}
                >
                    {__('Reply', 'zencommunity')}
                </LoadingButton>
            </Flex>
        </Box>
    )
};

const ActionIcons = ({ item, onEdit, onDelete, onPin, onReply, currentUser }) => {
    return (
        <Flex gap={2}>
            <Button color="var(--zencom-font-color)" variant='plain' minW="auto" height="auto" padding="0" _hover={{ color: "blue.500" }} onClick={onReply}>
                <Icon as={LuMessageCircleMore} boxSize="16px" />
            </Button>

            {Number(item?.user_id) === Number(currentUser?.user_id) && (
                <>
                    <Button color="var(--zencom-font-color)" variant='plain' minW="auto" height="auto" padding="0" _hover={{ color: "blue.500" }} onClick={onEdit}>
                        <Icon as={FiEdit2} boxSize="16px" />
                    </Button>
                    <Button color="var(--zencom-font-color)" variant='plain' minW="auto" height="auto" padding="0" _hover={{ color: "blue.500" }} onClick={onDelete}>
                        <Icon as={RiDeleteBinLine} boxSize="16px" />
                    </Button>
                    <Button onClick={onPin} color="var(--zencom-font-color)" minW="auto" variant='plain' height="auto" padding="0" _hover={{ color: "blue.500" }}>
                        <Icon as={item.is_pinned ? LuPinOff : MdOutlinePushPin} boxSize="16px" />
                    </Button>
                </>
            )}
        </Flex>
    )
};

// Shared attachment picker/preview used by both the top-level conversation
// edit form and the nested reply edit form — lets an in-progress edit remove
// existing attachments and stage new ones before Save uploads/submits them.
const EditAttachments = ({
    existingAttachments = [],
    removedMediaIds,
    onRemoveExisting,
    newFiles,
    onAddFiles,
    onRemoveNewFile,
}) => {
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);
    const visibleExisting = existingAttachments.filter((att) => !removedMediaIds.includes(att?.id));

    // Replaces (rather than appends to) the staged file list - mergeAttachmentFiles
    // already returns the full combined, sorted-by-filename result, and the
    // caller's setter (setEditNewFiles) is a plain replace, not an appender.
    const handleFilesPicked = (fileList) => {
        const { files, error } = mergeAttachmentFiles(newFiles, Array.from(fileList));
        if (error) {
            dispatch(showNotification({ message: error, isShow: true, type: 'error' }));
            return;
        }
        onAddFiles(files);
    };

    return (
        <Box mt={2}>
            {(visibleExisting.length > 0 || newFiles.length > 0) && (
                <Flex gap="8px" flexWrap="wrap" mb={2}>
                    {visibleExisting.map((att) => (
                        <Box key={`existing-${att.id}`} position="relative">
                            <Text
                                borderRadius="6px"
                                border="1px solid var(--zencom-border-color)"
                                whiteSpace="nowrap"
                                fontSize="14px"
                                p="2px 8px"
                                color="#586774"
                            >
                                {att?.meta?.original_name || att?.name || __('Attachment', 'zencommunity')}
                            </Text>
                            <Button
                                size="xs"
                                position="absolute"
                                top="-8px"
                                right="-8px"
                                background='transparent'
                                padding='0px'
                                minW="auto"
                                height="auto"
                                onClick={() => onRemoveExisting(att.id)}
                            >
                                <Icon as={IoCloseCircleSharp} color={'red'} />
                            </Button>
                        </Box>
                    ))}
                    {newFiles.map((file, idx) => (
                        <Box key={`new-${idx}`} position="relative">
                            <Text
                                borderRadius="6px"
                                border="1px solid var(--zencom-border-color)"
                                whiteSpace="nowrap"
                                fontSize="14px"
                                p="2px 8px"
                                color="#586774"
                            >
                                {file.name}
                            </Text>
                            <Button
                                size="xs"
                                position="absolute"
                                top="-8px"
                                right="-8px"
                                background='transparent'
                                padding='0px'
                                minW="auto"
                                height="auto"
                                onClick={() => onRemoveNewFile(idx)}
                            >
                                <Icon as={IoCloseCircleSharp} color={'red'} />
                            </Button>
                        </Box>
                    ))}
                </Flex>
            )}

            <ZenComTooltip
                content={
                    <Text fontSize='12px'>
                        {attachmentLimitsHint()}
                    </Text>
                }
                position='top-left'
                variant='black'
            >
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="xs"
                    bg="transparent"
                    color="#586774"
                    height="auto"
                    minWidth="auto"
                    padding="4px"
                >
                    <Icon size="sm" as={GrAttachment} color={'var(--zencom-font-color)'} />
                </Button>
            </ZenComTooltip>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="
                    image/*,
                    video/*,
                    application/pdf,
                    .doc,
                    .docx,
                    application/msword,
                    application/vnd.openxmlformats-officedocument.wordprocessingml.document,
                    .csv,
                    text/csv,
                    .zip,
                    application/zip,
                    .json,
                    application/json
                "
                style={{ display: 'none' }}
                onChange={(e) => {
                    handleFilesPicked(e.target.files);
                    e.target.value = '';
                }}
            />
        </Box>
    );
};

const Replies = ({
    conversation = [],
    parentId,
    site_url,
    current_logged_user,
    requesterId,
    editingId,
    setEditingId,
    editText,
    setEditText,
    editNewFiles,
    setEditNewFiles,
    editRemovedMediaIds,
    setEditRemovedMediaIds,
    uploadEditAttachments,
    replyingId,
    setReplyingId,
    replyText,
    setReplyText,
    replyNewFiles,
    setReplyNewFiles,
    handleReplySubmit,
    handleUpdate,
    replySubmitting,
    lastViewedBy,
}) => {
    const [localReplies, setLocalReplies] = useState(conversation || []);
    const dispatch = useDispatch();

    useEffect(() => {
        setLocalReplies(conversation || []);
    }, [conversation]);

    const handleDeleteLocal = (replyId) => {
        setLocalReplies(prev => prev.filter(r => r.id !== replyId));
        dispatch(
            showNotification({
                message: __("Deleted successfully", "zencommunity"),
                isShow: true,
                type: "success",
            })
        );
    };

    const handleDelete = async (ticket_id, parent_id, conversationId) => {
        // deletes replies
        dispatch(deleteTicketConversation({
            ticket_id,
            conversation_id: parent_id,
            conversation_reply_id: conversationId,
        }))
    };

    const handleUpdateLocal = (replyId, newContent, meta) => {
        setLocalReplies(prev =>
            prev.map(r =>
                r.id === replyId ? { ...r, content: newContent, ...(meta ? { meta } : {}) } : r
            )
        );
    };

    return (
        <>
            {localReplies?.map((msg, msgIndex) => {
                const isLastReply = msgIndex === localReplies.length - 1;
                const isStaffReply = requesterId != null && Number(msg?.user_id) !== Number(requesterId);
                return (
                <Box
                    key={msg?.id}
                    mt={3}
                    ml="56px"
                    pl="12px"
                    width="calc(100% - 56px)"
                    borderLeft="2px solid var(--zencom-primary-color)"
                >
                    <ZenComAvatar
                        userID={msg?.user_id}
                        variant="ticket"
                        size="sm"
                        src={
                            msg?.user_avatar_url
                                ? site_url + msg?.user_avatar_url
                                : ""
                        }
                        userName={[msg?.user_first_name, msg?.user_last_name].filter(Boolean).join(" ")}
                        postedTime={`${moment.utc(msg.created_at).local().fromNow()}${wasEdited(msg) ? ` · ${__('edited', 'zencommunity')}` : ''}`}
                        userRole={__(conversation?.role, "zencommunity")}
                        repliedContent={
                            <>
                            <ZenComTooltip
                                content={
                                    msg?._status === "sending" ? null : (
                                        <ActionIcons
                                            item={msg}
                                            currentUser={current_logged_user}
                                            onEdit={() => {
                                                setEditingId(msg?.id);
                                                setEditText(msg?.content);
                                                setEditNewFiles([]);
                                                setEditRemovedMediaIds([]);
                                            }}
                                            onDelete={() => {
                                                handleDeleteLocal(msg?.id);
                                                handleDelete(msg?.ticket_id, msg?.parent_id, msg?.id);
                                            }}
                                            onPin={() => { }}
                                            onReply={() => {
                                                setReplyingId(msg?.id);
                                                setReplyText("");
                                                setReplyNewFiles([]);
                                            }}
                                        />
                                    )
                                }
                                position="custom-1"
                                variant="white"
                                suffix="ticket-replies"
                            >
                                <Box
                                    borderRadius="4px 12px 12px 12px"
                                    border="1px solid var(--zencom-border-color)"
                                    bg={isStaffReply ? "var(--zencom-secondary-color)" : "var(--zencom-background)"}
                                    mt={1}
                                    p="14px 16px"
                                    opacity={msg?._status === "sending" ? 0.7 : 1}
                                >
                                    {editingId === msg?.id ? (
                                        <>
                                            <PostTextWithMention
                                                value={editText}
                                                onChangeHandler={(value) => {
                                                    setEditText(value);
                                                }}
                                                minHeight="50px"
                                                padding="8px 0px"
                                                showToolbar={true}
                                                imageType='ticket_discussion_attachments'
                                            />
                                            <EditAttachments
                                                existingAttachments={msg?.meta?.attachments?.ticket_discussion_attachments || []}
                                                removedMediaIds={editRemovedMediaIds}
                                                onRemoveExisting={(mediaId) => setEditRemovedMediaIds(prev => [...prev, mediaId])}
                                                newFiles={editNewFiles}
                                                onAddFiles={(files) => setEditNewFiles(files)}
                                                onRemoveNewFile={(idx) => setEditNewFiles(prev => prev.filter((_, i) => i !== idx))}
                                            />
                                            <Flex gap={2} justifyContent="flex-end" mt={2}>
                                                <Button
                                                    size="xs"
                                                    bg="transparent"
                                                    color="var(--zencom-font-color)"
                                                    height="auto"
                                                    padding="8px 16px"
                                                    onClick={() => {
                                                        setEditingId(null);
                                                        setEditNewFiles([]);
                                                        setEditRemovedMediaIds([]);
                                                    }}
                                                >
                                                    {__('Cancel', 'zencommunity')}
                                                </Button>
                                                <LoadingButton
                                                    size="xs"
                                                    bg="var(--zencom-primary-color)"
                                                    color="#fff"
                                                    height="auto"
                                                    padding="8px 16px"
                                                    onClick={async () => {
                                                        const uploadedIds = await uploadEditAttachments(editNewFiles);
                                                        const data = await handleUpdate(msg?.id, editText, uploadedIds, editRemovedMediaIds);
                                                        handleUpdateLocal(msg?.id, editText, data?.meta);
                                                        setEditingId(null);
                                                        setEditNewFiles([]);
                                                        setEditRemovedMediaIds([]);
                                                    }}
                                                >
                                                    {__('Save', 'zencommunity')}
                                                </LoadingButton>
                                            </Flex>
                                        </>
                                    ) : (
                                        <>
                                            {!isAttachmentNamesOnly(msg?.content, msg?.meta?.attachments?.ticket_discussion_attachments) && (
                                                <ZCLabel
                                                    label={msg?.content}
                                                    fontSize="14px"
                                                    fontWeight="400"
                                                    color="var(--zencom-font-color)"
                                                />
                                            )}
                                            {msg?.meta?.attachments?.ticket_discussion_attachments?.length > 0 && (
                                                <Flex gap={2} mt={msg?.content && !isAttachmentNamesOnly(msg?.content, msg?.meta?.attachments?.ticket_discussion_attachments) ? 3 : 0} flexWrap="wrap" >
                                                    {sortAttachments(msg?.meta?.attachments?.ticket_discussion_attachments).map((file, idx) => (
                                                        file?.meta?.type === 'img' ? (
                                                            <ImageFullScreenPreview
                                                                key={idx}
                                                                attachment={file}
                                                                idx={idx}
                                                            />
                                                        ) : (
                                                            <FileAttachmentCard key={idx} attachment={file} />
                                                        )
                                                    ))}
                                                </Flex>
                                            )}
                                        </>
                                    )}
                                </Box>
                            </ZenComTooltip>
                            {editingId !== msg?.id && (() => {
                                if (!isLastReply) {
                                    return <MessageStatus status={msg?._status === "failed" ? "failed" : null} />;
                                }
                                if (msg?._status === "sending" || msg?._status === "failed") {
                                    return <MessageStatus status={msg._status} />;
                                }
                                const seenAt = getSeenAt(msg, lastViewedBy);
                                return <MessageStatus status={seenAt ? "seen" : msg?._status} seenAt={seenAt} />;
                            })()}
                            </>
                        }
                    />

                    {replyingId === msg?.id && (
                        <Box ml="20px">
                            <ReplyEditor
                                value={replyText}
                                onChange={setReplyText}
                                onCancel={() => { setReplyingId(null); setReplyNewFiles([]); }}
                                onSubmit={() => handleReplySubmit(parentId)}
                                loading={replySubmitting}
                                files={replyNewFiles}
                                onAddFiles={setReplyNewFiles}
                                onRemoveFile={(idx) => setReplyNewFiles((prev) => prev.filter((_, i) => i !== idx))}
                            />
                        </Box>
                    )}
                </Box>
                );
            })}
        </>
    );
};

const Conversations = ({ id, conversations, setReplyTo, ticketLoading, ticketData, updatedSingleTicket }) => {
    // The ticket's original requester, so replies from anyone else (staff)
    // can be given a subtly different background — right now every entry in
    // the thread looks identical, making it hard to scan who's who.
    const requesterId = updatedSingleTicket?.user_id ?? ticketData?.user_id;
    const lastViewedBy = updatedSingleTicket?.meta?.last_viewed_by;
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");
    const [editNewFiles, setEditNewFiles] = useState([]);
    const [editRemovedMediaIds, setEditRemovedMediaIds] = useState([]);
    const { conversationPagination } = useSelector((state) => state.tickets);
    const members = useSelector((state) => state.members?.all) || [];
    const [replyingId, setReplyingId] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [replyNewFiles, setReplyNewFiles] = useState([]);
    const [replyLoading, setReplyLoading] = useState(false);
    const [replySubmitting, setReplySubmitting] = useState(false);
    const [replyIndex, setReplyIndex] = useState(null);
    const [expandedReplies, setExpandedReplies] = useState({});
    const dispatch = useDispatch();
    const bottomRef = useRef(null);
    const conversationRef = useRef(null);
    const prevIdRef = useRef(null);
    const prevFirstIdRef = useRef(null);
    // Gates useScrollFetchData's pagination fetch below until the initial
    // scroll-to-bottom has actually settled. At mount the page starts at
    // scrollTop 0, showing the oldest message of the loaded page - if the
    // IntersectionObserver attaches and samples visibility before the smooth
    // scroll finishes landing at the bottom, that oldest message still looks
    // "visible", firing a spurious older-page fetch the user never asked
    // for. That prepend then (correctly, for a real scroll-up) skips the
    // bottom re-scroll below, so initial load was stalling partway down
    // instead of reaching the last message.
    const [initialScrollSettled, setInitialScrollSettled] = useState(false);
    // Tracks whether the reader was actually near the bottom right before
    // this render's data change landed - updated continuously by the scroll
    // listener below, independent of any fetch. The id-based prepend check
    // only catches scroll-up pagination (which changes the FIRST id); it
    // missed the scheduled/socket page-1 refresh, which merges fresh data
    // into the TAIL and leaves the first id untouched, so it still looked
    // like "grew at the end" and yanked a reader who'd scrolled up to page 4
    // back down to the bottom. Gating on actual scroll position covers every
    // trigger at once instead of enumerating each one.
    const wasNearBottomRef = useRef(true);
    const { responsiveContentTicket } = useStyles();

    useEffect(() => {
        const threshold = 150;
        const updateNearBottom = () => {
            wasNearBottomRef.current =
                window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - threshold;
        };
        updateNearBottom();
        window.addEventListener('scroll', updateNearBottom, { passive: true });
        return () => window.removeEventListener('scroll', updateNearBottom);
    }, []);

    useEffect(() => {
        if (replyIndex) return;
        if (!bottomRef.current) return;

        // Scrolling up to load an older page PREPENDS to this same list, which
        // also changes its length - without this check that looked identical
        // to a new message arriving, so every "load more" yanked the view back
        // down to the bottom instead of leaving the reader where they were.
        // Browser scroll anchoring already keeps their position stable for a
        // prepend; only force-scroll when the thread actually grew at the end.
        const list = conversations?.[id];
        const currentFirstId = list?.[0]?.id ?? null;
        const sameTicket = prevIdRef.current === id;
        const isPrepend = sameTicket && prevFirstIdRef.current != null
            && currentFirstId != null && prevFirstIdRef.current !== currentFirstId;
        prevIdRef.current = id;
        prevFirstIdRef.current = currentFirstId;
        if (!sameTicket) setInitialScrollSettled(false);
        if (isPrepend) return;
        // A fresh ticket always opens at the bottom regardless of where the
        // reader happened to be scrolled on whatever they viewed before.
        if (sameTicket && !wasNearBottomRef.current) return;

        // Attachments (especially images) inside the thread finish loading
        // asynchronously, after this effect's own initial scroll already
        // landed - each one that loads pushes the thread taller, so the view
        // "settles" partway up the page instead of staying pinned to the
        // last message. A couple of follow-up scrolls shortly after catch
        // that late layout shift without fighting the smooth-scroll
        // animation of the first one.
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
        const settle1 = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 200);
        const settle2 = setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "auto" });
            setInitialScrollSettled(true);
        }, 600);
        return () => {
            clearTimeout(settle1);
            clearTimeout(settle2);
        };
    }, [
        id,
        ticketLoading,
        conversations?.[id]?.length,
        JSON.stringify(expandedReplies),
        replyIndex
    ]);

    const handleUpdate = async (conversationId, updatedText, addMediaIds = [], removeMediaIds = []) => {
        const payload = { content: updatedText };
        if (addMediaIds?.length) payload.add_media_ids = addMediaIds;
        if (removeMediaIds?.length) payload.remove_media_ids = removeMediaIds;

        const result = await dispatch(
            updateTicketConversations({
                ticket_id: id,
                conversation_id: conversationId,
                payload,
            })
        ).unwrap();

        return result?.data;
    };

    // Uploads newly-attached files picked during an edit and returns their
    // media IDs, ready to pass to handleUpdate's addMediaIds argument.
    const uploadEditAttachments = async (files) => {
        if (!files?.length) return [];
        const uploaded = await Promise.all(
            files.map((file) => mediaFileUploader('ticket_discussion_attachments', file))
        );
        return uploaded.map((res) => res?.id).filter(Boolean);
    };

    const handleDelete = async (conversationId) => {
        // delete conversation
        dispatch(deleteTicketConversation({
            ticket_id: id,
            conversation_id: conversationId,
        }))
    };

    const handleReplySubmit = async (parentConversationId) => {
        if (!replyText.trim() && replyNewFiles.length === 0) return;
        setReplySubmitting(true);

        // Expand instantly so the optimistic "sending" placeholder (added via the
        // createTicketConversationReply.pending reducer) is visible right away.
        if (!expandedReplies[parentConversationId]) {
            setExpandedReplies((prev) => ({ ...prev, [parentConversationId]: true }));
        }

        try {
            const mediaIds = await uploadEditAttachments(replyNewFiles);

            await dispatch(createTicketConversationReply({
                ticket_id: id,
                conversation_id: parentConversationId,
                content: replyText,
                media_ids: mediaIds,
            })).unwrap();

            setReplyText("");
            setReplyNewFiles([]);
            setReplyingId(null);

            dispatch(getAllTicketConversationReplies({ ticket_id: id, conversation_id: parentConversationId }));
        } catch (err) {
            console.error("Reply submit failed:", err);
        } finally {
            setReplySubmitting(false);
        }
    };

    const handleToggleReplies = (conversationId) => {
        const isExpanded = expandedReplies[conversationId];

        if (isExpanded) {
            setExpandedReplies((prev) => ({ ...prev, [conversationId]: false }));
        } else {
            setReplyLoading(true);
            dispatch(getAllTicketConversationReplies({ ticket_id: id, conversation_id: conversationId }))
                .finally(() => {
                    setExpandedReplies((prev) => ({ ...prev, [conversationId]: true }));
                    setReplyLoading(false);
                });
        }
    };

    const fetchNext = useCallback(async (page) => {
        const previousScrollY = window.scrollY;
        const previousHeight = document.documentElement.scrollHeight;

        await dispatch(getTicketpaginatedConversations({ ticket_id: id, page }));

        requestAnimationFrame(() => {
            const delta = document.documentElement.scrollHeight - previousHeight;
            if (delta > 0) {
                window.scrollTo({ top: previousScrollY + delta, behavior: "instant" });
            }
        });
    }, [dispatch, id]);

    // Memoized so this object's identity only changes when pagination state
    // actually changes, not on every render - an inline literal here would
    // still destabilize attachObserver's identity even with the dataLength
    // fix in useScrollFetchData, since attachObserver depends on this value.
    const scrollMeta = useMemo(() => ({
        page: conversationPagination.page ?? 1,
        per_page: conversationPagination.per_page ?? 15,
        total: conversationPagination.total ?? 0,
        pages: conversationPagination.pages ?? 1,
    }), [
        conversationPagination.page,
        conversationPagination.per_page,
        conversationPagination.total,
        conversationPagination.pages,
    ]);

    // Always call the hook, never inside an if
    useScrollFetchData(
        conversations[id] || [],
        scrollMeta,
        fetchNext,
        ticketLoading || !initialScrollSettled,
        conversationRef
    );

    if (ticketLoading) {
        return <TicketReplies />
    }

    const helperProps = {
        site_url,
        plugin_root_url,
        current_logged_user,
        requesterId,
        editingId,
        setEditingId,
        editText,
        setEditText,
        editNewFiles,
        setEditNewFiles,
        editRemovedMediaIds,
        setEditRemovedMediaIds,
        uploadEditAttachments,
        replyingId,
        setReplyingId,
        replyText,
        setReplyText,
        replyNewFiles,
        setReplyNewFiles,
        handleReplySubmit,
        handleUpdate,
        replySubmitting,
        lastViewedBy,
    };

    // Synthesized purely from the ticket's own meta (set in TicketModel::
    // update() when it transitions to/from 'closed') rather than a persisted
    // conversation row - closing/reopening a ticket doesn't create any
    // activity record server-side, and always deriving this from current
    // ticket state (instead of inserting a real row each time) means
    // repeated close/reopen cycles don't pile up duplicate system messages -
    // only the single most recent transition is ever shown.
    const isClosed = updatedSingleTicket?.status === "closed";
    const closedAt = updatedSingleTicket?.meta?.closed_at || updatedSingleTicket?.updated_at;
    const closedByUser = members.find(
        (m) => Number(m.id) === Number(updatedSingleTicket?.meta?.closed_by)
    );
    const closedByName = closedByUser
        ? `${closedByUser.first_name || ''} ${closedByUser.last_name || ''}`.trim() || closedByUser.username
        : null;

    // Only shown while NOT currently closed - if it's closed again later,
    // meta.closed_at/closed_by get re-stamped and isClosed takes over instead.
    const isReopened = !isClosed && !!updatedSingleTicket?.meta?.reopened_at;
    const reopenedAt = updatedSingleTicket?.meta?.reopened_at;
    const reopenedByUser = members.find(
        (m) => Number(m.id) === Number(updatedSingleTicket?.meta?.reopened_by)
    );
    const reopenedByName = reopenedByUser
        ? `${reopenedByUser.first_name || ''} ${reopenedByUser.last_name || ''}`.trim() || reopenedByUser.username
        : null;

    // Interleaved by timestamp instead of always trailing the list, so a
    // close/reopen that happened before later replies shows in its correct
    // chronological spot rather than jumping to the bottom of the thread.
    const bannerAt = isClosed ? closedAt : (isReopened ? reopenedAt : null);
    const bannerInsertIndex = bannerAt
        ? (conversations[id] ?? []).findIndex(
            (c) => moment.utc(c?.created_at).valueOf() > moment.utc(bannerAt).valueOf()
        )
        : -1;

    const bannerNode = isClosed && closedAt ? (
        <Flex mb="16px" alignItems="flex-start" direction="column" gap="8px">
            <ZenComAvatar
                variant="ticket"
                size="sm"
                userID={closedByUser?.id}
                src={closedByUser?.avatar_url ? site_url + closedByUser.avatar_url : ""}
                userName={closedByName || __("System", "zencommunity")}
                postedTime={moment.utc(closedAt).local().fromNow()}
                repliedContent={
                    <Box
                        borderRadius="4px 12px 12px 12px"
                        bg="yellow.subtle"
                        borderLeft="2px solid #533F04"
                        color="#533F04"
                        mt={2}
                        p="14px 16px"
                        wordBreak="break-word"
                    >
                        {__("Ticket has been closed", "zencommunity")}
                    </Box>
                }
            />
        </Flex>
    ) : isReopened && reopenedAt ? (
        <Flex mb="16px" alignItems="flex-start" direction="column" gap="8px">
            <ZenComAvatar
                variant="ticket"
                size="sm"
                userID={reopenedByUser?.id}
                src={reopenedByUser?.avatar_url ? site_url + reopenedByUser.avatar_url : ""}
                userName={reopenedByName || __("System", "zencommunity")}
                postedTime={moment.utc(reopenedAt).local().fromNow()}
                repliedContent={
                    <Box
                        borderRadius="4px 12px 12px 12px"
                        bg="blue.subtle"
                        borderLeft="2px solid var(--zencom-primary-color)"
                        color="var(--zencom-font-color)"
                        mt={2}
                        p="14px 16px"
                        wordBreak="break-word"
                    >
                        {__("Ticket has been reopened", "zencommunity")}
                    </Box>
                }
            />
        </Flex>
    ) : null;

    return (
        <>
            <Box
                ref={conversationRef}
                className="zencom-ticket-details__conversations-inner"
                flex="1"
                {...responsiveContentTicket}
            >
                {ticketLoading ? (
                    <Flex align="flex-start" gap="3">
                        <SkeletonCircle size="10" />
                        <Box>
                            <Skeleton height="12px" width="100px" mb="2" />
                            <Skeleton height="20px" width="300px" borderRadius="md" />
                        </Box>
                    </Flex>
                ) : (
                    <ZenComAvatar
                        userID={ticketData?.user_id}
                        variant="ticket"
                        size="sm"
                        src={
                            ticketData?.user_avatar_url
                                ? site_url + ticketData?.user_avatar_url
                                : ""
                        }
                        userName={ticketData?.user_first_name + " " + ticketData?.user_last_name}
                        postedTime={__(moment.utc(ticketData?.created_at).local().fromNow(), "zencommunity")}
                        postedContent={ticketData?.content}
                    />
                )}

                <HStack m="12px 0">
                    <Separator flex="1" borderColor="var(--zencom-border-color)" />
                    <ZCLabel
                        label={__("Replies", "zencommunity")}
                        color="#738496"
                        type="subTitle"
                        fontSize="11px"
                        fontWeight="600"
                        textTransform="uppercase"
                    />
                    <Separator flex="1" borderColor="var(--zencom-border-color)" />
                </HStack>

                {conversations[id]?.map((conversation, conversationIndex) => {
                    const isFirst = conversationIndex === 0;
                    const isLast = conversationIndex === conversations[id].length - 1;
                    // Unknown requester (still loading) reads as "not staff" —
                    // plain background rather than guessing.
                    const isStaffReply = requesterId != null && Number(conversation?.user_id) !== Number(requesterId);
                    return (
                        <React.Fragment key={conversationIndex}>
                        {conversationIndex === bannerInsertIndex && bannerNode}
                        <Flex
                            mb="16px"
                            alignItems="flex-start"
                            direction="column"
                            gap="8px"
                            data-first-item={isFirst}
                        >
                            <ZenComAvatar
                                userID={conversation?.user_id}
                                variant="ticket"
                                size="sm"
                                src={
                                    conversation?.user_avatar_url
                                        ? site_url + conversation?.user_avatar_url
                                        : ""
                                }
                                userName={[conversation?.user_first_name, conversation?.user_last_name].filter(Boolean).join(" ")}
                                postedTime={`${moment.utc(conversation?.created_at).local().fromNow()}${wasEdited(conversation) ? ` · ${__('edited', 'zencommunity')}` : ''}`}
                                repliedContent={
                                    <ZenComTooltip
                                        content={
                                            conversation?._status === "sending" ? null : (
                                                <ActionIcons
                                                    item={conversation}
                                                    currentUser={current_logged_user}
                                                    onEdit={() => {
                                                        setEditingId(conversation?.id);
                                                        setEditText(conversation?.content);
                                                        setEditNewFiles([]);
                                                        setEditRemovedMediaIds([]);
                                                    }}
                                                    onDelete={() => handleDelete(conversation?.id)}
                                                    onPin={() => dispatch(
                                                        togglePinConversation({
                                                            conversation_id: conversation?.id,
                                                            isPinned: conversation?.is_pinned,
                                                            ticket_id: id,
                                                        }))}
                                                    onReply={() => {
                                                        setReplyingId(conversation?.id);
                                                        setReplyText("");
                                                        setReplyNewFiles([]);
                                                    }}
                                                />
                                            )
                                        }
                                        position="custom-1"
                                        variant="white"
                                        suffix="ticket-replies"
                                    >
                                        <Box flex={1}>
                                            <Box
                                                position="relative"
                                                borderRadius="4px 12px 12px 12px"
                                                border="1px solid var(--zencom-border-color)"
                                                bg={conversation?.is_note ? "yellow.subtle" : (isStaffReply ? "var(--zencom-secondary-color)" : "var(--zencom-background)")}
                                                borderLeft={conversation?.is_note ? "2px solid #533F04" : "1px solid var(--zencom-border-color)"}
                                                color={conversation?.is_note ? "#533F04" : "var(--zencom-font-color)"}
                                                whiteSpace="pre-line"
                                                mt={2}
                                                p="14px 16px"
                                                wordBreak="break-word"
                                                opacity={conversation?._status === "sending" ? 0.7 : 1}
                                            >
                                                {editingId === conversation?.id ? (
                                                    <>
                                                        <PostTextWithMention
                                                            value={editText}
                                                            onChangeHandler={(value) => {
                                                                setEditText(value);
                                                            }}
                                                            minHeight="50px"
                                                            padding="8px 0px"
                                                            showToolbar={true}
                                                            imageType='ticket_discussion_attachments'
                                                        />
                                                        <EditAttachments
                                                            existingAttachments={conversation?.meta?.attachments?.ticket_discussion_attachments || []}
                                                            removedMediaIds={editRemovedMediaIds}
                                                            onRemoveExisting={(mediaId) => setEditRemovedMediaIds(prev => [...prev, mediaId])}
                                                            newFiles={editNewFiles}
                                                            onAddFiles={(files) => setEditNewFiles(files)}
                                                            onRemoveNewFile={(idx) => setEditNewFiles(prev => prev.filter((_, i) => i !== idx))}
                                                        />
                                                        <Flex gap={2} justifyContent="flex-end" mt={2}>
                                                            <Button
                                                                size="xs"
                                                                bg="transparent"
                                                                color="var(--zencom-font-color)"
                                                                height="auto"
                                                                padding="8px 16px"
                                                                onClick={() => {
                                                                    setEditingId(null);
                                                                    setEditNewFiles([]);
                                                                    setEditRemovedMediaIds([]);
                                                                }}
                                                            >
                                                                {__('Cancel', 'zencommunity')}
                                                            </Button>
                                                            <LoadingButton
                                                                size="xs"
                                                                bg="var(--zencom-primary-color)"
                                                                color="#fff"
                                                                height="auto"
                                                                padding="8px 16px"
                                                                onClick={async () => {
                                                                    const uploadedIds = await uploadEditAttachments(editNewFiles);
                                                                    await handleUpdate(conversation?.id, editText, uploadedIds, editRemovedMediaIds);
                                                                    setEditingId(null);
                                                                    setEditNewFiles([]);
                                                                    setEditRemovedMediaIds([]);
                                                                }}
                                                            >
                                                                {__('Save', 'zencommunity')}
                                                            </LoadingButton>
                                                        </Flex>
                                                    </>
                                                ) : (
                                                    <>
                                                        {!isAttachmentNamesOnly(conversation?.content, conversation?.meta?.attachments?.ticket_discussion_attachments) && (
                                                            <Box
                                                                as="p"
                                                                fontSize="14px"
                                                                fontWeight="400"
                                                                color={conversation?.is_note ? "#533F04" : "var(--zencom-font-color)"}
                                                                dangerouslySetInnerHTML={{
                                                                    __html: formatMessageHtml(conversation?.content)
                                                                }}
                                                            />
                                                        )}
                                                        <MessageSources sources={conversation?.meta?.sources} />
                                                        {conversation?.meta?.attachments?.ticket_discussion_attachments?.length > 0 && (
                                                            <Flex gap={2} mt={isAttachmentNamesOnly(conversation?.content, conversation?.meta?.attachments?.ticket_discussion_attachments) || !conversation?.content ? 0 : 3} flexWrap="wrap" alignItems="flex-start">
                                                                {sortAttachments(conversation?.meta?.attachments?.ticket_discussion_attachments).map((item, imgIndex) => {
                                                                    if (item?.meta?.type === 'img') {
                                                                        return <ImageFullScreenPreview key={imgIndex} attachment={item} idx={imgIndex} />;
                                                                    }
                                                                    if (item?.meta?.type === 'video') {
                                                                        // A real <video> (not an <iframe src={mp4}>) so it never
                                                                        // autoplays; it stays paused until clicked.
                                                                        return (
                                                                            <video
                                                                                key={imgIndex}
                                                                                src={item?.path}
                                                                                controls
                                                                                preload="metadata"
                                                                                width="100%"
                                                                                style={{ maxWidth: '100%', height: '250px', borderRadius: '6px', background: '#000' }}
                                                                            />
                                                                        );
                                                                    }
                                                                    return <FileAttachmentCard key={imgIndex} attachment={item} />;
                                                                })}
                                                            </Flex>
                                                        )}
                                                    </>
                                                )}
                                            </Box>
                                            {editingId !== conversation?.id && (() => {
                                                if (!isLast) {
                                                    return <MessageStatus status={conversation?._status === "failed" ? "failed" : null} />;
                                                }
                                                if (conversation?._status === "sending" || conversation?._status === "failed") {
                                                    return <MessageStatus status={conversation._status} />;
                                                }
                                                const seenAt = getSeenAt(conversation, lastViewedBy);
                                                return <MessageStatus status={seenAt ? "seen" : conversation?._status} seenAt={seenAt} />;
                                            })()}
                                        </Box>
                                    </ZenComTooltip>
                                }
                            />

                            {replyingId === conversation?.id && (
                                <Box ml="56px" width="calc(100% - 56px)">
                                    <ReplyEditor
                                        value={replyText}
                                        onChange={setReplyText}
                                        onCancel={() => { setReplyingId(null); setReplyNewFiles([]); }}
                                        onSubmit={() => handleReplySubmit(conversation?.id)}
                                        loading={replySubmitting}
                                        files={replyNewFiles}
                                        onAddFiles={setReplyNewFiles}
                                        onRemoveFile={(idx) => setReplyNewFiles((prev) => prev.filter((_, i) => i !== idx))}
                                    />
                                </Box>
                            )}

                            {expandedReplies[conversation?.id] && conversation?.all_replies && (
                                <Replies conversation={conversation?.all_replies} parentId={conversation?.id} {...helperProps} />
                            )}

                            {conversation?.latest_reply && !Array.isArray(conversation?.latest_reply) && !conversation?.all_replies && (
                                <Replies conversation={[conversation?.latest_reply]} parentId={conversation?.id} {...helperProps} />
                            )}

                            {Number(conversation?.conversation_count) > 1 && (
                                <Text
                                    fontSize="14px"
                                    fontWeight="400"
                                    color="blue.500"
                                    textAlign="right"
                                    pt={3}
                                    cursor="pointer"
                                    onClick={() => {
                                        handleToggleReplies(conversation?.id);
                                        setReplyIndex(conversationIndex);
                                    }}
                                >
                                    {(replyLoading && replyIndex === conversationIndex)
                                        ? __('Loading replies...', 'zencommunity')
                                        : expandedReplies[conversation?.id]
                                            ? __('Hide replies', 'zencommunity')
                                            : __('View all replies', 'zencommunity')}
                                </Text>
                            )}
                        </Flex>
                        </React.Fragment>
                    );
                })}

                {conversations[id]?.length === 0 && !bannerNode && (
                    <Flex direction="column" alignItems="center" gap="8px" py="32px" color="var(--zencom-font-muted)">
                        <Icon as={LuMessageCircleMore} boxSize="24px" />
                        <Text fontSize="14px" fontWeight="400">
                            {__("No replies yet", "zencommunity")}
                        </Text>
                    </Flex>
                )}

                {bannerInsertIndex === -1 && bannerNode}

                <Box ref={bottomRef} h="1px" />
            </Box>
        </>
    );
};

export default Conversations;
