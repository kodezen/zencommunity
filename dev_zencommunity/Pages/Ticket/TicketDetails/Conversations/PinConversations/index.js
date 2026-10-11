import {
    Box,
    Flex,
    Icon,
    Portal,
    Popover,
    Button,
    Separator,
    Menu,
} from "@chakra-ui/react";
import { useDispatch, useSelector } from "react-redux";
import { MdOutlinePushPin } from "react-icons/md";
import ZenComAvatar from "@Components/Chakra/ZenComAvatar";
import { plugin_root_url, site_url } from "@Utils/helper";
import { useEffect } from "react";
import { deleteTicketConversation, getAllPinsConversations, togglePinConversation } from "@Redux/slices/ticketSlice/ticketSlice";
import { __, sprintf } from '@wordpress/i18n';
import ZenComTooltip from "@Components/ZenComTooltip";
import { LuMessageCircleMore, LuPinOff } from "react-icons/lu";
import { RiDeleteBinLine } from "react-icons/ri";
import { BsThreeDots } from "react-icons/bs";
import NoDataPost from "@Components/NoDataPost";
import { RxActivityLog } from "react-icons/rx";

const PinConversations = ({ ticket_id, setReplyTo }) => {
    const { pinConversations } = useSelector((state) => state.tickets);
    const dispatch = useDispatch();

    useEffect(() => {
        if (ticket_id) {
            dispatch(getAllPinsConversations({ ticket_id: ticket_id }));
        }
    }, [ticket_id])

    const ActionIcons = ({ item, onDelete, onPin }) => (
        <Flex>
            <Button variant="plain" height="auto" padding="0" _hover={{ color: "var(--zencom-secondary-color)" }} onClick={() => setReplyTo(item)}>
                <Icon as={LuMessageCircleMore} size="md" color={"var(--zencom-font-color)"} />
            </Button>
            <Button variant="plain" height="auto" padding="0" _hover={{ color: "var(--zencom-secondary-color)" }} onClick={onDelete}>
                <Icon as={RiDeleteBinLine} size="md" color={"var(--zencom-font-color)"} />
            </Button>
            <Menu.Root>
                <Menu.Trigger asChild>
                    <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        cursor="pointer"
                    >
                        <BsThreeDots />
                    </Box>
                </Menu.Trigger>
                <Portal>
                    <Menu.Positioner style={{ zIndex: 9999, background: 'var(--zencom-background)' }}>
                        <Menu.Content background='var(--zencom-background)'>
                            <Menu.Item
                                value="un-pin"
                                onClick={onPin}
                                cursor="pointer"
                                _hover={{ bg: "none" }}
                            >
                                <LuPinOff color={"var(--zencom-font-color)"} />
                                <Box background={'var(--zencom-background)'} color={"var(--zencom-font-color)"} flex="1"> {__("Un-pin", "zencommunity")}</Box>
                            </Menu.Item>
                            {/* This backend server is not ready for it need separate page */}
                            {/* <Menu.Item
                                value="copy-link"
                                 cursor="pointer"
                            >
                                <LuLink />
                                <Box flex="1">{__("Copy link", "zencommunity")}</Box>
                            </Menu.Item> */}
                        </Menu.Content>
                    </Menu.Positioner>
                </Portal>
            </Menu.Root>
        </Flex>
    );

    return (
        <Popover.Root positioning={{ placement: "bottom-end" }}>
            <Popover.Trigger asChild>
                <Button size="xs" variant="plain" minW="auto" height="auto" p="6px">
                    <MdOutlinePushPin cursor="pointer" />
                </Button>
            </Popover.Trigger>
            <Portal>
                <Popover.Positioner>
                    <Popover.Content w={{ base: "298px", md: "445px" }} maxH="400px" overflowY="auto">
                        <Popover.Body p="4px" background="var(--zencom-background)" color={'var(--zencom-font-color)'}>
                            <Flex direction="column" gap="8px">
                                {pinConversations?.length === 0 ? (
                                    <NoDataPost
                                        icon={RxActivityLog}
                                        title={__('No Pin Conversations Found!', 'zencommunity')}
                                        subTitle={__('Pin conversation to get started', 'zencommunity')}
                                    />
                                ) :
                                    pinConversations.map((pinItem) => {
                                        return (
                                            <Box
                                            >
                                                <ZenComAvatar
                                                    userID={pinItem?.user_id}
                                                    variant="ticket"
                                                    size="sm"
                                                    isPinned={true}
                                                    src={
                                                        pinItem?.user_avatar_url
                                                            ? site_url + pinItem?.user_avatar_url
                                                            : plugin_root_url + "/assets/images/avatar_placeholder.png"
                                                    }
                                                    userName={pinItem?.user_first_name + " " + pinItem?.user_last_name}
                                                    // translators: %s: moment.utc(pinItem?.created_at).local().fromNow()
                                                    postedTime={sprintf(
                                                        __('%s', 'zencommunity'),
                                                        moment.utc(pinItem?.created_at).local().fromNow()
                                                    )}
                                                    repliedContent={
                                                        <ZenComTooltip
                                                            content={
                                                                <>
                                                                    <ActionIcons
                                                                        item={pinItem}
                                                                        onEdit={() => {
                                                                            setEditingId(pinItem.id);
                                                                            setEditText(pinItem.content);
                                                                        }}
                                                                        onDelete={() => {
                                                                            dispatch(deleteTicketConversation({
                                                                                ticket_id: ticket_id,
                                                                                conversation_id: pinItem?.id,
                                                                            }))
                                                                        }}
                                                                        onPin={() => dispatch(
                                                                            togglePinConversation({
                                                                                conversation_id: pinItem?.id,
                                                                                isPinned: pinItem?.is_pinned,
                                                                                ticket_id: ticket_id,
                                                                            }))}
                                                                        onReply={(msg) =>
                                                                            setReplyTo({
                                                                                author: msg.user_first_name,
                                                                                time: msg.created_at,
                                                                                text: msg.content,
                                                                                pinItem_id: msg.id,
                                                                                ticket_id: msg.ticket_id,
                                                                            })
                                                                        }
                                                                    />
                                                                </>
                                                            }
                                                            position="custom-1"
                                                            variant="white"
                                                        >
                                                            <Box flex={1}>
                                                                <Box
                                                                    position="relative"
                                                                    borderRadius="0 4px 4px 4px"
                                                                    bg={pinItem?.is_note ? "yellow.subtle" : "var(--zencom-secondary-color)"}
                                                                    borderLeft={pinItem?.is_note ? "2px solid var(--zemcom-border-color)" : ""}
                                                                    color={pinItem?.is_note ? "#533F04" : "var(--zencom-font-color)"}
                                                                    whiteSpace="pre-line"
                                                                    mt={2}
                                                                    p="12px"
                                                                >
                                                                    {/* translators: %s:pinItem?.content */}
                                                                    {sprintf(
                                                                        __('%s', 'zencommunity'),
                                                                        pinItem?.content
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        </ZenComTooltip>
                                                    }
                                                />
                                                <Separator />
                                            </Box>
                                        )
                                    })
                                }
                            </Flex>
                        </Popover.Body>
                    </Popover.Content>
                </Popover.Positioner>
            </Portal>
        </Popover.Root>
    );
};

export default PinConversations;
