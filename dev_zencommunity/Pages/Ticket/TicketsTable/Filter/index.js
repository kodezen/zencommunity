import React from 'react';
import {
    Button,
    Flex,
    Skeleton,
} from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import Select from '@Components/ReactSelect';
import { statusOptions, resetTicketFilters } from '../../helper';
import { current_logged_user } from '@Utils/helper';
import ZenComTooltip from '@Components/ZenComTooltip';
import { LuRotateCcw } from 'react-icons/lu';

const sortByOptions = [
    // The other filters reset by picking their own "All" row. Sorting had no
    // such row and leaned on the clear button, so it gets one here rather than
    // becoming a choice that cannot be undone.
    { label: __('Default', 'zencommunity'), value: '' },
    { label: __('Last activity', 'zencommunity'), value: 'updated_at' },
    { label: __('Date created', 'zencommunity'), value: 'created_at' },
    { label: __('Replies', 'zencommunity'), value: 'conversation_count' },
    { label: __('Subject', 'zencommunity'), value: 'title' },
];
const orderOptions = [
    { label: __('Newest first', 'zencommunity'), value: 'desc' },
    { label: __('Oldest first', 'zencommunity'), value: 'asc' },
];

const Filter = ({
    productFilterOptions,
    priorityLabelsOptions,
    loading,
    handleQueryParams,
    filterValues,
    setSearchParams,
    selectedTicket,
    isMobile
}) => {
    // Render dropdown menus in a body portal so they overlay the table instead of
    // being clipped/stacked beneath it.
    const menuPortalProps = {
        menuPortalTarget: typeof document !== 'undefined' ? document.body : undefined,
        menuPosition: 'fixed',
        styles: { menuPortal: (base) => ({ ...base, zIndex: 9999 }) },
    };
    return (
        <Flex gap="8px" align="center" flexWrap="wrap">
            {loading ? (
                <Skeleton height="36px" width="110px" rounded="md" />
            ) : (
                <Select
                    placeholder={__("All Status", "zencommunity")}
                    className="zen-com-select zen-com-select--140-ticket"
                    classNamePrefix="zen-com-select"
                    {...menuPortalProps}
                    options={statusOptions}
                    value={filterValues.status ? statusOptions.find((opt) => opt.value === filterValues.status) :
                        [{ label: __('Open', 'zencommunity'), value: 'open' }]
                    }
                    onChange={(opt) => {
                        handleQueryParams({ qstatus: opt?.value ?? "open" })
                    }}
                />
            )}

            {loading ? (
                <Skeleton height="36px" width="140px" rounded="md" />
            ) : (
                <Select
                    placeholder={__("All products", "zencommunity")}
                    className="zen-com-select zen-com-select--138-ticket"
                    classNamePrefix="zen-com-select"
                    {...menuPortalProps}
                    options={[
                        { label: "All Products", value: 0 },
                        ...productFilterOptions
                    ]}
                    value={filterValues.product ? productFilterOptions.find((opt) => Number(opt.value) === Number(filterValues.product)) : null}
                    onChange={(opt) => handleQueryParams({ qproduct: opt?.value ?? "" })}
                />
            )}
            {loading ? (
                <Skeleton height="36px" width="140px" rounded="md" />
            ) : (
                <Select
                    placeholder={__("All Priority", "zencommunity")}
                    className="zen-com-select zen-com-select--136-ticket"
                    classNamePrefix="zen-com-select"
                    {...menuPortalProps}
                    options={[
                        { label: "All", value: 0 },
                        ...priorityLabelsOptions
                    ]}
                    value={filterValues.priority ? priorityLabelsOptions.find((opt) => Number(opt.value) === Number(filterValues.priority)) : null}
                    onChange={(opt) => handleQueryParams({ qpriority: opt?.value ?? "" })}
                />
            )}

            {!loading && (
                <Select
                    placeholder={__("Sort by", "zencommunity")}
                    className="zen-com-select zen-com-select--140-ticket"
                    classNamePrefix="zen-com-select"
                    {...menuPortalProps}
                    options={sortByOptions}
                    value={filterValues.orderBy ? sortByOptions.find((opt) => opt.value === filterValues.orderBy) : null}
                    onChange={(opt) => handleQueryParams({ qorderBy: opt?.value ?? "" })}
                />
            )}
            {!loading && (
                <Select
                    className="zen-com-select zen-com-select--136-ticket"
                    classNamePrefix="zen-com-select"
                    {...menuPortalProps}
                    options={orderOptions}
                    value={orderOptions.find((opt) => opt.value === (filterValues.order || "desc"))}
                    onChange={(opt) => handleQueryParams({ qorder: opt?.value ?? "desc" })}
                />
            )}

            {/*
              * Now that the individual selects have no clear button, putting
              * the whole row back took opening Advance filters to reach the
              * reset inside it. This is that same reset, one click away.
              * Always rendered rather than appearing once a filter is set, so
              * it neither moves the row nor has to be discovered.
              */}
            {!loading && (
                // Beside the button, not above it: the table this sits in is
                // overflow:hidden and its top edge is level with the filter
                // row, so a tooltip pointing up is drawn outside the box and
                // clipped away entirely — present in the DOM, never visible.
                <ZenComTooltip content={__('Reset filters', 'zencommunity')} position="right">
                    <Button
                        aria-label={__('Reset filters', 'zencommunity')}
                        size="sm"
                        variant="plain"
                        bg="transparent"
                        color="var(--zencom-font-color)"
                        border="none"
                        minW="auto"
                        px="6px"
                        _hover={{ color: 'var(--zencom-primary-color)' }}
                        focusRing="none"
                        onClick={() => resetTicketFilters({
                            setSearchParams,
                            handleQueryParams,
                            selectedTicket,
                            currentUserId: current_logged_user?.id,
                        })}
                    >
                        <LuRotateCcw />
                    </Button>
                </ZenComTooltip>
            )}
        </Flex>
    );
};

export default Filter;
