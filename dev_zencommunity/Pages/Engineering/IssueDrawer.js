import React, { useEffect, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { IoCloseOutline, IoCheckmarkCircleOutline } from "react-icons/io5";
import { RiDeleteBinLine } from "react-icons/ri";
import Select from "react-select";
import { API, namespace, shortDate, fullDate } from "@Utils/helper";
import { useStyles } from "@Utils/chakra";
import { showNotification } from "@Redux/slices/notificationSlice/notificationSlice";
import LoadingButton from "@Components/LoadingButton";
import PostTextWithMention from "@Components/PostTextWithMention";
import ZenComModal from "@Components/ZenComModal/ZenComModal";
import ZenComMenu from "@Components/ZenComMenu";
import { STATUSES, PRIORITIES, fieldStyle, labelTxt, StatusBadge } from "./helper";

const selectMenuProps = {
    classNamePrefix: "zen-com-select",
    className: "zen-com-select zen-com-select--width-full",
    menuPortalTarget: typeof document !== "undefined" ? document.body : null,
    styles: { menuPortal: (base) => ({ ...base, zIndex: 10000 }) },
};

const IssueDrawer = ({ issueId, products = [], agents = [], onClose, onChanged }) => {
    const { primaryBtnInsideContent } = useStyles();
    const dispatch = useDispatch();
    const [issue, setIssue] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [notes, setNotes] = useState([]);
    const [noteContent, setNoteContent] = useState("");
    const [form, setForm] = useState({ title: "", description: "", priority: "medium", status: "open", fixed_in_version: "", product_id: "", assignee_id: "" });
    const [actionError, setActionError] = useState("");

    const notify = (message, type = "success") => dispatch(showNotification({ message, type, isShow: true }));
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const setSelect = (k) => (option) => setForm((f) => ({ ...f, [k]: option ? option.value : "" }));

    const statusOptions = STATUSES.map((s) => ({ label: labelTxt(s), value: s }));
    const priorityOptions = PRIORITIES.map((p) => ({ label: labelTxt(p), value: p }));
    const productOptions = [{ label: __("None", "zencommunity"), value: "" }, ...products.map((p) => ({ label: p.name, value: String(p.id) }))];
    const agentOptions = [{ label: __("Unassigned", "zencommunity"), value: "" }, ...agents.map((a) => ({ label: a.name, value: String(a.id) }))];

    const load = async () => {
        const { data } = await API.get(`${namespace}/eng-issue/${issueId}`);
        setIssue(data);
        setTickets(data?.tickets || []);
        setForm({
            title: data?.title || "",
            description: data?.description || "",
            priority: data?.priority || "medium",
            status: data?.status || "open",
            fixed_in_version: data?.fixed_in_version || "",
            product_id: data?.product_id ? String(data.product_id) : "",
            assignee_id: data?.assignee_id ? String(data.assignee_id) : "",
        });
        loadNotes();
    };

    const loadNotes = async () => {
        const { data } = await API.get(`${namespace}/eng-issue/${issueId}/notes`);
        setNotes(data?.records || []);
    };

    const addNote = async () => {
        if (!noteContent.trim()) return;
        await API.post(`${namespace}/eng-issue/${issueId}/notes`, { content: noteContent });
        setNoteContent("");
        await loadNotes();
    };

    const deleteNote = async (noteId) => {
        await API.delete(`${namespace}/eng-issue/note/${noteId}`);
        setNotes((n) => n.filter((x) => Number(x.id) !== Number(noteId)));
    };

    const noteAuthorName = (note) => {
        const authorId = note?.created_by;
        const agent = agents.find((a) => Number(a.id) === Number(authorId));
        return agent?.name || (authorId ? `#${authorId}` : "—");
    };

    useEffect(() => { if (issueId) load(); }, [issueId]);

    const save = async () => {
        await API.post(`${namespace}/eng-issue/${issueId}`, form);
        notify(__("Saved.", "zencommunity"));
        await load();
        onChanged && onChanged();
    };

    const markReleased = async () => {
        setActionError("");
        if (!form.fixed_in_version.trim()) {
            setActionError(__("Add a “Fixed in version” above, then mark as released.", "zencommunity"));
            return;
        }
        const count = tickets.length;
        await API.post(`${namespace}/eng-issue/${issueId}`, { ...form, status: "released" });
        notify(`${__("Released. Linked tickets resolved:", "zencommunity")} ${count}`);
        await load();
        onChanged && onChanged();
    };

    const unlink = async (ticketId) => {
        await API.post(`${namespace}/eng-issue/unlink`, { ticket_id: ticketId });
        setTickets((t) => t.filter((x) => Number(x.id) !== Number(ticketId)));
        onChanged && onChanged();
    };

    const handleDelete = async () => {
        if (!window.confirm(__("Delete this engineering issue? This cannot be undone.", "zencommunity"))) return;
        try {
            await API.delete(`${namespace}/eng-issue/${issueId}`);
            notify(__("Engineering issue deleted.", "zencommunity"));
            onChanged && onChanged();
            onClose && onClose();
        } catch (e) {
            notify(__("Failed to delete engineering issue.", "zencommunity"), "warning");
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
                        {__("Engineering issue", "zencommunity")}{issue ? ` #${issue.id}` : ""}
                    </Text>
                    {issue ? <StatusBadge status={issue.status} /> : null}
                </Flex>
            }
            externalComponent={
                issue ? (
                    <ZenComMenu
                        suffix="engineering"
                        options={[
                            {
                                type: "button",
                                label: __("Mark as released", "zencommunity"),
                                icon: IoCheckmarkCircleOutline,
                                onClick: markReleased,
                                disabled: issue.status === "released",
                            },
                            {
                                type: "button",
                                label: __("Delete issue", "zencommunity"),
                                icon: RiDeleteBinLine,
                                onClick: handleDelete,
                            },
                        ]}
                    />
                ) : null
            }
            isFooter={!!issue}
            isFooterContent={
                issue ? (
                    <LoadingButton {...primaryBtnInsideContent} onClick={save}>
                        {__("Save", "zencommunity")}
                    </LoadingButton>
                ) : null
            }
        >
            {!issue ? (
                <Text fontSize="14px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">{__("Loading…", "zencommunity")}</Text>
            ) : (
                <Flex direction="column" gap="12px">
                    <Box>
                        <Text fontSize="13px" fontWeight="500" mb="4px" color="var(--zencom-font-color)">{__("Title", "zencommunity")}</Text>
                        <Box as="input" type="text" value={form.title} onChange={set("title")} css={fieldStyle} />
                    </Box>
                    <Box>
                        <Text fontSize="13px" fontWeight="500" mb="4px" color="var(--zencom-font-color)">{__("Description", "zencommunity")}</Text>
                        <Box
                            borderRadius="4px"
                            border="1px solid var(--zencom-border-color)"
                            _focusWithin={{ borderColor: "var(--zencom-primary-color)" }}
                            padding="8px"
                        >
                            <PostTextWithMention
                                value={form.description}
                                onChangeHandler={(v) => setForm((f) => ({ ...f, description: v }))}
                                showToolbar={true}
                                minHeight="90px"
                                contentBg={false}
                                marginBottom="0"
                                padding="0"
                            />
                        </Box>
                    </Box>
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
                                options={productOptions}
                                value={productOptions.find((o) => o.value === form.product_id) || null}
                                onChange={setSelect("product_id")}
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

                    <Box>
                        <Text fontSize="13px" fontWeight="500" mb="4px" color="var(--zencom-font-color)">{__("Fixed in version", "zencommunity")}</Text>
                        <Box as="input" type="text" value={form.fixed_in_version} onChange={set("fixed_in_version")} placeholder="e.g. 1.4.0" css={fieldStyle} />
                    </Box>

                    {actionError && <Text fontSize="12px" color="var(--zencom-warning)">{actionError}</Text>}

                    <Box height="1px" bg="var(--zencom-border-color)" my="4px" />

                    <Text fontSize="13px" fontWeight="600" color="var(--zencom-font-color)">
                        {/* translators: %d: number of tickets */}
                        {__("Affected tickets", "zencommunity")} ({tickets.length})
                    </Text>
                    {tickets.length === 0 ? (
                        <Text fontSize="13px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">{__("No tickets linked yet.", "zencommunity")}</Text>
                    ) : (
                        <Flex direction="column" gap="6px">
                            {tickets.map((t) => (
                                <Flex key={t.id} justifyContent="space-between" alignItems="center" gap="8px"
                                    p="8px 10px" border="1px solid var(--zencom-border-color)" borderRadius="4px">
                                    <Link to={`/ticket/${t.id}`} style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
                                        <Text fontSize="13px" color="var(--zencom-primary-color)" truncate>
                                            #{t.id} {t.title}
                                        </Text>
                                    </Link>
                                    <Text fontSize="11px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)" textTransform="capitalize" whiteSpace="nowrap">
                                        {labelTxt(t.status)}
                                    </Text>
                                    <Box cursor="pointer" _hover={{ color: "#E2483D" }} title={__("Unlink", "zencommunity")}>
                                        <IoCloseOutline onClick={() => unlink(t.id)} />
                                    </Box>
                                </Flex>
                            ))}
                        </Flex>
                    )}

                    <Box height="1px" bg="var(--zencom-border-color)" my="4px" />

                    <Text fontSize="13px" fontWeight="600" color="var(--zencom-font-color)">
                        {/* translators: %d: number of notes */}
                        {__("Notes", "zencommunity")} ({notes.length})
                    </Text>
                    {notes.length === 0 ? (
                        <Text fontSize="13px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">{__("No notes yet.", "zencommunity")}</Text>
                    ) : (
                        <Flex direction="column" gap="6px">
                            {notes.map((n) => (
                                <Flex key={n.id} justifyContent="space-between" alignItems="flex-start" gap="8px"
                                    p="8px 10px" border="1px solid var(--zencom-border-color)" borderRadius="4px">
                                    <Box flex="1" minWidth="0">
                                        <Text fontSize="13px" color="var(--zencom-font-color)">{n.content}</Text>
                                        <Text fontSize="11px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)" title={fullDate(n.created_at)}>
                                            {noteAuthorName(n)} · {shortDate(n.created_at)}
                                        </Text>
                                    </Box>
                                    <Box cursor="pointer" _hover={{ color: "#E2483D" }} title={__("Delete", "zencommunity")}>
                                        <IoCloseOutline onClick={() => deleteNote(n.id)} />
                                    </Box>
                                </Flex>
                            ))}
                        </Flex>
                    )}
                    <Box
                        as="textarea"
                        rows={2}
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder={__("Add an internal note…", "zencommunity")}
                        css={fieldStyle}
                    />
                    <Flex>
                        <LoadingButton {...primaryBtnInsideContent} size="sm" onClick={addNote} disabled={!noteContent.trim()}>
                            {__("Add note", "zencommunity")}
                        </LoadingButton>
                    </Flex>
                </Flex>
            )}
        </ZenComModal>
    );
};

export default IssueDrawer;
