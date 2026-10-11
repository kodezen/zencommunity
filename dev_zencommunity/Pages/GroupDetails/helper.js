import { __ } from '@wordpress/i18n';
import { Flex, Stack, SkeletonCircle, Skeleton } from '@chakra-ui/react';
import { is_pro_active } from '@Utils/helper';

export const groupDataSortBy = [
    { label: __("Latest", 'zencommunity'), value: "created_at" },
    { label: __("Title", 'zencommunity'), value: "title" },
    { label: __("Like", 'zencommunity'), value: "like_count" },
    { label: __("Comment", 'zencommunity'), value: "comment_count" },
    { label: __("Trending", 'zencommunity'), value: "trending" },
    ...(is_pro_active ? [{ label: __("Top Ideas", 'zencommunity'), value: "vote_score" }] : []),
];

export const MemberSkeleton = () => (
    <Flex gap="8px" alignItems="center" justifyContent="space-between">
        <Flex gap="8px" alignItems="center">
            <SkeletonCircle size="10" /> {/* Avatar skeleton */}
            <Stack spacing="2">
                <Skeleton height="16px" width="120px" /> {/* Name skeleton */}
                <Skeleton height="12px" width="80px" />  {/* Email skeleton */}
            </Stack>
        </Flex>
        <Skeleton height="24px" width="24px" /> {/* Menu button skeleton */}
    </Flex>
);
