import React, { useState } from "react";
import { Box, Flex, Skeleton, Textarea } from "@chakra-ui/react";
import ZCLabel from "@Components/Chakra/Labels/ZCLabel";
import ZCSelect from "@Components/Select";
import { __, sprintf } from '@wordpress/i18n';
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
import { useEffect } from "react";
import { API, createSelectOptionsFromArray, current_logged_user, current_user_can, global_roles, namespace, plugin_root_url, site_url } from "@Utils/helper";
import { takeBootstrapValue } from "@Utils/bootstrap";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import Select from '@Components/ReactSelect';
import ZenComAvatar from "@Components/Chakra/ZenComAvatar";
import { IoCloseOutline } from "react-icons/io5";
import ZCCustomDrawer from "@Components/Drawer/Custom/ZCCustomDrawer";

const TicketDetailsDrawer = ({
    ticketData,
    ticketLoading,
    activePanel,
    onOpenChange,
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
    const [ticketNote, setTicketNote] = useState(ticketData?.meta?.note);
    const isAdminOrSupportAgent = current_logged_user?.is_site_admin || global_roles?.support_agent;

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

    return (
        <ZCCustomDrawer open={activePanel} onOpenChange={onOpenChange} backdrop={false} header={false} suffix="ticket-details">
            <Formik
                initialValues={{ ...ticketData, assignee_id: ticketData?.assignees?.[0]?.id || "" }}
                enableReinitialize={true}
            >
                {() => {
                    return (
                        <Form>
                            <Flex
                                p="12px 16px"
                                bg="var(--zencom-secondary-color)"
                                borderBottom="1px solid var(--zencom-border-color)"
                                justifyContent="space-between"
                                alignItems="center"
                                onClick={() => setOpenTicketInfo(!openTicketInfo)}
                                fontSize="14px"
                                // className="zencom-animate-fade"
                            >
                                <ZCLabel
                                    label={__("Ticket information", "zencommunity")}
                                    fontSize="14px"
                                    fontWeight="500"
                                />
                                {openTicketInfo ? <IoIosArrowUp /> : <IoIosArrowDown />}
                            </Flex>

                            {openTicketInfo && (
                                <Flex
                                    p="12px 16px"
                                    gap="16px"
                                    flexDirection="column"
                                    background="var(--zencom-background)"
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
                                            <ZCSelect
                                                label={__("Product", "zencommunity")}
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

                                            <ZCSelect
                                                label={__("Type", "zencommunity")}
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

                                            <ZCSelect
                                                label={__("Priority", "zencommunity")}
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
                                        </>
                                    )}
                                </Flex>
                            )}

                            <Flex
                                p="12px 16px"
                                bg="var(--zencom-secondary-color)"
                                className="label"
                                borderBottomWidth="1px"
                                borderColor="gray.200"
                                justifyContent="space-between"
                                alignItems="center"
                                onClick={() => setOpenAssignInfo(!openAssignInfo)}
                                fontSize="14px"
                                borderBottom="1px solid var(--zencom-border-color)"
                                borderTop="1px solid var(--zencom-border-color)"
                            >
                                <ZCLabel
                                    label={__("Assignee", "zencommunity")}
                                    fontSize="14px"
                                    fontWeight="500"
                                />
                                {openAssignInfo ? <IoIosArrowUp /> : <IoIosArrowDown />}
                            </Flex>

                            {openAssignInfo && (
                                <>
                                    {isAdminOrSupportAgent && (
                                        <Flex gap="12px" p="12px" direction="column" alignItems={"center"} bg="var(--zencom-background)">
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

                                        </Flex>
                                    )}
                                    {defaultAssignees?.length > 0 && (
                                        <Flex
                                            p="12px"
                                            flexDirection="column"
                                            gap="16px"
                                            bg="var(--zencom-background)"
                                        >
                                            {defaultAssignees?.map(user => (
                                                <Flex alignItems="center" justifyContent="space-between">
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
                                                        <Box _hover={{ color: "#E2483D" }}>
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
                                </>
                            )}
                        </Form>
                    )
                }}
            </Formik>

            {(global_roles?.support_agent || current_user_can?.manage_options) && (
                <Box p="12px 16px" bg="var(--zencom-background)">
                    <Textarea
                        border="1px solid var(--zencom-border-color)"
                        value={ticketNote}
                        borderRadius="4px"
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
        </ZCCustomDrawer>
    );
};

export default TicketDetailsDrawer;
