import { Box, Flex, Skeleton, SkeletonCircle } from "@chakra-ui/react";

const TicketDetailsSkelton = () => {
    return (
        <Flex direction="column" h="100vh"
        maxW={{ base: "100%", sm: "100%", md: "100%", lg: "100%", xl: "1620px" }}
        minW={{ base: "100%", sm: "100%", md: "100%", lg: "100%", xl: "1250px" }}
        >
            <Flex
                h="60px"
                align="center"
                justify="space-between"
                px="6"
                borderBottom="1px solid #e2e8f0"
                bg="var(--zencom-background)"
            >
                <Flex align="center" gap="4">
                    <Skeleton height="20px" width="80px" />
                    <Skeleton height="20px" width="200px" />
                </Flex>
                <Skeleton height="32px" width="120px" borderRadius="md" />
            </Flex>

            <Flex flex="1">
                <Box flex="1" p="6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Flex key={i} align="flex-start" gap="3" mb="6">
                            <SkeletonCircle size="10" />
                            <Box>
                                <Skeleton height="12px" width="100px" mb="2" />
                                <Skeleton
                                    height={i % 2 === 0 ? "20px" : "40px"}
                                    width="300px"
                                    borderRadius="md"
                                />
                            </Box>
                        </Flex>
                    ))}
                </Box>
                <Box w="280px" p="4" borderLeft="1px solid #e2e8f0" bg="var(--zencom-background)">
                    {["Product", "Requester", "Type", "Priority", "Assignee"].map(
                        (label, i) => (
                            <Box key={i} mb="6">
                                <Skeleton height="12px" width="60px" mb="2" />
                                <Flex align="center" gap="3">
                                    <SkeletonCircle size="6" />
                                    <Skeleton height="14px" width="120px" />
                                </Flex>
                            </Box>
                        )
                    )}
                </Box>
            </Flex>
        </Flex>
    );
};

export default TicketDetailsSkelton;