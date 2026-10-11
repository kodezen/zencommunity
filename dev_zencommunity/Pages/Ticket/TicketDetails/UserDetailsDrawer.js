import { useEffect } from "react";
import { __, sprintf } from '@wordpress/i18n';
import { Box, Flex, Textarea, Menu, Portal, Button, Input, Icon, Link, Text } from "@chakra-ui/react";
import { baseURL, current_logged_user, plugin_root_url, site_url } from "@Utils/helper";
import { useState } from "react";
import ZCLabel from "@Components/Chakra/Labels/ZCLabel";
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
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import ZenComAvatar from "@Components/Chakra/ZenComAvatar";
import { getStatusStyle, getStatusIcon } from "../helper";
import ZCCustomDrawer from "@Components/Drawer/Custom/ZCCustomDrawer";
import { RxExternalLink } from "react-icons/rx";
import { Link as RactLink } from "react-router-dom";

const UserDetailsDrawer = ({
    ticketData,
    activePanel,
    onOpenChange,
}) => {
    const userNotes = useSelector(state => state.tickets.userNotes);
    const memberTickets = useSelector(state => state.tickets.memberTickets);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const dispatch = useDispatch();
    const [isNote, setIsNote] = useState(true);
    const [ticketHistory, setTicketHistory] = useState(true);

    useEffect(() => {
        if (current_logged_user) {
            try {
                dispatch(
                    fetchMemberTickets({
                        member_id: current_logged_user?.user_id,
                        page: 1,
                        per_page: 10,
                    })
                )
            } catch (error) {
                console.error("❌ Failed to fetch member tickets:", error);
            }
        }
    }, [current_logged_user, dispatch]);


    useEffect(() => {
        if (ticketData?.id) {
            dispatch(getUserAllPrivateNotes({ ticket_id: ticketData.id }));
        }
    }, [ticketData, dispatch]);

    const handleKeyDown = async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const noteContent = e.target.value.trim();
            if (!noteContent) return;

            dispatch(createUserPrivateNote({
                ticket_id: ticketData.id,
                payload: { content: noteContent },
            }));

            e.target.value = "";
        }
    };

    return (
        <ZCCustomDrawer open={activePanel} onOpenChange={onOpenChange} backdrop={false} header={false} suffix="ticket-details">
            <Flex p="12px 16px" bg="var(--zencom-background)" color={'var( --zencom-font-color)'}>
                <ZenComAvatar
                    userID={ticketData?.user_id}
                    variant='default'
                    userName={ticketData?.user_first_name + " " + ticketData?.user_last_name}
                    src={
                        ticketData?.user_avatar_url
                            ? site_url + ticketData?.user_avatar_url
                            : plugin_root_url + "/assets/images/avatar_placeholder.png"
                    }
                    userMail={ticketData?.email}
                />
            </Flex>

            <Flex
                p="12px 16px"
                bg="var(--zencom-secondary-color)"
                borderBottomWidth="1px"
                borderColor="gray.200"
                justifyContent="space-between"
                alignItems="center"
                onClick={() => setIsNote(!isNote)}
                fontSize="14px"
                borderBottom="1px solid var(--zencom-border-color)"
                borderTop="1px solid var(--zencom-border-color)"
                // className="zencom-animate-fade"
            >
                <ZCLabel
                    label={__("Private Note", "zencommunity")}
                    fontSize="14px"
                    fontWeight="500"
                />
                {isNote ? <IoIosArrowUp /> : <IoIosArrowDown />}
            </Flex>

            {isNote && (
                <>
                    <Box p="12px 16px" bg="var(--zencom-background)">
                        <Textarea
                            borderWidth="1px"
                            borderColor="gray.200"
                            borderRadius="4px"
                            bg="yellow.50"
                            placeholder={__('Add user note...', 'zencommunity')}
                            color="gray.400"
                            h="100px"
                            onKeyDown={handleKeyDown}
                        />
                    </Box>

                    {userNotes?.length > 0 && (
                        <Box p="12px 16px" bg="var(--zencom-background)">
                            {userNotes.map((note) => (
                                <Flex
                                    key={note.id}
                                    borderWidth="1px"
                                    borderColor="gray.200"
                                    borderRadius="4px"
                                    mb="12px"
                                    p="8px"
                                    bg="yellow.50"
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <Box flex="1" bg="var(--zencom-background)">
                                        {editingNoteId === note.id ? (
                                            <Input
                                                autoFocus
                                                defaultValue={note.content}
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
                                                />
                                                <ZCLabel
                                                    // translators: %s: note.updated_at
                                                    label={moment(note.updated_at).fromNow()}
                                                    type="subTitle"
                                                    fontWeight="400"
                                                    color="gray.400"
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
                                                    <Menu.Content bg="var(--zencom-background)" color={'var( --zencom-font-color)'}>
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
                </>
            )}

            <Flex
                p="12px 16px"
                bg="var(--zencom-secondary-color)"
                borderBottomWidth="1px"
                borderColor="gray.200"
                justifyContent="space-between"
                alignItems="center"
                onClick={() => setTicketHistory(!ticketHistory)}
                fontSize="14px"
                borderBottom="1px solid var(--zencom-border-color)"
                borderTop="1px solid var(--zencom-border-color)"
            >
                <ZCLabel
                    label={__("Ticket History", "zencommunity")}
                    fontSize="14px"
                    fontWeight="500"
                />
                {ticketHistory ? <IoIosArrowUp /> : <IoIosArrowDown />}
            </Flex>

            {ticketHistory && (
                <>
                    <Box
                        p="16px"
                        maxHeight={!isNote ? "calc(100vh - 250px)" : "calc(100vh - 400px)"}
                        overflowY='auto'
                        bg="var(--zencom-background)"
                        color={'var( --zencom-font-color)'}
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
                        {memberTickets?.length > 0 && (
                            memberTickets?.map(ticket => (
                                <Flex
                                    key={ticket.id}
                                    mb="24px"
                                    flexDirection="column"
                                    gap="4px"
                                >
                                    <ZCLabel
                                        // translators: %s: ticket.title
                                        label={
                                            <Flex gap={'6px'}>
                                                {ticket.title}
                                                <Link as={RactLink} outline="none" target="_blank" to={baseURL(`/ticket/${ticket.id}`)} cursor={' pointer'} _hover={{ color: "blue.500" }}>
                                                    <Icon as={RxExternalLink} />
                                                </Link>
                                            </Flex>
                                        }
                                        fontWeight="500"
                                        fontSize="16px"
                                        color="#38414A"
                                    />

                                    <ZCLabel
                                        // translators: %s: ticket.created_at
                                        label={sprintf(
                                            __('%s', 'zencommunity'),
                                            moment.utc(ticket.created_at).local().fromNow()
                                        )}
                                        fontWeight="400"
                                        fontSize="14px"
                                        color="#738496"
                                    />
                                    <Flex gap={1} alignItems="center">
                                        <ZCLabel
                                            label={__('Status:', 'zencommunity')}
                                            fontWeight="400"
                                            fontSize="14px"
                                            color="#738496"
                                        />
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
                                            fontSize="12px"
                                            p="2px 8px"
                                            borderRadius="full"
                                        >
                                            <Box as="span" display="inline-flex" boxSize="11px" flexShrink={0}>
                                                <Icon as={getStatusIcon(ticket?.status)} boxSize="11px" />
                                            </Box>
                                            {ticket?.status}
                                        </Flex>
                                    </Flex>
                                </Flex>
                            ))
                        )}
                    </Box>
                </>
            )
            }
        </ZCCustomDrawer >
    );
};

export default UserDetailsDrawer;
