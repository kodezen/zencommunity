import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import NumberOverview from './NumberOverview';
import { Box, Button, Flex, useMediaQuery } from '@chakra-ui/react';
import TicketHistory from './TicketHistory';
import IndividualAgent from './IndividualAgent';
import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import moment from 'moment';
import { API, current_user_can, global_roles, namespace } from '@Utils/helper';
import TicketTimeStampLg from './TicketTimeStampLg';
import TicketTimeStampMd from './TicketTimeStampMd';

const TicketHeader = ({ loading, products, stats, }) => {
    const [ticketDrawerOpen, setOpenTicketDrawer] = useState(false);
    const [advanceAnalytics, setAdvanceAnalytics] = useState(false);
    const [isMobile] = useMediaQuery('(max-width: 1139px)');
    const [fromDate, setFromDate] = useState('2020-01-01');
    const [toDate, setToDate] = useState(moment().format('YYYY-MM-DD'));
    const [ticketCounts, setTicketCounts] = useState({
        ticket_count: 0,
        pending_count: 0,
        closed_count: 0,
    });

    useEffect(() => {
        if (!fromDate || !toDate) return;
        const fetchCounts = async () => {
            try {
                const res = await API.get(
                    `${namespace}/ticket/ticket-counts/from/${fromDate}/to/${toDate}`
                );
                setTicketCounts(res?.data || {
                    ticket_count: 0,
                    pending_count: 0,
                    closed_count: 0,
                });
            } catch (e) {
                console.error(e);
            }
        };

        fetchCounts();
    }, [fromDate, toDate]);

    return (
        <>
            <Box
                width="100%"
                mb="20px"
                className='zencom-ticket-header-top'
            // className='zencom-ticket-header-top zencom-animate-fade'
            >
                <>
                    {isMobile ? (
                        <TicketTimeStampMd
                            fromDate={fromDate}
                            toDate={toDate}
                            setFromDate={setFromDate}
                            setToDate={setToDate}
                            isMobile={isMobile}
                            ticketDrawerOpen={ticketDrawerOpen}
                            setOpenTicketDrawer={setOpenTicketDrawer}
                        />
                    ) : (
                        <TicketTimeStampLg
                            fromDate={fromDate}
                            toDate={toDate}
                            setFromDate={setFromDate}
                            setToDate={setToDate}
                            isMobile={isMobile}
                            ticketDrawerOpen={ticketDrawerOpen}
                            setOpenTicketDrawer={setOpenTicketDrawer}
                        />
                    )}
                </>
            </Box>

            <NumberOverview
                ticketDrawerOpen={ticketDrawerOpen}
                setOpenTicketDrawer={setOpenTicketDrawer}
                loading={loading}
                products={products}
                stats={stats}
                isMobile={isMobile}
            />

            {advanceAnalytics && (global_roles?.support_agent || current_user_can?.manage_options) && (
                <Flex alignItems="flex-start" gap={4} flexWrap="wrap" mt="16px" className='zencom-ticket-advance-analytics' width={'100%'}>
                    <TicketHistory fromDate={fromDate} toDate={toDate} />
                    <IndividualAgent fromDate={fromDate} toDate={toDate} />
                </Flex>
            )}

            {(global_roles?.support_agent || current_user_can?.manage_options) && (
                <Flex justifyContent="center" m="16px 0 0px 0">
                    <Button variant="plain" width="fit-content" color={'var(--zencom-font-color)'} onClick={() => {
                        setAdvanceAnalytics(!advanceAnalytics)
                    }}>
                        {advanceAnalytics ? <RiArrowUpSLine /> : <RiArrowDownSLine />} {__("Advance Analytics", "zencommunity")}
                    </Button>
                </Flex>
            )}
        </>
    );
};

export default TicketHeader;
