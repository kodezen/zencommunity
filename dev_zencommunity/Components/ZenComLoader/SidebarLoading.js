import React from 'react';
import { SkeletonText, Stack } from '@chakra-ui/react';

const SidebarLoading = () => {
    return (
        <Stack gap="4" p="16px 16px 0 16px" height="calc(100% - 82px)">
            <SkeletonText noOfLines={2} gap="4" />
            <SkeletonText noOfLines={3} gap="4" />
            <SkeletonText noOfLines={2} gap="4" />
            <SkeletonText noOfLines={4} gap="4" />
            <SkeletonText noOfLines={3} gap="4" />
            <SkeletonText noOfLines={2} gap="4" />
        </Stack>
    );
};

export default SidebarLoading;
