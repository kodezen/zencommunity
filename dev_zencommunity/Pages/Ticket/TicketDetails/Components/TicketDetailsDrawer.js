import React, { useState, useEffect } from "react";
import { takeBootstrapValue } from '@Utils/bootstrap';
import { Box, Flex, Skeleton, Text, Textarea } from "@chakra-ui/react";
import ZCSelect from "@Components/Select";
import NotchedSelectField from "@Components/NotchedSelectField";
import CustomSwitch from "@Components/CustomSwitch";
import { __, } from '@wordpress/i18n';
import { Form, Formik } from "formik";
import { useDispatch, useSelector } from "react-redux";
import {
    AssignTicketToSupportAgent,
    fetchTicketLabels,
    fetchTicketProducts,
    removeSupportAgentFromTicket,
    updateTicket,
    updateTicketNote
} from "@Redux/slices/ticketSlice/ticketSlice";
import { promoteToKnowledgeBase } from "@Redux/slices/aiAgentSlice/aiAgentSlice";
import LoadingButton from "@Components/LoadingButton";
import { API, createSelectOptionsFromArray, current_logged_user, current_user_can, global_roles, is_pro_active, active_addons, namespace, site_url } from "@Utils/helper";
import { FiUser } from "react-icons/fi";
import Select from '@Components/ReactSelect';
import ZenComAvatar from "@Components/Chakra/ZenComAvatar";
import ZCLabel from "@Components/Chakra/Labels/ZCLabel";
import { IoCloseOutline } from "react-icons/io5";
import ZCCustomDrawer from "@Components/Drawer/Custom/ZCCustomDrawer";
import EngineeringIssuePanel from "./EngineeringIssuePanel";
import CustomerPurchasesPanel from "./CustomerPurchasesPanel";
import { ROLE_DEVELOPER } from "@Utils/roles";
import { AccordionHeader, SidebarSection } from "./SidebarSection";

const TicketDetailsDrawer = ({
    ticketData,
    ticketLoading,
    activePanel,
    onOpenChange,
    type
}) => {
    const {
        products,
        typeLabels,
        priorityLabels,
        updatedSingleTicket,
    } = useSelector((state) => state.tickets);
    const [loading, setLoading] = useState(false);
    const [supportAgentOptions, setSupportAgentOptions] = useState([]);
    const dispatch = useDispatch();
    const [openTicketInfo, setOpenTicketInfo] = useState(true);
    const [openAssignInfo, setOpenAssignInfo] = useState(true);
    const [openAiAssistance, setOpenAiAssistance] = useState(true);
    const [openNote, setOpenNote] = useState(true);
    const [openFirstResponse, setOpenFirstResponse] = useState(true);
    const [ticketNote, setTicketNote] = useState(ticketData?.meta?.note);
    const [isAiEnabled, setIsAiEnabled] = useState(updatedSingleTicket?.meta?.is_ai_enabled ?? true);
    const [kbDraftResult, setKbDraftResult] = useState(null);
    const isAdminOrSupportAgent = current_logged_user?.is_site_admin || global_roles?.support_agent;
    // A developer reading a ticket via a linked engineering issue sees none
    // of the ticket-management UI below — read-only, not a support surface.
    const isDeveloperOnly = !isAdminOrSupportAgent && global_roles?.[ROLE_DEVELOPER];

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                await Promise.all([
                    dispatch(fetchTicketProducts()),
                    dispatch(fetchTicketLabels({ labelType: 'types' })),
                    dispatch(fetchTicketLabels({ labelType: 'priorities' })),
                ]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        setTicketNote(ticketData?.meta?.note ?? "");
    }, [ticketData]);

    useEffect(() => {
        setIsAiEnabled(updatedSingleTicket?.meta?.is_ai_enabled ?? true);
    }, [updatedSingleTicket]);

    useEffect(() => {
        (async () => {
            const preloaded = await takeBootstrapValue('support_agents', 'ticket');

            await (undefined !== preloaded ? Promise.resolve({ data: preloaded }) : API.get(`${namespace}/members?role=support_agent`))
                .then(res => {
                    const options = res?.data?.records?.map((item) => ({
                        label: `${item.first_name} ${item.last_name}`,
                        value: item.id,
                        avatar: item.avatar_url
                    }))
                    setSupportAgentOptions(options);
                })
        })()
    }, [])

    const productOptions = createSelectOptionsFromArray(products)
    const typeOptions = createSelectOptionsFromArray(typeLabels)
    const priorityOptions = createSelectOptionsFromArray(priorityLabels);

    const defaultAssignees = updatedSingleTicket?.assignees?.map(assignee => ({
        value: assignee?.id,
        label: `${assignee?.first_name} ${assignee?.last_name}`,
        avatar_url: assignee?.avatar_url,
    })) ?? [];

    const detailsContent = (
        <>
            <Formik
                initialValues={{ ...ticketData, assignee_id: ticketData?.assignees?.[0]?.id || "" }}
                enableReinitialize={true}
            >
                {() => {
                    return (
                        <Form>
                            {!isDeveloperOnly && (
                            <SidebarSection first>
                            <AccordionHeader isOpen={openTicketInfo} onClick={() => setOpenTicketInfo(!openTicketInfo)}>
                                {__("Ticket information", "zencommunity")}
                            </AccordionHeader>

                            {openTicketInfo && (
                                <Flex
                                    p="4px 16px 14px 16px"
                                    gap="14px"
                                    flexDirection="column"
                                >
                                    {ticketLoading ? (
                                        <>
                                            <Box w="280px" p="4">
                                                {["Product", "Requester", "Type", "Priority", "Assignee"].map(
                                                    (i) => (
                                                        <Box key={i} mb="6">
                                                            <Skeleton height="12px" width="60px" mb="2" />
                                                            <Flex align="center" gap="3">
                                                                <Skeleton height="20px" width="100%" />
                                                            </Flex>
                                                        </Box>
                                                    )
                                                )}
                                            </Box>
                                        </>
                                    ) : (
                                        <>
                                            {/* @todo: need to replace all zc select into react select later then remove wrapper */}
                                            <NotchedSelectField label={__("Product", "zencommunity")} className="tw-mt-[14px]">
                                                <ZCSelect
                                                    name="ticket_product"
                                                    options={productOptions}
                                                    width="100%"
                                                    disabled={updatedSingleTicket?.status === 'closed' || !isAdminOrSupportAgent}
                                                    _defaultValue={String(ticketData?.product_id)}
                                                    showClear={false}
                                                    onChange={(e) => {
                                                        dispatch(updateTicket({
                                                            ticket_id: ticketData?.id,
                                                            payload: {
                                                                product_id: e
                                                            }
                                                        }))
                                                    }}
                                                />
                                            </NotchedSelectField>

                                            <NotchedSelectField label={__("Type", "zencommunity")} className="tw-mt-[14px]">
                                                <ZCSelect
                                                    name="ticket_type"
                                                    options={typeOptions}
                                                    width="100%"
                                                    disabled={updatedSingleTicket?.status === 'closed' || !isAdminOrSupportAgent}
                                                    _defaultValue={String(ticketData?.type_id)}
                                                    showClear={false}
                                                    onChange={(e) => {
                                                        dispatch(updateTicket({
                                                            ticket_id: ticketData?.id,
                                                            payload: {
                                                                type_id: e
                                                            }
                                                        }))
                                                    }}
                                                />
                                            </NotchedSelectField>

                                            <NotchedSelectField label={__("Priority", "zencommunity")} className="tw-mt-[14px]">
                                                <ZCSelect
                                                    name="ticket_priority"
                                                    options={priorityOptions}
                                                    bg="var(--zencom-background)"
                                                    width="100%"
                                                    disabled={updatedSingleTicket?.status === 'closed' || !isAdminOrSupportAgent}
                                                    _defaultValue={String(ticketData?.priority_id)}
                                                    showClear={false}
                                                    onChange={(e) => {
                                                        dispatch(updateTicket({
                                                            ticket_id: ticketData?.id,
                                                            payload: {
                                                                priority_id: e
                                                            }
                                                        }))
                                                    }}
                                                />
                                            </NotchedSelectField>
                                        </>
                                    )}
                                </Flex>
                            )}
                            </SidebarSection>
                            )}

                            {!isDeveloperOnly && (
                                <SidebarSection>
                                    <AccordionHeader isOpen={openAssignInfo} onClick={() => setOpenAssignInfo(!openAssignInfo)}>
                                        {__("Assignee", "zencommunity")}
                                    </AccordionHeader>

                                    {openAssignInfo && (
                                        <Box pb="10px">
                                            {isAdminOrSupportAgent && (
                                                <Flex align="center" gap="10px" padding="10px 16px 10px 16px">
                                                    <Box color="var(--zencom-font-color)" flexShrink={0} display="flex">
                                                        <FiUser size={16} />
                                                    </Box>
                                                    <Box flex="1" minWidth={0}>
                                                        <Select
                                                            placeholder={__("Assign a Support Agent", "zencommunity")}
                                                            name="assignee_id"
                                                            className="zen-com-select zen-com-select--group-settings zen-com-select--width-full"
                                                            classNamePrefix="zen-com-select"
                                                            options={supportAgentOptions}
                                                            value={defaultAssignees}
                                                            isDisabled={updatedSingleTicket?.status === 'closed'}
                                                            onChange={(option) => {
                                                                dispatch(AssignTicketToSupportAgent({
                                                                    assignee_id: option?.value,
                                                                    ticket_id: ticketData?.id
                                                                }))
                                                            }}
                                                        />
                                                    </Box>
                                                </Flex>
                                            )}
                                            {defaultAssignees?.length > 0 && (
                                                <Flex
                                                    padding="0 8px"
                                                    flexDirection="column"
                                                    gap="2px"
                                                >
                                                    {defaultAssignees?.map(user => (
                                                        <Flex
                                                            key={user?.value}
                                                            alignItems="center"
                                                            justifyContent="space-between"
                                                            padding="6px 8px"
                                                            borderRadius="8px"
                                                            _hover={{ bg: "var(--zencom-secondary-color)" }}
                                                        >
                                                            <ZenComAvatar
                                                                variant='default'
                                                                size="sm"
                                                                // translators: %s: user?.label
                                                                userName={user?.label}
                                                                src={
                                                                    user?.avatar_url
                                                                        ? site_url + user?.avatar_url
                                                                        : ""
                                                                }
                                                            />

                                                            {isAdminOrSupportAgent && (
                                                                <Box color="var(--zencom-font-color)" opacity={0.5} _hover={{ color: "#E2483D", opacity: 1 }}>
                                                                    <IoCloseOutline
                                                                        onClick={() => {
                                                                            dispatch(removeSupportAgentFromTicket({
                                                                                ticket_id: ticketData?.id,
                                                                                agent_id: user?.value
                                                                            }))
                                                                        }}
                                                                        cursor="pointer"
                                                                    />
                                                                </Box>
                                                            )}
                                                        </Flex>
                                                    ))}
                                                </Flex>
                                            )}
                                        </Box>
                                    )}
                                </SidebarSection>
                            )}
                        </Form>
                    )
                }}
            </Formik>

            {is_pro_active && active_addons.includes('AiAgent') && isAdminOrSupportAgent && (
                <SidebarSection>
                    <AccordionHeader isOpen={openAiAssistance} onClick={() => setOpenAiAssistance(!openAiAssistance)}>
                        {__("AI Assistance", "zencommunity")}
                    </AccordionHeader>
                    {openAiAssistance && (
                        <Flex p="14px 16px 14px 16px" alignItems="center" justifyContent="space-between">
                            <Text fontSize="13px" color="var(--zencom-font-color)">{__("Enable AI auto-response", "zencommunity")}</Text>
                            <CustomSwitch
                                value={isAiEnabled}
                                onChange={async () => {
                                    const next = !isAiEnabled;
                                    const prev = isAiEnabled;
                                    setIsAiEnabled(next);
                                    const result = await dispatch(updateTicket({
                                        ticket_id: ticketData?.id,
                                        payload: { meta: { is_ai_enabled: next } },
                                    }));
                                    if (result?.error) setIsAiEnabled(prev);
                                }}
                            />
                        </Flex>
                    )}
                </SidebarSection>
            )}

            {is_pro_active && (global_roles?.support_agent || current_user_can?.manage_options) && (
                <SidebarSection>
                    <AccordionHeader isOpen={openNote} onClick={() => setOpenNote(!openNote)}>
                        {__("Internal note", "zencommunity")}
                    </AccordionHeader>
                    {openNote && (
                        <Box p="0 16px 14px 16px">
                            <Textarea
                                border="1px solid var(--zencom-border-color)"
                                value={ticketNote}
                                borderRadius="10px"
                                bg="var(--zencom-background)"
                                color={'var(--zencom-font-color)'}
                                placeholder={__("Add note...", "zencommunity")}
                                h="100px"
                                onChange={e => setTicketNote(e.target.value)}
                                onBlur={(e) => {
                                    if (!ticketNote) return;
                                    dispatch(updateTicketNote({
                                        ticket_id: ticketData?.id,
                                        payload: {
                                            note: ticketNote
                                        }
                                    }))
                                }}
                            />
                        </Box>
                    )}
                </SidebarSection>
            )}

            {is_pro_active && (global_roles?.support_agent || current_user_can?.manage_options) && active_addons.includes('AiAgent') && (
                <SidebarSection>
                    <AccordionHeader isOpen={openFirstResponse} onClick={() => setOpenFirstResponse(!openFirstResponse)}>
                        {__("First response", "zencommunity")}
                    </AccordionHeader>
                    {openFirstResponse && (
                        <Box p="0 16px 14px 16px">
                            <Text
                                fontSize="13px"
                                fontWeight="500"
                                color={ticketData?.first_responded_at ? "var(--zencom-font-color)" : "var(--zencom-warning)"}
                            >
                                {ticketData?.first_responded_at ? ticketData.first_responded_at : __("Awaiting first response", "zencommunity")}
                            </Text>
                        </Box>
                    )}
                </SidebarSection>
            )}

            {is_pro_active && active_addons.includes('AiAgent') && (global_roles?.support_agent || current_user_can?.manage_options) && (
                <Box p="12px 16px" bg="var(--zencom-background)" borderTop="1px solid var(--zencom-border-color)">
                    <ZCLabel label={__("Knowledge base", "zencommunity")} fontSize="13px" fontWeight="500" />
                    <Flex mt="8px" alignItems="center" gap="10px" flexWrap="wrap">
                        <LoadingButton
                            size="xs"
                            bg="var(--zencom-primary-color)"
                            color="#fff"
                            height="auto"
                            padding="8px 16px"
                            onClick={async () => {
                                setKbDraftResult(null);
                                const result = await dispatch(promoteToKnowledgeBase({
                                    source: 'ticket',
                                    source_id: ticketData?.id,
                                }));
                                if (promoteToKnowledgeBase.fulfilled.match(result)) {
                                    setKbDraftResult({ ok: true, editUrl: result.payload?.edit_url });
                                } else {
                                    setKbDraftResult({ ok: false });
                                }
                            }}
                        >
                            {__('Add to Knowledge Base', 'zencommunity')}
                        </LoadingButton>
                        {kbDraftResult?.ok && (
                            kbDraftResult.editUrl ? (
                                <ZCLabel
                                    label={
                                        <a href={kbDraftResult.editUrl} target="_blank" rel="noreferrer">
                                            {__('Draft created — review it', 'zencommunity')}
                                        </a>
                                    }
                                    fontSize="13px"
                                    color="var(--zencom-primary-color)"
                                />
                            ) : (
                                <ZCLabel label={__('Draft created.', 'zencommunity')} fontSize="13px" color="gray.500" />
                            )
                        )}
                        {kbDraftResult && !kbDraftResult.ok && (
                            <ZCLabel
                                label={__("Couldn't draft an article — this conversation may not have reached a clear resolution, or the feature is turned off.", 'zencommunity')}
                                fontSize="13px"
                                color="red.500"
                            />
                        )}
                    </Flex>
                </Box>
            )}

            {is_pro_active && active_addons.includes('Engineering') && (global_roles?.support_agent || current_user_can?.manage_options) && (
                <EngineeringIssuePanel ticketData={ticketData} />
            )}

            {is_pro_active && (global_roles?.support_agent || current_user_can?.manage_options) && (
                <CustomerPurchasesPanel ticketData={ticketData} />
            )}
        </>
    )

    return (
        <>
            {type === "column" ? (
                <ZCCustomDrawer open={activePanel} onOpenChange={onOpenChange} backdrop={false} header={false} suffix="ticket-details">
                    {detailsContent}
                </ZCCustomDrawer>
            ) : (
                detailsContent
            )}
        </>
    );
};

export default TicketDetailsDrawer;
