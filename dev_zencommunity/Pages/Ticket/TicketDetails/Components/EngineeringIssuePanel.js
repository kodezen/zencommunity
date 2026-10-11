import React, { useEffect, useRef, useState } from "react";
import { takeBootstrapValue, ticketScope } from '@Utils/bootstrap';
import { Box, Flex, Text } from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";
import { useDispatch } from "react-redux";
import { IoCloseOutline } from "react-icons/io5";
import { RxPencil2 } from "react-icons/rx";
import { API, namespace } from "@Utils/helper";
import { getTicket, getTicketAllConversations } from "@Redux/slices/ticketSlice/ticketSlice";
import { showNotification } from "@Redux/slices/notificationSlice/notificationSlice";
import LoadingButton from "@Components/LoadingButton";
import IssueDrawer from "@Pages/Engineering/IssueDrawer";
import { fetchMembersByRoles } from "@Utils/roles";
import { AccordionHeader, SidebarSection } from "./SidebarSection";

const STATUS_COLORS = {
    open: "#738496",
    "in-progress": "#2A3BEE",
    fixed: "#0F9D58",
    released: "#0F9D58",
    wontfix: "#A2ADB9",
    duplicate: "#A2ADB9",
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

const StatusBadge = ({ status }) => (
    <Box
        as="span"
        fontSize="11px"
        fontWeight="600"
        textTransform="capitalize"
        color="#fff"
        bg={STATUS_COLORS[status] || "#738496"}
        borderRadius="4px"
        padding="2px 8px"
    >
        {String(status || "").replace("-", " ")}
    </Box>
);

const EngineeringIssuePanel = ({ ticketData }) => {
    const dispatch = useDispatch();
    const ticketId = ticketData?.id;

    const [open, setOpen] = useState(false);
    const [linked, setLinked] = useState(null);
    const [issues, setIssues] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [editing, setEditing] = useState(false);
    const [products, setProducts] = useState([]);
    const [agents, setAgents] = useState([]);

    // Pre-fill the "or create new" input with the ticket's title when the panel
    // is first opened. Guard on !newTitle so a user-edited value is never clobbered.
    useEffect(() => {
        if (open && !newTitle && ticketData?.title) {
            setNewTitle(ticketData.title);
        }
    }, [open]);
    // null = settings not loaded yet; missing/failed fetch defaults to enabled
    const [enabledSetting, setEnabledSetting] = useState(null);

    useEffect(() => {
        let cancelled = false;

        takeBootstrapValue('eng_settings', 'ticket')
            .then((preloaded) => (undefined !== preloaded ? { data: preloaded } : API.get(`${namespace}/eng-issue/settings`)))
            .then(({ data }) => {
                if (!cancelled) setEnabledSetting(data?.enabled_on_ticket !== false);
            })
            .catch(() => {
                if (!cancelled) setEnabledSetting(true);
            });
        return () => { cancelled = true; };
    }, []);

    const loadLinked = async () => {
        try {
            const preloaded = await takeBootstrapValue('eng_issue', ticketScope(ticketId));
            const { data } = undefined !== preloaded
                ? { data: preloaded }
                : await API.get(`${namespace}/ticket/${ticketId}/eng-issue`);

            setLinked(data || null);
        } catch (e) {
            setLinked(null);
        }
    };

    const loadIssues = async () => {
        try {
            const { data } = await API.get(`${namespace}/eng-issues?per_page=100&order_by=updated_at`);
            setIssues(data?.records || []);
        } catch (e) {
            setIssues([]);
        }
    };

    useEffect(() => {
        if (!ticketId || enabledSetting !== true) return;
        loadLinked();
    }, [ticketId, enabledSetting]);

    // The list of every open engineering issue only fills the picker inside
    // this panel, and the panel starts collapsed. Fetching it on mount cost a
    // request on every ticket anyone opened, for a dropdown almost nobody
    // unfolds; it loads the first time someone does.
    const issuesLoadedRef = useRef(false);

    useEffect(() => {
        if (!open || issuesLoadedRef.current) return;
        if (!ticketId || enabledSetting !== true) return;

        issuesLoadedRef.current = true;
        loadIssues();
    }, [open, ticketId, enabledSetting]);

    const notify = (message, type = "success") =>
        dispatch(showNotification({ message, type, isShow: true }));

    const linkIssue = async (engIssueId) => {
        if (!engIssueId) {
            notify(__("Please select an engineering issue.", "zencommunity"), "warning");
            return;
        }
        await API.post(`${namespace}/eng-issue/${engIssueId}/link`, { ticket_id: ticketId });
        await loadLinked();
        dispatch(getTicket({ ticket_id: ticketId }));
        // Linking posts a system message into the ticket's conversation thread
        // server-side. Refetch directly instead of waiting on the websocket
        // broadcast, which the panel's own fetch() call never triggers/awaits.
        dispatch(getTicketAllConversations({ ticket_id: ticketId }));
        notify(__("Ticket linked to engineering issue.", "zencommunity"));
    };

    // Auto-create an engineering issue prefilled from this ticket, then link it.
    const createFromTicket = async () => {
        const { data } = await API.post(`${namespace}/eng-issues`, {
            title: ticketData?.title || __("Issue from ticket", "zencommunity"),
            description: ticketData?.content || "",
            product_id: ticketData?.product_id ? Number(ticketData.product_id) : 0,
        });
        const id = data?.id;
        await loadIssues();
        if (id) await linkIssue(id);
    };

    const createAndLink = async () => {
        if (!newTitle.trim()) {
            notify(__("Enter a title for the new issue.", "zencommunity"), "warning");
            return;
        }
        const { data } = await API.post(`${namespace}/eng-issues`, {
            title: newTitle.trim(),
            product_id: ticketData?.product_id ? Number(ticketData.product_id) : 0,
        });
        const id = data?.id;
        setNewTitle("");
        await loadIssues();
        if (id) await linkIssue(id);
    };

    // Loaded on demand since the drawer's product/assignee selects need them,
    // but most tickets never open the editor.
    const openEditor = async () => {
        if (!products.length) {
            try {
                const { data } = await API.get(`${namespace}/ticket/products?per_page=100&status=published`);
                setProducts((data?.records || []).map((p) => ({ id: p.id, name: p.name })));
            } catch (e) { /* ignore */ }
        }
        if (!agents.length) {
            try {
                const records = await fetchMembersByRoles();
                setAgents(records.map((m) => ({ id: m.id, name: `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email })));
            } catch (e) { /* ignore */ }
        }
        setEditing(true);
    };

    const unlink = async () => {
        await API.post(`${namespace}/eng-issue/unlink`, { ticket_id: ticketId });
        setLinked(null);
        setSelectedId("");
        dispatch(getTicket({ ticket_id: ticketId }));
        notify(__("Ticket unlinked from engineering issue.", "zencommunity"));
    };

    if (enabledSetting !== true) return null;

    return (
        <SidebarSection>
            <AccordionHeader isOpen={open} onClick={() => setOpen(!open)}>
                {__("Engineering issue", "zencommunity")}
            </AccordionHeader>

            {open && (
                <Box p="4px 16px 14px 16px">
                    {linked ? (
                        <Flex direction="column" gap="8px">
                            <Flex justifyContent="space-between" alignItems="flex-start" gap="8px">
                                <Text fontSize="14px" fontWeight="500" color="var(--zencom-font-color)">
                                    {linked.title}
                                </Text>
                                <Flex gap="8px" alignItems="center" flexShrink={0}>
                                    <Box _hover={{ color: "var(--zencom-primary-color)" }} title={__("Edit", "zencommunity")}>
                                        <RxPencil2 cursor="pointer" onClick={openEditor} />
                                    </Box>
                                    <Box _hover={{ color: "#E2483D" }} title={__("Unlink", "zencommunity")}>
                                        <IoCloseOutline cursor="pointer" onClick={unlink} />
                                    </Box>
                                </Flex>
                            </Flex>
                            <Flex gap="8px" alignItems="center" flexWrap="wrap">
                                <StatusBadge status={linked.status} />
                                <Text fontSize="12px" color="var(--zencom-gray-color)">
                                    {/* translators: %d: number of linked tickets */}
                                    {(linked.affected_count || 0)} {__("ticket(s) affected", "zencommunity")}
                                </Text>
                            </Flex>
                            {linked.fixed_in_version ? (
                                <Text fontSize="12px" color="var(--zencom-gray-color)">
                                    {__("Fixed in", "zencommunity")} {linked.fixed_in_version}
                                </Text>
                            ) : null}
                        </Flex>
                    ) : (
                        <Flex direction="column" gap="10px">
                            <Text fontSize="14px" color="var(--zencom-primary-light-font-color)">
                                {__("Link this ticket to an engineering issue so it's tracked with the dev work.", "zencommunity")}
                            </Text>

                            <LoadingButton
                                bg="var(--zencom-primary-color)"
                                color="#fff"
                                size="sm"
                                onClick={createFromTicket}
                            >
                                {__("Create issue from this ticket", "zencommunity")}
                            </LoadingButton>

                            <Flex alignItems="center" gap="8px" my="2px">
                                <Box flex="1" height="1px" bg="var(--zencom-border-color)" />
                                <Text fontSize="12px" color="var(--zencom-primary-light-font-color)">{__("or link existing", "zencommunity")}</Text>
                                <Box flex="1" height="1px" bg="var(--zencom-border-color)" />
                            </Flex>

                            <Box as="select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} css={fieldStyle}>
                                <option value="">{__("Select an issue…", "zencommunity")}</option>
                                {issues.map((it) => (
                                    <option key={it.id} value={it.id}>
                                        {it.title} ({(it.affected_count || 0)})
                                    </option>
                                ))}
                            </Box>
                            <LoadingButton
                                bg="var(--zencom-primary-color)"
                                color="#fff"
                                size="sm"
                                onClick={() => linkIssue(selectedId)}
                            >
                                {__("Link", "zencommunity")}
                            </LoadingButton>

                            <Flex alignItems="center" gap="8px" my="4px">
                                <Box flex="1" height="1px" bg="var(--zencom-border-color)" />
                                <Text fontSize="12px" color="var(--zencom-primary-light-font-color)">{__("or create new", "zencommunity")}</Text>
                                <Box flex="1" height="1px" bg="var(--zencom-border-color)" />
                            </Flex>

                            <Box
                                as="input"
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder={__("New issue title…", "zencommunity")}
                                css={fieldStyle}
                            />
                            <LoadingButton
                                bg="var(--zencom-background)"
                                color="var(--zencom-primary-color)"
                                border="1px solid var(--zencom-primary-color)"
                                size="sm"
                                onClick={createAndLink}
                            >
                                {__("Create & link", "zencommunity")}
                            </LoadingButton>
                        </Flex>
                    )}
                </Box>
            )}

            {editing && (
                <IssueDrawer
                    issueId={linked.id}
                    products={products}
                    agents={agents}
                    onClose={() => setEditing(false)}
                    onChanged={loadLinked}
                />
            )}
        </SidebarSection>
    );
};

export default EngineeringIssuePanel;
