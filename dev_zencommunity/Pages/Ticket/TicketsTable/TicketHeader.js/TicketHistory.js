import React from 'react';
import BoxView from '@Components/BoxView';
import { __ } from '@wordpress/i18n';
import { API, namespace } from '@Utils/helper';
import { useEffect } from 'react';
import { useState } from 'react';
import TicketHistoryChart from './TicketHistoryChart';
import ZenComLoader from '@Components/ZenComLoader';
import { Box, Flex, Text } from '@chakra-ui/react';

const TicketHistory = ({ fromDate, toDate }) => {
    const [ticketHistory, setTicketHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!fromDate || !toDate) return;
        const fetchTicketHistory = async () => {
            setLoading(true);
            try {
                const response = await API.get(
                    `${namespace}/ticket/ticket-history/from/${fromDate}/to/${toDate}`
                );

                const history = response?.data || [];
                setTicketHistory(history);
            } catch (err) {
                console.error('Failed to fetch ticket history', err);
                setTicketHistory([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTicketHistory();
    }, [fromDate, toDate]);

    const Legend = () => (
        <Flex gap="12px" align="center" marginRight={4}>
            <Flex align="center" gap="6px">
                <Box w="14px" h="14px" bg="#2A3BEE" rounded="full" />
                <Text fontSize="14px" fontWeight='500' color='#586774'>{__("Created", "zencommunity")}</Text>
            </Flex>
            <Flex align="center" gap="6px">
                <Box w="14px" h="14px" bg="#EA580C" rounded="full" />
                <Text fontSize="14px" fontWeight='500' color='#586774'>{__("Pending", "zencommunity")}</Text>
            </Flex>
            <Flex align="center" gap="6px">
                <Box w="14px" h="14px" bg="#22A06B" rounded="full" />
                <Text fontSize="14px" fontWeight='500' color='#586774'>{__("Closed", "zencommunity")}</Text>
            </Flex>
        </Flex>
    );
    const isFromDateAvailable = fromDate && fromDate !== 'all';
    const isToDateAvailable = toDate && toDate !== 'all';
    
    return (
        <BoxView
            title={__("Ticket history", "zencommunity")}
            subtitle={`${isFromDateAvailable ? moment(fromDate).format('MMM D') : ''} ${(isToDateAvailable && isFromDateAvailable) ? '-' : ''} ${isToDateAvailable ? moment(toDate).format('MMM D')  : ''}`}
            rightContent={<Legend />}
            width={{lg: '100%', xl: 'calc(60% - 8px)'}}
        >
            {loading ? <ZenComLoader /> : <TicketHistoryChart data={ticketHistory} />}
        </BoxView>
    );
};

export default TicketHistory;
