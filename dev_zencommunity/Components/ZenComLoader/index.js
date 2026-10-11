import React from 'react';
import { Box, Flex, HStack, Skeleton, SkeletonCircle, SkeletonText, Stack } from '@chakra-ui/react';
import GroupLoading from './Types/GroupLoading';

const ZenComLoader = ({
    type = 'large',
    maxW = "",
    margin,
    size = "10",
    height = "200px",
    noOfLines = 4,
    spacing = 6,
}) => {
    const styles = {
        inline: {
            maxW: "100%",
            size: "10",
            margin: "0",
            height: "10px",
            noOfLines: 2,
        },
        profile: {
            maxW: "80%",
            size: "20",
            margin: "0 auto",
            height: "10px",
            noOfLines: 1,
        },
        large: {
            maxW,
            margin,
            size,
            height,
            noOfLines,
            spacing,
        }
    };

    const isActive = styles[type] || styles['large'];

    const loadingComponent = (
        <Stack spacing={isActive.spacing} maxW={isActive.maxW} margin={isActive.margin}>
            <HStack>
                <SkeletonCircle size={isActive.size} />
                <SkeletonText noOfLines={isActive.noOfLines} maxW={isActive.width} />
            </HStack>
            <Skeleton height={isActive.height} />
        </Stack>
    );

    const userLoadingComponent = (
        <Flex justifyContent="center" direction="column" gap={2} spacing={isActive.spacing} maxW={isActive.maxW} margin={isActive.margin}>
            <Flex justifyContent="center">
                <SkeletonCircle size={isActive.size} />
            </Flex>

            <SkeletonText noOfLines={isActive.noOfLines} maxW={isActive.width} />
            <SkeletonText noOfLines={isActive.noOfLines} maxW={isActive.width} />
            <SkeletonText noOfLines={isActive.noOfLines} maxW={isActive.width} />
        </Flex>
    );

    const commentsLoadingComponent = (
        <Stack spacing={isActive.spacing} maxW={isActive.maxW} margin={isActive.margin}>
            <HStack gap="4">
                <SkeletonCircle size="10" />
                <Stack spacing={1}>
                    <Skeleton height="14px" width="100px" />
                    <Skeleton height="12px" width="80px" />
                </Stack>
            </HStack>
            <Flex direction="column" gap={2} paddingLeft="3.4rem">
                <SkeletonText noOfLines={2} spacing="2" width="85%" />
                <HStack gap={2}>
                    <Skeleton height="28px" width="60px" />
                    <Skeleton height="28px" width="80px" />
                </HStack>
            </Flex>
        </Stack>
    );

    return (
        <Box className="zencom-animate-fade">
            {type === "comments" ? commentsLoadingComponent : type === "profile" ? userLoadingComponent : type === "group" ? <GroupLoading /> : loadingComponent}
        </Box>
    )
};

export default ZenComLoader;
