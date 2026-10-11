import React, { useState, useMemo, useRef, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import { Box, Button, Flex, Icon, Input, Menu, Skeleton, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { BsThreeDots } from 'react-icons/bs';
import { IoIosSearch } from 'react-icons/io';
import Select from '@Components/ReactSelect';
import { updateTicket, fetchMoreTickets } from '@Redux/slices/ticketSlice/ticketSlice';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { useStyles } from '../../../utils/chakra';
import { normalize, getStatusStyle, getStatusIcon, statusOptions } from '../helper';
import { sliceString, shortDate, fullDate, global_roles, current_user_can } from '@Utils/helper';
import { MdFilterList } from 'react-icons/md';

const stripHtml = (str) => (str || '').replace(/<[^>]*>/g, '').trim();

const TicketConversationLeftSidebar = ({ tickets = [], currentTicketId, loading = false, currentPage = 1, totalPages = 1, loadingMore = false }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { commonInput, isDark } = useStyles();
  const [filter, setFilter] = useState(false);
  const isAgentOrAdmin = global_roles?.support_agent || current_user_can?.manage_options;

  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [filterAgent, setFilterAgent] = useState(null);

  const scrollBoxRef = useRef(null);
  const sentinelRef = useRef(null);

  // The highest page this sidebar has asked for.
  //
  // The loop guarded only on `currentPage`, which the reducer advances on a
  // successful load and leaves alone on a failed one — so a page that errored,
  // or came back without a page number, left the sentinel still in view and the
  // same request going out again the moment each answer arrived. On a long
  // queue that is one identical request per second, forever, which is what
  // `?page=62` firing over and over on the ticket screen was.
  const requestedPageRef = useRef(currentPage);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollBoxRef.current;
    if (!sentinel || !container) return;
    if (loadingMore || currentPage >= totalPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || loadingMore || currentPage >= totalPages) return;

        const nextPage = currentPage + 1;

        // Asked for already: either it is still coming, or it failed. Either
        // way, asking again changes nothing.
        if (nextPage <= requestedPageRef.current) return;

        requestedPageRef.current = nextPage;
        dispatch(fetchMoreTickets({ page: nextPage, per_page: 10 }));
      },
      { root: container, rootMargin: '100px', threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [tickets.length, currentPage, totalPages, loadingMore]);

  const agentOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    for (const ticket of tickets) {
      let assignees = ticket.assignees || [];
      if (typeof assignees === 'string') {
        try { assignees = JSON.parse(`[${assignees}]`); } catch { assignees = []; }
      }
      for (const a of assignees) {
        if (a?.id && !seen.has(a.id)) {
          seen.add(a.id);
          options.push({ value: a.id, label: [a.first_name, a.last_name].filter(Boolean).join(' ') || a.username || String(a.id) });
        }
      }
    }
    return options;
  }, [tickets]);

  const selectOptions = [
    { label: __('All', 'zencommunity'), value: '' },
    ...statusOptions.filter((o) => o.value !== 'all'),
  ];

  const filtered = tickets.filter((ticket) => {
    const matchesSearch = !searchText
      || normalize(ticket.title || '').includes(normalize(searchText))
      || normalize((ticket.user_first_name || '') + ' ' + (ticket.user_last_name || '')).includes(normalize(searchText));

    const matchesStatus = !filterStatus?.value
      || (filterStatus.value === 'open'
        ? !['resolved', 'closed'].includes(normalize(ticket.status))
        : normalize(ticket.status) === normalize(filterStatus.value));

    const matchesAgent = !isAgentOrAdmin
      || !filterAgent?.value
      || (() => {
          let assignees = ticket.assignees || [];
          if (typeof assignees === 'string') {
            try { assignees = JSON.parse(`[${assignees}]`); } catch { assignees = []; }
          }
          return assignees.some((a) => String(a?.id) === String(filterAgent.value));
        })();

    return matchesSearch && matchesStatus && matchesAgent;
  });

  const handleQuickAction = async (ticketId, status) => {
    await dispatch(updateTicket({ ticket_id: ticketId, payload: { status } }));
    dispatch(showNotification({
      message: status === 'resolved'
        ? __('Ticket resolved', 'zencommunity')
        : __('Ticket closed', 'zencommunity'),
      isShow: true,
      type: 'success',
    }));
    setOpenMenuId(null);
  };

  return (
    <Flex direction="column" className='zencom-ticket-conversation-left-sidebar' w="full" h="100%" minH={0} padding="0 16px">
      <Flex alignItems="center" gap={2} padding="12px 0" marginBottom={'12px'} w={"full"} borderBottom={'1px solid var(--zencom-border-color)'}>
        {/* Search */}
        <Flex
          alignItems="center"
          justifyContent="space-between"
          position="relative"
          width="100%"
        >
          <Icon 
            as={IoIosSearch} 
            color={isDark ? "color-mix(in srgb, var(--zencom-font-color) 60%, transparent) !important" : "color-mix(in srgb, var(--zencom-font-color) 60%, transparent) !important"}
            opacity={0.6} 
            size={14} 
            style={{ position: 'absolute', left: '10px', zIndex: 9 }} 
          />
          <Input
            {...commonInput}
            placeholder={__('Search tickets...', 'zencommunity')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            height="40px"
            bg="var(--zencom-secondary-color)"
            border="none"
            borderRadius="4px"
            paddingLeft={10}
            width="100%"
            _focus={{ boxShadow: "none", bg: "var(--zencom-secondary-color)" }}
          />
        </Flex>

        <Button
          onClick={() => setFilter(!filter)}
          variant="plain"
          minW="auto"
          height="36px"
          width="36px"
          padding="0"
          borderRadius="4px"
          background={filter ? "var(--zencom-secondary-color)" : "transparent"}
          color="var(--zencom-font-color)"
          _hover={{ background: "var(--zencom-secondary-color)" }}
        >
          <MdFilterList />
        </Button>
      </Flex>

      {filter && (
        <Box marginBottom={'12px'} paddingBottom={'4px'} borderBottom={'1px solid var(--zencom-border-color)'}>
          {/* Status filter */}
          <Box padding="0 0 8px 0" >
            <Select
              options={selectOptions}
              placeholder={__('Filter by status', 'zencommunity')}
              value={filterStatus}
              onChange={(option) => setFilterStatus(option)}
              isClearable
              className="zen-com-select zen-com-select--width-full"
              classNamePrefix="zen-com-select"
            />
          </Box>

          {/* Agent filter */}
          {isAgentOrAdmin && (
            <Box padding="0 0 8px 0">
              <Select
                options={agentOptions}
                placeholder={__('Filter by agent', 'zencommunity')}
                value={filterAgent}
                onChange={(option) => setFilterAgent(option)}
                isClearable
                className="zen-com-select zen-com-select--width-full"
                classNamePrefix="zen-com-select"
              />
            </Box>
          )}
        </Box>
      )}

      {/* Ticket list */}
      <Box 
        overflowY="auto" 
        flex="1" 
        minH={0} 
        display="flex" 
        flexDirection="column" 
        gap={4} 
        ref={scrollBoxRef}
        scrollbarWidth={'none'}
      >
        {loading ? (
          <>
            {[...Array(8)].map((_, i) => (
              <Box key={i} padding="12px 16px" borderBottom="1px solid var(--zencom-border-color)">
                <Skeleton height="48px" borderRadius="4px" />
              </Box>
            ))}
          </>
        ) : filtered.length === 0 ? (
          <Text fontSize="14px" color="var(--zencom-font-color)" textAlign="center" p={4}>
            {__('No tickets found.', 'zencommunity')}
          </Text>
        ) : (
          filtered.map((ticket) => {
            const isActive = Number(ticket.id) === Number(currentTicketId);
            const requester = [ticket.user_first_name, ticket.user_last_name].filter(Boolean).join(' ') || __('Unknown', 'zencommunity');
            const statusStyle = getStatusStyle(ticket.status);
            const StatusIcon = getStatusIcon(ticket.status);
            const preview = sliceString(stripHtml(ticket.last_message || ticket.last_reply_content || ticket.content || ''), 80);

            const formattedDate = shortDate(ticket.updated_at || ticket.created_at);
            const fullFormattedDate = fullDate(ticket.updated_at || ticket.created_at);

            return (
              <Box key={ticket.id} width="286px">
                <Flex
                  padding="10px 12px"
                  cursor="pointer"
                  alignItems="center"
                  justifyContent="space-between"
                  position="relative"
                  borderRadius="4px"
                  bg={isActive ? "var(--zencom-secondary-color)" : "transparent"}
                  _hover={{ bg: "var(--zencom-secondary-color)" }}
                  onClick={() => navigate(`/ticket/${ticket.id}`)}
                  onMouseEnter={() => setHoveredId(ticket.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <Box minW="100%">
                    <Flex alignItems="center" justifyContent="space-between" gap={1}>
                      <Text fontSize="14px" fontWeight="500" lineHeight="20px" color="var(--zencom-font-color)">
                        {sliceString(requester, 24)}
                      </Text>

                      <Flex alignItems="center" gap={1} flexShrink={0}>
                        <Text fontSize="12px" lineHeight="20px" color="#586774" whiteSpace="nowrap" title={fullFormattedDate}>
                          {formattedDate}
                        </Text>
                        <Box
                          opacity={(hoveredId === ticket.id || openMenuId === ticket.id) ? 1 : 0}
                          pointerEvents={(hoveredId === ticket.id || openMenuId === ticket.id) ? 'auto' : 'none'}
                          transition="opacity 0.15s ease"
                          display="flex"
                          alignItems="center"
                        >
                        <Menu.Root
                          open={openMenuId === ticket.id}
                          onOpenChange={({ open }) => setOpenMenuId(open ? ticket.id : null)}
                          positioning={{ placement: 'bottom-end', gutter: 4 }}
                        >
                          <Menu.Trigger
                            asChild
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(prev => prev === ticket.id ? null : ticket.id);
                            }}
                          >
                            <Box
                              p="0px"
                            >
                              <Icon as={BsThreeDots} color="var(--zencom-font-color)" />
                            </Box>
                          </Menu.Trigger>
                          <Menu.Positioner>
                            <Menu.Content color="var(--zencom-font-color)" bg="var(--zencom-background)">
                              <Menu.Item
                                cursor="pointer"
                                color="var(--zencom-font-color)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAction(ticket.id, 'resolved');
                                }}
                              >
                                {__('Resolve', 'zencommunity')}
                              </Menu.Item>
                              <Menu.Item
                                cursor="pointer"
                                color="var(--zencom-font-color)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAction(ticket.id, 'closed');
                                }}
                              >
                                {__('Close', 'zencommunity')}
                              </Menu.Item>
                            </Menu.Content>
                          </Menu.Positioner>
                        </Menu.Root>
                        </Box>
                      </Flex>
                    </Flex>

                    <Text
                      fontSize="13px" lineHeight="20px"
                      color="var(--zencom-font-color)"
                      overflow="hidden"
                      whiteSpace="nowrap"
                      textOverflow="ellipsis"
                    >
                      {sliceString(ticket.title || __('(no title)', 'zencommunity'), 30)}
                    </Text>

                    {preview && (
                      <Text
                        fontSize="11px"
                        color="var(--zencom-font-muted)"
                        mt="2px"
                        overflow="hidden"
                        whiteSpace="nowrap"
                        textOverflow="ellipsis"
                      >
                        {preview}
                      </Text>
                    )}

                    <Flex
                      display="inline-flex"
                      alignItems="center"
                      gap="5px"
                      mt="4px"
                      p="2px 8px"
                      borderRadius="full"
                      border="1.5px solid"
                      borderColor={statusStyle.border}
                      fontSize="12px"
                      fontWeight="700"
                      color={statusStyle.color}
                      bg={statusStyle.bg}
                    >
                      <Box as="span" display="inline-flex" boxSize="11px" flexShrink={0}>
                        <StatusIcon size={11} />
                      </Box>
                      {ticket.status || 'open'}
                    </Flex>
                  </Box>
                </Flex>
              </Box>
            );
          })
        )}
        <Box ref={sentinelRef} h="1px" />
        {loadingMore && (
          <Box padding="12px 16px">
            <Skeleton height="48px" borderRadius="4px" />
          </Box>
        )}
      </Box>
    </Flex>
  );
};

export default TicketConversationLeftSidebar;
