import React from 'react';
import LeftSideBars from './Components/LeftSideBars';
import RightSidebar from './Components/RightSidebar';
import Conversations from './Conversations';
import { Box, Flex } from '@chakra-ui/react';
import TicketReply from '@Components/PostCard/TicketReply';
import { __ } from "@wordpress/i18n";
import {
    createTicketConversations,
    replyToTicketConversation,
} from "@Redux/slices/ticketSlice/ticketSlice";
import { useDispatch } from 'react-redux';
import { useStyles } from '@Utils/chakra';
import HeaderMedium from './Components/Header/HeaderMedium';
import HeaderDesktop from './Components/Header/HeaderDesktop';
import ClosedTicketBanner from './Components/ClosedTicketBanner';
import { current_logged_user, current_user_can, global_roles } from '@Utils/helper';
import { ROLE_DEVELOPER, ROLE_SUPPORT_AGENT } from '@Utils/roles';

const SingleTicket = ({
    id,
    conversations,
    setReplyTo,
    ticketLoading,
    ticketData,
    replyTo,
    updatedSingleTicket,
    onPrev,
    onNext,
    canPrev,
    canNext,
    ticketsLoading,
    ticketsLoadingMore,
    tickets,
    currentTickets,
    totalPages,
}) => {
    const dispatch = useDispatch();
    const { ticketReply } = useStyles();
    // A developer reading a ticket via a linked engineering issue gets
    // neither the ticket-browsing left sidebar nor the ticket-management
    // right sidebar — read-only access to the conversation only.
    const isAdminOrSupportAgent = current_logged_user?.is_site_admin || current_user_can?.manage_options || global_roles?.[ROLE_SUPPORT_AGENT];
    const isDeveloperOnly = !isAdminOrSupportAgent && global_roles?.[ROLE_DEVELOPER];

    return (
        <Flex direction="row" gap="24px" justifyContent="space-around" alignItems="flex-start" className='zencom-single-ticket'>
            {!isDeveloperOnly && (
                <LeftSideBars
                    tickets={tickets || []}
                    id={id}
                    ticketsLoading={ticketsLoading}
                    currentTickets={currentTickets}
                    totalPages={totalPages}
                    ticketsLoadingMore={ticketsLoadingMore}
                />
            )}

            <Box
                className="zencom-ticket-content"
                flex="1"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent={{ base: "center", lg: "flex-start", xl: "center" }}
                ml={{ base: 0, "2xl": "362px" }}
                mr={{ base: 0, "2xl": "382px" }}
                marginTop={{ base: "40px", lg: "89px" }}
                minHeight={{ base: "calc(100vh - 40px)", lg: "calc(100vh - 89px)" }}
                p={{ base: "20px 20px 0 20px", lg: "0 20px 0 20px" }}
            >
                <HeaderDesktop
                    ticketData={ticketData}
                    updatedSingleTicket={updatedSingleTicket}
                    setReplyTo={setReplyTo}
                    ticketLoading={ticketLoading}
                    onPrev={onPrev}
                    onNext={onNext}
                    canPrev={canPrev}
                    canNext={canNext}
                />

                <Box display={{ base: "block", sm: "block", md: "block", lg: "none", xl: "none" }} pt={4} background="var(--zencom-body-background)" className="zencom-ticket-details-header">
                    <HeaderMedium
                        ticketData={ticketData}
                        updatedSingleTicket={updatedSingleTicket}
                        setReplyTo={setReplyTo}
                        ticketLoading={ticketLoading}
                        onPrev={onPrev}
                        onNext={onNext}
                        canPrev={canPrev}
                        canNext={canNext}
                        type='top'
                    />
                </Box>

                

                <Conversations
                    id={id}
                    conversations={conversations}
                    replyTo={replyTo}
                    setReplyTo={setReplyTo}
                    ticketLoading={ticketLoading}
                    ticketData={ticketData}
                    updatedSingleTicket={updatedSingleTicket}
                    ticketsLoading={ticketsLoading}
                    ticketsLoadingMore={ticketsLoadingMore}
                    tickets={tickets}
                    currentTickets={currentTickets}
                    totalPages={totalPages}
                />

                {updatedSingleTicket?.status === "closed" ? (
                    <ClosedTicketBanner id={id} updatedSingleTicket={updatedSingleTicket} />
                ) : (
                    <Box
                        className="zencom-ticket-details__reply-box"
                        position="sticky"
                        bottom="0"
                        zIndex="10"
                        bg="var(--zencom-body-background)"
                        {...ticketReply}
                    >
                        <TicketReply
                            onSend={(content, isNote, mediaIds, is_informal) => {
                                let action;
                                if (isNote) {
                                    action = createTicketConversations({
                                        ticket_id: id,
                                        payload: { content, is_note: true, ...(mediaIds.length ? { add_media_ids: mediaIds } : {}), meta: { ...is_informal } },
                                    });
                                } else if (replyTo) {
                                    action = replyToTicketConversation({
                                        conversation_id: replyTo.id,
                                        ticket_id: id,
                                        payload: { content, ...(mediaIds.length ? { add_media_ids: mediaIds } : {}), meta: { ...is_informal } },
                                    });
                                } else {
                                    action = createTicketConversations({
                                        ticket_id: id,
                                        payload: { content, ...(mediaIds.length ? { add_media_ids: mediaIds } : {}), meta: { ...is_informal } },
                                    });
                                }
    
                                dispatch(action)
                                    .then(() => setReplyTo(null))
                                    .catch((err) => console.error("Send failed:", err));
                            }}
                            replyTo={replyTo}
                            onCancelReply={() => setReplyTo(null)}
                            isDisabled={updatedSingleTicket?.status === "closed"}
                            showTabs={true}
                        />
    
                        <Box display={{ base: "block", sm: "block", md: "block", lg: "none", xl: "none" }} pt={4} background="var(--zencom-body-background)" className="zencom-ticket-details-header">
                            <HeaderMedium
                                ticketData={ticketData}
                                updatedSingleTicket={updatedSingleTicket}
                                setReplyTo={setReplyTo}
                                ticketLoading={ticketLoading}
                                onPrev={onPrev}
                                onNext={onNext}
                                canPrev={canPrev}
                                canNext={canNext}
                                type='bottom'
                            />
                        </Box>
                    </Box>
                )}


            </Box>

            {!isDeveloperOnly && (
                <Box
                    bg="var(--zencom-background)"
                    position='fixed'
                    right="0"
                    top="57px"
                    width={{ xl: "62px" }}
                    height="calc(100vh - 69px)"
                    borderLeft="1px solid var(--zencom-border-color)"
                    borderRight="1px solid var(--zencom-border-color)"
                    display={{ base: "none", lg: "block" }}
                    className="zencom-chat__user"
                >
                    <RightSidebar ticketLoading={ticketLoading} ticketData={ticketData} />
                </Box>
            )}
        </Flex>
    );
};

export default SingleTicket;
