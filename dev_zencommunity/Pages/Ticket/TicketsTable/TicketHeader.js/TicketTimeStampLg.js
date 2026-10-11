import React, { useState } from 'react';
import { Box, Flex, Input } from '@chakra-ui/react';
import Select from '@Components/ReactSelect';
import moment from 'moment';
import { __ } from '@wordpress/i18n';
import CreateTicket from '@Pages/Ticket/CreateTicket';
import { current_user_can, global_roles } from '@Utils/helper';
import { IoCalendarOutline } from 'react-icons/io5';

import "./styles.scss";

const TicketTimeStampLg = ({ fromDate, toDate, setFromDate, setToDate, ticketDrawerOpen, setOpenTicketDrawer }) => {
    const [activeOption, setActiveOption] = useState();
    const allTimeOptions = [
        // { value: 'all-to-today', label: __("All To Today", "zencommunity") },
        { value: 'previous-year-to-all', label: __("Previous Year To All", "zencommunity") },
        { value: 'all-time', label: __("All Time", "zencommunity") },
    ];
    const last30DaysOption = [{ value: 'last30', label: __("Last 30 Days", "zencommunity") }];
    const handleAllTimeSelect = (option) => {
        setActiveOption(option.value);

        switch (option.value) {
            case 'all-to-today':
                setFromDate('all');
                setToDate(moment().format('YYYY-MM-DD'));
                break;
            case 'previous-year-to-all':
                setFromDate(moment().subtract(1, 'year').startOf('year').format('YYYY-MM-DD'));
                setToDate(moment().format('YYYY-MM-DD'));
                break;
            case 'all-time':
                setFromDate('all');
                setToDate(moment().format('YYYY-MM-DD'));
                break;
            default:
                break;
        }
    };

    const handleLast30Days = () => {
        setFromDate(moment().subtract(30, 'days').format('YYYY-MM-DD'));
        setToDate(moment().format('YYYY-MM-DD'));
    };

    return (
        <Flex
            justifyContent={(global_roles?.support_agent || current_user_can?.manage_options) ? "space-between" : "flex-end"}
            alignItems="center"
        >
            {(global_roles?.support_agent || current_user_can?.manage_options) && (
                <Flex gap="16px" align="center" width="80%">
                    <Select
                        className="zen-com-select zen-com-select--100"
                        classNamePrefix="zen-com-select"
                        options={allTimeOptions}
                        placeholder={__('All Time', 'zencommunity')}
                        value={allTimeOptions.find(opt => opt.value === activeOption) || null}
                        onChange={handleAllTimeSelect}
                    />

                    <Box position="relative" width="180px">
                        <Input
                            width='180px'
                            type="date"
                            value={fromDate}
                            max={toDate}
                            onChange={e => setFromDate(e.target.value)}
                            bg="var(--zencom-background)"
                            color="var(--zencom-font-color)"
                            borderColor="var(--zencom-border-color)"
                            pr="20px"
                            className="date-input"
                        />
                        <Box
                            position="absolute"
                            right="12px"
                            top="50%"
                            transform="translateY(-50%)"
                            pointerEvents="none"
                            color="var(--zencom-font-color)"
                        >
                            <IoCalendarOutline />
                        </Box>
                    </Box>

                    <Box position="relative" width="180px">
                        <Input
                            type="date"
                            bg="var(--zencom-background)"
                            color="var(--zencom-font-color)"
                            borderColor="var(--zencom-border-color)"
                            value={toDate}
                            min={fromDate}
                            max={moment().format('YYYY-MM-DD')}
                            onChange={e => setToDate(e.target.value)}
                            pr="20px"
                            className="date-input"
                        />

                        <Box
                            position="absolute"
                            right="12px"
                            top="50%"
                            transform="translateY(-50%)"
                            pointerEvents="none"
                            color="var(--zencom-font-color)"
                        >
                            <IoCalendarOutline />
                        </Box>
                    </Box>

                    <Select
                        className="zen-com-select zen-com-select--100"
                        classNamePrefix="zen-com-select"
                        options={last30DaysOption}
                        placeholder={__('Last 30 Days', 'zencommunity')}
                        value={activeOption === 'last30' ? last30DaysOption[0] : null}
                        onChange={handleLast30Days}
                    />
                </Flex>
            )}

            <CreateTicket ticketDrawerOpen={ticketDrawerOpen} setOpenTicketDrawer={setOpenTicketDrawer} />
        </Flex>
    );
};

export default TicketTimeStampLg;
