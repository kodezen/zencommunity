import React from "react";
import {
    Box,
    Flex,
    SkeletonCircle,
    Skeleton,
} from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";

const TicketReplies = () => {
    return (
        <Box
            flex="1"
            p="6"
            maxW={{
                base: "calc(100% - 114px)",
                sm: "calc(100% - 114px)",
                md: "calc(100% - 114px)",
                lg: "calc(608px - 114px)",
                xl: "calc(650px - 114px)",
                "2xl": "720px"
            }}
            minW={{
                base: "calc(100% - 114px)",
                sm: "calc(100% - 114px)",
                md: "calc(100% - 114px)",
                lg: "calc(696px - 114px)",
                xl: "calc(650px - 114px)",
                "2xl": "720px"
            }}
            margin={{
                base: "140px 16px 16px 16px",
                sm: "140px 16px 16px 16px",
                md: "140px 16px 16px 16px",
                lg: "0px auto 0 2%",
                xl: "0px auto 0 30%",
                "2xl": "0px auto 0 auto"
            }}
        >
            {Array.from({ length: 3 }).map((_, i) => (
                <Flex key={i} align="flex-start" gap="3" mb="4">
                    <SkeletonCircle size="10" />
                    <Box width="100%">
                        <Skeleton height="12px" width="100px" mb="2" />
                        <Skeleton
                            height="40px"
                            borderRadius="md"
                        />
                    </Box>
                </Flex>
            ))}
        </Box>
    );
};

export default TicketReplies;
