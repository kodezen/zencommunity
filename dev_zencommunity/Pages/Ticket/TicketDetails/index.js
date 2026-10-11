import React, { useContext, useState, useEffect, useMemo } from "react";
import { Box } from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllMembers } from "@Redux/slices/membersSlice/membersSlice";
import { primeTicketBootstrap, primeTicketDetail } from "@Utils/bootstrap";
import {
  addConversation,
  deleteConversation,
  getTicket,
  getTicketAllConversations,
  markTicketViewed,
  markTicketViewedLocally,
  replyToConversation,
  updateConversation,
  selectPrevNextTicketIds,
  fetchTickets,
} from "@Redux/slices/ticketSlice/ticketSlice";
import { useParams, useNavigate } from "react-router-dom";
import moment from "moment";
import { current_logged_user } from "@Utils/helper";
import SocketContext from "@Context/SocketContext";
import { showNotification } from "@Redux/slices/notificationSlice/notificationSlice";
import SingleTicket from "./SingleTicket";
import TicketCsat from "@Components/TicketCsat";

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { onMessage, isConnected } = useContext(SocketContext);
  const { conversations, updatedSingleTicket, totalTickets, tickets, ticketsLoading, currentTickets, totalPages, ticketsLoadingMore } = useSelector((state) => state.tickets);
  const membersLoaded = useSelector((state) => (state.members?.all || []).length > 0);
  const [replyTo, setReplyTo] = useState(null);
  const [ticketData, setTicketData] = useState({});
  const [ticketLoading, setTicketLoading] = useState(false);
  const [showCsat, setShowCsat] = useState(false);

  const dispatch = useDispatch();

  // Both batches start here rather than in an effect. Effects run children
  // first, and in the order they are declared — so a batch started in one has
  // already been overtaken by every fetch above it and in every panel below.
  // Rendering happens top-down, which is the order these are needed in.
  useMemo(() => {
    primeTicketBootstrap();
    primeTicketDetail(id);
  }, [id]);

  useEffect(() => {
    if (!updatedSingleTicket?.id) return;
    const isOwner = Number(updatedSingleTicket?.user_id) === Number(current_logged_user?.user_id);
    const isClosed = ['resolved', 'closed'].includes(updatedSingleTicket?.status);
    const alreadyRated = Boolean(updatedSingleTicket?.meta?.csat?.rating);
    setShowCsat(isOwner && isClosed && !alreadyRated);
  }, [updatedSingleTicket?.id, updatedSingleTicket?.status, updatedSingleTicket?.meta?.csat]);

  // Marks the ticket "seen" by the current user: on open, and again whenever
  // the thread grows while this tab stays open - otherwise reading a new
  // reply without navigating away and back would never update the stamp the
  // other party's "Seen" indicator depends on. Skips the call when the last
  // message is already covered by our own last-viewed stamp (nothing new to
  // mark) or when we authored it ourselves (no "read" to record), so a plain
  // reload of an already-read ticket doesn't fire the API every time.
  useEffect(() => {
    if (!id) return;
    const list = conversations?.[id];
    // Wait for the thread to actually load before deciding - calling blind
    // while it's still empty is exactly the redundant per-reload hit this
    // guard exists to avoid; the effect reruns once the list populates.
    if (!list?.length) return;
    const lastMessage = list[list.length - 1];
    if (Number(lastMessage.user_id) === Number(current_logged_user?.user_id)) return;
    // updatedSingleTicket isn't cleared on navigation, so right after
    // switching tickets it can still hold the PREVIOUS ticket's data for a
    // tick while this ticket's conversations are already cached - guard
    // against reading its last_viewed_by before it actually belongs to `id`.
    const isCurrentTicket = Number(updatedSingleTicket?.id) === Number(id);
    const myLastView = isCurrentTicket
      ? updatedSingleTicket?.meta?.last_viewed_by?.[String(current_logged_user?.user_id)]
      : undefined;
    if (myLastView && moment.utc(myLastView).valueOf() >= moment.utc(lastMessage.created_at).valueOf()) {
      return;
    }
    dispatch(markTicketViewed({ ticket_id: id }));
  }, [id, conversations?.[id]?.length, updatedSingleTicket?.id, updatedSingleTicket?.meta?.last_viewed_by]);

  useEffect(() => {
    (async () => {
      setTicketLoading(true);
      try {
        const res = await dispatch(getTicket({ ticket_id: id })).unwrap();
        setTicketData(res);
      } catch (err) {
        console.error("Error fetching ticket:", err);
      } finally {
        setTicketLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    dispatch(getTicketAllConversations({ ticket_id: id }));
    if (totalTickets === null) {
      // Enough to fill the sidebar in one answer. At ten per page it took three
      // round trips — 15 KB, then 17 KB, then 5 KB, one after another — before
      // the list was tall enough to stop asking.
      dispatch(fetchTickets({ per_page: 30 }));
    }
    // Mentions and the "closed by" name read the member directory. It used to
    // arrive with every page in the community, whether or not anything on that
    // page wanted it; the screens that do want it ask.
    if (!membersLoaded) {
      dispatch(fetchAllMembers({}));
    }
  }, [id]);

  // Fallback polling while the socket is down.
  //
  // This page fetched once on mount and then relied entirely on socket events
  // for everything after — so with the socket unavailable a reply never
  // appeared at all, and the only way to see one was to reload the page. The
  // live chat widget has had this fallback all along; a ticket conversation is
  // the same kind of waiting and had nothing.
  //
  // Deliberately unhurried at ten seconds: a ticket is not a live chat, and the
  // socket is the normal path — this only has to stop the page going stale.
  useEffect(() => {
    if (isConnected) return;

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      dispatch(getTicketAllConversations({ ticket_id: id }));
    }, 10000);

    return () => clearInterval(timer);
  }, [isConnected, id, dispatch]);

  useEffect(() => {
    const unsubscribe = onMessage((data) => {
      handleSocketMessage(data);
    });
    return unsubscribe;
  }, [onMessage]);

  const { prevId, nextId } = useSelector((state) =>
    selectPrevNextTicketIds(state, id)
  );
  const canPrev = Boolean(prevId);
  const canNext = Boolean(nextId);

  const navigateToTicket = (tid) => {
    if (!tid) return;
    navigate(`/ticket/${tid}`);
  };

  const onPrev = () => {
    if (prevId) navigateToTicket(prevId);
  };

  const onNext = () => {
    if (nextId) navigateToTicket(nextId);
  };

  const handleSocketMessage = (event) => {
    try {
      const { action: eventType, data, user_id, conversation_id, ticket_id } = event;
      const isCurrentUser = Number(user_id) === Number(current_logged_user?.user_id);

      switch (eventType) {
        case "conversation_created":
          if (data?.need_to_refetch) {
            dispatch(getTicketAllConversations({ ticket_id: id }));
            return;
          }
          // Always dispatch — addConversation dedupes by id, so this is a
          // no-op for messages the sender already has via their own optimistic
          // create, but it's required for system messages (e.g. an engineering
          // issue link/create) that never went through a local thunk.
          dispatch(addConversation({ ticket_id, data }));
          if (!isCurrentUser) {
            dispatch(
              showNotification({
                message: __("New Message", "zencommunity"),
                isShow: true,
                type: "notification",
              })
            );
          }
          break;

        case "reply_created":
          dispatch(
            replyToConversation({
              ticket_id,
              conversation_id: data.parent_id,
              data,
            })
          );
          break;

        case "conversation_updated":
          dispatch(
            updateConversation({
              ticket_id,
              conversation_id,
              data,
            })
          );
          break;

        case "conversation_deleted":
          dispatch(
            deleteConversation({
              ticket_id,
              conversation_id,
            })
          );
          break;

        case "ticket_viewed":
          dispatch(
            markTicketViewedLocally({
              ticket_id,
              user_id,
              viewed_at: data?.viewed_at,
            })
          );
          break;

        default:
          break;
      }
    } catch (err) {
      console.error("WS message parse error:", err);
    }
  };

  return (
    <Box className="zencom-ticket-details" width={'100%'}>
      <TicketCsat ticket={updatedSingleTicket} isOpen={showCsat} onClose={() => setShowCsat(false)} />

      <SingleTicket
        id={id}
        conversations={conversations}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        ticketLoading={ticketLoading}
        ticketData={ticketData}
        updatedSingleTicket={updatedSingleTicket}
        totalTickets={totalTickets}
        onPrev={onPrev}
        onNext={onNext}
        canPrev={canPrev}
        canNext={canNext}
        ticketsLoading={ticketsLoading}
        ticketsLoadingMore={ticketsLoadingMore}
        tickets={tickets}
        currentTickets={currentTickets}
        totalPages={totalPages}
      />
    </Box>
  );
};

export default TicketDetails;
