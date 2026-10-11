import React from 'react';
import { Flex, Icon } from "@chakra-ui/react";
import { __, sprintf } from "@wordpress/i18n";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { FiRefreshCw } from "react-icons/fi";
import { LuLock } from "react-icons/lu";
import ZCLabel from "@Components/Chakra/Labels/ZCLabel";
import LoadingButton from "@Components/LoadingButton";
import { updateTicket } from "@Redux/slices/ticketSlice/ticketSlice";
import { useStyles } from "@Utils/chakra";

/**
 * Shown above the conversation thread when a ticket is closed. The reference
 * design (FluentSupport-style) also shows an inline "Ticket has been closed"
 * system note in the thread too - that part still isn't buildable, since
 * closing a ticket doesn't emit any conversation/activity record (only the
 * ticket's own meta.closed_by/closed_at, set server-side in
 * TicketModel::update()). "by {name}" now uses that - it's null for tickets
 * closed before this existed or auto-closed by the system (AutoClose::
 * run_auto_close() passes no actor), so the "by" clause just drops out then.
 */
const ClosedTicketBanner = ({ id, updatedSingleTicket }) => {
    const dispatch = useDispatch();
    const { primaryBtnInsideContentTrans, responsiveContentTicket } = useStyles();
    const members = useSelector(state => state.members?.all) || [];

    if (updatedSingleTicket?.status !== "closed") return null;

    const closedAt = updatedSingleTicket?.meta?.closed_at || updatedSingleTicket?.updated_at;
    const closedOn = closedAt ? moment.utc(closedAt).local().format('YYYY-MM-DD HH:mm:ss') : null;

    const closedByUser = members.find(
        (m) => Number(m.id) === Number(updatedSingleTicket?.meta?.closed_by)
    );
    const closedByName = closedByUser
        ? `${closedByUser.first_name || ''} ${closedByUser.last_name || ''}`.trim() || closedByUser.username
        : null;

    return (
        <Flex
            direction="column"
            align="center"
            textAlign="center"
            gap="10px"
            // Matches Conversations/index.js's own inner content width (same
            // shared style) - the right sidebar is `position: fixed` and out
            // of normal flow, so without this the banner's plain 100% width
            // reads off the whole flex column and runs under both sidebars
            // instead of stopping at the same edges as the conversation below it.
            {...responsiveContentTicket}
            padding="16px"
            mt="16px"
            mb="16px"
            borderRadius="8px"
            border="1px solid var(--zencom-border-color)"
            background="var(--zencom-secondary-color)"
        >
            <Flex align="center" gap="8px">
                <Icon as={LuLock} boxSize="16px" color="var(--zencom-font-color)" />
                <ZCLabel
                    label={__("Closed Ticket", "zencommunity")}
                    fontSize="15px"
                    fontWeight="600"
                />
            </Flex>

            {closedOn && (
                <ZCLabel
                    label={
                        closedByName
                            // translators: 1: close date/time, 2: name of the person who closed the ticket
                            ? sprintf(__("This ticket was closed on %1$s by %2$s", "zencommunity"), closedOn, closedByName)
                            : sprintf(__("This ticket was closed on %s", "zencommunity"), closedOn)
                    }
                    fontSize="13px"
                    color="var(--zencom-font-color)"
                />
            )}

            <LoadingButton
                {...primaryBtnInsideContentTrans}
                onClick={() => dispatch(updateTicket({ ticket_id: id, payload: { status: "in-progress" } }))}
            >
                <Icon as={FiRefreshCw} boxSize="14px" marginRight="6px" />
                {__("Reopen This Ticket", "zencommunity")}
            </LoadingButton>
        </Flex>
    );
};

export default ClosedTicketBanner;
