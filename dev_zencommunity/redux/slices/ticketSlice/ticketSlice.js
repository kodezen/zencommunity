import { createAsyncThunk, createSlice, createSelector } from "@reduxjs/toolkit";
import { API, current_logged_user, handleSliceError, handleSliceSuccess, namespace } from "@Utils/helper";
import { showNotification } from "../notificationSlice/notificationSlice";
import { __ } from '@wordpress/i18n';
import { takeBootstrapValue, ticketScope } from '@Utils/bootstrap';

const cleanParams = (params = {}) => {
  const out = { ...params };
  Object.keys(out).forEach((k) => {
    const v = out[k];
    if (v === undefined || v === null || (typeof v === "string" && !String(v).trim())) {
      delete out[k];
    }
  });
  return out;
};

const makeListParams = (o = {}) =>
  cleanParams({
    page: o.page,
    per_page: o.per_page,
    search: o.search,
    status: o.status,
    order: o.order,
    order_by: o.order_by,
    search: o.search,
    search_col: o.search_col,
    product_id: o.product_id,
    type_id: o.type_id,
    priority_id: o.priority_id,
  });

/* ---------------------- Ticket Labels (types / priorities) ---------------------- */

export const fetchTicketLabels = createAsyncThunk(
  "tickets/fetchTicketLabels",
  async ({ labelType = "types", ...query } = {}, thunkAPI) => {
    try {
      const params = makeListParams(query);

      // The ticket screens' opening batch carries the unfiltered lists; a
      // filtered or paged request is a different question and asks for itself.
      if (!Object.keys(params).length) {
        const preloaded = await takeBootstrapValue(
          'types' === labelType ? 'types' : 'priorities' === labelType ? 'priorities' : '',
          'ticket'
        );

        if (undefined !== preloaded) return { labelType, data: preloaded };
      }

      const res = await API.get(`${namespace}/ticket/label/${labelType}`, { params });
      return { labelType, data: res.data };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const createTicketLabel = createAsyncThunk(
  "tickets/createTicketLabel",
  async ({ labelType = "types", payload }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/ticket/label/${labelType}`, payload);
      handleSliceSuccess(thunkAPI, "Label created successfully");
      return { labelType, record: res.data?.data ?? res.data };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const getTicketLabel = createAsyncThunk(
  "tickets/getTicketLabel",
  async ({ id }, thunkAPI) => {
    try {
      const res = await API.get(`${namespace}/ticket/label/${id}`);
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const updateTicketLabel = createAsyncThunk(
  "tickets/updateTicketLabel",
  async ({ id, payload }, thunkAPI) => {
    try {
      const res = await API.put(`${namespace}/ticket/label/${id}`, payload);
      handleSliceSuccess(thunkAPI, "Label updated successfully");
      return res.data?.data ?? res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const deleteTicketLabel = createAsyncThunk(
  "tickets/deleteTicketLabel",
  async (id, thunkAPI) => {
    try {
      await API.delete(`${namespace}/ticket/label/${id}`);
      handleSliceSuccess(thunkAPI, "Label deleted successfully");
      return { id };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

/* -------------------------------- Ticket Products ------------------------------- */

export const fetchTicketProducts = createAsyncThunk(
  "tickets/fetchTicketProducts",
  async (query = {}, thunkAPI) => {
    try {
      const params = makeListParams(query);

      if (!Object.keys(params).length) {
        const preloaded = await takeBootstrapValue('products', 'ticket');

        if (undefined !== preloaded) return preloaded;
      }

      const res = await API.get(`${namespace}/ticket/products`, { params });
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const createTicketProduct = createAsyncThunk(
  "tickets/createTicketProduct",
  async (payload, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/ticket/products`, payload);
      handleSliceSuccess(thunkAPI, "Product created successfully");
      return res.data?.data ?? res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const getTicketProduct = createAsyncThunk(
  "tickets/getTicketProduct",
  async ({ id }, thunkAPI) => {
    try {
      const res = await API.get(`${namespace}/ticket/product/${id}`);
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const getAllTicketProducts = createAsyncThunk("tickets/getAllTicketProducts ", async (_, thunkAPI) => {
  try {
    const preloaded = await takeBootstrapValue('products', 'ticket');

    if (undefined !== preloaded) return preloaded;

    const res = await API.get(`${namespace}/ticket/products`);
    return res.data;
  } catch (e) {
    return handleSliceError(thunkAPI, e);
  }
});

export const updateTicketProduct = createAsyncThunk(
  "tickets/updateTicketProduct",
  async ({ id, payload }, thunkAPI) => {
    try {
      const res = await API.put(`${namespace}/ticket/product/${id}`, payload);
      handleSliceSuccess(thunkAPI, "Product updated successfully");
      return res.data?.data ?? res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const deleteTicketProduct = createAsyncThunk(
  "tickets/deleteTicketProduct",
  async ({ id }, thunkAPI) => {
    try {
      await API.delete(`${namespace}/ticket/product/${id}`);
      handleSliceSuccess(thunkAPI, "Product deleted successfully");
      return { id };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

/* ------------------------------------ Tickets ----------------------------------- */
export const fetchTickets = createAsyncThunk(
  "community/fetchTickets",
  async (
    {
      page = 1,
      per_page = 10,
      type_id = '',
      product_id = '',
      priority_id = '',
      timespan = '',
      status = 'open',
      search = '',
      assignee_id = '',
      assignee_id_relation,
      unresolved,
      eng_issue_id = '',
      order_by = '',
      order = ''
    } = {},
    thunkAPI
  ) => {
    try {
      let params = {
        page,
        per_page,
      };
      if (search) {
        params = {
          ...params, search,
          page: 1,
        }
      }
      if (type_id) params = { ...params, type_id: parseInt(type_id) };
      if (product_id) params = { ...params, product_id: parseInt(product_id) };
      if (priority_id) params = { ...params, priority_id: parseInt(priority_id) };
      if (timespan) params = { ...params, timespan };
      if (status) params = { ...params, status };
      if (assignee_id) params = { ...params, assignee_id: parseInt(assignee_id) };
      if (assignee_id_relation) params = { ...params, assignee_id_relation };
      if (unresolved) params = { ...params, unresolved };
      if (eng_issue_id) params = { ...params, eng_issue_id: parseInt(eng_issue_id) };
      if (order_by) params = { ...params, order_by };
      if (order) params = { ...params, order };

      const res = await API.get(`${namespace}/tickets`, { params });
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const fetchMoreTickets = createAsyncThunk(
  "community/fetchMoreTickets",
  async (
    {
      page = 2,
      per_page = 10,
      type_id = '',
      product_id = '',
      priority_id = '',
      timespan = '',
      status = 'open',
      search = '',
      assignee_id = '',
      assignee_id_relation,
      unresolved,
      eng_issue_id = '',
      order_by = '',
      order = ''
    } = {},
    thunkAPI
  ) => {
    try {
      let params = { page, per_page };
      if (search) params = { ...params, search, page: 1 };
      if (type_id) params = { ...params, type_id: parseInt(type_id) };
      if (product_id) params = { ...params, product_id: parseInt(product_id) };
      if (priority_id) params = { ...params, priority_id: parseInt(priority_id) };
      if (timespan) params = { ...params, timespan };
      if (status) params = { ...params, status };
      if (assignee_id) params = { ...params, assignee_id: parseInt(assignee_id) };
      if (assignee_id_relation) params = { ...params, assignee_id_relation };
      if (unresolved) params = { ...params, unresolved };
      const res = await API.get(`${namespace}/tickets`, { params });
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const createTicket = createAsyncThunk(
  "tickets/createTicket",
  async (payload, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/tickets`, payload);
      thunkAPI.dispatch(
        showNotification({
          message: __("Ticket created successfully", 'zencommunity'),
          isShow: true,
          type: "success",
          linkTo: '/tickets'
        })
      );
      return res.data?.data ?? res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const bulkTicketAction = createAsyncThunk(
  "tickets/bulkTicketAction",
  async ({ ids, action, value = null }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/tickets/bulk`, { ids, action, value });
      handleSliceSuccess(thunkAPI, __("Tickets updated", "zencommunity"));
      return { ids, action, value, processed: res.data?.processed ?? [] };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const rateTicket = createAsyncThunk(
  "tickets/rateTicket",
  async ({ ticketId, rating, comment = "" }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/ticket/${ticketId}/rate`, { rating, comment });
      handleSliceSuccess(thunkAPI, __("Thanks for your feedback!", "zencommunity"));
      return { ticketId, csat: res.data?.csat };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const fetchMemberTickets = createAsyncThunk(
  "tickets/fetchMemberTickets",
  async ({ member_id, ...query }, thunkAPI) => {
    try {
      const params = makeListParams(query);
      const res = await API.get(`${namespace}/member/${member_id}/tickets`, { params });
      return { data: res?.data?.records };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const getTicket = createAsyncThunk(
  "tickets/getTicket",
  async ({ ticket_id }, thunkAPI) => {
    try {
      const preloaded = await takeBootstrapValue('ticket', ticketScope(ticket_id));

      if (undefined !== preloaded) return preloaded;

      const res = await API.get(`${namespace}/ticket/${ticket_id}`);
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const getTicketsByAssigneeUser = createAsyncThunk(
  "community/getTicketsByAssigneeUser",
  async ({ assignee_id }, thunkAPI) => {
    try {
      const res = await API.get(`${namespace}/tickets?assignee_id=${parseInt(assignee_id)}`);
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const getTicketsByWithoutAssigneeUser = createAsyncThunk(
  "community/getTicketsByWithoutAssigneeUser",
  async ({ assignee_id }, thunkAPI) => {
    try {
      const res = await API.get(`${namespace}/tickets?assignee_id=${assignee_id}&assignee_id_relation=not_equal`);
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const getTicketsByUnresolved = createAsyncThunk(
  "community/getTicketsByUnsolved",
  async (thunkAPI) => {
    try {
      const res = await API.get(`${namespace}/tickets?unresolved=true`);
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);


export const updateTicket = createAsyncThunk(
  "tickets/updateTicket",
  async ({ ticket_id, payload }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/ticket/${ticket_id}`, payload);
      handleSliceSuccess(thunkAPI, "Ticket updated successfully");
      return res.data?.data ?? res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

// Fire-and-forget: records that the current user has seen this ticket as of
// now. No notification, no stored result here - the "Seen" indicator reads
// state.updatedSingleTicket.meta.last_viewed_by, which this updates server-
// side and the "ticket_viewed" socket event (handled by
// markTicketViewedLocally) keeps in sync for anyone else looking at the same
// ticket right now.
export const markTicketViewed = createAsyncThunk(
  "tickets/markTicketViewed",
  async ({ ticket_id }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/ticket/${ticket_id}/mark-viewed`);
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const updateTicketNote = createAsyncThunk(
  "tickets/updateTicketNote",
  async ({ ticket_id, payload }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/ticket/${ticket_id}/note`, payload);
      return res.data?.data ?? res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const AssignTicketToSupportAgent = createAsyncThunk(
  "community/AssignTicketToSupportAgent",
  async ({ ticket_id, assignee_id }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/ticket/${ticket_id}/assign/${assignee_id}`);
      handleSliceSuccess(thunkAPI, "Ticket Assign to Support Agent Successfully");
      return {
        assigned_ticket: res?.data?.data,
        ticket_id,
        assignee_id,
      };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const removeSupportAgentFromTicket = createAsyncThunk(
  "community/removeSupportAgentFromTicket",
  async ({ ticket_id, agent_id }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/ticket/${ticket_id}/remove/${agent_id}`);
      handleSliceSuccess(thunkAPI, "Removed Support Agent Successfully");
      return {
        ticket_id,
        agent_id,
      };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const deleteTicket = createAsyncThunk(
  "tickets/deleteTicket",
  async ({ ticket_id }, thunkAPI) => {
    try {
      await API.delete(`${namespace}/ticket/${ticket_id}`);
      handleSliceSuccess(thunkAPI, "Ticket deleted successfully");
      return { ticket_id };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

/**
 * Conversations
 */
export const createTicketConversations = createAsyncThunk(
  "tickets/createTicketConversations",
  async ({ ticket_id, payload }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/ticket/${ticket_id}/conversations`, payload);
      return {
        data: res.data,
        ticket_id
      }
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

// getTicketAllConversations is called once by the page on mount and then
// repeatedly for the rest of the ticket's life — every reply, every socket
// event, every ten-second fallback poll. Only that first call may take the
// preloaded page from the ticket's batch; every later one, including a second
// mount of the same ticket racing the first (the header renders a mobile and
// a desktop copy of the pin list side by side, though that copy asks for page
// 1 too), must reach the network so a reply is never served stale. Tracked
// here rather than in the bootstrap module itself, which hands the rest of a
// ticket's batch out on a reuse window because those keys have no such
// requirement — see the comment on WINDOW in utils/bootstrap.js.
const consumedConversationsPreload = new Set();

export const getTicketAllConversations = createAsyncThunk(
  "tickets/getTicketAllConversations",
  async ({ ticket_id, page=1 }, thunkAPI) => {
    try {
      let preloaded;

      if (1 === page && !consumedConversationsPreload.has(ticket_id)) {
        consumedConversationsPreload.add(ticket_id);
        preloaded = await takeBootstrapValue('conversations', ticketScope(ticket_id));
      }

      const res = undefined !== preloaded ? { data: preloaded } : await API.get(`${namespace}/ticket/${ticket_id}/conversations?page=${page}&per_page=15`);

      return {
        data: res?.data?.records,
        ticket_id,
        page: res?.data?.page,
        per_page: res?.data?.per_page,
        total: res?.data?.total,
        pages: res?.data?.pages,
      }
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const getTicketpaginatedConversations = createAsyncThunk(
  "tickets/getTicketpaginatedConversations",
  async ({ ticket_id, page=1 }, thunkAPI) => {
    try {
      const res = await API.get(`${namespace}/ticket/${ticket_id}/conversations?page=${page}&per_page=15`);
      return {
        data: res?.data?.records,
        ticket_id,
        page: res?.data?.page,
        per_page: res?.data?.per_page,
        total: res?.data?.total,
        pages: res?.data?.pages,
      }
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const updateTicketConversations = createAsyncThunk(
  "tickets/updateTicketConversations",
  async ({ conversation_id, ticket_id, payload }, thunkAPI) => {
    try {
      const res = await API.put(`${namespace}/ticket/${ticket_id}/conversation/${conversation_id}`, payload);
      return {
        data: res.data,
        ticket_id,
        conversation_id
      };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const deleteTicketConversation = createAsyncThunk(
  "tickets/deleteTicketConversation",
  async ({ ticket_id, conversation_id = null, conversation_reply_id = null }, thunkAPI) => {
    try {
      await API.delete(`${namespace}/ticket/${ticket_id}/conversation/${conversation_reply_id ? conversation_reply_id : conversation_id}`);
      return {
        ticket_id,
        conversation_id,
        conversation_reply_id
      };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const createTicketConversationReply = createAsyncThunk(
  "tickets/createTicketConversationReply",
  async ({ ticket_id, conversation_id, content, media_ids = [] }, thunkAPI) => {
    try {
      const payload = { content, ...(media_ids.length ? { add_media_ids: media_ids } : {}) };
      const res = await API.post(`${namespace}/ticket/${ticket_id}/conversation/${conversation_id}`, payload);
      return {
        data: res.data,
        ticket_id,
        conversation_id
      }
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const replyToTicketConversation = createAsyncThunk(
  "tickets/replyToTicketConversation",
  async ({ conversation_id, ticket_id, payload }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/ticket/${ticket_id}/conversation/${conversation_id}`, payload);
      return {
        data: res.data,
        ticket_id,
        conversation_id,
        payload
      }
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const getAllTicketConversationReplies = createAsyncThunk(
  "tickets/getAllTicketConversationReplies",
  async ({ conversation_id, ticket_id }, thunkAPI) => {
    try {
      const res = await API.get(`${namespace}/ticket/${ticket_id}/conversation/${conversation_id}`);
      return {
        data: res.data,
        ticket_id,
        conversation_id,
      }
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const togglePinConversation = createAsyncThunk(
  "tickets/togglePinConversation",
  async ({ conversation_id, ticket_id, isPinned }, thunkAPI) => {
    try {
      const action = isPinned ? "unpin" : "pin";
      const res = await API.post(
        `${namespace}/ticket/conversation/${conversation_id}/${action}`
      );
      handleSliceSuccess(
        thunkAPI,
        isPinned
          ? "Unpinned this conversation successfully"
          : "Pinned this conversation successfully"
      );
      return {
        conversation_id,
        isPinned: !isPinned,
        ticket_id
      };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const getAllPinsConversations = createAsyncThunk(
  "tickets/getAllPinsConversations",
  async ({ ticket_id }, thunkAPI) => {
    try {
      const preloaded = await takeBootstrapValue('pinned', ticketScope(ticket_id));
      const res = undefined !== preloaded ? { data: preloaded } : await API.get(`${namespace}/ticket/${ticket_id}/conversations?is_pinned=true`);

      return {
        data: res?.data?.records,
        ticket_id,
      }
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

//User Note
export const createUserPrivateNote = createAsyncThunk(
  "tickets/createUserPrivateNote",
  async ({ ticket_id, payload }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/ticket/${ticket_id}/notes`, payload);
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const getUserAllPrivateNotes = createAsyncThunk(
  "tickets/getUserAllPrivateNotes",
  async ({ ticket_id }, thunkAPI) => {
    try {
      const res = await API.get(`${namespace}/ticket/${ticket_id}/notes`);
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const updateUserPrivateNote = createAsyncThunk(
  "tickets/updateUserPrivateNote",
  async ({ note_id, payload }, thunkAPI) => {
    try {
      const res = await API.put(`${namespace}/ticket/note/${note_id}`, payload);
      return {
        data: res.data,
        note_id
      };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const deleteUserPrivateNote = createAsyncThunk(
  "tickets/deleteUserPrivateNote",
  async ({ note_id }, thunkAPI) => {
    try {
      await API.delete(`${namespace}/ticket/note/${note_id}`);
      return { note_id };
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

// Memoized so it returns a stable { prevId, nextId } reference across unrelated
// store updates — otherwise the new object literal re-renders TicketDetails on
// every dispatch.
export const selectPrevNextTicketIds = createSelector(
  [(state) => state?.tickets?.tickets || [], (_state, currentId) => currentId],
  (list, currentId) => {
    const idx = list.findIndex(t => Number(t.id ?? t.ticket_id) === Number(currentId));
    if (idx === -1) return { prevId: null, nextId: null };
    const prev = idx > 0 ? (list[idx - 1].id ?? list[idx - 1].ticket_id) : null;
    const next = idx < list.length - 1 ? (list[idx + 1].id ?? list[idx + 1].ticket_id) : null;
    return { prevId: prev, nextId: next };
  }
);

// Reflect new activity on a ticket (a reply was posted, possibly with a
// server-side auto status change) in both the open ticket and the list, so
// the status, preview text, and "last activity" time update without a
// refetch. Notes are excluded from the preview to match the backend's
// `last_message` subquery, which only looks at non-note conversations.
const syncTicketStatus = (state, ticketId, newStatus, newUpdatedAt, newContent, isNote) => {
  const patch = {
    ...(newStatus ? { status: newStatus } : {}),
    ...(!isNote && newContent ? { last_message: newContent } : {}),
    updated_at: newUpdatedAt || new Date().toISOString(),
  };
  if (state.updatedSingleTicket && Number(state.updatedSingleTicket.id) === Number(ticketId)) {
    state.updatedSingleTicket = { ...state.updatedSingleTicket, ...patch };
  }
  state.tickets = (state.tickets || []).map(t =>
    Number(t.id) === Number(ticketId) ? { ...t, ...patch } : t
  );
};

const ticketSlice = createSlice({
  name: "tickets",
  initialState: {
    typeLabels: [],
    priorityLabels: [],
    products: [],
    tickets: [],
    totalTickets: null,
    currentTickets: null,
    perPageTickets: null,
    totalPages: null,
    updatedSingleTicket: null,
    memberTickets: [],
    memberTicketsLoading: false,
    conversations: {},
    userNotes: [],
    pinConversations: [],
    loading: false,
    ticketsLoadingMore: false,
    conversationPagination: {
      page: 1,
      per_page: 15,
      total: 0,
      pages: 1
    }
  },
  reducers: {
    addConversation: (state, { payload }) => {
      const { ticket_id, data } = payload;
      if (!ticket_id || !data) return;
      const list = state.conversations[Number(ticket_id)] || [];
      // Avoid duplicating a conversation the sender already has via their own
      // optimistic create — this reducer also fires for system messages
      // (e.g. engineering issue link) which the sender has no local copy of yet.
      if (list.some((item) => Number(item.id) === Number(data.id))) return;

      // The socket's echo of the sender's own message routinely beats the
      // HTTP response back (the server broadcasts as soon as the row is
      // written, before it finishes serializing the response body). The
      // placeholder's fake `temp_<requestId>` id never matches the dedupe
      // check above, so without this it lands as a second, separate row —
      // visible for the few hundred ms until createTicketConversations.fulfilled
      // arrives and removes the placeholder. Replace the placeholder in
      // place instead: same visual slot, no flash of a duplicate.
      const placeholderIndex = list.findIndex((item) =>
        item._status === "sending" &&
        Number(item.user_id) === Number(data.user_id) &&
        item.content === data.content
      );
      if (placeholderIndex !== -1) {
        state.conversations[Number(ticket_id)] = list.map((item, idx) =>
          idx === placeholderIndex ? { ...data, _status: "sent" } : item
        );
        return;
      }

      state.conversations[Number(ticket_id)] = [...list, data];
    },
    // Fed by the "ticket_viewed" socket event (TicketDataBroadcaster::viewed
    // in zencommunity-pro) so a "Seen" indicator updates live when the other
    // party opens the ticket, without waiting for this tab's own next
    // getTicket/getTicketAllConversations fetch to pick up the new meta.
    markTicketViewedLocally: (state, { payload }) => {
      const { ticket_id, user_id, viewed_at } = payload;
      if (Number(state.updatedSingleTicket?.id) !== Number(ticket_id)) return;
      if (!state.updatedSingleTicket.meta) state.updatedSingleTicket.meta = {};
      if (!state.updatedSingleTicket.meta.last_viewed_by) state.updatedSingleTicket.meta.last_viewed_by = {};
      state.updatedSingleTicket.meta.last_viewed_by[String(user_id)] = viewed_at;
    },
    updateConversation: (state, action) => {
      const { ticket_id, conversation_id, data } = action.payload;

      if (state.conversations[ticket_id]) {
        state.conversations[ticket_id] = state.conversations[ticket_id].map(item =>
          Number(item.id) === Number(conversation_id)
            ? { ...item, ...data }
            : item
        );
      }
    },
    deleteConversation: (state, action) => {
      const { ticket_id, conversation_id } = action.payload;
      if (state.conversations[Number(ticket_id)]) {
        state.conversations[Number(ticket_id)] = state.conversations[Number(ticket_id)].filter(
          item => Number(item.id) !== Number(conversation_id)
        );
      }
    },
    replyToConversation: (state, action) => {
      const { ticket_id, conversation_id, data } = action.payload;

      if (!state.conversations[ticket_id]) return;

      state.conversations[ticket_id] = state.conversations[ticket_id].map(item => {
        if (Number(item.id) === Number(conversation_id)) {
          if (item.all_replies) {
            // The sender's own reply already landed here once via
            // replyToTicketConversation.fulfilled (the API response) before
            // this socket event for the same reply arrives back — same
            // reasoning as addConversation's guard above.
            if (item.all_replies.some((r) => Number(r.id) === Number(data.id))) {
              return { ...item, latest_reply: data };
            }

            // Same placeholder race as addConversation: the socket's echo of
            // the sender's own reply can beat replyToTicketConversation.fulfilled
            // back, landing here while the "sending" placeholder (fake
            // `temp_<requestId>` id) is still in `all_replies` — replace it in
            // place instead of prepending a second, separate row.
            const placeholderIndex = item.all_replies.findIndex((r) =>
              r._status === "sending" &&
              Number(r.user_id) === Number(data.user_id) &&
              r.content === data.content
            );
            if (placeholderIndex !== -1) {
              const sentReply = { ...data, _status: "sent" };
              return {
                ...item,
                latest_reply: sentReply,
                all_replies: item.all_replies.map((r, idx) => idx === placeholderIndex ? sentReply : r),
              };
            }

            return {
              ...item,
              latest_reply: data,
              all_replies: [data, ...item.all_replies],
            }
          }
          return {
            ...item,
            latest_reply: data,
          }
        }
        return item;
      });
    },
  },
  extraReducers: (builder) => {
    /* Labels */
    builder
      .addCase(fetchTicketLabels.fulfilled, (state, { payload }) => {
        const { labelType, data } = payload || {};
        if (!labelType) return;
        const list = data?.records ?? data?.data ?? data ?? [];
        if (labelType === "types") state.typeLabels = Array.isArray(list) ? list : [];
        if (labelType === "priorities") state.priorityLabels = Array.isArray(list) ? list : [];
      })
      .addCase(createTicketLabel.fulfilled, (state, { payload }) => {
        const { labelType, record } = payload || {};
        if (!labelType || !record) return;
        if (labelType === "types") state.typeLabels = [record, ...(state.typeLabels || [])];
        if (labelType === "priorities") state.priorityLabels = [record, ...(state.priorityLabels || [])];
      })
      .addCase(getTicketLabel.fulfilled, () => { })
      .addCase(updateTicketLabel.fulfilled, (state, { payload }) => {
        const id = payload?.id;
        if (id == null) return;
        const upd = (arr) => {
          const i = arr.findIndex((x) => Number(x.id) === Number(id));
          if (i >= 0) arr[i] = { ...arr[i], ...payload };
        };
        upd(state.typeLabels);
        upd(state.priorityLabels);
      })
      .addCase(deleteTicketLabel.fulfilled, (state, { payload }) => {
        const id = payload?.id;
        if (id == null) return;
        state.typeLabels = (state.typeLabels || []).filter((x) => Number(x.id) !== Number(id));
        state.priorityLabels = (state.priorityLabels || []).filter((x) => Number(x.id) !== Number(id));
      })

      /* Products */
      .addCase(fetchTicketProducts.fulfilled, (state, { payload }) => {
        const list = payload?.records ?? payload?.data ?? payload ?? [];
        state.products = Array.isArray(list) ? list : [];
      })
      .addCase(getAllTicketProducts.fulfilled, (state, { payload }) => {
        const list = payload?.records ?? payload?.data ?? payload ?? [];
        state.products = Array.isArray(list) ? list : [];
      })
      .addCase(createTicketProduct.fulfilled, (state, { payload }) => {
        state.products = [payload, ...(state.products || [])];
      })
      .addCase(getTicketProduct.fulfilled, () => { })
      .addCase(updateTicketProduct.fulfilled, (state, { payload }) => {
        const id = payload?.id;
        if (id == null) return;
        const i = state.products.findIndex((x) => Number(x.id) === Number(id));
        if (i >= 0) state.products[i] = { ...state.products[i], ...payload };
      })
      .addCase(deleteTicketProduct.fulfilled, (state, { payload }) => {
        const id = payload?.id;
        if (id == null) return;
        state.products = (state.products || []).filter((x) => Number(x.id) !== Number(id));
      })

      /* Tickets */
      .addCase(fetchTickets.pending, (state, { payload }) => {
        state.loading = true;
      })
      .addCase(fetchTickets.fulfilled, (state, { payload }) => {
        state.tickets = payload.records ?? [];
        state.totalTickets = payload.total ?? (payload.records?.length || 0);
        state.currentTickets = payload.page ?? 1;
        state.perPageTickets = payload.per_page ?? 10;
        state.totalPages = payload.pages ?? 1;
        state.loading = false;
      })
      .addCase(fetchTickets.rejected, (state, { payload }) => {
        state.loading = false;
      })
      .addCase(fetchMoreTickets.pending, (state) => {
        state.ticketsLoadingMore = true;
      })
      .addCase(fetchMoreTickets.fulfilled, (state, { payload }) => {
        state.tickets = [...state.tickets, ...(payload.records ?? [])];
        state.totalTickets = payload.total ?? state.totalTickets;
        state.currentTickets = payload.page ?? state.currentTickets;
        state.perPageTickets = payload.per_page ?? state.perPageTickets;
        state.totalPages = payload.pages ?? state.totalPages;
        state.ticketsLoadingMore = false;
      })
      .addCase(fetchMoreTickets.rejected, (state) => {
        state.ticketsLoadingMore = false;
      })
      .addCase(getTicketsByAssigneeUser.fulfilled, (state, { payload }) => {
        state.tickets = payload.records ?? payload?.data ?? [];
        state.totalTickets = payload.total ?? (payload.records?.length || 0);
        state.currentTickets = payload.page ?? 1;
        state.perPageTickets = payload.per_page ?? 10;
      })
      .addCase(getTicketsByWithoutAssigneeUser.fulfilled, (state, { payload }) => {
        state.tickets = payload.records ?? payload?.data ?? [];
        state.totalTickets = payload.total ?? (payload.records?.length || 0);
        state.currentTickets = payload.page ?? 1;
        state.perPageTickets = payload.per_page ?? 10;
      })
      .addCase(getTicketsByUnresolved.fulfilled, (state, { payload }) => {
        state.tickets = payload.records ?? payload?.data ?? [];
        state.totalTickets = payload.total ?? (payload.records?.length || 0);
        state.currentTickets = payload.page ?? 1;
        state.perPageTickets = payload.per_page ?? 10;
      })
      .addCase(createTicket.pending, (state, action) => {
        const payload = action.meta.arg;
        const typeObj = (state.typeLabels || []).find((t) => String(t.id) === String(payload.type_id)) || { name: "" };
        const priorityObj = (state.priorityLabels || []).find((p) => String(p.id) === String(payload.priority_id)) || { name: "" };
        const productObj = (state.products || []).find((p) => String(p.id) === String(payload.product_id)) || null;
        const placeholder = {
          id: `temp_${action.meta.requestId}`,
          _client_id: action.meta.requestId,
          _status: "sending",
          title: payload.title,
          content: payload.content,
          status: "open",
          type: typeObj,
          priority: priorityObj,
          product: productObj,
          user_id: current_logged_user?.user_id,
          user_first_name: current_logged_user?.first_name,
          user_last_name: current_logged_user?.last_name,
          user_avatar_url: current_logged_user?.avatar_url,
          created_at: new Date().toISOString(),
        };
        state.tickets = [placeholder, ...(state.tickets || [])];
      })
      .addCase(createTicket.fulfilled, (state, action) => {
        const { payload } = action;
        const requestId = action.meta.requestId;
        const hasPlaceholder = (state.tickets || []).some((t) => t._client_id === requestId);
        state.tickets = hasPlaceholder
          ? state.tickets.map((t) => (t._client_id === requestId ? payload : t))
          : [payload, ...(state.tickets || [])];
        if (typeof state.totalTickets === "number") state.totalTickets += 1;
      })
      .addCase(createTicket.rejected, (state, action) => {
        const requestId = action.meta.requestId;
        state.tickets = (state.tickets || []).filter((t) => t._client_id !== requestId);
      })
      .addCase(fetchMemberTickets.pending, (state) => {
        state.memberTicketsLoading = true;
      })
      .addCase(fetchMemberTickets.fulfilled, (state, { payload }) => {
        const { data } = payload;
        state.memberTickets = data;
        state.memberTicketsLoading = false;
      })
      .addCase(fetchMemberTickets.rejected, (state) => {
        state.memberTickets = [];
        state.memberTicketsLoading = false;
      })
      .addCase(getTicket.fulfilled, (state, { payload }) => {
        if (!payload) return;
        const id = payload.id || payload.ticket_id;
        if (id == null) return;
        // Update the row in-place if it's on the current page, but do NOT splice
        // an off-page ticket into the paginated list — that desyncs totalTickets
        // and corrupts prev/next navigation. The single ticket lives here:
        const i = state.tickets.findIndex((x) => Number(x.id || x.ticket_id) === Number(id));
        if (i >= 0) state.tickets[i] = { ...state.tickets[i], ...payload };
        state.updatedSingleTicket = payload;
      })
      .addCase(updateTicket.fulfilled, (state, { payload }) => {
        const { id: ticket_id } = payload || {};
        if (!ticket_id) return;

        state.tickets = state?.tickets?.map(ticket =>
          Number(ticket.id) === Number(ticket_id) ? { ...ticket, ...payload } : ticket
        );

        if (state.updatedSingleTicket && Number(state.updatedSingleTicket?.id) === Number(ticket_id)) {
          state.updatedSingleTicket = { ...state.updatedSingleTicket, ...payload };
        }
      })
      .addCase(markTicketViewed.fulfilled, (state, { payload, meta }) => {
        const { ticket_id } = meta.arg;
        if (Number(state.updatedSingleTicket?.id) !== Number(ticket_id)) return;
        if (!state.updatedSingleTicket.meta) state.updatedSingleTicket.meta = {};
        if (!state.updatedSingleTicket.meta.last_viewed_by) state.updatedSingleTicket.meta.last_viewed_by = {};
        state.updatedSingleTicket.meta.last_viewed_by[String(current_logged_user?.user_id)] = payload?.viewed_at;
      })
      .addCase(rateTicket.fulfilled, (state, { payload }) => {
        if (state.updatedSingleTicket && Number(state.updatedSingleTicket?.id) === Number(payload.ticketId)) {
          state.updatedSingleTicket = {
            ...state.updatedSingleTicket,
            meta: { ...(state.updatedSingleTicket.meta || {}), csat: payload.csat },
          };
        }
      })
      .addCase(AssignTicketToSupportAgent.fulfilled, (state, { payload }) => {
        const { assigned_ticket } = payload;
        state.tickets = state.tickets.map((ticket) =>
          ticket.id === assigned_ticket.id ? assigned_ticket : ticket,
          state.updatedSingleTicket = assigned_ticket
        );
      })
      .addCase(removeSupportAgentFromTicket.fulfilled, (state, { payload }) => {
        const { ticket_id, agent_id } = payload;
        if (!ticket_id || !agent_id) return;
        const removeAgentFromTicket = (ticket) => ({
          ...ticket,
          assignees: (ticket.assignees || []).filter(
            (assignee) => parseInt(assignee.id) !== parseInt(agent_id)
          ),
        });
        const ticketIndex = state.tickets.findIndex(
          (ticket) => parseInt(ticket.id) === parseInt(ticket_id)
        );
        if (ticketIndex >= 0) {
          state.tickets[ticketIndex] = removeAgentFromTicket(state.tickets[ticketIndex]);
        }
        if (state.updatedSingleTicket && parseInt(state.updatedSingleTicket.id) === parseInt(ticket_id)) {
          state.updatedSingleTicket = removeAgentFromTicket(state.updatedSingleTicket);
        }
      })
      .addCase(deleteTicket.fulfilled, (state, { payload }) => {
        const id = payload?.ticket_id;
        if (id == null) return;
        state.tickets = (state.tickets || []).filter(
          (x) => Number(x.id || x.ticket_id) !== Number(id)
        );
        if (typeof state.totalTickets === "number") state.totalTickets = Math.max(0, state.totalTickets - 1);
      })

      //Conversations
      .addCase(createTicketConversations.pending, (state, action) => {
        const { ticket_id, payload } = action.meta.arg;
        const placeholder = {
          id: `temp_${action.meta.requestId}`,
          _client_id: action.meta.requestId,
          _status: "sending",
          content: payload?.content,
          is_note: !!payload?.is_note,
          user_id: current_logged_user?.user_id,
          user_first_name: current_logged_user?.first_name,
          user_last_name: current_logged_user?.last_name,
          user_avatar_url: current_logged_user?.avatar_url,
          created_at: new Date().toISOString(),
          is_pinned: false,
          conversation_count: 0,
          latest_reply: null,
          all_replies: [],
          meta: payload?.meta || {},
        };
        state.conversations[ticket_id] = [...(state.conversations[ticket_id] || []), placeholder];
      })
      .addCase(createTicketConversations.fulfilled, (state, action) => {
        const { ticket_id, data } = action.payload;
        const requestId = action.meta.requestId;
        const list = state.conversations[ticket_id] || [];
        const sentData = { ...data, _status: "sent" };
        // The placeholder has a fake `temp_<requestId>` id, so it never
        // matches addConversation's real-id dedupe check — if the socket's
        // own echo of this message lands before this response does, it adds
        // the real row while the placeholder is still sitting there. Replacing
        // the placeholder in that case would leave both: drop it instead.
        const alreadyDeliveredBySocket = list.some((item) => Number(item.id) === Number(data.id));
        if (alreadyDeliveredBySocket) {
          state.conversations[ticket_id] = list.filter((item) => item._client_id !== requestId);
        } else {
          const hasPlaceholder = list.some((item) => item._client_id === requestId);
          state.conversations[ticket_id] = hasPlaceholder
            ? list.map((item) => (item._client_id === requestId ? sentData : item))
            : [...list, sentData];
        }
        // A reply can auto-change the ticket status — reflect it immediately.
        syncTicketStatus(state, ticket_id, data?.ticket_status, data?.ticket_updated_at, data?.content, data?.is_note);
      })
      .addCase(createTicketConversations.rejected, (state, action) => {
        const { ticket_id } = action.meta.arg;
        const requestId = action.meta.requestId;
        if (!state.conversations[ticket_id]) return;
        state.conversations[ticket_id] = state.conversations[ticket_id].map((item) =>
          item._client_id === requestId ? { ...item, _status: "failed" } : item
        );
      })
      .addCase(getTicketAllConversations.fulfilled, (state, action) => {
        // Merge into the per-ticket cache instead of replacing the whole map —
        // replacing evicts every other ticket's thread and forces a full refetch
        // on every navigation.
        const { ticket_id, data, page } = action.payload;
        const freshData = data || [];
        const existing = state.conversations[ticket_id];
        const hadExisting = Boolean(existing?.length);

        // This thunk only ever requests page 1 (the newest messages), but it's
        // not just the initial load - the 10s socket-down poll and every
        // "need_to_refetch" socket event call it again for the ticket's whole
        // life. Replacing the array wholesale here threw away every older page
        // the reader had already scrolled up to load, so the next scroll-up
        // re-fetched a page they'd already seen instead of continuing on.
        // Dedupe by id rather than id magnitude - seeded/imported threads can
        // have non-monotonic ids, so "older" has to mean "came from an
        // explicit older-page fetch", not "has a smaller id".
        if (hadExisting && freshData.length) {
          const freshIds = new Set(freshData.map(item => String(item.id)));
          const olderKept = existing.filter(item => !freshIds.has(String(item.id)));
          // Belt-and-suspenders: when many messages share one second's
          // timestamp (seed data, bulk imports), the backend's ORDER BY has
          // no stable tiebreaker, so the same row can land on more than one
          // page and "older" already contains its own duplicates. One more
          // id-dedupe pass keeps those from accumulating in the thread.
          const seen = new Set();
          state.conversations[ticket_id] = [...olderKept, ...freshData].filter(item => {
            const key = String(item.id);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        } else {
          state.conversations[ticket_id] = freshData;
        }

        // Same reasoning for the pagination cursor: a page-1 refresh of a
        // ticket already scrolled deeper must not reset "next page to fetch"
        // back down to 2. A fresh ticket (nothing cached yet) still takes the
        // real value, so switching tickets starts pagination over correctly.
        state.conversationPagination.page = hadExisting
          ? Math.max(Number(state.conversationPagination.page) || 1, Number(page) || 1)
          : (Number(page) || 1);
        state.conversationPagination.per_page = action.payload.per_page;
        state.conversationPagination.total = action.payload.total;
        state.conversationPagination.pages = action.payload.pages;
      })
      .addCase(getTicketpaginatedConversations.fulfilled, (state, action) => {
        const { ticket_id, data } = action.payload;
        state.conversations[ticket_id] = [...data, ...(state.conversations[ticket_id] || [])];
        state.conversationPagination.page = action.payload.page;
        state.conversationPagination.per_page = action.payload.per_page;
        state.conversationPagination.total = action.payload.total;
        state.conversationPagination.pages = action.payload.pages;
      })

      .addCase(updateTicketConversations.fulfilled, (state, action) => {
        const { ticket_id, conversation_id, data } = action.payload;

        if (state.conversations[ticket_id]) {
          state.conversations[ticket_id] = state.conversations[ticket_id].map(item =>
            parseInt(item.id) === parseInt(conversation_id)
              ? { ...item, ...data, is_edited: true }
              : item
          );
        }
      })

      .addCase(deleteTicketConversation.fulfilled, (state, action) => {
        const { ticket_id, conversation_id, conversation_reply_id} = action.payload;
        if(conversation_reply_id) {
          state.conversations[ticket_id] = [...state.conversations[ticket_id].map(item => {
            if(parseInt(item.id) === parseInt(conversation_id)) {
              return {
                ...item,
                conversation_count: Number(item.conversation_count) - 1,
                all_replies: [
                  ...item.all_replies.filter(replyItem => Number(replyItem.id) !== Number(conversation_reply_id)),
                ]
              }
            }
            return item;
          })]
        } else {
          state.conversations[ticket_id] = [...state.conversations[ticket_id].filter(item => parseInt(item.id) !== parseInt(conversation_id))];
        }
        state.pinConversations = state.pinConversations.filter(item => Number(item.id) !== Number(conversation_id));
      })
      .addCase(createTicketConversationReply.pending, (state, action) => {
        const { ticket_id, conversation_id, content } = action.meta.arg;
        const list = state.conversations[ticket_id];
        if (!list) return;

        const placeholder = {
          id: `temp_${action.meta.requestId}`,
          _client_id: action.meta.requestId,
          _status: "sending",
          content,
          user_id: current_logged_user?.user_id,
          user_first_name: current_logged_user?.first_name,
          user_last_name: current_logged_user?.last_name,
          user_avatar_url: current_logged_user?.avatar_url,
          created_at: new Date().toISOString(),
          ticket_id,
          parent_id: conversation_id,
        };

        state.conversations[ticket_id] = list.map(item => {
          if (Number(item.id) !== Number(conversation_id)) return item;
          const newReplies = item.all_replies ? [...item.all_replies, placeholder] : [placeholder];
          return { ...item, latest_reply: placeholder, all_replies: newReplies };
        });
      })
      .addCase(createTicketConversationReply.fulfilled, (state, action) => {
        const { ticket_id, conversation_id, data } = action.payload;
        const requestId = action.meta.requestId;
        syncTicketStatus(state, ticket_id, data?.ticket_status, data?.ticket_updated_at, data?.content, data?.is_note);
        if (!state.conversations[ticket_id]) return;

        state.conversations[ticket_id] = state.conversations[ticket_id].map(item => {
          if (Number(item.id) === Number(conversation_id)) {
            const sentData = { ...data, _status: "sent" };
            const existingReplies = item.all_replies || [];
            const hasPlaceholder = existingReplies.some(r => r._client_id === requestId);
            const newReplies = hasPlaceholder
              ? existingReplies.map(r => (r._client_id === requestId ? sentData : r))
              : [...existingReplies, sentData];
            return {
              ...item,
              latest_reply: sentData,
              all_replies: newReplies,
              conversation_count: Number(item.conversation_count) + 1
            }
          }
          return item;
        });
      })
      .addCase(createTicketConversationReply.rejected, (state, action) => {
        const { ticket_id, conversation_id } = action.meta.arg;
        const requestId = action.meta.requestId;
        const list = state.conversations[ticket_id];
        if (!list) return;

        state.conversations[ticket_id] = list.map(item => {
          if (Number(item.id) !== Number(conversation_id)) return item;
          const newReplies = (item.all_replies || []).map(r =>
            r._client_id === requestId ? { ...r, _status: "failed" } : r
          );
          const latest_reply = item.latest_reply?._client_id === requestId
            ? { ...item.latest_reply, _status: "failed" }
            : item.latest_reply;
          return { ...item, all_replies: newReplies, latest_reply };
        });
      })
      .addCase(replyToTicketConversation.fulfilled, (state, action) => {
        const { ticket_id, conversation_id, data } = action.payload;
        syncTicketStatus(state, ticket_id, data?.ticket_status, data?.ticket_updated_at, data?.content, data?.is_note);
        if (!state.conversations[ticket_id]) return;

        state.conversations[ticket_id] = state.conversations[ticket_id].map(item => {
          if (Number(item.id) === Number(conversation_id)) {
            if (item.all_replies) {
              // The reply_created socket broadcast for this same reply can
              // land before this HTTP response does — same race the
              // replyToConversation reducer guards against, other direction.
              if (item.all_replies.some((r) => Number(r.id) === Number(data.id))) {
                return { ...item, latest_reply: data };
              }
              return {
                ...item,
                latest_reply: data,
                all_replies: [data, ...item.all_replies],
              }
            }
            return {
              ...item,
              latest_reply: data,
            }
          }
          return item;
        });
      })
      .addCase(getAllTicketConversationReplies.fulfilled, (state, action) => {
        const { ticket_id, conversation_id, data } = action.payload;
        if (!state.conversations[ticket_id]) return;

        state.conversations[ticket_id] = state.conversations[ticket_id].map(item =>
          Number(item.id) === Number(conversation_id)
            ? {
              ...item,
              all_replies: data.records,
            }
            : item
        );
      })
      .addCase(getAllPinsConversations.fulfilled, (state, action) => {
        state.pinConversations = action.payload.data;
      })
      .addCase(togglePinConversation.fulfilled, (state, action) => {
        const { conversation_id, ticket_id, isPinned } = action.payload;

        if (isPinned) {
          const conversation = state.conversations[ticket_id].find(
            (item) => Number(item.id) === Number(conversation_id)
          );
          if (conversation) {
            conversation.is_pinned = true;
            state.pinConversations = [
              ...state.pinConversations,
              { ...conversation, is_pinned: true },
            ];
          }
        } else {
          state.pinConversations = state.pinConversations.filter(
            (item) => Number(item.id) !== Number(conversation_id)
          );
          state.conversations[ticket_id] = state.conversations[ticket_id].map((item) =>
            Number(item.id) === Number(conversation_id)
              ? { ...item, is_pinned: false }
              : item
          );
        }
      })

      //user private notes
      .addCase(createUserPrivateNote.fulfilled, (state, { payload }) => {
        const id = payload?.id;
        if (id == null) return;
        state.userNotes = [payload, ...(state.userNotes || [])];
      })

      .addCase(getUserAllPrivateNotes.fulfilled, (state, { payload }) => {
        state.userNotes = payload.records ?? payload?.data ?? [];
      })
      .addCase(updateUserPrivateNote.fulfilled, (state, action) => {
        const { note_id, data } = action.payload;

        if (state.userNotes) {
          state.userNotes = state.userNotes.map(note =>
            parseInt(note.id) === parseInt(note_id)
              ? { ...note, ...data }
              : note
          );
        }
      })

      .addCase(deleteUserPrivateNote.fulfilled, (state, { payload }) => {
        const { note_id } = payload;
        if (!note_id) return;

        state.userNotes = state.userNotes.filter(
          note => note.id !== note_id
        );
      })
  },
});

export const {
  addConversation,
  updateConversation,
  deleteConversation,
  replyToConversation,
  markTicketViewedLocally
} = ticketSlice.actions;

export default ticketSlice.reducer;
