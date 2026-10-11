import { useState } from "react";
import { Button, Flex, Icon } from "@chakra-ui/react";
import { __ } from '@wordpress/i18n';
import { API, namespace, site_url, sliceString } from "@Utils/helper";
import { IoIosArrowBack } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import CreateTicket from "@Pages/Ticket/CreateTicket";
import ZenComAvatar from "@Components/Chakra/ZenComAvatar";
import ZenComMenu from "@Components/ZenComMenu";
import { LuInfo, LuTicketSlash } from "react-icons/lu";
import { CgUnblock } from "react-icons/cg";
import { useStyles } from "../../../utils/chakra";
import ZenComDrawer from "@Components/ZenComDrawer";
import MessageRightDetailsBar from "./MessageRightDetailsBar";
import ZenComTooltip from "@Components/ZenComTooltip";
import { MdBlock } from "react-icons/md";

const iconBtnProps = {
    background: "transparent",
    border: "none",
    borderRadius: "50%",
    padding: "8px",
    minWidth: "36px",
    height: "36px",
    color: "var(--zencom-font-color)",
    _hover: { background: "var(--zencom-secondary-color)" },
};

const ChatBoxHeader = ({ 
    selectedUser, 
    fetchBlockedUsers, 
    isBlocked, 
    setBlockedUser, 
    blockedUser, 
    onBack, 
    showBackButton,
    dataLoading,
    isLargeScreen,
}) => {
    const { clearBtn } = useStyles();
    const [ticketDrawerOpen, setOpenTicketDrawer] = useState(false);
    const handleBlockUser = async () => {
        await API.post(namespace + `/private/message/user/${parseInt(selectedUser?.id)}/block`);
        setBlockedUser([...blockedUser, selectedUser])
        await fetchBlockedUsers();
    }
    const handleUnblockUser = async () => {
        await API.post(namespace + `/private/message/user/${parseInt(selectedUser?.id)}/unblock`);
        setBlockedUser(blockedUser.filter(item => parseInt(item.id) !== parseInt(isBlocked.id)))
        await fetchBlockedUsers();
    }

    const menuOptions = [
        {
            label: __("Create ticket", "zencommunity"),
            icon: LuTicketSlash,
            type: "button",
            onClick: () => {setOpenTicketDrawer(true)},
        },
        // {
        //     label: __("End chat", "zencommunity"),
        //     icon: LuMessagesSquare,
        //     type: "button",
        //     onClick: () => {},
        // },
        {
            label: isBlocked ? __("Unblock", "zencommunity") : __("Block", "zencommunity"),
            icon: isBlocked ? CgUnblock : MdBlock,
            type: "button",
            hasBorder: true,
            textColor: "red",
            iconColor: "red",
            onClick: isBlocked ? handleUnblockUser : handleBlockUser,
        },
    ];

    return (
        <Flex
            align="center"
            justify="space-between"
            padding="10px 16px"
            borderBottom="1px solid var(--zencom-border-color)"
            bg="var(--zencom-background)"
        >
            <Flex align="center">
                {showBackButton && (
                    <Button {...clearBtn} onClick={onBack}>
                        <IoIosArrowBack />
                    </Button>
                )}

                <ZenComTooltip content={selectedUser?.name ?? selectedUser?.first_name + " " + selectedUser?.last_name} position="bottom">
                    <ZenComAvatar
                    userID={selectedUser?.id}
                    userName={sliceString(selectedUser?.name ?? selectedUser?.first_name + " " + selectedUser?.last_name, 25, "...")}
                    src={(selectedUser?.avatar_url || selectedUser?.featured_img) ? `${site_url}${selectedUser.avatar_url ?? selectedUser?.featured_img}` : ""}
                    time={moment().format('MMMM D, YYYY')}
                    boxSize="32px"
                />
                </ZenComTooltip>
            </Flex>

            <Flex align="center">
                <Flex align="center" justify="center" minWidth="36px" height="36px">
                    <ZenComMenu
                        options={menuOptions}
                        suffix="chatbox"
                    />
                </Flex>

                {!isLargeScreen && (
                    <ZenComDrawer
                        triggerClassname={iconBtnProps}
                        triggerContent={<Icon as={LuInfo} boxSize="18px" />}
                        isHeader={false}
                        backdrop={false}
                        isClose={false}
                        defaultOpen={false}
                        placement="end"
                        size="md"
                        width="360px"
                        bodyPadding="0px"
                        marginTop="57px"
                    >
                        <MessageRightDetailsBar
                            dataLoading={dataLoading}
                            selectedUser={selectedUser}
                        />
                    </ZenComDrawer>
                )}

                <Button {...iconBtnProps} onClick={onBack} aria-label={__('Close conversation', 'zencommunity')}>
                    <IoClose size={18} />
                </Button>
            </Flex>

            {ticketDrawerOpen && <CreateTicket ticketDrawerOpen={ticketDrawerOpen} setOpenTicketDrawer={setOpenTicketDrawer}/>}
        </Flex>
    );
};

export default ChatBoxHeader;
