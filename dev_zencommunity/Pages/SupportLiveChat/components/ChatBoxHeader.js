import { useState } from "react";
import { Button, Flex, Icon } from "@chakra-ui/react";
import { __ } from '@wordpress/i18n';
import { site_url } from "@Utils/helper";
import { IoIosArrowBack } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import CreateTicket from "@Pages/Ticket/CreateTicket";
import ZenComAvatar from "@Components/Chakra/ZenComAvatar";
import { LuInfo, LuTicketSlash } from "react-icons/lu";
import { useStyles } from "../../../utils/chakra";
import ZenComDrawer from "@Components/ZenComDrawer";
import ZenComMenu from "@Components/ZenComMenu";
import MessageRightDetailsBar from "./MessageRightDetailsBar";

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
    const [ticketDrawerOpen, setOpenTicketDrawer] = useState(false);
    // const handleBlockUser = async () => {
    //     await API.post(namespace + `/private/message/user/${parseInt(selectedUser?.id)}/block`);
    //     setBlockedUser([...blockedUser, selectedUser])
    //     await fetchBlockedUsers();
    // }
    // const handleUnblockUser = async () => {
    //     await API.post(namespace + `/private/message/user/${parseInt(selectedUser?.id)}/unblock`);
    //     setBlockedUser(blockedUser.filter(item => parseInt(item.id) !== parseInt(isBlocked.id)))
    //     await fetchBlockedUsers();
    // }
    const { clearBtn } = useStyles();

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
        // {
        //     label: isBlocked ? __("Unblock", "zencommunity") : __("Block", "zencommunity"),
        //     icon: CgBlock,
        //     type: "button",
        //     onClick: isBlocked ? handleUnblockUser : handleBlockUser,
        //     hasBorder: true,
        //     textColor: "red",
        //     iconColor: "red",
        // },
    ];

    // Shared look for every icon button in the row (info, menu, close) so
    // they read as one consistent group rather than three differently-styled
    // controls that happened to end up next to each other.
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

    return (
        <Flex
            align="center"
            justify="space-between"
            padding="10px 16px"
            borderBottom="1px solid var(--zencom-border-color)"
            bg="var(--zencom-background)"
        >
            <Flex align="center" gap="4px">
                {showBackButton && (
                    <Button {...clearBtn} onClick={onBack}>
                        <IoIosArrowBack />
                    </Button>
                )}

                <ZenComAvatar
                    userID={selectedUser?.id}
                    userName={selectedUser?.name}
                    src={(selectedUser?.avatar) ? `${selectedUser?.avatar.includes('https://') ? "" : site_url}${selectedUser.avatar}` : ""}
                    time={moment().format('MMMM D, YYYY')}
                    boxSize="32px"
                />
            </Flex>

            <Flex align="center" gap="2px">
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

                {/* "Create ticket" previously had no way to reach it — this menu
                    was defined above but never rendered anywhere. */}
                <Flex align="center" justify="center" minWidth="36px" height="36px">
                    <ZenComMenu options={menuOptions} suffix="chat-header-menu" />
                </Flex>

                <Button {...iconBtnProps} onClick={onBack} aria-label={__('Close conversation', 'zencommunity')}>
                    <IoClose size={18} />
                </Button>
            </Flex>
            {ticketDrawerOpen && <CreateTicket ticketDrawerOpen={ticketDrawerOpen} setOpenTicketDrawer={setOpenTicketDrawer}/>}
        </Flex>
    );
};

export default ChatBoxHeader;