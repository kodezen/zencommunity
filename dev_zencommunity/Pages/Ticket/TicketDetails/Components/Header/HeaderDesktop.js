import React, { useState } from 'react';
import {
    Box,
    Flex,
    Button,
    Icon,
    Text,
    Menu,
    Portal,
    Popover,
    Skeleton,
    Image,
    Drawer,
    Avatar,
} from "@chakra-ui/react";
import ZCLabel from "@Components/Chakra/Labels/ZCLabel";
import { __, sprintf } from "@wordpress/i18n";
import { updateTicket } from "@Redux/slices/ticketSlice/ticketSlice";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { baseURL, copyToClipboard, current_logged_user, getAvatarBg, getInitials, global_roles, site_logo, site_url, sliceString } from "@Utils/helper";
import {
    MdOutlineKeyboardArrowLeft,
    MdOutlineKeyboardArrowRight,
} from "react-icons/md";
import { FaChevronDown } from "react-icons/fa";
import { IoIosArrowRoundBack } from "react-icons/io";
import PinConversations from "../../Conversations/PinConversations";
import { BsThreeDots } from "react-icons/bs";
import { LuLink, LuMenu } from "react-icons/lu";
import { showNotification } from "@Redux/slices/notificationSlice/notificationSlice";
import { useStyles } from '../../../../../utils/chakra';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';

const HeaderDesktop = ({
    ticketData,
    updatedSingleTicket,
    setReplyTo,
    ticketLoading,
    onPrev,
    onNext,
    canPrev,
    canNext,
}) => {
    const navigate = useNavigate();
    const isAdminOrSupportAgent = (current_logged_user?.is_site_admin || global_roles?.support_agent) || Number(ticketData?.user_id) === Number(current_logged_user?.id);
    const canManagePins = current_logged_user?.is_site_admin || global_roles?.support_agent;
    const dispatch = useDispatch();
    const location = useLocation();
    const [hoverText, setHoverText] = useState(false);
    const { primaryBtnInsideContent, } = useStyles();

    const statusOptions =
        updatedSingleTicket?.status === "closed"
            ? [{ label: __("In Progress", "zencommunity"), value: "in-progress" }]
            : updatedSingleTicket?.status === "resolved"
                ? [{ label: __("Closed", "zencommunity"), value: "closed" }]
                : [{ label: __("Resolved", "zencommunity"), value: "resolved" },
                { label: __("Closed", "zencommunity"), value: "closed" }]


    const getSubmitLabel = (status) => {
        if (["new", "open", "in-progress", "draft", "waiting"].includes(status)) {
            return "Submit as Resolved";
        } else if (status === "resolved") {
            return "Submit as Closed";
        } else if (status === "closed") {
            return "Submit as In Progress";
        } else {
            return "Submit";
        }
    };

    const handleCopyLink = () => {
        const sharableLink = baseURL(location.pathname);

        copyToClipboard(sharableLink);

        dispatch(
            showNotification({
                message: __("Link copied", "zencommunity"),
                isShow: true,
                type: "success",
            })
        );
    };

    const slicedTitle = ticketData?.title
        ? ticketData.title.length > 30
            ? <Text onMouseLeave={() => setHoverText(false)} onMouseEnter={() => setHoverText(true)}>{sliceString(ticketData.title, 30)}</Text>
            : ticketData.title
        : "";

    return (
        <Flex
            p="16px"
            bg="var(--zencom-background)"
            align="center"
            justifyContent="space-between"
            width={{ md: "100%", lg: "100%", xl: "100%" }}
            position="fixed"
            top="0px"
            zIndex="8"
            borderBottom="1px solid var(--zencom-border-color)"
        // className="zencom-animate-fade"
        >
            <Flex gap={4} alignItems="center">
                <Drawer.Root placement="start">
                    <Drawer.Trigger asChild>
                        <Button variant="plain" bg="none" color="var(--zencom-font-color)" border="1px solid var(--zencom-border-color)" p="6px" size="xs" display={{ base: "none", md: "none", lg: "block", xl: "none" }}>
                            <LuMenu />
                        </Button>
                    </Drawer.Trigger>
                    <Portal>
                        <Drawer.Positioner>
                            <Drawer.Content bg="var(--zencom-background)" maxW="300px" minW="300px">
                                <Drawer.Header p="12px 16px" borderBottom="1px solid var(--zencom-border-color)" mb="16px">
                                    <Flex justifyContent="space-between" alignItems="center" width="100%">
                                        <Image src={site_logo} width="36px" />

                                        <Link
                                            to={`/member/${current_logged_user?.id}`}
                                            style={{ textDecoration: 'none', color: 'inherit', outline: 'none' }}
                                        >
                                            <Avatar.Root size="xs" width="24px" height="24px" borderWidth="2px" borderColor="var(--zencom-border-color)">
                                                <Avatar.Fallback
                                                    bg={getAvatarBg(`${current_logged_user?.first_name} ${current_logged_user?.last_name}`)}
                                                    color="white"
                                                    display='flex'
                                                    alignItems='center'
                                                    justifyContent='center'
                                                    width='100%'
                                                    height='100%'
                                                >
                                                    {getInitials(`${current_logged_user?.first_name} ${current_logged_user?.last_name}` ?? current_logged_user?.usename)}
                                                </Avatar.Fallback>
                                                <Avatar.Image
                                                    src={current_logged_user?.avatar_url ? `${site_url}${current_logged_user?.avatar_url} ` : ""}
                                                />
                                            </Avatar.Root>
                                        </Link>
                                    </Flex>
                                </Drawer.Header>

                                <Drawer.Body p={0}>
                                    <LeftSidebar />
                                </Drawer.Body>
                            </Drawer.Content>
                        </Drawer.Positioner>
                    </Portal>
                </Drawer.Root>

                <Button
                    variant="plain"
                    padding={0}
                    height="auto"
                    onClick={() => {
                        if (window.history.state && window.history.state.idx > 0) {
                            navigate(-1);
                        } else {
                            navigate("/tickets");
                        }
                    }}
                >
                    <Icon as={IoIosArrowRoundBack} boxSize="30px" />
                    <ZCLabel
                        label={__("Ticket list", "zencommunity")}
                        type="title"
                        fontSize="16px"
                        fontWeight="600"
                    />
                </Button>
            </Flex>

            {ticketLoading ? (
                <Skeleton height="20px" width="200px" />
            ) : (
                <>
                    <Flex gap="6px" alignItems="center">
                        {/* Prev / Next via props */}
                        {/* <Flex>
                            <Button
                                variant="plain"
                                padding={0}
                                height="auto"
                                color={'var(--zencom-font-color)'}
                                onClick={onPrev}
                                disabled={!canPrev}
                                aria-label={__('Previous ticket', 'zencommunity')}
                                title={
                                    canPrev
                                        ? __("Previous ticket", "zencommunity")
                                        : __("No previous ticket", "zencommunity")
                                }
                            >
                                <Icon as={MdOutlineKeyboardArrowLeft} boxSize="7" />
                            </Button>

                            <Button
                                variant="plain"
                                padding={0}
                                height="auto"
                                color={"var(--zencom-font-color)"}
                                onClick={onNext}
                                disabled={!canNext}
                                aria-label={__('Next ticket', 'zencommunity')}
                                title={
                                    canNext
                                        ? __("Next ticket", "zencommunity")
                                        : __("No next ticket", "zencommunity")
                                }
                            >
                                <Icon as={MdOutlineKeyboardArrowRight} boxSize="7" />
                            </Button>
                        </Flex> */}

                        <ZCLabel
                            // translators: %s:ticketData.id
                            label={sprintf(__("Ticket #%s", "zencommunity"), ticketData?.id)}
                            fontSize="18px"
                            fontWeight="600"
                            lineHeight="28px"
                        />

                        <ZCLabel
                            label={slicedTitle}
                            fontSize="18px"
                            fontWeight="600"
                            lineHeight="28px"
                        />

                        {hoverText && (
                            <>
                                <Popover.Root open={hoverText}>
                                    <Popover.Trigger asChild cursor="pointer">
                                        <Text />
                                    </Popover.Trigger>
                                    <Portal>
                                        <Popover.Positioner>
                                            <Popover.Content>
                                                <Popover.Body
                                                    p="12px"
                                                    background="var(--zencom-background)"
                                                    color={'var(--zencom-font-color)'}
                                                >
                                                    <Text>
                                                        {ticketData?.title}
                                                    </Text>
                                                </Popover.Body>
                                            </Popover.Content>
                                        </Popover.Positioner>
                                    </Portal>
                                </Popover.Root>
                            </>
                        )}
                    </Flex>
                </>
            )}

            <Flex gap="12px" alignItems="center" justifyContent="flex-end">
                <Flex alignItems="center" gap="8px" background="var(--zencom-background)" color={'var(--zencom-font-color)'}>
                    {canManagePins && (
                        <PinConversations ticket_id={ticketData?.id} setReplyTo={setReplyTo} />
                    )}
                    <Menu.Root>
                        <Menu.Trigger asChild>
                            <Box w="32px" cursor="pointer" color={'var(--zencom-font-color)'}>
                                <BsThreeDots />
                            </Box>
                        </Menu.Trigger>
                        <Portal>
                            <Menu.Positioner style={{ zIndex: 9999 }}>
                                <Menu.Content bg="var(--zencom-background)">
                                    <Menu.Item value="copy-link" cursor="pointer" color={'var(--zencom-font-color)'} onClick={handleCopyLink}>
                                        <LuLink />
                                        <Box flex="1">{__("Copy link", "zencommunity")}</Box>
                                    </Menu.Item>
                                </Menu.Content>
                            </Menu.Positioner>
                        </Portal>
                    </Menu.Root>
                </Flex>

                {isAdminOrSupportAgent && (
                    <Menu.Root>
                        <Menu.Trigger asChild>
                            <Button
                                {...primaryBtnInsideContent}
                                padding="0 14px 0 0px"
                            >
                                <Text
                                    fontSize="14px"
                                    fontWeight="500"
                                    borderRight="1px solid var(--zencom-border-color)"
                                    p="8px 14px"
                                >
                                    {getSubmitLabel(updatedSingleTicket?.status)}
                                </Text>
                                <Icon as={FaChevronDown} size="xs" color="#fff" marginLeft="4px" />
                            </Button>
                        </Menu.Trigger>
                        <Portal>
                            <Menu.Positioner>
                                <Menu.Content
                                    color={'var(--zencom-font-color)'}
                                    bg="var(--zencom-background)"
                                    width='200px'
                                    boxShadow='var(--zencom-shadow)'
                                >
                                    {statusOptions.map((status) => (
                                        <Menu.Item
                                            key={status.value}
                                            value={status.value}
                                            color={'var(--zencom-font-color)'}
                                            onClick={() => {
                                                dispatch(
                                                    updateTicket({
                                                        ticket_id: ticketData?.id,
                                                        payload: { status: status?.value },
                                                    })
                                                );
                                            }}
                                            cursor="pointer"
                                        >
                                            {status?.label}
                                        </Menu.Item>
                                    ))}
                                </Menu.Content>
                            </Menu.Positioner>
                        </Portal>
                    </Menu.Root>
                )}
            </Flex>
        </Flex>
    );
};

export default HeaderDesktop;
