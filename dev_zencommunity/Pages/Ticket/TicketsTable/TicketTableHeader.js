import React, { useState } from 'react';
import { IoIosSearch } from 'react-icons/io';
import { Button, CloseButton, Drawer, Flex, Icon, Input, Portal, useBreakpointValue, } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import Filter from './Filter';
import Subtext from '@Components/Labels/Subtext';
import AdvanceFilter from './Filter/AdvanceFilter';
import { useStyles } from '@Utils/chakra';
import { LiaFilterSolid } from 'react-icons/lia';
import { CiViewList } from 'react-icons/ci';
import TicketsLeftSidebar from '../TicketLeftSidebar';

const TicketTableHeader = ({
    typeLabelsOptions,
    loading,
    productFilterOptions,
    priorityLabelsOptions,
    filterValues,
    setSearchParams,
    searchParams,
    handleQueryParams,
    selectedTicket,
    localSearch,
    setLocalSearch,
    debouncedAPICall,
    setSelectedTicket,
    stats,
    totalTickets,
}) => {
    const isMobile = useBreakpointValue({ base: true, lg: false });
    const [openFilters, setOpenFilters] = useState(false);
    const { primaryBtnInsideContentTrans, isDark } = useStyles();

    return (
        <>
            {isMobile ? (
                <Flex
                    w="100%"
                    justifyContent="flex-end" align="center" flexWrap="wrap" gap={'12px'}
                    p="16px" background={'var(--zencom-background)'} zIndex="1"
                    borderRadius="4px 4px 0 0"
                >
                    <Flex align="center" color={'var(--zencom-font-color)'} border={'1px solid var(--zencom-border-color)'} position="relative" borderRadius="4px" w={{ base: '140px', md: '250px' }}>
                        <Icon 
                            as={IoIosSearch} 
                            size={14} 
                            color={isDark ? "color-mix(in srgb, var(--zencom-font-color) 60%, transparent) !important" : "color-mix(in srgb, var(--zencom-font-color) 60%, transparent) !important"} 
                            style={{ position: 'absolute', left: '12px', zIndex: 9 }} 
                        />
                        <Input
                            placeholder={__('Search...', 'zencommunity')}
                            size="sm" w='250px' pl={10}
                            value={localSearch}
                            onChange={(e) => {
                                setLocalSearch(e.target.value)
                                debouncedAPICall(e.target.value)
                            }}
                            border="none" outline="none"
                            borderRadius="4px"
                            _focus={{ boxShadow: "none"}}
                        />
                    </Flex>

                    <Button minW="auto" {...primaryBtnInsideContentTrans} onClick={() => setOpenFilters(!openFilters)}>
                        <LiaFilterSolid />
                    </Button>

                    {openFilters && (
                        <Flex gap="8px" align="center" justifyContent="space-between" flexWrap="wrap" width="100%">
                            <Filter
                                typeLabelsOptions={typeLabelsOptions}
                                productFilterOptions={productFilterOptions}
                                priorityLabelsOptions={priorityLabelsOptions}
                                loading={loading}
                                setSearchParams={setSearchParams}
                                searchParams={searchParams}
                                handleQueryParams={handleQueryParams}
                                selectedTicket={selectedTicket}
                                filterValues={filterValues}
                                isMobile={isMobile}
                            />

                            <AdvanceFilter
                                loading={loading}
                                typeLabelsOptions={typeLabelsOptions}
                                priorityLabelsOptions={priorityLabelsOptions}
                                setSearchParams={setSearchParams}
                                searchParams={searchParams}
                                handleQueryParams={handleQueryParams}
                                selectedTicket={selectedTicket}
                                filterValues={filterValues}
                            />

                            <Drawer.Root>
                                <Drawer.Trigger asChild>
                                    <Button {...primaryBtnInsideContentTrans} size="sm">
                                        <CiViewList />
                                    </Button>
                                </Drawer.Trigger>
                                <Portal>
                                    <Drawer.Backdrop />
                                    <Drawer.Positioner>
                                        <Drawer.Content>
                                            <Drawer.Body p={0}>
                                                <TicketsLeftSidebar
                                                    totalTickets={totalTickets}
                                                    selectedTicket={selectedTicket}
                                                    setSelectedTicket={setSelectedTicket}
                                                    stats={stats}
                                                />
                                            </Drawer.Body>
                                        </Drawer.Content>
                                    </Drawer.Positioner>
                                </Portal>
                            </Drawer.Root>
                        </Flex>
                    )}
                </Flex>
            ) : (
                <Flex
                    w="100%"
                    justifyContent="space-between" align="center" flexWrap="wrap" gap={'12px'}
                    p="16px" background={'var(--zencom-background)'} zIndex="1"
                    borderRadius="4px 4px 0 0"
                >
                    <Flex gap="8px" align="center" flexWrap="wrap">
                        <Subtext fontSize="16px">
                            {__('Filter by', 'zencommunity')}
                        </Subtext>

                        <Filter
                            typeLabelsOptions={typeLabelsOptions}
                            productFilterOptions={productFilterOptions}
                            priorityLabelsOptions={priorityLabelsOptions}
                            loading={loading}
                            setSearchParams={setSearchParams}
                            searchParams={searchParams}
                            handleQueryParams={handleQueryParams}
                            selectedTicket={selectedTicket}
                            filterValues={filterValues}
                        />
                    </Flex>

                    <Flex justifyContent="flex-end" gap={4}>
                        <AdvanceFilter
                            loading={loading}
                            typeLabelsOptions={typeLabelsOptions}
                            priorityLabelsOptions={priorityLabelsOptions}
                            setSearchParams={setSearchParams}
                            searchParams={searchParams}
                            handleQueryParams={handleQueryParams}
                            selectedTicket={selectedTicket}
                            filterValues={filterValues}
                        />

                        <Flex align="center" border={'1px solid var(--zencom-border-color)'} color={'var(--zencom-font-color)'} position="relative" borderRadius="4px" w={{ base: '140px', md: '250px' }}>
                            <Icon 
                                color={isDark ? "color-mix(in srgb, var(--zencom-font-color) 60%, transparent) !important" : "color-mix(in srgb, var(--zencom-font-color) 60%, transparent) !important"} 
                                as={IoIosSearch} 
                                size={14} 
                                style={{ position: 'absolute', left: '12px', zIndex: 9 }} 
                            />
                            <Input
                                placeholder={__('Search...', 'zencommunity')}
                                size="sm" w='250px' pl={10}
                                value={localSearch}
                                onChange={(e) => {
                                    setLocalSearch(e.target.value)
                                    debouncedAPICall(e.target.value)
                                }}
                                border="none" outline="none"
                                borderRadius="4px"
                                _focus={{ boxShadow: "none"}}
                            />
                        </Flex>
                    </Flex>
                </Flex>
            )}
        </>
    );
};

export default TicketTableHeader;
