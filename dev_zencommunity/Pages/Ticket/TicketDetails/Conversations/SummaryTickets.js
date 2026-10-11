import React, { useState, useEffect } from 'react';
import { API, current_logged_user, current_user_can, generateTitleFromDescription, global_roles, namespace } from '@Utils/helper';
import { Box, Flex, Icon, Skeleton, SkeletonCircle, Text } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { getStatusStyle, getStatusIcon } from '@Pages/Ticket/helper';
import { __ } from '@wordpress/i18n';
import NoDataPost from '@Components/NoDataPost';
import { RxActivityLog } from 'react-icons/rx';
import { Link } from 'react-router-dom';

const SummaryTicketsCard = ({ id, userName, updatedAt, content, status, type, priority, typeColor, priorityColor }) => {
    return (
        <Link to={`/ticket/${id}`}>
            <Flex gap="12px" direction="column" border="1px solid var(--zencom-border-color)" borderRadius="4px" padding="12px">
                <Flex alignItems="center" justifyContent="space-between">
                    <ZCLabel type='basic' fontWeight='400' label={userName} />
                    <ZCLabel type='simple' fontSize='12px' label={updatedAt} />
                </Flex>

                <ZCLabel type='basic' fontWeight='400' label={content} />

                <Flex gap="8px" flexWrap="wrap">
                    <Flex
                        as="span"
                        display="inline-flex"
                        alignItems="center"
                        gap="5px"
                        bg={getStatusStyle(status).bg}
                        color={getStatusStyle(status).color}
                        border="1.5px solid"
                        borderColor={getStatusStyle(status).border}
                        fontWeight="700"
                        fontSize="12px"
                        p="2px 8px"
                        borderRadius="full"
                    >
                        <Icon as={getStatusIcon(status)} boxSize="11px" />
                        {status}
                    </Flex>

                    <Text
                        as="span"
                        bg={typeColor}
                        fontWeight="500"
                        fontSize="12px"
                        color="#FFFFFF"
                        p="0 6px"
                        borderRadius="4px"
                    >
                        {type}
                    </Text>

                    <Text
                        as="span"
                        bg={priorityColor}
                        fontWeight="500"
                        fontSize="12px"
                        color="#FFFFFF"
                        p="0 6px"
                        borderRadius="4px"
                    >
                        {priority}
                    </Text>
                </Flex>
            </Flex>
        </Link>
    )
}

const SummaryTickets = ({ maxW = "288px", minW = "288px", borderRight = "1px solid var(--zencom-border-color)" }) => {
    const [loading, setLoading] = useState(false);
    const [ownTickets, setOwnTickets] = useState([]);
    const [allTickets, setAllTickets] = useState([]);
    const memberId = current_logged_user?.id;
    const myRole = global_roles?.support_agent?.change_ticket_status || global_roles?.support_agent?.is_manager || global_roles?.support_agent?.reply_ticket || global_roles?.support_agent?.update_ticket || global_roles?.support_agent?.view_ticket;

    const isAdmin = current_user_can?.manage_options;
    const showAllTicketsTo = isAdmin || myRole;

    useEffect(() => {
        const fetchTickets = async () => {
            setLoading(true);

            try {
                if (showAllTicketsTo) {
                    const res = await API.get(`${namespace}/tickets?assignee_id=${current_logged_user?.id}`);
                    setAllTickets(res?.data?.records);
                } else {
                    const response = await API.get(`${namespace}/member/${memberId}/tickets`);
                    setOwnTickets(response?.data?.records);
                }
            } catch (error) {
                console.error("Failed to fetch tickets:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, [current_logged_user?.id, memberId]);

    return (
        <>
            {loading ? (
                <Flex gap="16px" direction="column" maxW={maxW} minW={minW} p="16px" borderRight={borderRight} bg="var(--zencom-background)" height="calc(100vh - 128px)">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Flex key={i} direction="column" gap="12px" border="1px solid var(--zencom-border-color)" borderRadius="4px" padding="12px">
                            <Flex alignItems="center" justifyContent="space-between" gap="12px">
                                <Flex alignItems="center" gap="12px">
                                    <SkeletonCircle size="9" />
                                    <Skeleton height="5" width="20px" />
                                    <Skeleton height="5" width="20px" />
                                </Flex>
                                <Skeleton height="5" width="60px" />
                            </Flex>

                            <Skeleton height="5" width="100%" />

                            <Flex alignItems="center" gap="12px">
                                <Skeleton height="5" width="50px" />
                                <Skeleton height="5" width="50px" />
                                <Skeleton height="5" width="50px" />
                            </Flex>
                        </Flex>
                    ))}
                </Flex>
            ) : (
                <Box
                    maxW={maxW}
                    minW={minW}
                    p="16px"
                    borderRight={borderRight}
                    bg="var(--zencom-background)"
                    overflowY="auto"
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
                    height="calc(100vh - 128px)"
                >
                    <Flex gap="16px" direction="column">
                        {showAllTicketsTo ? (
                            <>
                                {allTickets.length > 0 ? (
                                    allTickets.map((ticket, idx) => (
                                        <SummaryTicketsCard
                                            key={idx}
                                            id={ticket.id}
                                            userName={ticket?.user_first_name + " " + ticket?.user_last_name}
                                            updatedAt={ticket?.updated_at}
                                            status={ticket?.status}
                                            type={ticket?.type?.name}
                                            typeColor={ticket?.type?.meta?.icon_color}
                                            priority={ticket?.priority?.name}
                                            priorityColor={ticket?.priority?.meta?.icon_color}
                                            content={generateTitleFromDescription(ticket?.rendered) + "..."}
                                        />
                                    ))
                                ) : (
                                    <NoDataPost
                                        icon={RxActivityLog}
                                        title={__('No data found!', 'zencommunity')}
                                        subTitle={__(`You don't have any assigned tickets`, 'zencommunity')}
                                        subTitleWrap="nowrap"
                                        padding="0"
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                {ownTickets.length > 0 ? (
                                    ownTickets.map((ticket, idx) => (
                                        <SummaryTicketsCard
                                            key={idx}
                                            id={ticket.id}
                                            userName={ticket?.user_first_name + " " + ticket?.user_last_name}
                                            updatedAt={ticket?.updated_at}
                                            status={ticket?.status}
                                            type={ticket?.type?.name}
                                            typeColor={ticket?.type?.meta?.icon_color}
                                            priority={ticket?.priority?.name}
                                            priorityColor={ticket?.priority?.meta?.icon_color}
                                            content={generateTitleFromDescription(ticket?.rendered) + "..."}
                                        />
                                    ))
                                ) : (
                                    <NoDataPost
                                        icon={RxActivityLog}
                                        title={__('No data found!', 'zencommunity')}
                                        subTitle={__(`You don't have any tickets`, 'zencommunity')}
                                        subTitleWrap="nowrap"
                                        padding="0"
                                    />
                                )}
                            </>
                        )}
                    </Flex>
                </Box>
            )}
        </>
    );
};

export default SummaryTickets;
