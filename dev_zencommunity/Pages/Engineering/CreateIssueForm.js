import React, { useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";
import { useDispatch } from "react-redux";
import Select from "react-select";
import { API, namespace } from "@Utils/helper";
import { useStyles } from "@Utils/chakra";
import { showNotification } from "@Redux/slices/notificationSlice/notificationSlice";
import LoadingButton from "@Components/LoadingButton";
import PostTextWithMention from "@Components/PostTextWithMention";
import ZenComModal from "@Components/ZenComModal/ZenComModal";
import { STATUSES, PRIORITIES, fieldStyle, labelTxt } from "./helper";

const selectMenuProps = {
    classNamePrefix: "zen-com-select",
    className: "zen-com-select zen-com-select--width-full",
    menuPortalTarget: typeof document !== "undefined" ? document.body : null,
    styles: { menuPortal: (base) => ({ ...base, zIndex: 10000 }) },
};

const CreateIssueForm = ({ products = [], agents = [], onClose, onCreated }) => {
    const { primaryBtnInsideContent } = useStyles();
    const dispatch = useDispatch();
    const [form, setForm] = useState({ title: "", description: "", priority: "medium", status: "open", product_id: "", assignee_id: "" });
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const setSelect = (k) => (option) => setForm((f) => ({ ...f, [k]: option ? option.value : "" }));

    const priorityOptions = PRIORITIES.map((p) => ({ label: labelTxt(p), value: p }));
    const statusOptions = STATUSES.map((s) => ({ label: labelTxt(s), value: s }));
    const productOptions = [{ label: __("None", "zencommunity"), value: "" }, ...products.map((p) => ({ label: p.name, value: String(p.id) }))];
    const agentOptions = [{ label: __("Unassigned", "zencommunity"), value: "" }, ...agents.map((a) => ({ label: a.name, value: String(a.id) }))];

    const submit = async () => {
        if (!form.title.trim()) {
            dispatch(showNotification({ message: __("Title is required.", "zencommunity"), type: "warning", isShow: true }));
            return;
        }
        const { data } = await API.post(`${namespace}/eng-issues`, {
            ...form,
            product_id: form.product_id ? Number(form.product_id) : 0,
            assignee_id: form.assignee_id ? Number(form.assignee_id) : 0,
        });
        dispatch(showNotification({ message: __("Engineering issue created.", "zencommunity"), type: "success", isShow: true }));
        onCreated && onCreated(data);
        onClose && onClose();
    };

    return (
        <ZenComModal
            isOpen={true}
            onRequestClose={onClose}
            size="small"
            position="center"
            scrollBehavior="outside"
            suffix="eng-issue-create"
            title={__("New engineering issue", "zencommunity")}
            isFooter={true}
            isFooterContent={
                <>
                    <LoadingButton bg="transparent" color="var(--zencom-font-color)"  border="1px solid var(--zencom-border-color)" height="auto" onClick={onClose}>
                        {__("Cancel", "zencommunity")}
                    </LoadingButton>
                    <LoadingButton {...primaryBtnInsideContent} onClick={submit}>
                        {__("Create", "zencommunity")}
                    </LoadingButton>
                </>
            }
        >
            <Flex direction="column" gap="12px">
                <Box>
                    <Text fontSize="13px" fontWeight="500" mb="4px" color="var(--zencom-font-color)">{__("Title", "zencommunity")}</Text>
                    <Box as="input" type="text" value={form.title} onChange={set("title")} placeholder={__("Short summary of the bug/feature", "zencommunity")} css={fieldStyle} />
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
                            placeholder={__("Details, repro steps…", "zencommunity")}
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
                        <Text fontSize="13px" fontWeight="500" mb="4px" color="var(--zencom-font-color)">{__("Priority", "zencommunity")}</Text>
                        <Select
                            {...selectMenuProps}
                            options={priorityOptions}
                            value={priorityOptions.find((o) => o.value === form.priority) || null}
                            onChange={setSelect("priority")}
                        />
                    </Box>
                    <Box flex="1">
                        <Text fontSize="13px" fontWeight="500" mb="4px" color="var(--zencom-font-color)">{__("Status", "zencommunity")}</Text>
                        <Select
                            {...selectMenuProps}
                            options={statusOptions}
                            value={statusOptions.find((o) => o.value === form.status) || null}
                            onChange={setSelect("status")}
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
            </Flex>
        </ZenComModal>
    );
};

export default CreateIssueForm;
