import React from "react";
import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { IoIosArrowDown } from "react-icons/io";

// Shared building blocks for the ticket/user right-sidebar panels so every
// section (Ticket information, Assignee, Private Note, Engineering issue…)
// reads consistently instead of each panel hand-rolling its own header with
// its own one-off border combination.

export const SectionHeader = ({ children }) => (
    <Text
        fontSize="12px"
        fontWeight="600"
        color="var(--zencom-font-color)"
        opacity={0.6}
        textTransform="uppercase"
        letterSpacing="0.04em"
        padding="0 16px"
        marginBottom="10px"
    >
        {children}
    </Text>
);

export const AccordionHeader = ({ children, isOpen, onClick }) => (
    <Flex
        as="button"
        type="button"
        width="100%"
        padding="12px 16px"
        justifyContent="space-between"
        alignItems="center"
        cursor="pointer"
        onClick={onClick}
        bg="transparent"
        border="none"
        _hover={{ bg: "var(--zencom-secondary-color)" }}
        transition="background 0.15s ease"
    >
        <Text
            fontSize="12px"
            fontWeight="600"
            color="var(--zencom-font-color)"
            opacity={0.6}
            textTransform="uppercase"
            letterSpacing="0.04em"
        >
            {children}
        </Text>
        <Box
            color="var(--zencom-font-color)"
            opacity={0.5}
            transform={isOpen ? "rotate(180deg)" : "rotate(0deg)"}
            transition="transform 0.2s ease"
            display="flex"
        >
            <IoIosArrowDown size={14} />
        </Box>
    </Flex>
);

export const InfoRow = ({ icon, children }) => (
    <Flex align="center" gap="10px" padding="6px 16px">
        <Flex
            align="center"
            justify="center"
            boxSize="28px"
            borderRadius="8px"
            bg="var(--zencom-secondary-color)"
            color="var(--zencom-font-color)"
            flexShrink={0}
        >
            <Icon as={icon} boxSize="14px" />
        </Flex>
        <Box fontSize="13px" color="var(--zencom-font-color)" minWidth={0} flex="1">
            {children}
        </Box>
    </Flex>
);

// Only the top border lives here — bottom spacing is NOT applied
// unconditionally, because a collapsed section renders no content and a
// fixed paddingBottom would leave a dead gap between the header and the
// next section's border. Content blocks add their own bottom padding
// (e.g. p="4px 16px 14px 16px") only when they're actually rendered.
export const SidebarSection = ({ children, first = false }) => (
    <Box borderTop={first ? "none" : "1px solid var(--zencom-border-color)"}>
        {children}
    </Box>
);
