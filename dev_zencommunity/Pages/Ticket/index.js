import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { ticketStatsSignature } from '@Utils/ticket-stats';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTickets,
  fetchTicketProducts,
  fetchTicketLabels,
} from '@Redux/slices/ticketSlice/ticketSlice';
import TicketsTable from './TicketsTable';
import TicketsLeftSidebar from './TicketLeftSidebar';
import { API, createSelectOptionsFromArray, current_logged_user, namespace } from '@Utils/helper';
import { primeTicketBootstrap, takeBootstrapValue } from '@Utils/bootstrap';
import { useSearchParams } from "react-router-dom";
import TicketHeader from './TicketsTable/TicketHeader.js';
import IconSidebar from '@Components/Sidebar/IconSidebar';
import { normalize, getPriorityChip, prettyStatus, getTypePill } from './helper';

const defaultFilters = {
  page: 1,
  per_page: 10,
  search: "",
  status: "open",
  product_id: 0,
  type_id: 0,
  priority_id: 0,
  timespan: "",
  assignee_id: 0,
};

/**
 * The filter row lives in the URL, and opening a ticket leaves that URL behind.
 *
 * Coming back from a ticket therefore landed on an unfiltered list every time:
 * the status, product, priority and sort someone had just chosen were gone, and
 * they had to set all four again to carry on where they were. The last set is
 * kept here and put back when this page is opened without filters of its own.
 */
const FILTER_STORAGE_KEY = 'zencommunity_ticket_filters';

/** Every query key the filter row owns — what is saved, and what counts as "the URL already has filters". */
const FILTER_PARAM_KEYS = [
  'page', 'per_page', 'search', 'status', 'product_id', 'type_id', 'priority_id',
  'timespan', 'assignee_id', 'assignee_id_relation', 'unresolved', 'eng_issue_id',
  'order_by', 'order', 'view',
];

/** Storage can be unavailable (private windows, blocked site data) — never let that break the page. */
const readSavedFilters = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) || 'null');

    return saved && 'object' === typeof saved && Object.keys(saved).length ? saved : null;
  } catch (e) {
    return null;
  }
};

const writeSavedFilters = (params) => {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(params));
  } catch (e) {
    // Nothing to do — the filters simply won't survive the next visit.
  }
};

const Ticket = () => {
  const {
    products,
    priorityLabels: priorities,
    tickets,
    totalTickets,
    perPageTickets,
    typeLabels,
    loading: ticketsLoading
  } = useSelector((state) => state.tickets);
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlHasFilters = FILTER_PARAM_KEYS.some((key) => searchParams.has(key));

  // Decided once, as this page mounts: arriving with a bare URL — which is what
  // coming back from a ticket looks like — falls back to the last set used.
  // Held in state so it can be dropped after the first render; otherwise
  // clearing every filter by hand would look like a bare URL too, and the old
  // set would come straight back.
  const [restoredFilters, setRestoredFilters] = useState(() =>
    urlHasFilters ? null : readSavedFilters()
  );

  const filterValues = useMemo(() => {
    // Read the saved set only while the URL still carries nothing of its own;
    // the mount effect below writes it into the URL, and from then on the URL
    // is the single source of truth again.
    const source = restoredFilters && ! urlHasFilters
      ? new URLSearchParams(restoredFilters)
      : searchParams;

    return {
      page: Number(source.get("page")) || 1,
      perPage: Number(source.get("per_page")) || 10,
      search: source.get("search") || "",
      status: source.get("status") || "",
      product: Number(source.get("product_id")) || 0,
      typeLabel: Number(source.get("type_id")) || 0,
      priority: Number(source.get("priority_id")) || 0,
      time: source.get("timespan") || "",
      supportStaff: Number(source.get("assignee_id")) || 0,
      engIssue: Number(source.get("eng_issue_id")) || 0,
      orderBy: source.get("order_by") || "",
      order: source.get("order") || "",
      view: source.get("view") || "",
      assigneeRelation: source.get("assignee_id_relation") || "",
      unresolved: source.get("unresolved") || "",
    };
  }, [searchParams, urlHasFilters, restoredFilters]);

  // Started here rather than in an effect, same reasoning as the ticket
  // detail page (see primeTicketBootstrap's call site there): effects run
  // children first, so starting this in an effect would already have been
  // overtaken by AdvanceFilter's own support-agent fetch. useMemo runs
  // top-down during render, before any child mounts.
  useMemo(() => {
    primeTicketBootstrap();
  }, []);

  const [loading, setLoading] = useState(ticketsLoading);
  const [stats, setStats] = useState({
    total: 0,
    assigned: 0,
    not_assigned: 0,
    all_unresolved: 0,
    you: 0,
    this_month: { created: 0, unresolved: 0, resolved: 0 },
  });

  const [selectedTicket, setSelectedTicket] = useState(() => {
    return searchParams.get("view") || localStorage.getItem("selectedTicket") || "all-tickets";
  });

  const handleQueryParams = ({
    qpage = !filterValues.page ? 1 : filterValues.page,
    qperPage = !filterValues.perPage ? perPageTickets : filterValues.perPage,
    qsearch = filterValues.search,
    qstatus = filterValues.status,
    qproduct = filterValues.product,
    qtypeLabel = filterValues.typeLabel,
    qpriority = filterValues.priority,
    qtime = filterValues.time,
    qsupportStaff = filterValues.supportStaff,
    qassigneeIdRelation = filterValues.assigneeRelation,
    qunresolved = filterValues.unresolved,
    qengIssue = filterValues.engIssue,
    qorderBy = filterValues.orderBy,
    qorder = filterValues.order,
    qview = filterValues.view,
  }) => {
    const params = {};

    if (qpage !== defaultFilters.page && qpage) params.page = qpage;
    if (qperPage !== defaultFilters.per_page && qperPage) params.per_page = qperPage;
    if (qsearch !== defaultFilters.search && qsearch) params.search = qsearch;
    if (qstatus !== defaultFilters.status && qstatus) params.status = qstatus;
    if (qproduct !== defaultFilters.product_id && qproduct) params.product_id = qproduct;
    if (qtypeLabel !== defaultFilters.type_id && qtypeLabel) params.type_id = qtypeLabel;
    if (qpriority !== defaultFilters.priority_id && qpriority) params.priority_id = qpriority;
    if (qtime !== defaultFilters.timespan && qtime) params.timespan = qtime;
    if (qsupportStaff !== defaultFilters.assignee_id && qsupportStaff) params.assignee_id = qsupportStaff;
    if (qassigneeIdRelation) params.assignee_id_relation = qassigneeIdRelation;
    if (qunresolved) params.unresolved = qunresolved;
    if (qengIssue) params.eng_issue_id = qengIssue;
    if (qorderBy) params.order_by = qorderBy;
    if (qorder) params.order = qorder;
    if (qview) params.view = qview;
    setSearchParams(params);
    dispatch(fetchTickets(params))
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([
          dispatch(fetchTicketProducts()),
          dispatch(fetchTicketLabels({ labelType: 'types' })),
          dispatch(fetchTicketLabels({ labelType: 'priorities' })),
        ]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  useEffect(() => {
    if (!current_logged_user?.id) return;

    if (selectedTicket === "all-tickets") {
      handleQueryParams({
        qpage: !filterValues.page ? 1 : filterValues.page,
        qperPage: !filterValues.perPage ? perPageTickets : filterValues.perPage,
        qsearch: filterValues.search,
        qstatus: filterValues.status ? filterValues.status : "",
        qproduct: filterValues.product ? filterValues.product : 0,
        qtypeLabel: filterValues.typeLabel ? filterValues.typeLabel : 0,
        qpriority: filterValues.priority ? filterValues.priority : 0,
        qtime: filterValues.time ? filterValues.time : '',
        qsupportStaff: 0,
        qassigneeIdRelation: "",
        qunresolved: "",
        qengIssue: filterValues.engIssue,
        qview: "all-tickets",
      });

    } else if (selectedTicket === "assigned-tickets") {
      handleQueryParams({
        qsupportStaff: current_logged_user.id,
        qassigneeIdRelation: "",
        qunresolved: "",
        qview: "assigned-tickets",
      })

    } else if (selectedTicket === "unassigned-tickets") {
      handleQueryParams({
        qsupportStaff: 0,
        qassigneeIdRelation: 'not_equal',
        qunresolved: "",
        qview: "unassigned-tickets",
      })

    } else if (selectedTicket === "unresolved-tickets") {
      handleQueryParams({
        qsupportStaff: 0,
        qassigneeIdRelation: "",
        qunresolved: "true",
        qview: "unresolved-tickets",
      })
    }
  }, [selectedTicket]);

  // Declared after the effect above on purpose: that one runs first on mount
  // and writes the restored set into the URL. Once it has, the fallback has
  // done its job and is dropped, so a later "clear everything" stays cleared
  // instead of being refilled from storage.
  useEffect(() => {
    if (restoredFilters) {
      setRestoredFilters(null);
    }
  }, []);

  // Remember whatever the row is showing, for the next time this page is
  // opened without filters of its own.
  useEffect(() => {
    const current = {};

    FILTER_PARAM_KEYS.forEach((key) => {
      if (searchParams.has(key)) {
        current[key] = searchParams.get(key);
      }
    });

    if (Object.keys(current).length) {
      writeSavedFilters(current);
    }
  }, [searchParams]);


  // `tickets` is a fresh array on every fetch, so keying the effect on it made
  // each poll two requests — the list, then stats that had not moved.
  const statsSignature = useMemo(() => ticketStatsSignature(tickets), [tickets]);

  // The counts come from the server, not from the list, so the fetch on mount
  // already has them right. The signature going from empty to loaded is the
  // first page of tickets arriving — not a change to anything counted — and
  // refetching there was the second stats request on every cold load.
  const countedSignatureRef = useRef(null);

  // get stats count — refetched whenever a status or assignment changes (e.g.
  // after an update) so counts like "Unassigned tickets" don't go stale.
  useEffect(() => {
    const firstListArrival = countedSignatureRef.current === '' && statsSignature !== '';
    const alreadyCounted = countedSignatureRef.current === statsSignature;

    if (alreadyCounted || firstListArrival) {
      countedSignatureRef.current = statsSignature;
      return;
    }

    countedSignatureRef.current = statsSignature;

    (async () => {
      const preloaded = await takeBootstrapValue('stats', 'ticket');
      const res = undefined !== preloaded
        ? { data: preloaded }
        : await API.get(`${namespace}/tickets/stats`);
      setStats(res?.data);
    })();
  }, [statsSignature]);

  const handleTicketsPageChange = async (e) => {
    handleQueryParams({
      qpage: e.page,
    })
  };

  const groupedByPriority = useMemo(() => {
    const buckets = {};
    (tickets || []).forEach((t) => {
      const key = normalize(t?.priority?.name || 'Normal');
      buckets[key] ??= [];
      buckets[key].push(t);
    });

    return (priorities || [])
      .filter((p) => (buckets[normalize(p.name)] || []).length)
      .map((p) => ({
        label: p.name,
        meta: p.meta,
        data: buckets[normalize(p.name)],
      }));
  }, [tickets, priorities]);

  // convert to options
  const typeLabelsOptions = createSelectOptionsFromArray(typeLabels);
  const productFilterOptions = createSelectOptionsFromArray(products);
  const priorityLabelsOptions = createSelectOptionsFromArray(priorities);

  return (
    <>
      <Flex
        marginLeft="0"
        alignItems="flex-start"
        width="100%"
        paddingBottom="57px"
        className="zencom-tickets"
      >
        <Box
          className='zencom-left-sidebar'
          borderRight="1px solid var(--zencom-border-color)"
          display={{ base: "none", md: "none", lg: "none", xl: "block" }}
          maxW={{ base: "100%", sm: "100%", md: "100%", lg: "364px" }}
          minW={{ base: "100%", sm: "100%", md: "100%", lg: "364px" }}
          position='fixed' left="0" 
          top="57px"
          zIndex="8"
          background="var(--zencom-background)"
          height="100vh"
          overflow="hidden"
        >
          <Flex direction="row" justifyContent="space-around" alignItems="flex-start">
            <IconSidebar height='100vh' display={{ base: "none", md: "flex" }} />

            <Box
              minW="290px"
              w="290px"
              borderRight="1px solid var(--zencom-border-color)"
              display={{ base: "none", lg: "block" }}
              bg="var(--zencom-background)"
            >
              <TicketsLeftSidebar
                totalTickets={totalTickets}
                selectedTicket={selectedTicket}
                setSelectedTicket={setSelectedTicket}
                stats={stats}
              />
            </Box>
          </Flex>
        </Box>

        {/* Main content */}
        <Flex
          direction="column"
          p={{ base: "16px", lg: "20px" }}
          overflow="hidden"
          height="auto"
          maxW={{ base: "100%", sm: "100%", md: "100%", xl: "calc(100% - 364px)" }}
          minW={{ base: "100%", sm: "100%", md: "100%", xl: "calc(100% - 364px)" }}
          margin={{lg: "0 0 0 auto"}}
        >
          <TicketHeader loading={loading} products={products} stats={stats} />

          <TicketsTable
            typeLabelsOptions={typeLabelsOptions}
            loading={loading}
            productFilterOptions={productFilterOptions}
            priorityLabelsOptions={priorityLabelsOptions}
            groupedByPriority={groupedByPriority}
            prettyStatus={prettyStatus}
            getTypePill={getTypePill}
            filterValues={filterValues}
            totalTickets={totalTickets}
            handleTicketsPageChange={handleTicketsPageChange}
            getPriorityChip={getPriorityChip}
            setSearchParams={setSearchParams}
            searchParams={searchParams}
            handleQueryParams={handleQueryParams}
            selectedTicket={selectedTicket}
            setSelectedTicket={setSelectedTicket}
            stats={stats}
          />
        </Flex>
      </Flex>
    </>
  );
};

export default Ticket;
