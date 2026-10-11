import {
    Box,
    Flex,
    Skeleton,
    Stack,
} from "@chakra-ui/react"
import { useStyles } from "../../../utils/chakra";

const GroupLoading = () => {
    const { responsiveContent3 } = useStyles();

    return (
        <Flex p={6} {...responsiveContent3} direction="column" gap={'16px'}>
            <Box
                display="flex"
                flexDirection={"column"}
                gap={4}
                borderRadius="md"
                bg={"var(--zencom-background)"}
                position="relative"
            >
                {/* Cover Image Skeleton */}
                <Skeleton height="320px" width="100%" borderTopRadius="md" />

                {/* Group Header Skeleton */}
                <Stack spacing={4} p={6} pt={0} pb={0} height="120px">
                    <Flex align="center" gap={6} mt={-16} position="relative" zIndex={1}>
                        {/* Profile Avatar */}
                        <Skeleton height="120px" width="120px" borderRadius="full" border="4px solid var(--zencom-background)" />
                        
                        {/* Header Info */}
                        <Flex flex={1} justify="space-between" align="flex-start">
                            <Stack spacing={2} flex={1}>
                                <Skeleton height="28px" width="200px" />
                                <Skeleton height="16px" width="150px" />
                            </Stack>
                            
                            {/* Action Buttons */}
                            <Flex gap={2} wrap="wrap" justify="flex-end">
                                <Skeleton height="36px" width="80px" borderRadius="md" />
                                <Skeleton height="36px" width="80px" borderRadius="md" />
                                <Skeleton height="36px" width="40px" borderRadius="md" />
                            </Flex>
                        </Flex>
                    </Flex>

                    {/* Description Skeleton */}
                    <Stack spacing={2}>
                        <Skeleton height="14px" width="100%" />
                        <Skeleton height="14px" width="95%" />
                    </Stack>
                </Stack>

                {/* Tab Navigation Skeleton */}
                <Flex
                    gap={8}
                    px={6}
                    borderTop="1px solid var(--zencom-border-color)"
                    borderBottom="1px solid var(--zencom-border-color)"
                    py={2}
                    overflowX="auto"
                >
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} height="16px" width="80px" />
                    ))}
                </Flex>
            </Box>

            {/* Main Content Layout */}
            <Flex gap={6} direction={{ base: "column", lg: "row" }}>
                {/* Left Content Area */}
                <Stack spacing={6} flex={1} minW={0}>
                    {/* Create Post Section Skeleton */}
                    <Box
                        padding="20px"
                        borderWidth="1px"
                        borderRadius="6px"
                        bg="var(--zencom-background)"
                        marginBottom={'40px'}
                    >
                        <Stack spacing={2}>
                            {/* Input Field */}
                            <Flex gap={3}>
                                <Skeleton height="40px" width="40px" borderRadius="full" />
                                <Skeleton height="40px" flex={1} borderRadius="md" />
                            </Flex>

                            {/* Post Type Buttons */}
                            <Flex gap={3} justify="space-around">
                                <Skeleton height="32px" width="80px" borderRadius="md" />
                                <Skeleton height="32px" width="100px" borderRadius="md" />
                                <Skeleton height="32px" width="80px" borderRadius="md" />
                            </Flex>
                        </Stack>
                    </Box>

                    {/* Filter/Sorting Section Skeleton */}
                    <Flex gap={4} align="center" justify="space-between">
                        <Flex gap={2}>
                            <Skeleton height="36px" width="120px" borderRadius="md" />
                            <Skeleton height="36px" width="100px" borderRadius="md" />
                        </Flex>
                        <Skeleton height="36px" width="140px" borderRadius="md" />
                    </Flex>

                    {/* Post Cards Skeletons */}
                    {[1, 2].map((postIndex) => (
                        <Box
                            key={postIndex}
                            padding="20px"
                            borderWidth="1px"
                            borderRadius="6px"
                            bg="var(--zencom-background)"
                        >
                            <Stack spacing={4}>
                                {/* Author & Meta */}
                                <Flex gap={4} align="flex-start">
                                    <Skeleton height="40px" width="40px" borderRadius="full" />
                                    <Stack spacing={2} flex={1} width="full">
                                        <Skeleton height="16px" width="40%" />
                                        <Skeleton height="12px" width="30%" />
                                    </Stack>
                                    <Skeleton height="20px" width="20px" />
                                </Flex>

                                {/* Title */}
                                <Skeleton height="18px" width="75%" />

                                {/* Content Lines */}
                                <Stack spacing={2}>
                                    <Skeleton height="12px" width="100%" />
                                    <Skeleton height="12px" width="100%" />
                                    <Skeleton height="12px" width="90%" />
                                </Stack>

                                {/* Image */}
                                <Skeleton height="200px" width="100%" borderRadius="6px" />

                                {/* Action Buttons */}
                                <Flex
                                    gap={8}
                                    justify="flex-start"
                                    borderTop="1px solid var(--zencom-border-color)"
                                    pt={4}
                                >
                                    <Skeleton height="14px" width="50px" />
                                    <Skeleton height="14px" width="80px" />
                                    <Skeleton height="14px" width="60px" />
                                </Flex>
                            </Stack>
                        </Box>
                    ))}
                </Stack>

                {/* Right Sidebar */}
                <Stack w={{ base: "100%", lg: "300px" }} spacing={6} flexShrink={0}>
                    {/* Members Section */}
                    <Box
                        padding="20px"
                        borderWidth="1px"
                        borderRadius="6px"
                        bg="var(--zencom-background)"
                    >
                        <Stack spacing={4}>
                            <Skeleton height="18px" width="80px" />
                            <Flex gap={2} mb={4}>
                                <Skeleton height="32px" width="32px" borderRadius="full" />
                                <Skeleton height="32px" width="32px" borderRadius="full" />
                                <Skeleton height="32px" width="32px" borderRadius="full" />
                            </Flex>
                            <Skeleton height="36px" width="100%" borderRadius="md" />
                        </Stack>
                    </Box>

                    {/* About Section */}
                    <Box
                        padding="20px"
                        borderWidth="1px"
                        borderRadius="6px"
                        bg="var(--zencom-background)"
                    >
                        <Stack spacing={3}>
                            <Skeleton height="18px" width="60px" />
                            <Skeleton height="12px" width="100%" />
                            <Skeleton height="12px" width="95%" />
                            <Skeleton height="12px" width="90%" />
                        </Stack>
                    </Box>
                    <Box
                        padding="20px"
                        borderWidth="1px"
                        borderRadius="6px"
                        bg="var(--zencom-background)"
                    >
                        <Stack spacing={3}>
                            <Skeleton height="18px" width="60px" />
                            <Skeleton height="12px" width="100%" />
                            <Skeleton height="12px" width="95%" />
                            <Skeleton height="12px" width="90%" />
                        </Stack>
                    </Box>
                </Stack>
            </Flex>
        </Flex>
    )
}

export default GroupLoading;
