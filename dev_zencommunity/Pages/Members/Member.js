import React, { useCallback, useMemo, useState } from 'react';
import {
    Flex, Text, Avatar, HStack, SkeletonCircle, Stack, Skeleton, Button, Tag, useBreakpointValue, Box
} from '@chakra-ui/react';
import Select from '@Components/ReactSelect';
import { __ } from '@wordpress/i18n';
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllMembers, followMember, removeMemberBadge } from '@Redux/slices/membersSlice/membersSlice';
import { API, current_logged_user, getAddonActiveStatus, getAvatarBg, getInitials, namespace, reactDebounce } from '@Utils/helper';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { useNavigate } from 'react-router-dom';
import { useStyles } from '../../utils/chakra';
import ZenComSearch from '@Components/Chakra/Search';
import useInfiniteLoader from '@Hooks/useInfiniteLoader';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import Subtext from '@Components/Labels/Subtext';
import RankChip from '@Components/Gamification/RankChip';
import { BadgeList } from '@Components/Badges/BadgeChip';

import "./styles.scss";

const options = [
    { label: "Active", value: "active" },
    { label: "Alphabetical", value: "alphabetical" },
    { label: "Date", value: "date" },
];

const Member = () => {
    const { primaryBtnInsideContent, primaryBtnInsideContentTrans, responsiveContent3, } = useStyles();
    const [sortOption, setSortOption] = useState("alphabetical");
    const { all: allMembers, totalMembers } = useSelector(state => state.members);
    const activeAddons = useSelector(state => state?.addons?.activeAddons);
    const userID = current_logged_user?.user_id;
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const followAddonActive = getAddonActiveStatus(activeAddons, "FollowerAndBlocker");
    const isMobile = useBreakpointValue({ base: true, md: false });

    const sortedMembers = useMemo(() => {
        if (!Array.isArray(allMembers)) return [];

        return [...allMembers]
            .sort((a, b) => {
                if (sortOption === 'active') {
                    return a.status === 'active' && b.status !== 'active' ? -1 : 1;
                } else if (sortOption === 'alphabetical') {
                    const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
                    const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                } else if (sortOption === 'date') {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                return 0;
            });
    }, [allMembers, sortOption]);

    const fetchPage = async (page, isRefresh) => {
        const { total, pages } = await dispatch(fetchAllMembers({ page })).unwrap();
        return { hasMore: page < pages, total };
    };

    const handleFollow = async (user) => {
        try {
            if (user.is_following) {
                await API.post(`${namespace}/unfollow/${user?.id}`);
                dispatch(followMember({ id: user.id, isFollowing: false }))
                dispatch(showNotification({
                    message: __('Unfollowed successfully!', 'zencommunity'),
                    isShow: true,
                    type: 'success',
                }));
            } else {
                await API.post(`${namespace}/follow/${user?.id}`);
                dispatch(followMember({ id: user.id, isFollowing: true }))
                dispatch(showNotification({
                    message: __('Followed successfully!', 'zencommunity'),
                    isShow: true,
                    type: 'success',
                }));
            }
        } catch (error) {
            dispatch(showNotification({
                message: error?.response?.data?.message || __('Failed to update follow status', 'zencommunity'),
                isShow: true,
                type: 'error',
            }));
            console.error("Follow toggle failed", error);
        }
    }

    // Revoke a badge directly from the members list, rather than requiring an
    // admin to go back to Settings > Badges > Assign and re-search for this
    // same member. Only rendered for site admins (see BadgeList's onRemove
    // prop below) - the same admin_can gate the REST endpoint enforces.
    const handleRemoveBadge = async (member, badge) => {
        try {
            await API.delete(`${namespace}/badges/member/${member.id}/${badge.id}`);
            dispatch(removeMemberBadge({ id: member.id, badgeId: badge.id }));
            dispatch(showNotification({
                message: __('Badge removed.', 'zencommunity'),
                isShow: true,
                type: 'success',
            }));
        } catch (error) {
            dispatch(showNotification({
                message: error?.response?.data?.message || __('Failed to remove badge', 'zencommunity'),
                isShow: true,
                type: 'error',
            }));
        }
    };

    const { renderContent: renderMembersContent, loading: membersLoading } = useInfiniteLoader({
        refreshBtnLabel: __("🔄 Refresh Feed", "zencommunity"),
        emptyLabel: __("No posts found", "zencommunity"),
        noMoreLabel: __("No more member.", "zencommunity"),
        renderItem: (member, itemRef) => {
            const currentDate = member?.created_at;
            const serverMoment = moment.utc(currentDate, "YYYY-MM-DD HH:mm:ss").local();
            // Short form only — this now renders inline in a compact row
            // (memberMeta below), where a full "Month Dth YYYY, h:mm:ss a"
            // timestamp reads as noise rather than information.
            const formattedDate = moment().diff(serverMoment, "days") > 2
                ? serverMoment.format('MMM D, YYYY')
                : serverMoment.fromNow();

            const isFollowing = member?.is_following;
            const isBlocked = member?.is_blocked;
            const isOnline = member?.is_online;
            const userName = member?.first_name + " " + member?.last_name
            const memberAvatar = (
                <Box position="relative" display="inline-block" flexShrink={0}>
                    <Avatar.Root size={isMobile ? "2xl" : "md"}>
                        <Avatar.Fallback
                            bg={getAvatarBg(userName)}
                            color="white"
                            display='flex'
                            alignItems='center'
                            justifyContent='center'
                            width='100%'
                            height='100%'
                        >
                            {getInitials(userName)}
                        </Avatar.Fallback>
                        <Avatar.Image
                            src={member?.avatar_url}
                            rounded="full"
                        />
                    </Avatar.Root>
                    {isOnline && (
                        <Box
                            position="absolute"
                            bottom="0"
                            right="0"
                            w={isMobile ? "14px" : "11px"}
                            h={isMobile ? "14px" : "11px"}
                            borderRadius="full"
                            bg="#22c55e"
                            border="2px solid var(--zencom-background)"
                            title={__('Online', 'zencommunity')}
                        />
                    )}
                </Box>
            )

            const memberName = (
                <Flex gap={'10px'} alignItems="center" wrap="wrap">
                    <Text fontSize="16px" fontWeight="bold">{member?.user_id === userID ? __(`${member?.first_name + " " + member?.last_name} (You)`, 'zencommunity') : member?.first_name + " " + member?.last_name}</Text>
                    <RankChip data={member?.gamification} />
                    <BadgeList
                        badges={member?.badges}
                        size="xs"
                        limit={3}
                        onRemove={current_logged_user?.is_site_admin ? (badge) => handleRemoveBadge(member, badge) : undefined}
                    />
                    {(followAddonActive && member?.is_blocked) && (
                        <Tag.Root size="sm" colorPalette="red" maxW="200px" minH={'18px'} height={'18px'}>
                            <Tag.Label>{__("Blocked", 'zencommunity')}</Tag.Label>
                        </Tag.Root>
                    )}
                </Flex>
            )

            // formattedDate is the account's join date (derived from created_at
            // above), not a last-active time — labelled accordingly rather than
            // implying recent activity. Online/offline is already conveyed by
            // the avatar's status dot, so it isn't repeated here as text.
            const memberMeta = (
                <Text fontSize="13px" color="var(--zencom-font-muted)" mt="2px">
                    {member?.username && `@${member.username} · `}
                    {__('Joined', 'zencommunity')} {formattedDate}
                </Text>
            )

            const memberStatus = (
                <Flex justifyContent={{base: "flex-start", md: "flex-end"}} width={{base: "100%", md: "auto"}} alignItems="center" gap="8px" flexShrink={0}>
                    {(followAddonActive && !member.is_blocked) && (
                        <Button
                            size="sm"
                            borderRadius="8px"
                            {...primaryBtnInsideContentTrans}
                            onClick={() => handleFollow(member)}
                        >
                            {isFollowing ? __('Unfollow', 'zencommunity') : __('Follow', 'zencommunity')}
                        </Button>
                    )}

                    <Button
                        size="sm"
                        borderRadius="8px"
                        {...primaryBtnInsideContent}
                        onClick={() => navigate("/member/" + member?.id)}
                    >
                        {__('View profile', 'zencommunity')}
                    </Button>
                </Flex>
            )

            const cardProps = {
                borderRadius: "8px",
                bg: "var(--zencom-background)",
                color: "var(--zencom-font-color)",
                className: "zencom-hover-lift",
            };

            return (
                <Box
                    key={member.id}
                    ref={itemRef}
                    className='zencom-members'
                    marginBottom={'14px'}
                >
                    {isMobile ? (
                        <Flex
                            {...cardProps}
                            flexDirection="row"
                            alignItems="center"
                            gap="12px"
                            justifyContent="space-between"
                            borderRadius="4px"
                            border="1px solid var(--zencom-border-color)"
                            bg="var(--zencom-background)"
                            p="16px 24px"
                            color={'var(--zencom-font-color)'}
                            transition="border-color 0.15s ease"
                            _hover={{ borderColor: "var(--zencom-primary-color)" }}
                        >
                            {memberAvatar}
                            <Flex flexDirection="column" alignItems="flex-start" gap="12px" w="100%" minW={0}>
                                <Box minW={0}>
                                    {memberName}
                                    {memberMeta}
                                </Box>
                                {memberStatus}
                            </Flex>

                        </Flex>
                    ) : (
                        <Flex
                            {...cardProps}
                            alignItems="center"
                            gap="12px"
                            justifyContent="space-between"
                            borderRadius="4px"
                            border="1px solid var(--zencom-border-color)"
                            bg="var(--zencom-background)"
                            p="16px 24px"
                            color={'var(--zencom-font-color)'}
                            transition="border-color 0.15s ease"
                            _hover={{ borderColor: "var(--zencom-primary-color)" }}
                        >
                            {memberAvatar}

                            <Flex flexDirection="column" alignItems="flex-start" w="100%" minW={0}>
                                {memberName}
                                {memberMeta}
                            </Flex>

                            {memberStatus}
                        </Flex>
                    )}
                </Box>
            )
        },
        renderSkeleton: () => (
            <HStack gap="5" mt='20px'>
                <SkeletonCircle size="12" />
                <Stack flex="1">
                    <Skeleton height="5" />
                    <Skeleton height="5" width="80%" />
                </Stack>
            </HStack>
        ),
        fetchPage,
        data: sortedMembers,
    });

    // --- debounce search ---
    const debouncedAPICall = useCallback(
        reactDebounce(async (keyword) => {
            await dispatch(fetchAllMembers({ searchKey: keyword })).unwrap();
        }, 500),
        []
    );

    const handleSearch = (e) => {
        const searchKey = e.target.value;
        if (searchKey.length > 0) {
            navigate(`/members?search=${e.target.value}`);
        } else {
            navigate("/members");
        }
        debouncedAPICall(e.target.value);
    };

    return (
        <Flex flexDirection="column" {...responsiveContent3} className='zencom-members zencom-animate-fade'>
            <Flex align={{ base: "flex-start", md: "center" }} justify="space-between" width="100%" mb={4} direction={{ base: "column", md: "row" }} rowGap={{ base: "4", md: "0" }}>
                <Flex align="baseline" gap="8px">
                    <ZCLabel type='heading' label={__('All Members', 'zencommunity')} />
                    <Text fontSize="14px" color="var(--zencom-font-muted)" fontWeight="500">
                        {`(${totalMembers})`}
                    </Text>
                </Flex>

                {/* 260px on desktop, matching the Courses and Groups pages. */}
                <ZenComSearch width={{ base: "100%", md: "260px" }} changeHandler={(e) => handleSearch(e)} />
            </Flex>

            <HStack gap={2} mb={4}>
                <Subtext fontSize="16px">
                    {__('Sort by', 'zencommunity')}
                </Subtext>

                <Select
                    className="zen-com-select zen-com-select--150"
                    classNamePrefix="zen-com-select"
                    options={options}
                    onChange={(option) => {
                        setSortOption(option.value)
                        // fetchMembers("", option.value)
                    }}
                    value={options.find(item => item.value === sortOption)}
                />
            </HStack>

            {renderMembersContent()}

            {/* <Pagination.Root 
                count={10} 
                pageSize={2} 
                defaultPage={1} 
                position="fixed" 
                right={{ base: "0", md: "24px", lg: "24px", "2xl": "300px" }} 
                bottom="0" 
                my="20px"
            >
                <ButtonGroup variant="outline" size="xs">
                    <Pagination.PrevTrigger asChild>
                        <IconButton>
                            <LuChevronLeft />
                        </IconButton>
                    </Pagination.PrevTrigger>

                    <Pagination.Items
                        render={(page) => (
                            <IconButton variant="outline" _selected={{bg: "var(--zencom-primary-color)", color: "#fff"}}>
                                {page.value}
                            </IconButton>
                        )}
                    />

                    <Pagination.NextTrigger asChild>
                        <IconButton>
                            <LuChevronRight />
                        </IconButton>
                    </Pagination.NextTrigger>
                </ButtonGroup>
            </Pagination.Root> */}
        </Flex >
    );
};

export default Member;
