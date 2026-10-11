import React, { useEffect, useState } from "react";
import { takeBootstrapValue, ticketScope } from '@Utils/bootstrap';
import { Box, Flex, Text, Spinner } from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";
import { useDispatch } from "react-redux";
import { FiRefreshCw, FiExternalLink } from "react-icons/fi";
import { API, namespace } from "@Utils/helper";
import { getTicket } from "@Redux/slices/ticketSlice/ticketSlice";
import { showNotification } from "@Redux/slices/notificationSlice/notificationSlice";
import LoadingButton from "@Components/LoadingButton";
import { AccordionHeader, SidebarSection } from "./SidebarSection";

const STATUS_COLORS = {
    completed: "#0F9D58",
    processing: "#2A3BEE",
    on_hold: "#E8A13A",
    pending_payment: "#E8A13A",
    payment_confirmed: "#2A3BEE",
    refunded: "#A2ADB9",
    cancelled: "#E2483D",
    payment_failed: "#E2483D",
    active: "#0F9D58",
};

const fieldStyle = {
    width: "100%",
    fontSize: "14px",
    border: "1px solid var(--zencom-border-color)",
    borderRadius: "8px",
    padding: "8px 10px",
    background: "var(--zencom-background)",
    color: "var(--zencom-font-color)",
    outline: "none",
};

const StatusBadge = ({ status, label }) => (
    <Box as="span" fontSize="11px" fontWeight="600" textTransform="capitalize" color="#fff"
        bg={STATUS_COLORS[status] || "#738496"} borderRadius="4px" padding="2px 8px">
        {label || String(status || "").replace(/_/g, " ")}
    </Box>
);

const money = (currency, amount) =>
    `${currency ? currency + " " : ""}${Number(amount || 0).toFixed(2)}`;

const CustomerPurchasesPanel = ({ ticketData }) => {
    const dispatch = useDispatch();
    const ticketId = ticketData?.id;
    const requesterEmail = ticketData?.email || "";
    const metaPurchase = ticketData?.meta?.purchase_email || "";

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [useOverride, setUseOverride] = useState(!!(metaPurchase && metaPurchase !== requesterEmail));
    const [overrideEmail, setOverrideEmail] = useState(metaPurchase || "");

    const notify = (message, type = "success") =>
        dispatch(showNotification({ message, type, isShow: true }));

    const load = async (refresh = false) => {
        if (!ticketId) return;
        setLoading(true);
        try {
            const preloaded = refresh ? undefined : await takeBootstrapValue('purchases', ticketScope(ticketId));
            const { data } = undefined !== preloaded
                ? { data: preloaded }
                : await API.get(`${namespace}/ticket/${ticketId}/purchases${refresh ? "?refresh=1" : ""}`);
            setData(data || null);
        } catch (e) {
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        setUseOverride(!!(metaPurchase && metaPurchase !== requesterEmail));
        setOverrideEmail(metaPurchase || "");
    }, [ticketId]);

    const saveEmail = async () => {
        const purchase_email = useOverride ? overrideEmail.trim() : "";
        if (useOverride && !/^\S+@\S+\.\S+$/.test(purchase_email)) {
            notify(__("Enter a valid purchase email.", "zencommunity"), "warning");
            return;
        }
        await API.post(`${namespace}/ticket/${ticketId}/purchase-email`, {
            purchase_email,
            confirmed: true,
        });
        await dispatch(getTicket({ ticket_id: ticketId }));
        await load(true);
        notify(__("Purchase email saved.", "zencommunity"));
    };

    // Hidden entirely when the integration is off (configure it in Ticket Settings).
    if (data && data.enabled === false) return null;

    const found = data?.found;
    const orders = data?.orders || [];
    const subs = data?.subscriptions || [];

    return (
        <SidebarSection>
            <AccordionHeader isOpen={open} onClick={() => setOpen(!open)}>
                {__("Purchases", "zencommunity")}
            </AccordionHeader>

            {open && (
                <Box p="4px 16px 14px 16px">
                    {/* Purchase email control */}
                    <Flex direction="column" mb="24px">
                        <Flex as="label" alignItems="center" gap="8px" cursor="pointer">
                            <input type="checkbox" checked={!useOverride}
                                onChange={(e) => { setUseOverride(!e.target.checked); }} />
                            <Text fontSize="14px" lineHeight="20px" color="var(--zencom-primary-light-font-color)">
                                {__("Registered email is the purchase email", "zencommunity")}
                            </Text>
                        </Flex>
                        <Text fontSize="14px" lineHeight="20px" color="var(--zencom-primary-light-font-color)" m="16px 0 24px 0">
                            {__("Looking up", "zencommunity")}: <b>{data?.email || requesterEmail || "—"}</b>
                        </Text>
                        {useOverride && (
                            <Box as="input" type="email" value={overrideEmail}
                                onChange={(e) => setOverrideEmail(e.target.value)}
                                placeholder={__("purchase@email.com", "zencommunity")} css={fieldStyle} />
                        )}
                        <Flex gap="8px">
                            <LoadingButton bg="var(--zencom-primary-color)" color="#fff" size="sm" width="57%" onClick={saveEmail}>
                                {__("Save & fetch", "zencommunity")}
                            </LoadingButton>
                            <LoadingButton bg="var(--zencom-background)" color="var(--zencom-font-color)"
                                border="1px solid var(--zencom-border-color)" size="sm" onClick={() => load(true)}>
                                <FiRefreshCw style={{ marginRight: 6 }} /> {__("Refresh", "zencommunity")}
                            </LoadingButton>
                        </Flex>
                    </Flex>

                    {/* Readout */}
                    {loading ? (
                        <Flex align="center" gap="8px" color="var(--zencom-gray-color)" fontSize="13px">
                            <Spinner size="xs" /> {__("Loading purchases…", "zencommunity")}
                        </Flex>
                    ) : data?.error ? (
                        <Text fontSize="13px" color="var(--zencom-warning)">{data.error}</Text>
                    ) : !found ? (
                        <Text fontSize="13px" color="var(--zencom-gray-color)">
                            {__("No purchases found for this email.", "zencommunity")}
                        </Text>
                    ) : (
                        <Flex direction="column" gap="10px">
                            <Flex justify="space-between" align="center" flexWrap="wrap" gap="6px" bg="var(--zencom-secondary-color)" borderRadius="8px" p={3} mb={4}>
                                {data?.customer?.name ? (
                                    <Text fontSize="13px" fontWeight="500" color="var(--zencom-font-color)">
                                        {data.customer.name}
                                    </Text>
                                ) : <span />}
                                <Text fontSize="13px" color="var(--zencom-font-color)">
                                    {__("Total spent", "zencommunity")}: <b>{money(data.currency, data.total_spent)}</b>
                                </Text>
                            </Flex>

                            {orders.map((o) => (
                                <Box key={o.id} p="8px 10px" border="1px solid var(--zencom-border-color)" borderRadius="8px">
                                    <Flex justify="space-between" align="center" gap="8px" mb="8px">
                                        <Flex align="center" gap="6px">
                                            {o.url ? (
                                                <a href={o.url} target="_blank" rel="noreferrer"
                                                    style={{ fontSize: 13, fontWeight: 600, color: "var(--zencom-primary-color)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                                    #{o.id} <FiExternalLink size={12} />
                                                </a>
                                            ) : <Text fontSize="14px" fontWeight="600">#{o.id}</Text>}
                                            <StatusBadge status={o.status} label={o.status_label} />
                                        </Flex>
                                        <Text fontSize="14px" fontWeight="500" color="var(--zencom-font-color)">
                                            {money(data.currency, o.total)}
                                        </Text>
                                    </Flex>
                                    <Text fontSize="14px" color="var(--zencom-primary-light-font-color)">
                                        {o.date}
                                        {o.items?.length ? " · " + o.items.map((i) => i.qty > 1 ? `${i.name} ×${i.qty}` : i.name).join(", ") : ""}
                                    </Text>
                                </Box>
                            ))}

                            {subs.length > 0 && (
                                <Box>
                                    <Text fontSize="14px" fontWeight="600" color="var(--zencom-font-color)" mb="4px">
                                        {__("Subscriptions", "zencommunity")}
                                    </Text>
                                    <Flex direction="column" gap="6px">
                                        {subs.map((s) => (
                                            <Flex key={s.id} justify="space-between" align="center" gap="8px">
                                                <Flex align="center" gap="6px">
                                                    <Text fontSize="14px" color="var(--zencom-primary-light-font-color)">#{s.id}</Text>
                                                    <StatusBadge status={s.status} label={s.status_label} />
                                                </Flex>
                                                {s.next_payment ? (
                                                    <Text fontSize="14px" color="var(--zencom-gray-color)">
                                                        {__("Next", "zencommunity")}: {s.next_payment}
                                                    </Text>
                                                ) : <span />}
                                            </Flex>
                                        ))}
                                    </Flex>
                                </Box>
                            )}
                        </Flex>
                    )}
                </Box>
            )}
        </SidebarSection>
    );
};

export default CustomerPurchasesPanel;
