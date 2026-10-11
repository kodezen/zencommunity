import React, { useEffect, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import Select from "react-select";
import { API, namespace, useQuery, shortDate, fullDate } from "@Utils/helper";
import { useStyles } from "@Utils/chakra";
import { showNotification } from "@Redux/slices/notificationSlice/notificationSlice";
import LoadingButton from "@Components/LoadingButton";
import ZenComModal from "@Components/ZenComModal/ZenComModal";
import { fetchMembersByRoles } from "@Utils/roles";
import { STATUSES, PRIORITIES, fieldStyle, labelTxt, StatusBadge } from "./helper";

const selectMenuProps = {
    classNamePrefix: "zen-com-select",
    className: "zen-com-select zen-com-select--width-full",
    menuPortalTarget: typeof document !== "undefined" ? document.body : null,
    styles: { menuPortal: (base) => ({ ...base, zIndex: 10000 }) },
};

/**
 * Read + limited-edit view for one engineering issue a developer is the
 * assignee of, shown as a ZenComModal over the issue list.
 *
 * Title/description/product stay read-only for a developer; status, priority,
 * and assignee are editable (PUT /eng-issue/{id} server-side restricts a
 * developer's payload to exactly those three fields — see eng-issue.php).
 * Affected tickets are read-only links into the ticket conversation. Notes
 * (followups) are read + post only, same as before.
 */
const AssignedIssueDetail = ({ issueId, onClose, onChanged }) => {
    const { primaryBtnInsideContent } = useStyles();
    const dispatch = useDispatch();

    const [issue, setIssue] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [notes, setNotes] = useState([]);
    const [noteContent, setNoteContent] = useState("");
    const [products, setProducts] = useState([]);
    const [agents, setAgents] = useState([]);
    const [form, setForm] = useState({ status: "open", priority: "medium", assignee_id: "" });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const notify = (message, type = "success") => dispatch(showNotification({ message, type, isShow: true }));
    const setSelect = (k) => (option) => setForm((f) => ({ ...f, [k]: option ? option.value : "" }));

    const statusOptions = STATUSES.map((s) => ({ label: labelTxt(s), value: s }));
    const priorityOptions = PRIORITIES.map((p) => ({ label: labelTxt(p), value: p }));
    const productOptions = [{ label: __("None", "zencommunity"), value: "" }, ...products.map((p) => ({ label: p.name, value: String(p.id) }))];
    const agentOptions = [{ label: __("Unassigned", "zencommunity"), value: "" }, ...agents.map((a) => ({ label: a.name, value: String(a.id) }))];

    const load = async () => {
        setLoading(true);
        setError(false);
        try {
            const [{ data: issueData }, { data: noteData }] = await Promise.all([
                API.get(`${namespace}/eng-issue/${issueId}`),
                API.get(`${namespace}/eng-issue/${issueId}/notes`),
            ]);
            setIssue(issueData);
            setTickets(issueData?.tickets || []);
            setNotes(noteData?.records || []);
            setForm({
                status: issueData?.status || "open",
                priority: issueData?.priority || "medium",
                assignee_id: issueData?.assignee_id ? String(issueData.assignee_id) : "",
            });
        } catch (e) {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [issueId]);

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

    const save = async () => {
        try {
            await API.post(`${namespace}/eng-issue/${issueId}`, form);
            notify(__("Saved.", "zencommunity"));
            onChanged && onChanged();
            await load();
        } catch (e) {
            notify(__("Could not save your changes.", "zencommunity"), "warning");
        }
    };

    const addNote = async () => {
        if (!noteContent.trim()) return;
        try {
            await API.post(`${namespace}/eng-issue/${issueId}/notes`, { content: noteContent });
            setNoteContent("");
            const { data } = await API.get(`${namespace}/eng-issue/${issueId}/notes`);
            setNotes(data?.records || []);
        } catch (e) {
            notify(__("Could not post your note.", "zencommunity"), "warning");
        }
    };

    return (
        <ZenComModal
            isOpen={!!issueId}
            onRequestClose={onClose}
            size="small"
            position="center"
            scrollBehavior="outside"
            suffix="eng-issue"
            title={
                <Flex alignItems="center" gap="8px">
                    <Text as="span">
                        {issue ? issue.title : __("Engineering issue", "zencommunity")}
                    </Text>
                    {issue ? <StatusBadge status={issue.status} /> : null}
                </Flex>
            }
        >
            {loading ? (
                <Text fontSize="14px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">{__("Loading…", "zencommunity")}</Text>
            ) : error || !issue ? (
                <Text fontSize="14px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">
                    {__("This issue isn't available — it may not be assigned to you anymore.", "zencommunity")}
                </Text>
            ) : (
                <Flex direction="column" gap="12px">
                    <Box>
                        <Text fontSize="13px" fontWeight="500" mb="4px" color="var(--zencom-font-color)">{__("Title", "zencommunity")}</Text>
                        <Text fontSize="14px" color="var(--zencom-font-color)">{issue.title}</Text>
                    </Box>

                    {issue.description ? (
                        <Box>
                            <Text fontSize="13px" fontWeight="500" mb="4px" color="var(--zencom-font-color)">{__("Description", "zencommunity")}</Text>
                            <Box fontSize="14px" color="var(--zencom-font-color)" dangerouslySetInnerHTML={{ __html: issue.description }} />
                        </Box>
                    ) : null}

                    <Flex gap="12px">
                        <Box flex="1">
                            <Text fontSize="13px" fontWeight="500" mb="4px" color="var(--zencom-font-color)">{__("Status", "zencommunity")}</Text>
                            <Select
                                {...selectMenuProps}
                                options={statusOptions}
                                value={statusOptions.find((o) => o.value === form.status) || null}
                                onChange={setSelect("status")}
                            />
                        </Box>
                        <Box flex="1">
                            <Text fontSize="13px" fontWeight="500" mb="4px" color="var(--zencom-font-color)">{__("Priority", "zencommunity")}</Text>
                            <Select
                                {...selectMenuProps}
                                options={priorityOptions}
                                value={priorityOptions.find((o) => o.value === form.priority) || null}
                                onChange={setSelect("priority")}
                            />
                        </Box>
                    </Flex>

                    <Flex gap="12px">
                        <Box flex="1">
                            <Text fontSize="13px" fontWeight="500" mb="4px" color="var(--zencom-font-color)">{__("Product", "zencommunity")}</Text>
                            <Select
                                {...selectMenuProps}
                                isDisabled
                                options={productOptions}
                                value={productOptions.find((o) => o.value === String(issue.product_id || "")) || null}
                            />
                        </Box>
                        <Box flex="1">
                            <Text fontSize="13px" fontWeight="500" mb="4px" color="var(--zencom-font-color)">{__("Assignee", "zencommunity")}</Text>
                            <Select
                                {...selectMenuProps}
                                options={agentOptions}
                                value={agentOptions.find((o) => o.value === form.assignee_id) || null}
                                onChange={setSelect("assignee_id")}
                            />
                        </Box>
                    </Flex>

                    <Flex>
                        <LoadingButton {...primaryBtnInsideContent} size="sm" onClick={save}>
                            {__("Save", "zencommunity")}
                        </LoadingButton>
                    </Flex>

                    <Box height="1px" bg="var(--zencom-border-color)" my="4px" />

                    <Text fontSize="13px" fontWeight="600" color="var(--zencom-font-color)">
                        {__("Affected tickets", "zencommunity")} ({tickets.length})
                    </Text>
                    {tickets.length === 0 ? (
                        <Text fontSize="13px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">{__("No tickets linked yet.", "zencommunity")}</Text>
                    ) : (
                        <Flex direction="column" gap="6px">
                            {tickets.map((t) => (
                                <Link key={t.id} to={`/ticket/${t.id}`} style={{ textDecoration: "none" }}>
                                    <Flex justifyContent="space-between" alignItems="center" gap="8px"
                                        p="8px 10px" border="1px solid var(--zencom-border-color)" borderRadius="4px"
                                        _hover={{ bg: "var(--zencom-secondary-color)" }}>
                                        <Text fontSize="13px" color="var(--zencom-primary-color)" truncate flex="1" minWidth="0">
                                            #{t.id} {t.title}
                                        </Text>
                                        <Text fontSize="11px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)" textTransform="capitalize" whiteSpace="nowrap">
                                            {labelTxt(t.status)}
                                        </Text>
                                    </Flex>
                                </Link>
                            ))}
                        </Flex>
                    )}

                    <Box height="1px" bg="var(--zencom-border-color)" my="4px" />

                    <Text fontSize="13px" fontWeight="600" color="var(--zencom-font-color)">
                        {__("Notes", "zencommunity")} ({notes.length})
                    </Text>
                    {notes.length === 0 ? (
                        <Text fontSize="13px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">{__("No notes yet.", "zencommunity")}</Text>
                    ) : (
                        <Flex direction="column" gap="6px">
                            {notes.map((n) => (
                                <Box key={n.id} p="8px 10px" border="1px solid var(--zencom-border-color)" borderRadius="4px">
                                    <Text fontSize="13px" color="var(--zencom-font-color)">{n.content}</Text>
                                    <Text fontSize="11px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)" title={fullDate(n.created_at)}>
                                        {shortDate(n.created_at)}
                                    </Text>
                                </Box>
                            ))}
                        </Flex>
                    )}
                    <Box
                        as="textarea"
                        rows={2}
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder={__("Add a followup…", "zencommunity")}
                        css={fieldStyle}
                    />
                    <Flex>
                        <LoadingButton {...primaryBtnInsideContent} size="sm" onClick={addNote} disabled={!noteContent.trim()}>
                            {__("Post followup", "zencommunity")}
                        </LoadingButton>
                    </Flex>
                </Flex>
            )}
        </ZenComModal>
    );
};

/**
 * Landing view for a developer: lists only the issues assigned to them
 * (GET /eng-issues is force-scoped to assignee_id=self for non-agents on the
 * backend — see EngIssue::index() in zencommunity-pro) and lets them open one
 * for details + followups. A "?issue=" param (from the assignment
 * notification) deep-links straight into that issue's detail view.
 */
const DeveloperIssueView = () => {
    const query = useQuery();
    const deepLinkId = query.get("issue");

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(deepLinkId ? Number(deepLinkId) : null);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await API.get(`${namespace}/eng-issues?per_page=100&order_by=updated_at&order=desc`);
            setItems(data?.records || []);
        } catch (e) {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    return (
        <Box p="24px" maxWidth="600px" mx="auto" width="100%">
            <Text fontSize="20px" fontWeight="600" color="var(--zencom-font-color)" mb="4px">
                {__("My engineering issues", "zencommunity")}
            </Text>
            <Text fontSize="13px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)" mb="16px">
                {__("Issues assigned to you. Open one to read details and post followups.", "zencommunity")}
            </Text>

            {loading ? (
                <Text fontSize="14px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">{__("Loading…", "zencommunity")}</Text>
            ) : items.length === 0 ? (
                <Text fontSize="14px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">
                    {__("No engineering issues are assigned to you yet.", "zencommunity")}
                </Text>
            ) : (
                <Flex direction="column" gap="6px">
                    {items.map((it) => (
                        <Flex key={it.id} justifyContent="space-between" alignItems="center" gap="8px"
                            p="10px 12px" border="1px solid var(--zencom-border-color)" borderRadius="4px" cursor="pointer"
                            _hover={{ bg: "var(--zencom-secondary-color)" }} onClick={() => setSelectedId(it.id)}>
                            <Box flex="1" minWidth="0">
                                <Text fontSize="14px" fontWeight="500" color="var(--zencom-font-color)" truncate>{it.title}</Text>
                                <Text fontSize="11px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">#{it.id}</Text>
                            </Box>
                            <StatusBadge status={it.status} />
                        </Flex>
                    ))}
                </Flex>
            )}

            {selectedId && (
                <AssignedIssueDetail issueId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />
            )}
        </Box>
    );
};

export default DeveloperIssueView;
