import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import IconSidebar from '@Components/Sidebar/IconSidebar';
import TicketConversationLeftSidebar from '../TicketConversationLeftSidebar';

const LeftSideBars = ({
    tickets,
    id,
    ticketsLoading,
    currentTickets,
    totalPages,
    ticketsLoadingMore,
}) => {
    return (
        <Box
            className='zencom-ticket-left-sidebar'
            borderRight="1px solid var(--zencom-border-color)"
            display={{ base: "none", xl: "block" }}
            maxW={{ xl: "396px" }}
            minW={{ xl: "396px" }}
            position='fixed' left="0" top="69px"
            zIndex="8"
            background="var(--zencom-background)"
            height="calc(100vh - 57px)"
            overflow="hidden"
        >
            <Flex alignItems="stretch" height="100%">
                <IconSidebar height="calc(100vh - 57px)" display={{ base: "none", sm: "none", md: "none", lg: "none", xl: "flex" }} />

                <TicketConversationLeftSidebar
                    tickets={tickets || []}
                    currentTicketId={id}
                    loading={ticketsLoading}
                    currentPage={currentTickets}
                    totalPages={totalPages}
                    loadingMore={ticketsLoadingMore}
                />
            </Flex>
        </Box>
    );
};

export default LeftSideBars;
