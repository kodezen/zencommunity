import React, { useState } from 'react';
import { Avatar, Box, Button, Drawer, Flex, Image, Input, Portal } from '@chakra-ui/react';
import Select from '@Components/ReactSelect';
import moment from 'moment';
import { __ } from '@wordpress/i18n';
import { LiaFilterSolid } from "react-icons/lia";
import { IoCalendarOutline } from 'react-icons/io5';
import { useStyles } from '@Utils/chakra';
import CreateTicket from '@Pages/Ticket/CreateTicket';
import { current_logged_user, current_user_can, getAvatarBg, getInitials, global_roles, site_logo, site_url } from '@Utils/helper';
import { LuMenu } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';

import "./styles.scss";

const TicketTimeStampMd = ({ fromDate, toDate, setFromDate, setToDate, isMobile, ticketDrawerOpen, setOpenTicketDrawer }) => {
    const [activeOption, setActiveOption] = useState();
    const [openTimeStamp, setOpenTimeStamp] = useState(false);
    const { primaryBtnInsideContentTrans } = useStyles();

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
        <>
            <Flex alignItems="center" justifyContent="space-between" gap={2}>
                <Drawer.Root placement="start">
                    <Drawer.Trigger asChild>
                        <Button variant="plain" bg="none" color="var(--zencom-font-color)" border="1px solid var(--zencom-border-color)" p="6px" size="xs">
                            <LuMenu />
                        </Button>
                    </Drawer.Trigger>
                    <Portal>
                        <Drawer.Positioner>
                            <Drawer.Content bg="var(--zencom-background)" maxW="300px" minW="300px">
                                <Drawer.Header p="12px 16px" borderBottom="1px solid var(--zencom-border-color)" mb="16px">
                                    <Flex justifyContent="space-between" alignItems="center" width="100%">
                                        <Image src={site_logo} width="36px" />

                                        <Link
                                            to={`/member/${current_logged_user?.id}`}
                                            style={{ textDecoration: 'none', color: 'inherit', outline: 'none' }}
                                        >
                                            <Avatar.Root size="xs" width="24px" height="24px" borderWidth="2px" borderColor="var(--zencom-border-color)">
                                                <Avatar.Fallback
                                                    bg={getAvatarBg(`${current_logged_user?.first_name} ${current_logged_user?.last_name}`)}
                                                    color="white"
                                                    display='flex'
                                                    alignItems='center'
                                                    justifyContent='center'
                                                    width='100%'
                                                    height='100%'
                                                >
                                                    {getInitials(`${current_logged_user?.first_name} ${current_logged_user?.last_name}` ?? current_logged_user?.usename)}
                                                </Avatar.Fallback>
                                                <Avatar.Image
                                                    src={current_logged_user?.avatar_url ? `${site_url}${current_logged_user?.avatar_url} ` : ""}
                                                />
                                            </Avatar.Root>
                                        </Link>
                                    </Flex>
                                </Drawer.Header>

                                <Drawer.Body p={0}>
                                    <LeftSidebar />
                                </Drawer.Body>
                            </Drawer.Content>
                        </Drawer.Positioner>
                    </Portal>
                </Drawer.Root>

                <Flex
                    justifyContent="flex-end"
                    alignItems="center"
                    gap="16px"
                >
                    {(global_roles?.support_agent || current_user_can?.manage_options) && (
                        <Button minW="auto" {...primaryBtnInsideContentTrans} onClick={() => setOpenTimeStamp(!openTimeStamp)}>
                            <LiaFilterSolid />
                        </Button>
                    )}

                    <CreateTicket ticketDrawerOpen={ticketDrawerOpen} setOpenTicketDrawer={setOpenTicketDrawer} />
                </Flex>
            </Flex>

            {openTimeStamp && (global_roles?.support_agent || current_user_can?.manage_options) && (
                <Flex gap="16px" align="center" mt={6} flexWrap={{ base: "wrap", md: "nowrap" }}>
                    <Flex
                        justifyContent="space-between"
                        alignItems="center"
                        gap="16px"
                        width="100%"
                    >
                        <Select
                            className="zen-com-select zen-com-select--width-full"
                            classNamePrefix="zen-com-select"
                            options={allTimeOptions}
                            placeholder="All Time"
                            value={allTimeOptions.find(opt => opt.value === activeOption) || null}
                            onChange={handleAllTimeSelect}
                        />

                        <Select
                            className="zen-com-select zen-com-select--width-full"
                            classNamePrefix="zen-com-select"
                            options={last30DaysOption}
                            placeholder={__('Last 30 Days', 'zencommunity')}
                            value={activeOption === 'last30' ? last30DaysOption[0] : null}
                            onChange={handleLast30Days}
                        />
                    </Flex>

                    <Flex
                        justifyContent="space-between"
                        alignItems="center"
                        gap="16px"
                        width="100%"
                    >
                        <Box position="relative" width="50%">
                            <Input
                                width='100%'
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

                        <Box position="relative" width="50%">
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
                    </Flex>
                </Flex>
            )}
        </>
    );
};

export default TicketTimeStampMd;
