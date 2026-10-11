import React from 'react';
import { Box, Flex, Separator, Skeleton, SkeletonCircle, Stack } from '@chakra-ui/react';
import PostCardLoader from './PostCardLoader';

const LoadingProfile = () => {
    return (
        <Stack gap="36px">
            {/* "My Profile" heading */}
            <Skeleton height="28px" width="160px" mt="25px" />

            <Box borderRadius="md" bg="var(--zencom-background)">
                {/* Cover image area with overlapping avatar */}
                <Box position="relative" marginBottom={'1rem'}>
                    <Skeleton height="320px" width="100%" borderRadius="md" />
                    <SkeletonCircle
                        size="100px"
                        position="absolute"
                        top="250px"
                        left="20px"
                        border="3px solid white"
                    />
                </Box>

                {/* Name + username on left, action buttons on right */}
                <Flex justifyContent="space-between" boxSizing={'border-box'} alignItems="center" mt="32px" marginBottom={'1rem'} px="20px" pb="20px" minHeight={'62px'}>
                    <Stack gap="8px" px="0">
                        <Skeleton height="22px" width="180px" />
                        <Skeleton height="16px" width="120px" />
                    </Stack>
                    <Flex gap="8px">
                        <Skeleton height="36px" width="90px" borderRadius="md" />
                        <Skeleton height="36px" width="100px" borderRadius="md" />
                    </Flex>
                </Flex>

                {/* Tab list */}
                <Flex gap="4px" px="20px" pb="12px" pt="4px">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} height="36px" width="72px" borderRadius="sm" />
                    ))}
                </Flex>
            </Box>

            {/* Tab content — two-column layout (mirrors Post tab) */}
            <Flex mt="4px" gap={{ base: "0", lg: "20px" }}>

                {/* Left column: post creation box + sort row + feed cards */}
                <Flex width={{ base: "100%", lg: "70%" }} direction="column" gap="20px">

                    {/* Post creation box */}
                    <Box borderRadius="8px" bg="var(--zencom-background)" p="16px">
                        <Flex alignItems="center" gap="12px" mb="12px">
                            <SkeletonCircle size="10" flexShrink={0} />
                            <Skeleton height="40px" flex="1" borderRadius="md" />
                        </Flex>
                        <Flex justifyContent="flex-end" gap="8px">
                            <Skeleton height="32px" width="80px" borderRadius="md" />
                            <Skeleton height="32px" width="80px" borderRadius="md" />
                        </Flex>
                    </Box>

                    {/* Sort-by row */}
                    <Flex alignItems="center" justifyContent="space-between" gap="12px">
                        <Skeleton height="2px" width="65%" />
                        <Skeleton height="36px" width="130px" borderRadius="md" />
                    </Flex>

                    {/* Feed post card skeletons */}
                    {[...Array(3)].map((_, i) => (
                        <PostCardLoader key={i} />
                    ))}
                </Flex>

                {/* Right column: Recent Activities (desktop only) */}
                <Box
                    display={{ base: "none", lg: "block" }}
                    width="30%"
                    borderRadius="8px"
                    bg="var(--zencom-background)"
                    p="20px"
                    height="fit-content"
                >
                    <Skeleton height="20px" width="160px" mb="16px" />
                    <Separator w="100%" borderColor="var(--zencom-border-color)" mb="16px" />
                    <Flex direction="column" gap="24px">
                        {[...Array(4)].map((_, i) => (
                            <Flex key={i} alignItems="center" gap="8px">
                                <SkeletonCircle size="10" flexShrink={0} />
                                <Flex direction="column" gap="6px" flex="1">
                                    <Skeleton height="12px" maxW="220px" />
                                    <Skeleton height="10px" width="80px" />
                                </Flex>
                            </Flex>
                        ))}
                    </Flex>
                </Box>
            </Flex>
        </Stack>
    );
};

export default LoadingProfile;
