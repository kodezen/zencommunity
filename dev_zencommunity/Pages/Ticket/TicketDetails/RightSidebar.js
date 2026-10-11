import React, { useState, useEffect } from "react";
import {
    Box,
    Button,
    Flex,
    useBreakpointValue,
} from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";
import TicketDetailsDrawer from "./TicketDetailsDrawer";
import UserDetailsDrawer from "./UserDetailsDrawer";
import { LuTicket, LuIdCard } from "react-icons/lu";
import { GoDatabase } from "react-icons/go";
import ZCCustomDrawer from "@Components/Drawer/Custom/ZCCustomDrawer";
import SummaryTickets from "./Conversations/SummaryTickets";
import { theme_settings } from "@Utils/helper";

const RightSidebar = ({ ticketData, ticketLoading }) => {
    const isThemeDark = theme_settings?.theme_mode === "dark";
    const [activePanel, setActivePanel] = useState(null);

    const isLargeScreen = useBreakpointValue({
        base: false,
        sm: false,
        md: false,
        lg: true,
        xl: true,
        "2xl": true,
    });

    useEffect(() => {
        if (isLargeScreen) {
            setActivePanel((prev) => prev || "ticket");
        } else {
            setActivePanel(null);
        }
    }, [isLargeScreen]);

    const handleTicketClick = () => {
        if (isLargeScreen) {
            setActivePanel("ticket");
        } else {
            setActivePanel((prev) => (prev === "ticket" ? null : "ticket"));
        }
    };

    const handleUserClick = () => {
        if (isLargeScreen) {
            setActivePanel("user");
        } else {
            setActivePanel((prev) => (prev === "user" ? null : "user"));
        }
    };

    const handleUserDataClick = () => {
        if (isLargeScreen) {
            setActivePanel("user-data");
        } else {
            setActivePanel((prev) =>
                prev === "user-data" ? null : "user-data"
            );
        }
    };

    const handleClosePanel = () => {
        if (isLargeScreen) {
            setActivePanel("ticket");
        } else {
            setActivePanel(null);
        }
    };

    const getButtonBg = (panel) => {
    if (activePanel !== panel) return "transparent";
    return isThemeDark
        ? "var(--zencom-secondary-color)"
        : "color-mix(in srgb, var(--zencom-primary-color) 15%, transparent)";
    };

    return (
        <>
            <Box
                bg="var(--zencom-background)"
                p={4}
                position="fixed"
                right="16px"
                top={{ base: "148px", sm: "148px", md: "128px" }}
                height="calc(100vh - 70px)"
                borderLeft="1px solid var(--zencom-border-color)"
                borderRight="1px solid var(--zencom-border-color)"
                // className="zencom-animate-fade"
            >
                <Flex direction="column" gap="8px">
                    <Button
                        color="var(--zencom-font-color)"
                        bg={getButtonBg("ticket")}
                        padding="0"
                        _hover={{
                            bg: isThemeDark ? "var(--zencom-background)" : "color-mix(in srgb, var(--zencom-primary-color) 100%, transparent)"
                        }}
                        onClick={handleTicketClick}
                    >
                        <LuTicket />
                    </Button>

                    <Button
                        color="var(--zencom-font-color)"
                        bg={getButtonBg("user")}
                        padding="0"
                        _hover={{
                            bg: isThemeDark ? "var(--zencom-background)" : "color-mix(in srgb, var(--zencom-primary-color) 100%, transparent)"
                        }}
                        onClick={handleUserClick}
                    >
                        <LuIdCard />
                    </Button>

                    <Button
                        color="var(--zencom-font-color)"
                        bg={getButtonBg("user-data")}
                        padding="0"
                        onClick={handleUserDataClick}
                        _hover={{
                            bg: isThemeDark ? "var(--zencom-background)" : "color-mix(in srgb, var(--zencom-primary-color) 100%, transparent)"
                        }}
                        display={{ base: "flex", sm: "flex", md: "flex", lg: "flex", xl: "none" }}
                    >
                        <GoDatabase />
                    </Button>
                </Flex>
            </Box>

            {activePanel === "ticket" && (
                <TicketDetailsDrawer
                    ticketLoading={ticketLoading}
                    ticketData={ticketData}
                    activePanel
                    onOpenChange={handleClosePanel}
                />
            )}

            {activePanel === "user" && (
                <UserDetailsDrawer
                    ticketData={ticketData}
                    activePanel
                    onOpenChange={handleClosePanel}
                />
            )}

            {activePanel === "user-data" && (
                <ZCCustomDrawer
                    open
                    onOpenChange={handleClosePanel}
                    backdrop={false}
                    header={false}
                    suffix="ticket-details"
                >
                    <SummaryTickets minW="100%" maxW="100%" borderRight="none" />
                </ZCCustomDrawer>
            )}
        </>
    );
};

export default RightSidebar;
