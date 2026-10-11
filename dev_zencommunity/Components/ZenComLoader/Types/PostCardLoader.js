import React from 'react';
import { Box, Flex, Skeleton, SkeletonCircle } from '@chakra-ui/react';

const PostCardLoader = () => (
    <Box
        marginBottom="16px"
        borderRadius="8px"
        background="var(--zencom-background)"
        overflow="hidden"
        className="zencom-animate-fade"
    >
        {/* Header + body */}
        <Flex direction="column" gap={6} padding={4}>

            {/* Avatar row */}
            <Flex alignItems="flex-start" justifyContent="space-between">
                <Flex gap={3} alignItems="flex-start">
                    <SkeletonCircle size="8" flexShrink={0} />
                    <Flex direction="column" gap={2} mt="2px">
                        {/* Author name */}
                        <Skeleton height="14px" width="130px" />
                        {/* Timestamp */}
                        <Skeleton height="12px" width="90px" />
                        {/* Group name */}
                        <Skeleton height="12px" width="110px" />
                    </Flex>
                </Flex>
                {/* Kebab / menu icon */}
                <Skeleton width="22px" height="22px" borderRadius="4px" />
            </Flex>

            {/* Post content lines */}
            <Flex direction="column" gap="10px">
                <Skeleton height="14px" width="100%" />
                <Skeleton height="14px" width="92%" />
                <Skeleton height="14px" width="80%" />
            </Flex>
        </Flex>

        {/* Stats row (likes • comments) */}
        <Flex alignItems="center" gap={2} px={4} pb={4}>
            <Skeleton height="14px" width="58px" borderRadius="4px" />
            <Skeleton height="8px" width="5px" borderRadius="full" />
            <Skeleton height="14px" width="82px" borderRadius="4px" />
        </Flex>

        {/* Action bar — Like | Comments | Share */}
        <Flex
            justifyContent="space-around"
            gap={4}
            p={2}
            borderTop="1px solid var(--zencom-border-color)"
        >
            <Skeleton height="28px" width="72px" borderRadius="4px" />
            <Skeleton height="28px" width="88px" borderRadius="4px" />
            <Skeleton height="28px" width="64px" borderRadius="4px" />
        </Flex>
    </Box>
);

export default PostCardLoader;
