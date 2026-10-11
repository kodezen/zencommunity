import React from 'react';
import BoxView from '@Components/BoxView';
import { __ } from '@wordpress/i18n';
import { Avatar, Flex, Table, Text } from '@chakra-ui/react';
import { API, getAvatarBg, getInitials, namespace } from '@Utils/helper';
import { useEffect } from 'react';
import { useState } from 'react';


const tableHeaders = [__("Name", "zencommunity"), __("Tickets", "zencommunity"), __("Closed", "zencommunity"), __("Open", "zencommunity")];

const IndividualAgent = ({ fromDate, toDate }) => {
    const [stat, setStat] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchAgentStats = async () => {
            setLoading(true);
            try {
                const response = await API.get(
                    `${namespace}/ticket/agent-stats/from/${fromDate}/to/${toDate}`
                );
                const agentStats = response?.data?.records || [];
                setStat(agentStats);
            } catch (err) {
                console.error('Failed to fetch agent stats', err);
                setStat([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAgentStats();
    }, [fromDate, toDate]);

    return (
        <BoxView
            title={__("Individual agent", "zencommunity")}
            subtitle={`${moment(fromDate).format('MMM D')} - ${moment(toDate).format('MMM D')}`}
            width={{lg: '100%', xl: 'calc(40% - 8px)'}}
            height={'-webkit-fill-available'}
        >

            <Table.Root size="sm" variant="unstyled" stickyHeader>
                <Table.Header>
                    <Table.Row
                        bg="var(--zencom-background)"
                        borderBottom="1px solid var(--zencom-border-color)"
                    >
                        {tableHeaders.map((header, idx) => (
                            <Table.ColumnHeader
                                key={idx}
                                fontSize="14px"
                                fontWeight="500"
                                color="var(--zencom-font-color)"
                            >
                                {header}
                            </Table.ColumnHeader>
                        ))}
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {stat.length > 0 ? (
                        stat.map((agent, index) => {
                            const agentName = `${agent.first_name} ${agent.last_name}`;
                            return (
                                <Table.Row
                                    key={agent.user_id || index}
                                    borderBottom="1px solid var(--zencom-border-color)"
                                    _hover={{ bg: "var(--zencom-hover-bg)" }}
                                >
                                    <Table.Cell>
                                        <Flex alignItems="center" gap="8px">
                                            <Avatar.Root
                                                width="24px"
                                                height="24px"
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                            >
                                                <Avatar.Fallback
                                                    bg={getAvatarBg(agentName)}
                                                    color="white"
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                    width="100%"
                                                    height="100%"
                                                    fontSize="12px"
                                                    fontWeight="500"
                                                >
                                                    {getInitials(agentName)}
                                                </Avatar.Fallback>

                                                <Avatar.Image
                                                    src={agent.avatar_url}
                                                    width="100%"
                                                    height="100%"
                                                    border="1px solid #E0E4E8"
                                                    borderRadius="full"
                                                    objectFit="cover"
                                                />
                                            </Avatar.Root>

                                            <Text
                                                color="var(--zencom-font-color)"
                                                fontSize="14px"
                                                fontWeight="500"
                                                lineHeight="20px"
                                            >
                                                {agentName}
                                            </Text>
                                        </Flex>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <Flex alignItems="center">
                                            <Text
                                                color="#738496"
                                                fontSize="14px"
                                                fontWeight="500"
                                                lineHeight="20px"
                                            >
                                                {agent.ticket_count}
                                            </Text>
                                        </Flex>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <Flex alignItems="center">
                                            <Text
                                                color="#738496"
                                                fontSize="14px"
                                                fontWeight="500"
                                                lineHeight="20px"
                                            >
                                                {agent.closed_count}
                                            </Text>
                                        </Flex>
                                    </Table.Cell>

                                    <Table.Cell>
                                        <Flex alignItems="center">
                                            <Text
                                                color="#738496"
                                                fontSize="14px"
                                                fontWeight="500"
                                                lineHeight="20px"
                                            >
                                                {agent.pending_count}
                                            </Text>
                                        </Flex>
                                    </Table.Cell>

                                </Table.Row>
                            );
                        })
                    ) : (
                        <Table.Row>
                            <Table.Cell colSpan={4} p="16px" textAlign="center">
                                <Text fontSize="14px" color="gray.400">
                                    {__("No data available", "zencommunity")}
                                </Text>
                            </Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table.Root>

        </BoxView>
    );
};

export default IndividualAgent;
