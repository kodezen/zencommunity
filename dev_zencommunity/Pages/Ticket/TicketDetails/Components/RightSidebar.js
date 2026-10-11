import React, { useState, useEffect } from "react";
import {
    Button,
    Drawer,
    Flex,
    Portal,
    Separator,
    useBreakpointValue,
} from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";
import TicketDetailsDrawer from "./TicketDetailsDrawer";
import UserDetailsDrawer from "./UserDetailsDrawer";
import { LuTicket, LuIdCard } from "react-icons/lu";
import { GoDatabase } from "react-icons/go";
import ZCCustomDrawer from "@Components/Drawer/Custom/ZCCustomDrawer";
import { theme_settings } from "@Utils/helper";
import SummaryTickets from "../Conversations/SummaryTickets";

const RightSidebar = ({ ticketData, ticketLoading, btnType = "column" }) => {
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
            setActivePanel((prev) => prev || "user");
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
            setActivePanel("user");
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
            {btnType === "column" ? (
                <>
                    <Flex direction="column" gap="8px" p="16px">
                        <Button
                            color="var(--zencom-font-color)"
                            bg={getButtonBg("ticket")}
                            padding="4px"
                            minW="auto"
                            height="auto"
                            _hover={{
                                bg: isThemeDark ? "var(--zencom-secondary-color)" : "color-mix(in srgb, var(--zencom-primary-color) 15%, transparent)"
                            }}
                            onClick={handleTicketClick}
                        >
                            <LuTicket />
                        </Button>

                        <Button
                            color="var(--zencom-font-color)"
                            bg={getButtonBg("user")}
                            padding="4px"
                            minW="auto"
                            height="auto"
                            _hover={{
                                bg: isThemeDark ? "var(--zencom-secondary-color)" : "color-mix(in srgb, var(--zencom-primary-color) 15%, transparent)"
                            }}
                            onClick={handleUserClick}
                        >
                            <LuIdCard />
                        </Button>

                        <Button
                            color="var(--zencom-font-color)"
                            bg={getButtonBg("user-data")}
                            padding="4px"
                            minW="auto"
                            height="auto"
                            onClick={handleUserDataClick}
                            _hover={{
                                bg: isThemeDark ? "var(--zencom-secondary-color)" : "color-mix(in srgb, var(--zencom-primary-color) 15%, transparent)"
                            }}
                            display={{ base: "flex", sm: "flex", md: "flex", lg: "flex", xl: "none" }}
                        >
                            <GoDatabase />
                        </Button>
                    </Flex>

                    {activePanel === "ticket" && (
                        <TicketDetailsDrawer
                            ticketLoading={ticketLoading}
                            ticketData={ticketData}
                            activePanel
                            onOpenChange={handleClosePanel}
                            type="column"
                        />
                    )}

                    {activePanel === "user" && (
                        <UserDetailsDrawer
                            ticketData={ticketData}
                            activePanel
                            onOpenChange={handleClosePanel}
                            type="column"
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
            ) : (
                <>
                    <Flex direction="row" alignItems="center" gap="8px">
                        <Drawer.Root>
                            <Drawer.Trigger asChild>
                                <Button
                                    color="var(--zencom-font-color)"
                                    bg={getButtonBg("ticket")}
                                    padding="0"
                                    _hover={{
                                        bg: isThemeDark ? "var(--zencom-secondary-color)" : "color-mix(in srgb, var(--zencom-primary-color) 15%, transparent)"
                                    }}
                                >
                                    <LuTicket />
                                </Button>
                            </Drawer.Trigger>
                            <Portal>
                                <Drawer.Backdrop />
                                <Drawer.Positioner>
                                    <Drawer.Content>
                                        <Drawer.Body p={0}>
                                            <TicketDetailsDrawer
                                                ticketLoading={ticketLoading}
                                                ticketData={ticketData}
                                                activePanel
                                                onOpenChange={handleClosePanel}
                                                type="row"
                                            />
                                        </Drawer.Body>
                                    </Drawer.Content>
                                </Drawer.Positioner>
                            </Portal>
                        </Drawer.Root>

                        <Drawer.Root>
                            <Drawer.Trigger asChild>
                                <Button
                                    color="var(--zencom-font-color)"
                                    bg={getButtonBg("user")}
                                    padding="0"
                                    _hover={{
                                        bg: isThemeDark ? "var(--zencom-secondary-color)" : "color-mix(in srgb, var(--zencom-primary-color) 15%, transparent)"
                                    }}
                                >
                                    <LuIdCard />
                                </Button>
                            </Drawer.Trigger>
                            <Portal>
                                <Drawer.Backdrop />
                                <Drawer.Positioner>
                                    <Drawer.Content>
                                        <Drawer.Body p={0}>
                                            <UserDetailsDrawer
                                                ticketData={ticketData}
                                                activePanel
                                                onOpenChange={handleClosePanel}
                                                type="row"
                                            />
                                        </Drawer.Body>
                                    </Drawer.Content>
                                </Drawer.Positioner>
                            </Portal>
                        </Drawer.Root>

                        <Separator borderColor="var(--zencom-border-color)" orientation="vertical" height="6" />

                        <Drawer.Root>
                            <Drawer.Trigger asChild>
                                <Button
                                    color="var(--zencom-font-color)"
                                    bg={getButtonBg("user-data")}
                                    padding="0"
                                    _hover={{
                                        bg: isThemeDark ? "var(--zencom-secondary-color)" : "color-mix(in srgb, var(--zencom-primary-color) 15%, transparent)"
                                    }}
                                >
                                    <GoDatabase />
                                </Button>
                            </Drawer.Trigger>
                            <Portal>
                                <Drawer.Backdrop />
                                <Drawer.Positioner>
                                    <Drawer.Content>
                                        <Drawer.Body p={0}>
                                            <SummaryTickets minW="100%" maxW="100%" borderRight="none" />
                                        </Drawer.Body>
                                    </Drawer.Content>
                                </Drawer.Positioner>
                            </Portal>
                        </Drawer.Root>
                    </Flex>
                </>
            )}
        </>
    );
};

export default RightSidebar;
