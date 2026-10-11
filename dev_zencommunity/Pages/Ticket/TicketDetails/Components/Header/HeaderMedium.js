import React from 'react';
import {
    Flex,
    Button,
    Icon,
    Text,
    Menu,
    Portal,
    Drawer,
    Image,
    Avatar,
} from "@chakra-ui/react";
import ZCLabel from "@Components/Chakra/Labels/ZCLabel";
import { __, sprintf } from "@wordpress/i18n";
import { updateTicket } from "@Redux/slices/ticketSlice/ticketSlice";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, } from "react-redux";
import { baseURL, copyToClipboard, current_logged_user, getAvatarBg, getInitials, global_roles, site_logo, site_url, } from "@Utils/helper";
import {
    MdOutlineKeyboardArrowLeft,
    MdOutlineKeyboardArrowRight,
} from "react-icons/md";
import { IoIosArrowRoundBack } from "react-icons/io";
import PinConversations from "../../Conversations/PinConversations";
import { LuLink, LuMenu } from "react-icons/lu";
import { showNotification } from "@Redux/slices/notificationSlice/notificationSlice";
import { useStyles } from '../../../../../utils/chakra';
import { FaChevronDown } from 'react-icons/fa6';
import RightSidebar from '../RightSidebar';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';
import { ROLE_DEVELOPER } from '@Utils/roles';

const HeaderMedium = ({
    ticketData,
    updatedSingleTicket,
    setReplyTo,
    ticketLoading,
    onPrev,
    onNext,
    canPrev,
    canNext,
    type = "bottom"
}) => {
    const navigate = useNavigate();
    const isAdminOrSupportAgent = current_logged_user?.is_site_admin || global_roles?.support_agent;
    const isDeveloperOnly = !isAdminOrSupportAgent && global_roles?.[ROLE_DEVELOPER];
    const dispatch = useDispatch();
    const location = useLocation();
    const { primaryBtnInsideContentTrans } = useStyles();

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
        }
        else {
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

    return (
        <>
            {type === "bottom" ? (
                <Flex
                    p="8px 12px"
                    bg="var(--zencom-background)"
                    align="center"
                    justifyContent="space-between"
                    borderTop="1px solid var(--zencom-border-color)"
                // className="zencom-animate-fade"
                >
                    {!isDeveloperOnly && (
                        <RightSidebar btnType='row' ticketLoading={ticketLoading} ticketData={ticketData} />
                    )}

                    {isAdminOrSupportAgent && (
                        <Menu.Root>
                            <Menu.Trigger asChild>
                                <Button
                                    // {...primaryBtnInsideContentTrans}
                                    // className='zencom-menu zencom-menu--active'
                                    padding="0px"
                                    width="auto"
                                    minWidth="auto"
                                    height="auto"
                                    focusRing="none"
                                    color="var(--zencom-primary-color)"
                                >
                                    <Text
                                        fontSize="14px"
                                        fontWeight="500"
                                        borderRight="1px solid var(--zencom-border-color)"
                                        p="8px 14px"
                                    >
                                        {getSubmitLabel(updatedSingleTicket?.status)}
                                    </Text>
                                    <Icon as={FaChevronDown} size="xs" color="#fff" paddingRight="8px" />
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
            ) : (
                <Flex
                    bg="var(--zencom-background)"
                    align="center"
                    direction="column"
                    justifyContent="space-between"
                    width="100%"
                    position="fixed"
                    top="0px"
                    left="0px"
                    zIndex="999"
                    borderBottom="1px solid var(--zencom-border-color)"
                // className="zencom-animate-fade"
                >
                    <Flex alignItems="center" justifyContent="space-between" width="100%" padding="12px">
                        <Flex alignItems="center" gap={2}>
                            <Drawer.Root placement="start">
                                <Drawer.Trigger asChild>
                                    <Button variant="plain" bg="none" color="var(--zencom-font-color)" border="1px solid var(--zencom-border-color)" p="6px" size="xs">
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

                            <Button variant="plain" onClick={() => navigate("/tickets")} padding={0} height="auto">
                                <Icon as={IoIosArrowRoundBack} /> <ZCLabel
                                    label={__("Ticket list", "zencommunity")}
                                    type="title"
                                    fontSize="16px"
                                    fontWeight="600"
                                />
                            </Button>
                        </Flex>

                        {/* Prev / Next via props */}
                        <Flex alignItems="center" gap={1}>
                            <Button
                                variant="plain"
                                padding={0}
                                height="auto"
                                color={"#586774"}
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

                            <ZCLabel
                                // translators: %s:ticketData.id
                                label={sprintf(__("#%s", "zencommunity"), ticketData?.id)}
                                fontSize="18px"
                                fontWeight="600"
                                lineHeight="28px"
                            />

                            <Button
                                variant="plain"
                                padding={0}
                                height="auto"
                                color={"#586774"}
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
                        </Flex>

                        <Flex alignItems="center" gap={2}>
                            {isAdminOrSupportAgent && (
                                <PinConversations ticket_id={ticketData?.id} setReplyTo={setReplyTo} />
                            )}

                            <Button size="xs" onClick={handleCopyLink} {...primaryBtnInsideContentTrans} minW="auto" height="auto" p="6px">
                                <LuLink />
                            </Button>
                        </Flex>
                    </Flex>
                </Flex>
            )}
        </>
    );
};

export default HeaderMedium;
