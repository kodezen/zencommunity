import React, { useEffect, useState } from "react";
import { Box, Checkbox, Flex, Table, Text } from "@chakra-ui/react";
import { __, sprintf } from "@wordpress/i18n";
import Select from "react-select";
import { useDispatch } from "react-redux";
import { RiDeleteBinLine } from "react-icons/ri";
import { LuBug } from "react-icons/lu";
import { API, namespace, baseURL, current_logged_user, global_roles } from "@Utils/helper";
import { useStyles } from "@Utils/chakra";
import { showNotification } from "@Redux/slices/notificationSlice/notificationSlice";
import LoadingButton from "@Components/LoadingButton";
import LeftContainer from "@Components/Layouts/LeftContainer";
import LeftSidebar from "@Components/Sidebar/LeftSidebar";
import CenterContainer from "@Components/Layouts/CenterContainer";
import ZenComMenu from "@Components/ZenComMenu";
import CreateIssueForm from "./CreateIssueForm";
import IssueDrawer from "./IssueDrawer";
import DeveloperIssueView from "./DeveloperIssueView";
import { STATUSES, fieldStyle, labelTxt, StatusBadge, PriorityBadge } from "./helper";
import { fetchMembersByRoles, ROLE_SUPPORT_AGENT, ROLE_DEVELOPER } from "@Utils/roles";

const PER_PAGE = 15;

const HeaderCell = ({ children, ...rest }) => (
    <Table.ColumnHeader fontSize="12px" fontWeight="600" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)" textTransform="uppercase" p="10px 16px" {...rest}>
        {children}
    </Table.ColumnHeader>
);

const filterSelectProps = {
    classNamePrefix: "zen-com-select",
    className: "zen-com-select zen-com-select--150",
    menuPortalTarget: typeof document !== "undefined" ? document.body : null,
    styles: { menuPortal: (base) => ({ ...base, zIndex: 1500 }), container: (base) => ({ ...base, minWidth: "200px" }) },
};

// The full list/management view — support_agent/admin only. A developer
// can't call eng-issues list/create, so they get DeveloperIssueView instead
// (see the Engineering wrapper below).
const EngineeringManagerView = () => {
    const { primaryBtnInsideContent } = useStyles();
    const dispatch = useDispatch();
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("");
    const [assignee, setAssignee] = useState("");
    const [search, setSearch] = useState("");
    const [debounced, setDebounced] = useState("");
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [activeId, setActiveId] = useState(null);
    const [products, setProducts] = useState([]);
    const [agents, setAgents] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 600);
        return () => clearTimeout(t);
    }, [search]);

    // Shared option sources for the create form + issue drawer.
    useEffect(() => {
        (async () => {
            try {
                const { data } = await API.get(`${namespace}/ticket/products?per_page=100&status=published`);
                setProducts((data?.records || []).map((p) => ({ id: p.id, name: p.name })));
            } catch (e) { /* ignore */ }
            try {
                const records = await fetchMembersByRoles();
                setAgents(records.map((m) => ({ id: m.id, name: `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email })));
            } catch (e) { /* ignore */ }
        })();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            // Fetch the filtered set (up to 100) and sort by affected-count GLOBALLY,
            // then paginate client-side so "most-affected first" is correct across pages.
            const params = new URLSearchParams({ page: "1", per_page: "100", order_by: "updated_at", order: "desc" });
            if (status) params.set("status", status);
            if (assignee) params.set("assignee_id", String(assignee));
            if (debounced) params.set("search", debounced);
            const { data } = await API.get(`${namespace}/eng-issues?${params.toString()}`);
            const records = (data?.records || []).slice().sort((a, b) => (b.affected_count || 0) - (a.affected_count || 0));
            setItems(records);
        } catch (e) {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [status, assignee, debounced]);
    useEffect(() => { setPage(1); setSelectedIds([]); }, [status, assignee, debounced]);

    const agentName = (id) => agents.find((a) => Number(a.id) === Number(id))?.name || "—";
    const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
    const pageItems = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const pageIds = pageItems.map((it) => it.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

    const toggleId = (id) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };
    const toggleAllOnPage = () => {
        setSelectedIds((prev) => allPageSelected
            ? prev.filter((id) => !pageIds.includes(id))
            : [...new Set([...prev, ...pageIds])]);
    };

    const deleteIssues = async (ids) => {
        await Promise.all(ids.map((id) => API.delete(`${namespace}/eng-issue/${id}`)));
        setItems((prev) => prev.filter((it) => !ids.includes(it.id)));
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    };

    const handleDelete = async (id) => {
        if (!window.confirm(__("Delete this engineering issue? This cannot be undone.", "zencommunity"))) return;
        try {
            await deleteIssues([id]);
            dispatch(showNotification({ message: __("Engineering issue deleted.", "zencommunity"), type: "success", isShow: true }));
        } catch (e) {
            dispatch(showNotification({ message: __("Failed to delete engineering issue.", "zencommunity"), type: "error", isShow: true }));
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!window.confirm(__("Delete the selected engineering issues? This cannot be undone.", "zencommunity"))) return;
        setBulkDeleting(true);
        try {
            await deleteIssues(selectedIds);
            dispatch(showNotification({ message: __("Engineering issues deleted.", "zencommunity"), type: "success", isShow: true }));
        } catch (e) {
            dispatch(showNotification({ message: __("Failed to delete some engineering issues.", "zencommunity"), type: "error", isShow: true }));
        } finally {
            setBulkDeleting(false);
        }
    };

    return (
        <>
        <LeftContainer><LeftSidebar /></LeftContainer>
        <CenterContainer>
        <Box p="24px" maxWidth="1100px" mx="auto" width="100%">
            <Flex justifyContent="space-between" alignItems="center" mb="4px">
                <Text fontSize="22px" fontWeight="600" color="var(--zencom-font-color)">{__("Engineering", "zencommunity")}</Text>
                <LoadingButton {...primaryBtnInsideContent} onClick={() => setShowCreate(true)}>
                    {__("New issue", "zencommunity")}
                </LoadingButton>
            </Flex>
            
            <Text fontSize="13px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)" mb="24px">
                {__("Dev-side issues that support tickets link into. Sorted by how many tickets are affected.", "zencommunity")}
            </Text>

            <Box bg="var(--zencom-background)" p={6}>
                <Flex gap="12px" mb="16px" flexWrap="wrap">
                <Box as="input" type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder={__("Search issues…", "zencommunity")} css={{ ...fieldStyle, maxWidth: "280px" }} />
                <Select
                    {...filterSelectProps}
                    options={[{ label: __("All statuses", "zencommunity"), value: "" }, ...STATUSES.map((s) => ({ label: labelTxt(s), value: s }))]}
                    value={status ? { label: labelTxt(status), value: status } : { label: __("All statuses", "zencommunity"), value: "" }}
                    onChange={(option) => setStatus(option ? option.value : "")}
                />
                <Select
                    {...filterSelectProps}
                    options={[
                        { label: __("All assignees", "zencommunity"), value: "" },
                        ...(current_logged_user?.user_id ? [{ label: __("Assigned to me", "zencommunity"), value: String(current_logged_user.user_id) }] : []),
                        ...agents.map((a) => ({ label: a.name, value: String(a.id) })),
                    ]}
                    value={
                        assignee
                            ? {
                                label: String(assignee) === String(current_logged_user?.user_id)
                                    ? __("Assigned to me", "zencommunity")
                                    : agentName(assignee),
                                value: String(assignee),
                            }
                            : { label: __("All assignees", "zencommunity"), value: "" }
                    }
                    onChange={(option) => setAssignee(option ? option.value : "")}
                />
                </Flex>

                {selectedIds.length > 0 && (
                    <Flex
                        position="fixed" bottom="24px" left="50%" transform="translateX(-50%)" zIndex="1300"
                        alignItems="center" gap="16px" p="10px 16px"
                        border="1px solid var(--zencom-border-color)" borderRadius="8px"
                        bg="var(--zencom-background)" boxShadow="0 8px 24px rgba(20,26,36,0.18)"
                        maxWidth="400px"
                        width="100%"
                        justifyContent="space-between"
                    >
                        <Text fontSize="13px" fontWeight="500" color="var(--zencom-font-color)" whiteSpace="nowrap">
                            {`${selectedIds.length} ${sprintf(__("%s selected", "zencommunity"), selectedIds.length > 1 ? "items" : "item")}`}
                        </Text>
                        <Flex gap="8px">
                            <LoadingButton bg="var(--zencom-secondary-color)" color="var(--zencom-font-color)" size="sm"
                                onClick={() => setSelectedIds([])}>
                                {__("Clear", "zencommunity")}
                            </LoadingButton>
                            <LoadingButton bg="#E2483D" color="#fff" size="sm" loading={bulkDeleting} onClick={handleBulkDelete}>
                                {__("Delete", "zencommunity")}
                            </LoadingButton>
                        </Flex>
                    </Flex>
                )}

                <Box border="1px solid var(--zencom-border-color)" borderRadius="6px" overflow="hidden" bg="var(--zencom-background)">
                    <Table.Root size="sm" variant="unstyled">
                        <Table.Header>
                            <Table.Row bg="var(--zencom-body-background)" borderBottom="1px solid var(--zencom-border-color)">
                                <HeaderCell w="40px">
                                    <Checkbox.Root cursor="pointer" size="sm" checked={allPageSelected} onCheckedChange={toggleAllOnPage}>
                                        <Checkbox.HiddenInput />
                                        <Checkbox.Control />
                                    </Checkbox.Root>
                                </HeaderCell>
                                <HeaderCell fontSize="14px" fontWeight="500" color="var(--zencom-font-color)" textTransform="capitalize">{__("Issue", "zencommunity")}</HeaderCell>
                                <HeaderCell fontSize="14px" fontWeight="500" color="var(--zencom-font-color)" w="110px" textTransform="capitalize">{__("Status", "zencommunity")}</HeaderCell>
                                <HeaderCell fontSize="14px" fontWeight="500" color="var(--zencom-font-color)" w="90px" textTransform="capitalize">{__("Priority", "zencommunity")}</HeaderCell>
                                <HeaderCell fontSize="14px" fontWeight="500" color="var(--zencom-font-color)" w="130px" textTransform="capitalize">{__("Assignee", "zencommunity")}</HeaderCell>
                                <HeaderCell fontSize="14px" fontWeight="500" color="var(--zencom-font-color)" w="80px" textTransform="capitalize" textAlign="center">{__("Tickets", "zencommunity")}</HeaderCell>
                                <HeaderCell fontSize="14px" fontWeight="500" color="var(--zencom-font-color)" w="90px" textTransform="capitalize">{__("Fixed in", "zencommunity")}</HeaderCell>
                                <HeaderCell fontSize="14px" fontWeight="500" color="var(--zencom-font-color)" w="40px" textTransform="capitalize" />
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {loading ? (
                                <Table.Row>
                                    <Table.Cell colSpan={8} p="24px">
                                        <Text fontSize="14px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">{__("Loading…", "zencommunity")}</Text>
                                    </Table.Cell>
                                </Table.Row>
                            ) : items.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan={8} p={0}>
                                        <Flex direction="column" align="center" justify="center" gap="10px" py="48px" px="24px">
                                            <LuBug size={32} color="var(--zencom-border-color)" />
                                            <Text fontSize="14px" fontWeight="500" color="var(--zencom-font-color)">
                                                {__("No engineering issues yet", "zencommunity")}
                                            </Text>
                                            <Text fontSize="13px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)" textAlign="center" maxWidth="320px">
                                                {__("Dev-side issues linked from support tickets will show up here.", "zencommunity")}
                                            </Text>
                                        </Flex>
                                    </Table.Cell>
                                </Table.Row>
                            ) : (
                                pageItems.map((it, idx) => (
                                    <Table.Row key={it.id} cursor="pointer"
                                        borderBottom={idx === pageItems.length - 1 ? "" : "1px solid var(--zencom-border-color)"}
                                        _hover={{ bg: "var(--zencom-body-background)" }} onClick={() => setActiveId(it.id)}>
                                        <Table.Cell p="12px 16px" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox.Root cursor="pointer" size="sm" checked={selectedIds.includes(it.id)} onCheckedChange={() => toggleId(it.id)}>
                                                <Checkbox.HiddenInput />
                                                <Checkbox.Control />
                                            </Checkbox.Root>
                                        </Table.Cell>
                                        <Table.Cell p="12px 16px" maxW="0">
                                            <Text fontSize="14px" fontWeight="500" color="var(--zencom-font-color)" truncate>{it.title}</Text>
                                            <Text fontSize="11px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">#{it.id}</Text>
                                        </Table.Cell>
                                        <Table.Cell p="12px 16px"><StatusBadge status={it.status} /></Table.Cell>
                                        <Table.Cell p="12px 16px"><PriorityBadge priority={it.priority} /></Table.Cell>
                                        <Table.Cell p="12px 16px">
                                            <Text fontSize="13px" color="var(--zencom-font-color)" truncate>{it.assignee_id ? agentName(it.assignee_id) : "—"}</Text>
                                        </Table.Cell>
                                        <Table.Cell p="12px 16px" textAlign="center" onClick={(e) => e.stopPropagation()}>
                                            {it.affected_count > 0 ? (
                                                <a
                                                    href={baseURL(`/tickets?eng_issue_id=${it.id}`)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title={__("Open affected tickets in a new tab", "zencommunity")}
                                                    style={{ color: "var(--zencom-primary-color)", fontWeight: 600, fontSize: "14px", textDecoration: "underline" }}
                                                >
                                                    {it.affected_count}
                                                </a>
                                            ) : (
                                                <Text fontSize="14px" fontWeight="600" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">0</Text>
                                            )}
                                        </Table.Cell>
                                        <Table.Cell p="12px 16px">
                                            <Text fontSize="13px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">{it.fixed_in_version || "—"}</Text>
                                        </Table.Cell>
                                        <Table.Cell p="12px 16px" onClick={(e) => e.stopPropagation()}>
                                            <ZenComMenu
                                                options={[
                                                    {
                                                        type: "button",
                                                        label: __("Delete", "zencommunity"),
                                                        icon: RiDeleteBinLine,
                                                        onClick: () => handleDelete(it.id),
                                                    },
                                                ]}
                                            />
                                        </Table.Cell>
                                    </Table.Row>
                                ))
                            )}
                        </Table.Body>
                    </Table.Root>
                </Box>

                <Flex justifyContent="space-between" alignItems="center" mt="24px">
                    <Text fontSize="13px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">
                        {`${__("Page", "zencommunity")} ${page} / ${totalPages} · ${items.length} ${__("total", "zencommunity")}`}
                        {items.length >= 100 && ` · ${__("showing first 100 — refine filters to narrow down", "zencommunity")}`}
                    </Text>
                    <Flex gap="8px">
                        <LoadingButton
                            size="sm"
                            border="1px solid var(--zencom-border-color)"
                            bg="var(--zencom-background)"
                            color="var(--zencom-font-color)"
                            _hover={{ bg: "var(--zencom-secondary-color)" }}
                            _disabled={{ opacity: 0.4, cursor: "not-allowed" }}
                            disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                            {__("Prev", "zencommunity")}
                        </LoadingButton>
                        <LoadingButton
                            size="sm"
                            border="1px solid var(--zencom-border-color)"
                            bg="var(--zencom-background)"
                            color="var(--zencom-font-color)"
                            _hover={{ bg: "var(--zencom-secondary-color)" }}
                            _disabled={{ opacity: 0.4, cursor: "not-allowed" }}
                            disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                            {__("Next", "zencommunity")}
                        </LoadingButton>
                    </Flex>
                </Flex>
            </Box>

            {showCreate && (
                <CreateIssueForm products={products} agents={agents} onClose={() => setShowCreate(false)} onCreated={() => load()} />
            )}
            {activeId && (
                <IssueDrawer issueId={activeId} products={products} agents={agents} onClose={() => setActiveId(null)} onChanged={() => load()} />
            )}
        </Box>
        </CenterContainer>
        </>
    );
};

const Engineering = () => {
    const isManager = current_logged_user?.is_site_admin || global_roles?.[ROLE_SUPPORT_AGENT];
    if (!isManager && global_roles?.[ROLE_DEVELOPER]) {
        return <DeveloperIssueView />;
    }
    return <EngineeringManagerView />;
};

export default Engineering;
