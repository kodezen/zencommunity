import React, { useCallback, useState } from 'react';
import { Box, Checkbox, Flex, HStack, Table, Badge, Text, Pagination, ButtonGroup, IconButton, AvatarGroup, Avatar, Image, } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { Link } from 'react-router-dom';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { FiFlag } from 'react-icons/fi';
import { getStatusStyle, getStatusIcon } from './../helper';
import { getAvatarBg, getInitials, plugin_root_url, site_url, shortDate, fullDate } from '@Utils/helper';
import Select from '@Components/ReactSelect';
import debounce from 'just-debounce-it';
import { useSelector, useDispatch } from 'react-redux';
import TableLoader from '../TableLoader';
import TicketTableHeader from './TicketTableHeader';
import { bulkTicketAction } from '@Redux/slices/ticketSlice/ticketSlice';
import useThemeStyles from '@Hooks/useThemeStyles';

const tableHeaders = [
    __("ID", "zencommunity"),
    __("Status", "zencommunity"),
    __("Subject", "zencommunity"),
    __("Posted by", "zencommunity"),
    __("Requested", "zencommunity"),
    __("Product", "zencommunity"),
    __("Assignee", "zencommunity"),
];

const pageSizeOptions = [
    { label: __(10, "zencommunity"), value: 10 },
    { label: __(20, "zencommunity"), value: 20 },
    { label: __(30, "zencommunity"), value: 30 },
    { label: __(50, "zencommunity"), value: 50 },
    { label: __(100, "zencommunity"), value: 100 }
]

const TicketsTable = ({
    typeLabelsOptions,
    loading,
    productFilterOptions,
    priorityLabelsOptions,
    groupedByPriority,
    prettyStatus,
    getTypePill,
    filterValues,
    totalTickets,
    handleTicketsPageChange,
    setSearchParams,
    searchParams,
    handleQueryParams,
    selectedTicket,
    setSelectedTicket,
    stats,
}) => {
    const {
        loading: ticketsLoading
    } = useSelector((state) => state.tickets);
    const dispatch = useDispatch();
    const { isDark } = useThemeStyles();
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkBusy, setBulkBusy] = useState(false);

    const allVisibleIds = (groupedByPriority || []).flatMap((grp) => (grp?.data || []).map((t) => t?.id)).filter(Boolean);
    const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));

    const toggleId = (id) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };
    const toggleAll = () => {
        setSelectedIds(allSelected ? [] : allVisibleIds);
    };
    const runBulk = async (action, value = null) => {
        if (selectedIds.length === 0) return;
        setBulkBusy(true);
        try {
            await dispatch(bulkTicketAction({ ids: selectedIds, action, value })).unwrap();
            setSelectedIds([]);
            handleQueryParams({}); // refetch current view
        } catch (e) { /* notified in thunk */ } finally {
            setBulkBusy(false);
        }
    };

    const [localSearch, setLocalSearch] = useState(filterValues.search || "");
    const debouncedAPICall = useCallback(
        debounce((keyword) => {
            handleQueryParams({ qsearch: keyword });
        }, 1000),
        [handleQueryParams]
    )

    return (
        <>
            <Flex
                mt="20px"
                direction="column"
                borderRadius="4px"
                overflow="hidden"
                border="1px solid var(--zencom-border-color)"
                className='zencom-ticket-table'
            // className='zencom-ticket-table zencom-animate-fade'
            >
                <TicketTableHeader
                    localSearch={localSearch}
                    setLocalSearch={setLocalSearch}
                    debouncedAPICall={debouncedAPICall}
                    typeLabelsOptions={typeLabelsOptions}
                    loading={loading}
                    productFilterOptions={productFilterOptions}
                    priorityLabelsOptions={priorityLabelsOptions}
                    filterValues={filterValues}
                    setSearchParams={setSearchParams}
                    searchParams={searchParams}
                    handleQueryParams={handleQueryParams}
                    selectedTicket={selectedTicket}
                    setSelectedTicket={setSelectedTicket}
                    stats={stats}
                    totalTickets={totalTickets}
                />

                {selectedIds.length > 0 && (
                    <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2 tw-border-b tw-border-zc-border tw-bg-zc-primary-faint tw-px-4 tw-py-2">
                        <span className="tw-text-sm tw-text-zc-fg">
                            {selectedIds.length} {__('selected', 'zencommunity')}
                        </span>
                        <div className="tw-ml-auto tw-flex tw-flex-wrap tw-gap-2">
                            <button type="button" disabled={bulkBusy} onClick={() => runBulk('status', 'resolved')} className="tw-rounded-md tw-border tw-border-zc-border tw-px-3 tw-py-1 tw-text-xs tw-text-zc-fg hover:tw-bg-zc-hover disabled:tw-opacity-50">
                                {__('Mark resolved', 'zencommunity')}
                            </button>
                            <button type="button" disabled={bulkBusy} onClick={() => runBulk('status', 'closed')} className="tw-rounded-md tw-border tw-border-zc-border tw-px-3 tw-py-1 tw-text-xs tw-text-zc-fg hover:tw-bg-zc-hover disabled:tw-opacity-50">
                                {__('Close', 'zencommunity')}
                            </button>
                            <button type="button" disabled={bulkBusy} onClick={() => { if (window.confirm(__('Delete the selected tickets? This cannot be undone.', 'zencommunity'))) runBulk('delete'); }} className="tw-rounded-md tw-bg-zc-warning tw-px-3 tw-py-1 tw-text-xs tw-text-white hover:tw-opacity-90 disabled:tw-opacity-50">
                                {__('Delete', 'zencommunity')}
                            </button>
                            <button type="button" onClick={() => setSelectedIds([])} className="tw-rounded-md tw-px-3 tw-py-1 tw-text-xs tw-text-zc-muted hover:tw-text-zc-fg">
                                {__('Clear', 'zencommunity')}
                            </button>
                        </div>
                    </div>
                )}

                {(loading || ticketsLoading) ? (
                    <TableLoader tableHeaders={tableHeaders} />
                ) : groupedByPriority?.length === 0 ? (
                    <>
                        <Table.Root variant="unstyled">
                            <Table.Header bg="var(--zencom-body-background)">
                                <Table.Row bg="var(--zencom-body-background)" color={'var(--zencom-font-color)'} borderBottom="1px solid var(--zencom-border-color)">
                                    <Table.ColumnHeader p="10px 14px">
                                        <Checkbox.Root size="sm">
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control />
                                        </Checkbox.Root>
                                    </Table.ColumnHeader>
                                    {tableHeaders.map((header, idx) => (
                                        <Table.ColumnHeader key={idx} p="14px 12px" fontSize="13px" fontWeight="600" color={'var(--zencom-font-color)'} opacity={0.6} textTransform="uppercase" letterSpacing="0.04em">
                                            {header}
                                        </Table.ColumnHeader>
                                    ))}
                                </Table.Row>
                            </Table.Header>
                        </Table.Root>
                        <Flex alignItems="center" justifyContent="center" height="60vh">
                            <Image src={plugin_root_url + "/assets/images/emptyTicket.svg"} />
                        </Flex>
                    </>
                ) : (
                    <Table.ScrollArea maxW="100%">
                        <Table.Root size="sm" variant="unstyled" stickyHeader>
                            <Table.Header>
                                <Table.Row bg="var(--zencom-body-background)" color={'var(--zencom-font-color)'} borderBottom="1px solid var(--zencom-border-color)">
                                    <Table.ColumnHeader p="10px 14px">
                                        <Checkbox.Root size="sm" checked={allSelected} onCheckedChange={toggleAll}>
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control />
                                        </Checkbox.Root>
                                    </Table.ColumnHeader>
                                    {tableHeaders.map((header, idx) => (
                                        <Table.ColumnHeader key={idx} p="14px 12px" fontSize="13px" fontWeight="600" color={'var(--zencom-font-color)'} opacity={0.6} textTransform="uppercase" letterSpacing="0.04em">
                                            {header}
                                        </Table.ColumnHeader>
                                    ))}
                                </Table.Row>
                            </Table.Header>

                            <Table.Body>
                                {groupedByPriority.map((grp) => (
                                    <React.Fragment key={grp.key}>
                                        {/* Group header.
                                            It used to put an 18px rounded square filled
                                            with the priority colour in the checkbox
                                            column — the same size, shape and position as
                                            a checkbox, so it read as a checked one, and
                                            the row beside it looked like a ticket with
                                            every field missing. The flag inside it was
                                            drawn in the square's own background colour,
                                            so it was invisible and the square stayed
                                            blank.

                                            One cell across the whole width now, on a
                                            tinted band, so it reads as a divider between
                                            groups rather than a row within them. */}
                                        <Table.Row>
                                            <Table.Cell
                                                colSpan={8}
                                                p="8px 14px"
                                                bg="var(--zencom-secondary-background, rgba(0,0,0,.03))"
                                                borderTop="1px solid var(--zencom-border-color)"
                                                borderBottom="1px solid var(--zencom-border-color)"
                                            >
                                                <Flex align="center" gap="8px">
                                                    <FiFlag size={13} color={grp?.meta?.icon_color} />
                                                    <Text fontSize="13px" fontWeight="600" color={grp?.meta?.icon_color} textTransform="uppercase" letterSpacing=".04em">
                                                        {grp.label}
                                                    </Text>
                                                    {/* How many are in this group — the
                                                        label alone made you count. */}
                                                    <Text fontSize="12px" color="var(--zencom-font-light-color, #8896a5)">
                                                        {grp?.data?.length ?? 0}
                                                    </Text>
                                                </Flex>
                                            </Table.Cell>
                                        </Table.Row>

                                        {grp?.data?.map((t, idx, array) => {
                                            const id = t?.id ?? `#${idx + 1}`;
                                            const subject = t?.title ?? "(no title)";
                                            const status = t?.status ?? "Open";
                                            const typeLabel = t?.type?.name ?? "Other";
                                            const product = t?.product?.name ?? "—";
                                            const postedBy = t?.user_first_name || t?.user_last_name
                                                ? `${t?.user_first_name || ""} ${t?.user_last_name || ""}`
                                                : "—";
                                            const requested = shortDate(t?.created_at);
                                            const typeStyle = getTypePill(typeLabel);
                                            const statusStyle = getStatusStyle(status);
                                            const StatusIcon = getStatusIcon(status);
                                            const statusLabel = prettyStatus(status);
                                            const isLast = idx === array.length - 1;

                                            return (
                                                <Table.Row key={`${grp.key}-${id}`} background={'var(--zencom-background)'} color={'var(--zencom-font-color)'} borderBottom={isLast ? "" : "1px solid var(--zencom-border-color)"} _hover={{ background: "var(--zencom-secondary-color)" }} transition="background 0.15s ease">
                                                    <Table.Cell p="10px 14px">
                                                        <Checkbox.Root size="sm" checked={selectedIds.includes(id)} onCheckedChange={() => toggleId(id)}>
                                                            <Checkbox.HiddenInput />
                                                            <Checkbox.Control />
                                                        </Checkbox.Root>
                                                    </Table.Cell>

                                                    <Table.Cell p="10px 14px">
                                                        <HStack spacing={2}>
                                                            <Link to={`/ticket/${id}`}>
                                                                <Text fontWeight="500" minWidth="40px" color="var(--zencom-font-color)">#{id}</Text>
                                                            </Link>
                                                            <Badge bg={typeStyle.bg} color={typeStyle.color} minWidth="140px" maxWidth="140px" padding="4px 8px" display="inline-flex" justifyContent="center">
                                                                <HStack spacing={1}>{typeStyle.icon}<Text>{typeLabel}</Text></HStack>
                                                            </Badge>
                                                        </HStack>
                                                    </Table.Cell>

                                                    <Table.Cell p="10px 14px">
                                                        <Badge
                                                            bg={statusStyle.bg}
                                                            color={statusStyle.color}
                                                            border="1.5px solid"
                                                            borderColor={statusStyle.border}
                                                            fontWeight="700"
                                                            minWidth="84px"
                                                            padding="4px 10px"
                                                            borderRadius="full"
                                                            display="inline-flex"
                                                            alignItems="center"
                                                            justifyContent="center"
                                                            gap="6px"
                                                        >
                                                            <Box as="span" display="inline-flex" boxSize="13px" flexShrink={0}>
                                                                <StatusIcon size={13} />
                                                            </Box>
                                                            {statusLabel}
                                                        </Badge>
                                                    </Table.Cell>
                                                    <Table.Cell p="14px 12px">
                                                        <Link to={`/ticket/${id}`} style={{ textDecoration: "none", color: "var(--zencom-font-color)" }}>
                                                            {subject
                                                                ? subject.length > 30
                                                                    ? subject.slice(0, 30) + "..."
                                                                    : subject
                                                                : ""}
                                                        </Link>
                                                    </Table.Cell>

                                                    <Table.Cell p="14px 12px">{postedBy}</Table.Cell>
                                                    <Table.Cell p="14px 12px" title={fullDate(t?.created_at)}>{requested}</Table.Cell>
                                                    <Table.Cell p="14px 12px">{product}</Table.Cell>
                                                    <Table.Cell p="14px 12px">
                                                        {Array.isArray(t?.assignees) && t.assignees.flat().length > 0 ? (
                                                            <AvatarGroup gap="0" spaceX="-3" size="sm">
                                                                {t.assignees.flat().map((assignee, index) => (
                                                                    <Avatar.Root key={assignee?.id || index}>
                                                                        <Avatar.Fallback
                                                                            name={getInitials(assignee.first_name + " " + assignee.last_name)}
                                                                            bg={getAvatarBg(assignee.first_name + " " + assignee.last_name)}
                                                                            color="white"
                                                                            display='flex'
                                                                            alignItems='center'
                                                                            justifyContent='center'
                                                                            width='100%'
                                                                            height='100%'
                                                                        />
                                                                        <Avatar.Image
                                                                            src={
                                                                                assignee?.avatar_url
                                                                                    ? site_url + assignee.avatar_url
                                                                                    : ""
                                                                            }
                                                                        />
                                                                    </Avatar.Root>
                                                                ))}
                                                            </AvatarGroup>
                                                        ) : (
                                                            <Text color="var(--zencom-font-color)">{__("N/A", "zencommunity")}</Text>
                                                        )}
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    </Table.ScrollArea>
                )}
            </Flex>

            {totalTickets > 10 && (
                <Pagination.Root
                    count={Number(totalTickets) || 0}
                    pageSize={Number(filterValues.perPage)}
                    page={Number(filterValues.page) || 1}
                    onPageChange={handleTicketsPageChange}
                    borderRadius="4px"
                    marginLeft="auto"
                    marginTop="8px"
                >
                    <Flex gap="12px">
                        <Select
                            className="zen-com-select zen-com-select--width-full"
                            classNamePrefix="zen-com-select"
                            options={pageSizeOptions}
                            value={pageSizeOptions.find(item => Number(item.value) === Number(filterValues.perPage))}
                            onChange={(option) => {
                                handleQueryParams({ qperPage: option.value })
                            }}
                            menuPlacement='top'
                            placeholder={__("Row Per Page", "zencommunity")}
                        />

                        <ButtonGroup
                            // bg="var(--zencom-background)"
                            variant="plain"
                            color={'var(--zencom-font-color)'}
                            size="xs"
                        >
                            <Pagination.PrevTrigger asChild>
                                <IconButton 
                                    aria-label={__('Previous', 'zencommunity')} 
                                    color="var(--zencom-font-color)" 
                                    border="1px solid var(--zencom-border-color)"
                                ><LuChevronLeft /></IconButton>
                            </Pagination.PrevTrigger>

                            <Pagination.Items
                                render={(page) => (
                                    <IconButton 
                                        variant="outline" 
                                        color="var(--zencom-font-color)"
                                        border={isDark ? "1px solid var(--zencom-border-color)" : "1px solid var(--zencom-primary-color)"}
                                        _selected={{
                                            bg: isDark ? "var(--zencom-secondary-color)" : "var(--zencom-primary-color)",
                                            color: isDark ? "var(--zencom-font-color)" : "#fff",
                                            border: "1px solid var(--zencom-primary-color)"
                                        }}
                                        _hover={{
                                            bg: isDark ? "var(--zencom-secondary-color)" : "var(--zencom-primary-color)",
                                            color: isDark ? "var(--zencom-font-color)" : "#fff",
                                        }}
                                    >
                                        {page.value}
                                    </IconButton>
                                )}
                            />
                            <Pagination.NextTrigger asChild>
                                <IconButton aria-label={__('Next', 'zencommunity')} color="var(--zencom-font-color)" border="1px solid var(--zencom-border-color)"><LuChevronRight /></IconButton>
                            </Pagination.NextTrigger>
                        </ButtonGroup>
                    </Flex>
                </Pagination.Root>
            )}
        </>
    );
};

export default TicketsTable;
