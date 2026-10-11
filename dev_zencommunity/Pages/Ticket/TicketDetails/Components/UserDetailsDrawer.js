import React, { useEffect, useState } from "react";
import moment from 'moment';
import { __, sprintf } from '@wordpress/i18n';
import { Box, Flex, Textarea, Menu, Portal, Button, Input, Icon, Link, Text, Skeleton, SkeletonCircle, Stack } from "@chakra-ui/react";
import { baseURL, current_logged_user, current_user_can, global_roles, plugin_root_url, site_url } from "@Utils/helper";
import ZCLabel from "@Components/Chakra/Labels/ZCLabel";
import LoadingButton from "@Components/LoadingButton";
import {
    createUserPrivateNote,
    deleteUserPrivateNote,
    fetchMemberTickets,
    getUserAllPrivateNotes,
    updateUserPrivateNote
} from "@Redux/slices/ticketSlice/ticketSlice";
import { useDispatch, useSelector } from 'react-redux';
import { BsThreeDots } from "react-icons/bs";
import { RiDeleteBinLine } from "react-icons/ri";
import { MdOutlineEdit } from "react-icons/md";
import ZenComAvatar from "@Components/Chakra/ZenComAvatar";
import { getStatusStyle, getStatusIcon } from "../../helper";
import ZCCustomDrawer from "@Components/Drawer/Custom/ZCCustomDrawer";
import { RxExternalLink } from "react-icons/rx";
import { Link as RactLink } from "react-router-dom";
import { AccordionHeader, SidebarSection } from "./SidebarSection";

const UserDetailsDrawer = ({
    ticketData,
    activePanel,
    onOpenChange,
    type
}) => {
    const userNotes = useSelector(state => state.tickets.userNotes);
    const memberTickets = useSelector(state => state.tickets.memberTickets);
    const memberTicketsLoading = useSelector(state => state.tickets.memberTicketsLoading);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteContent, setNoteContent] = useState("");
    const dispatch = useDispatch();
    const [isNote, setIsNote] = useState(true);
    const [ticketHistory, setTicketHistory] = useState(true);

    // Private notes are staff-only context about the user - a regular member
    // viewing their own ticket must never see this section or trigger its API calls.
    const canSeePrivateNotes = Boolean(
        current_logged_user?.is_site_admin || current_user_can?.manage_options || global_roles?.support_agent
    );

    useEffect(() => {
        if (ticketData?.user_id) {
            try {
                dispatch(
                    fetchMemberTickets({
                        member_id: ticketData.user_id,
                        page: 1,
                        per_page: 10,
                    })
                )
            } catch (error) {
                console.error("❌ Failed to fetch member tickets:", error);
            }
        }
    }, [ticketData?.user_id, dispatch]);


    useEffect(() => {
        if (ticketData?.id && canSeePrivateNotes) {
            dispatch(getUserAllPrivateNotes({ ticket_id: ticketData.id }));
        }
    }, [ticketData, dispatch, canSeePrivateNotes]);

    const handleAddNote = async () => {
        const content = noteContent.trim();
        if (!content || !ticketData?.id) return;

        try {
            await dispatch(createUserPrivateNote({
                ticket_id: ticketData.id,
                payload: { content },
            })).unwrap();
            setNoteContent("");
        } catch (e) {
            // handleSliceError already surfaced a notification for this —
            // keep the draft in the box so the note isn't lost.
        }
    };

    const handleNoteKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAddNote();
        }
    };

    const otherMemberTickets = (memberTickets || []).filter(ticket => Number(ticket.id) !== Number(ticketData?.id));

    const detailsContent = (
        <>
            <Flex p="16px" gap="12px" alignItems="center" bg="var(--zencom-background)" color={'var(--zencom-font-color)'} borderBottom="1px solid var(--zencom-border-color)">
                <ZenComAvatar
                    userID={ticketData?.user_id}
                    variant='simple'
                    userName={[ticketData?.user_first_name, ticketData?.user_last_name].filter(Boolean).join(" ")}
                    src={
                        ticketData?.user_avatar_url
                            ? site_url + ticketData?.user_avatar_url
                            : plugin_root_url + "/assets/images/avatar_placeholder.png"
                    }
                />
                <Box flex="1" minWidth={0}>
                    <Text fontSize="14px" fontWeight="600" color="var(--zencom-font-color)" noOfLines={1}>
                        {[ticketData?.user_first_name, ticketData?.user_last_name].filter(Boolean).join(" ")}
                    </Text>
                    <Text fontSize="12px" color="var(--zencom-font-color)" opacity={0.6} noOfLines={1}>
                        {ticketData?.email}
                    </Text>
                </Box>
            </Flex>

            {canSeePrivateNotes && (
            <SidebarSection first>
                <AccordionHeader isOpen={isNote} onClick={() => setIsNote(!isNote)}>
                    {__("Private Note", "zencommunity")}
                </AccordionHeader>

                {isNote && (
                    <Box pb="14px">
                        <Box p="4px 16px 0 16px">
                            <Textarea
                                borderWidth="1px"
                                borderColor="var(--zencom-border-color)"
                                borderRadius="4px"
                                fontSize="13px"
                                bg="yellow.subtle"
                                placeholder={__('Add user note...', 'zencommunity')}
                                color="yellow.fg"
                                h="100px"
                                value={noteContent}
                                onChange={(e) => setNoteContent(e.target.value)}
                                onKeyDown={handleNoteKeyDown}
                            />
                            <Flex justifyContent="flex-end" mt={2}>
                                <LoadingButton
                                    size="xs"
                                    bg="var(--zencom-primary-color)"
                                    color="#fff"
                                    height="auto"
                                    padding="8px 16px"
                                    disabled={!noteContent.trim()}
                                    onClick={handleAddNote}
                                >
                                    {__('Add note', 'zencommunity')}
                                </LoadingButton>
                            </Flex>
                        </Box>

                        {userNotes?.length > 0 && (
                            <Box p="10px 16px 0 16px">
                                {userNotes.map((note) => (
                                    <Flex
                                        key={note.id}
                                        borderWidth="1px"
                                        borderColor="var(--zencom-border-color)"
                                        borderRadius="10px"
                                        mb="8px"
                                        p="8px 10px"
                                        bg="yellow.subtle"
                                        justifyContent="space-between"
                                        alignItems="center"
                                    >
                                        <Box flex="1">
                                            {editingNoteId === note.id ? (
                                                <Input
                                                    autoFocus
                                                    defaultValue={note.content}
                                                    color="yellow.fg"
                                                    bg="var(--zencom-background)"
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            dispatch(
                                                                updateUserPrivateNote({
                                                                    note_id: note.id,
                                                                    payload: { content: e.target.value },
                                                                })
                                                            );
                                                            setEditingNoteId(null);
                                                        } else if (e.key === "Escape") {
                                                            setEditingNoteId(null);
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <>
                                                    <ZCLabel
                                                        // translators: %s: note.content
                                                        label={note.content}
                                                        fontWeight="500"
                                                        color="yellow.fg"
                                                    />
                                                    <ZCLabel
                                                        // translators: %s: note.updated_at
                                                        label={moment.utc(note.updated_at).local().fromNow()}
                                                        type="subTitle"
                                                        fontWeight="400"
                                                        color="yellow.fg"
                                                    />
                                                </>
                                            )}
                                        </Box>

                                        {editingNoteId !== note.id && (
                                            <Menu.Root>
                                                <Menu.Trigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <BsThreeDots />
                                                    </Button>
                                                </Menu.Trigger>
                                                <Portal>
                                                    <Menu.Positioner style={{ zIndex: 9999 }}>
                                                        <Menu.Content bg="var(--zencom-background)" color={'var(--zencom-font-color)'}>
                                                            <Menu.Item
                                                                value="update"
                                                                onClick={() => setEditingNoteId(note.id)}
                                                            >
                                                                <MdOutlineEdit /> {__("Update", "zencommunity")}
                                                            </Menu.Item>
                                                            <Menu.Item
                                                                value="delete"
                                                                color="fg.error"
                                                                _hover={{ bg: "bg.error", color: "fg.error" }}
                                                                onClick={() =>
                                                                    dispatch(deleteUserPrivateNote({ note_id: note.id }))
                                                                }
                                                            >
                                                                <RiDeleteBinLine /> {__("Delete", "zencommunity")}
                                                            </Menu.Item>
                                                        </Menu.Content>
                                                    </Menu.Positioner>
                                                </Portal>
                                            </Menu.Root>
                                        )}
                                    </Flex>
                                ))}
                            </Box>
                        )}
                    </Box>
                )}
            </SidebarSection>
            )}

            <SidebarSection first={!canSeePrivateNotes}>
                <AccordionHeader isOpen={ticketHistory} onClick={() => setTicketHistory(!ticketHistory)}>
                    {__("Ticket History", "zencommunity")}
                </AccordionHeader>

                {ticketHistory && (
                    <Box
                        p="4px 8px 14px 8px"
                        maxHeight={canSeePrivateNotes && isNote ? "calc(100vh - 400px)" : "calc(100vh - 250px)"}
                        overflowY='auto'
                        color={'var(--zencom-font-color)'}
                        css={{
                            '&::-webkit-scrollbar': {
                                width: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                                width: '6px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: "#CBD1D7",
                                borderRadius: '9999px',
                            },
                        }}
                    >
                        {memberTicketsLoading ? (
                            <Stack gap="24px" padding="8px">
                                {[1, 2, 3].map((i) => (
                                    <Flex key={i} gap="10px" alignItems="flex-start">
                                        <SkeletonCircle size="8" />
                                        <Stack gap="6px" flex="1">
                                            <Skeleton height="16px" width="60%" />
                                            <Skeleton height="12px" width="35%" />
                                            <Skeleton height="18px" width="45px" />
                                        </Stack>
                                    </Flex>
                                ))}
                            </Stack>
                        ) : otherMemberTickets.length === 0 ? (
                            <Text fontSize="14px" color="var(--zencom-font-color)" opacity={0.6} textAlign="center" padding="12px 8px">
                                {__("No other tickets from this user.", "zencommunity")}
                            </Text>
                        ) : (
                            otherMemberTickets.map(ticket => (
                                <Flex
                                    key={ticket.id}
                                    flexDirection="column"
                                    gap="4px"
                                    padding="10px 8px"
                                    borderRadius="8px"
                                    _hover={{ bg: "var(--zencom-secondary-color)" }}
                                >
                                    <Flex alignItems="center" gap="6px">
                                        <Text fontWeight="500" fontSize="14px" color="var(--zencom-font-color)" noOfLines={1} minWidth={0}>
                                            {ticket.title}
                                        </Text>
                                        <Link as={RactLink} outline="none" target="_blank" to={baseURL(`/ticket/${ticket.id}`)} cursor="pointer" flexShrink={0} color="var(--zencom-font-color)" opacity={0.6} _hover={{ opacity: 1, color: "var(--zencom-primary-color)" }}>
                                            <Icon as={RxExternalLink} />
                                        </Link>
                                    </Flex>

                                    <Text fontWeight="400" fontSize="12px" color="var(--zencom-font-color)" opacity={0.6}>
                                        {sprintf(
                                            __('%s', 'zencommunity'),
                                            moment.utc(ticket.created_at).local().fromNow()
                                        )}
                                    </Text>

                                    <Flex gap={1} alignItems="center">
                                        <Text fontWeight="400" fontSize="12px" color="var(--zencom-font-color)" opacity={0.6}>
                                            {__('Status:', 'zencommunity')}
                                        </Text>
                                        <Flex
                                            as="span"
                                            display="inline-flex"
                                            alignItems="center"
                                            gap="5px"
                                            bg={getStatusStyle(ticket?.status).bg}
                                            color={getStatusStyle(ticket?.status).color}
                                            border="1.5px solid"
                                            borderColor={getStatusStyle(ticket?.status).border}
                                            fontWeight="700"
                                            fontSize="11px"
                                            p="2px 8px"
                                            borderRadius="full"
                                            textTransform="capitalize"
                                        >
                                            <Icon as={getStatusIcon(ticket?.status)} boxSize="11px" />
                                            {ticket?.status}
                                        </Flex>
                                    </Flex>
                                </Flex>
                            ))
                        )}
                    </Box>
                )}
            </SidebarSection>
        </>
    )

    return (
        <>
            {type === "column" ? (
                <ZCCustomDrawer open={activePanel} onOpenChange={onOpenChange} backdrop={false} header={false} suffix="ticket-details">
                    {detailsContent}
                </ZCCustomDrawer>
            ) : (
                detailsContent
            )}
        </>
    );
};

export default UserDetailsDrawer;
