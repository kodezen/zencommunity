import React from "react";
import {
    Box,
    Flex,
    Skeleton,
    Separator,
} from "@chakra-ui/react";
import { __ } from "@wordpress/i18n";

const IconMenu = () => {
    return (
        <Flex justifyContent="space-between" flexDirection="column" height="100%">
            <Box minW="74px">
                <Box p={4}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} height="30px" width="30px" m="0 auto 12px auto" />
                    ))}
                </Box>

                <Separator flex="1" borderColor="var(--zencom-border-color)" />

                <Box p={4}>
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} height="30px" width="30px" m="0 auto 12px auto" />
                    ))}
                </Box>
            </Box>

            <Box>
                <Separator flex="1" borderColor="var(--zencom-border-color)" />
                <Skeleton height="30px" width="30px" m="16px auto" p={4} />
            </Box>
        </Flex>
    );
};

export default IconMenu;
