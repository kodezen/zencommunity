import React, { useEffect, useState } from "react";
import { Box, Flex, Text, Input, Icon } from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import { GrAttachment } from "react-icons/gr";
import { IoCloseCircleSharp } from "react-icons/io5";
import { FaRegCircleCheck } from "react-icons/fa6";
import { VscSend } from "react-icons/vsc";
import { API, namespace, mediaFileUploader } from "@Utils/helper";
import LoadingButton from "@Components/LoadingButton";
import ResizeAbleTextArea from "@Components/ResizeAbleTextArea";

const selectPortal = {
    menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
    styles: { menuPortal: (base) => ({ ...base, zIndex: 9999 }) },
};

const Field = ({ label, htmlFor, error, children }) => (
    <Box>
        <Text as="label" htmlFor={htmlFor} fontSize="13px" fontWeight="500" color="var(--zencom-font-color)" mb="4px" display="block">
            {label}
        </Text>
        {children}
        {error && <Text fontSize="12px" color="var(--zencom-warning)" mt="2px">{error}</Text>}
    </Box>
);

const GuestTicketCreate = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [form, setForm] = useState({ name: "", email: "", title: "", product_id: "", priority_id: "", content: "" });
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [done, setDone] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await API.get(`${namespace}/tickets/guest/config`);
                setProducts((data?.products || []).map((p) => ({ value: p.id, label: p.name })));
                setPriorities((data?.priorities || []).map((p) => ({ value: p.id, label: p.name })));
            } catch (e) { /* ignore */ }
        })();
    }, []);

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const onPickFiles = async (e) => {
        const picked = Array.from(e.target.files || []);
        e.target.value = "";
        if (!picked.length) return;
        setUploading(true);
        try {
            for (const f of picked) {
                try {
                    const res = await mediaFileUploader("ticket_attachments", f);
                    if (res?.id) setFiles((prev) => [...prev, { id: res.id, name: f.name }]);
                } catch (err) { /* skip */ }
            }
        } finally {
            setUploading(false);
        }
    };

    const validate = () => {
        const next = {};
        if (!form.name.trim()) next.name = __("Name is required", "zencommunity");
        if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) next.email = __("A valid email is required", "zencommunity");
        if (!form.title.trim()) next.title = __("Subject is required", "zencommunity");
        if (!form.product_id) next.product_id = __("Please choose a product", "zencommunity");
        if (!form.priority_id) next.priority_id = __("Please choose a priority", "zencommunity");
        if (!form.content.trim()) next.content = __("Please describe your issue", "zencommunity");
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async () => {
        setServerError("");
        if (!validate()) return;
        try {
            const { data } = await API.post(`${namespace}/tickets/guest`, {
                name: form.name,
                email: form.email,
                title: form.title,
                content: form.content,
                product_id: Number(form.product_id),
                priority_id: Number(form.priority_id),
                add_media_ids: files.map((f) => f.id),
            });
            if (data?.success) {
                setDone({ reference: data.reference || `#${data.id}` });
            } else {
                setServerError(data?.message || __("Could not create the ticket. Please try again.", "zencommunity"));
            }
        } catch (err) {
            setServerError(err?.response?.data?.message || __("Could not create the ticket. Please try again.", "zencommunity"));
        }
    };

    const goLogin = () => navigate("/signin", { state: { from: { pathname: "/tickets" } } });

    const card = {
        width: "100%", maxWidth: "640px", margin: "32px auto", background: "var(--zencom-background)",
        border: "1px solid var(--zencom-border-color)", borderRadius: "4px",
    };

    if (done) {
        return (
            <Box css={card} p="32px" textAlign="center">
                <Flex direction="column" align="center" gap="12px">
                    <Icon as={FaRegCircleCheck} width="48px" height="48px" color="var(--zencom-primary-color)" />
                    <Text fontSize="20px" fontWeight="600" color="var(--zencom-font-color)">
                        {__("Ticket created", "zencommunity")} {done.reference}
                    </Text>
                    <Text fontSize="14px" color="var(--zencom-gray-color)">
                        {__("Thanks! We've emailed a copy to", "zencommunity")} {form.email}. {__("Our team will reply by email.", "zencommunity")}
                    </Text>
                    <Flex gap="8px" mt="8px">
                        <LoadingButton bg="var(--zencom-primary-color)" color="#fff" onClick={goLogin}>
                            {__("Log in to track it", "zencommunity")}
                        </LoadingButton>
                        <LoadingButton bg="var(--zencom-secondary-color)" color="var(--zencom-font-color)"
                            onClick={() => { setDone(null); setForm({ name: "", email: "", title: "", product_id: "", priority_id: "", content: "" }); setFiles([]); }}>
                            {__("Submit another", "zencommunity")}
                        </LoadingButton>
                    </Flex>
                </Flex>
            </Box>
        );
    }

    return (
        <Box css={card} p={{ base: "20px", md: "28px" }}>
            <Text fontSize="22px" fontWeight="600" color="var(--zencom-font-color)">{__("Submit a support ticket", "zencommunity")}</Text>
            <Text fontSize="14px" color="var(--zencom-gray-color)" mt="4px">
                {__("Tell us what's going on and we'll get back to you by email — no account needed.", "zencommunity")}
            </Text>

            <Flex align="center" justify="space-between" gap="12px" flexWrap="wrap"
                bg="var(--zencom-primary-light)" borderRadius="6px" p="10px 14px" mt="16px" mb="20px">
                <Text fontSize="13px" color="var(--zencom-font-color)">
                    {__("Have an account? Log in to track your tickets and see replies.", "zencommunity")}
                </Text>
                <LoadingButton size="sm" bg="var(--zencom-primary-color)" color="#fff" onClick={goLogin}>
                    {__("Log in", "zencommunity")}
                </LoadingButton>
            </Flex>

            <Flex direction="column" gap="14px">
                <Flex gap="14px" direction={{ base: "column", sm: "row" }}>
                    <Box flex="1">
                        <Field label={__("Name", "zencommunity")} htmlFor="gt-name" error={errors.name}>
                            <Input id="gt-name" value={form.name} onChange={set("name")} placeholder={__("Your name", "zencommunity")}
                                bg="var(--zencom-background)" color="var(--zencom-font-color)" borderColor="var(--zencom-border-color)" />
                        </Field>
                    </Box>
                    <Box flex="1">
                        <Field label={__("Email", "zencommunity")} htmlFor="gt-email" error={errors.email}>
                            <Input id="gt-email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com"
                                bg="var(--zencom-background)" color="var(--zencom-font-color)" borderColor="var(--zencom-border-color)" />
                        </Field>
                    </Box>
                </Flex>

                <Field label={__("Subject", "zencommunity")} htmlFor="gt-title" error={errors.title}>
                    <Input id="gt-title" value={form.title} onChange={set("title")} placeholder={__("Brief summary", "zencommunity")}
                        bg="var(--zencom-background)" color="var(--zencom-font-color)" borderColor="var(--zencom-border-color)" />
                </Field>

                <Flex gap="14px" direction={{ base: "column", sm: "row" }}>
                    <Box flex="1">
                        <Field label={__("Product", "zencommunity")} error={errors.product_id}>
                            <Select
                                className="zen-com-select" classNamePrefix="zen-com-select"
                                placeholder={__("Select…", "zencommunity")}
                                options={products}
                                value={products.find((o) => String(o.value) === String(form.product_id)) || null}
                                onChange={(opt) => setForm((f) => ({ ...f, product_id: opt?.value ?? "" }))}
                                {...selectPortal}
                            />
                        </Field>
                    </Box>
                    <Box flex="1">
                        <Field label={__("Priority", "zencommunity")} error={errors.priority_id}>
                            <Select
                                className="zen-com-select" classNamePrefix="zen-com-select"
                                placeholder={__("Select…", "zencommunity")}
                                options={priorities}
                                value={priorities.find((o) => String(o.value) === String(form.priority_id)) || null}
                                onChange={(opt) => setForm((f) => ({ ...f, priority_id: opt?.value ?? "" }))}
                                {...selectPortal}
                            />
                        </Field>
                    </Box>
                </Flex>

                <Field label={__("Message", "zencommunity")} htmlFor="gt-content" error={errors.content}>
                    <ResizeAbleTextArea id="gt-content" value={form.content} onChange={set("content")} rows={6} maxHeight="320px"
                        placeholder={__("Describe your issue…", "zencommunity")}
                        bg="var(--zencom-background)" color="var(--zencom-font-color)" borderColor="var(--zencom-border-color)" />
                </Field>

                <Box>
                    <input id="gt-attachment" type="file" multiple style={{ display: "none" }} onChange={onPickFiles} />
                    <Flex as="label" htmlFor="gt-attachment" align="center" gap="6px" cursor="pointer" width="fit-content"
                        fontSize="13px" color="var(--zencom-primary-color)">
                        <Icon as={GrAttachment} width="14px" height="14px" />
                        {uploading ? __("Uploading…", "zencommunity") : __("Attach files", "zencommunity")}
                    </Flex>
                    {files.length > 0 && (
                        <Flex direction="column" gap="4px" mt="6px">
                            {files.map((f, i) => (
                                <Flex key={`${f.id}-${i}`} align="center" justify="space-between" gap="8px"
                                    p="4px 8px" border="1px solid var(--zencom-border-color)" borderRadius="4px">
                                    <Text fontSize="12px" color="var(--zencom-font-color)" truncate>{f.name}</Text>
                                    <Box cursor="pointer" color="var(--zencom-warning)" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                                        <Icon as={IoCloseCircleSharp} width="16px" height="16px" />
                                    </Box>
                                </Flex>
                            ))}
                        </Flex>
                    )}
                </Box>

                {serverError && <Text fontSize="13px" color="var(--zencom-warning)">{serverError}</Text>}

                <LoadingButton bg="var(--zencom-primary-color)" color="#fff" onClick={handleSubmit} alignSelf="flex-start" px="20px">
                    {__("Submit ticket", "zencommunity")}
                    <Icon as={VscSend} width="16px" height="16px" color="#fff" ml="6px" />
                </LoadingButton>
            </Flex>
        </Box>
    );
};

export default GuestTicketCreate;
