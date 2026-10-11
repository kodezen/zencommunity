import React, { useRef, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Box, Button, Flex, Icon, Input, Skeleton, SkeletonCircle } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import { current_logged_user, site_url, sliceString } from '@Utils/helper';
import { IoIosSearch } from 'react-icons/io';
import { LuMessageCircle } from 'react-icons/lu';
import { useStyles } from '../../../utils/chakra';
import { useScrollFetchData } from '@Hooks/useScrollFetchData';
import NoDataPost from '@Components/NoDataPost';

moment.updateLocale("en", {
    relativeTime: {
        future: "in %s",
        past: "%s ago",
        s: "a few sec",
        ss: "%d sec",
        m: "1 min",
        mm: "%d min",
        h: "1 hr",
        hh: "%d hr",
        d: "1 day",
        dd: "%d days",
        M: "1 month",
        MM: "%d months",
        y: "1 year",
        yy: "%d years",
    },
});

const MessageLeftBar = ({
    unreadCount = 0,
    searchText,
    setSearchText,
    messageableMembers,
    handleSelectUser,
    membersLoading,
    membersMessages,
    membersPagination,
    fetchMoreMembers,
    leftSidebarOpen,
    selectedUser,
    handleSearchChat,
}) => {
    const [filterBy, setFilterBy] = useState('all');
    const { commonInput, isDark } = useStyles();
    const barContainerRef = useRef(null);

    // Scroll-down pagination of the conversation list (skips while searching).
    useScrollFetchData(
        Array.isArray(membersMessages) ? membersMessages : [],
        membersPagination,
        (page) => fetchMoreMembers?.(page),
        !!membersLoading,
        barContainerRef
    );

    const filteredMembersMessages = (membersMessages || [])
        .filter(item => Number(item?.other_user?.id) !== Number(current_logged_user?.user_id))
        .filter(item => {
            if (filterBy === 'all') return item;
            else if (filterBy === 'unread') return !item.is_seen
            else if (filterBy === 'group') return !item.is_private
        });

    return (
        <Flex direction="column" height="100%" minH={0}>
            <Flex alignItems="center" justifyContent="space-between" padding="16px" margin="0 0 16px 0" borderBottomWidth="1px" borderColor="var(--zencom-border-color)" flexShrink={0}>
                <Flex alignItems="center" gap="8px">
                    <ZCLabel label={__("Message", "zencommunity")} type="bold" fontSize="18px" lineHeight="34px" />

                    {unreadCount > 0 && (
                        <Flex
                            alignItems="center"
                            justifyContent="center"
                            minWidth="20px"
                            height="20px"
                            padding="0 6px"
                            borderRadius="10px"
                            bg="#E2483D"
                            color="#fff"
                            fontSize="12px"
                            fontWeight="600"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Flex>
                    )}
                </Flex>

                {/* <Button bg="var(--zencom-primary-color)" color="#fff">
                    <IoAdd /> {__("New message", "zencommunity")}
                </Button> */}
            </Flex>

            <Flex alignItems="center" position={"relative"} padding="0 16px 16px 16px" flexShrink={0}>
                <Icon
                    as={IoIosSearch}
                    color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)"
                    size={14}
                    style={{ position: "absolute", left: "26px", zIndex: 9 }}
                />
                <Input
                    {...commonInput}
                    placeholder={__('Search...', 'zencommunity')}
                    value={searchText}
                    onChange={(e) => handleSearchChat(e.target.value)}
                    width="100%"
                    height="40px"
                    bg="var(--zencom-secondary-color)"
                    border="none"
                    borderRadius="4px"
                    paddingLeft={10}
                    _focus={{ boxShadow: "none", bg: "var(--zencom-secondary-color)" }}
                />
            </Flex>

            <Box align="stretch" spacing={0} overflowY="auto" flex="1" minH={0} padding="0 16px" ref={barContainerRef} >
                {/* will need in the future */}
                {/* <Flex justifyContent="space-between" mb={4}>
                    <Select
                        placeholder={__('All', 'zencommunity')}
                        className="zen-com-select"
                        classNamePrefix="zen-com-select"
                    />
                    <Select
                        placeholder={__('Filter', 'zencommunity')}
                        className="zen-com-select"
                        classNamePrefix="zen-com-select"
                    />
                </Flex> */}

                <Flex gap={2} mb={4}>
                    {[
                        { value: 'all', label: __("All", "zencommunity") },
                        { value: 'unread', label: __("Unread", "zencommunity") },
                        { value: 'group', label: __("Group", "zencommunity") },
                    ].map((item) => (
                        <Button
                            key={item.value}
                            size="sm"
                            onClick={() => setFilterBy(item.value)}
                            borderWidth="1px"
                            borderColor={filterBy === item.value ? "var(--zencom-primary-color)" : "var(--zencom-border-color)"}
                            bg={filterBy === item.value ? "var(--zencom-primary-color)" : "transparent"}
                            color={filterBy === item.value ? "#fff" : "var(--zencom-font-color)"}
                            _hover={{ bg: filterBy === item.value ? "var(--zencom-primary-color)" : "var(--zencom-secondary-color)" }}
                        >
                            {item.label}
                        </Button>
                    ))}
                </Flex>

                {searchText ? (
                    <>
                        {messageableMembers.length === 0 ? (
                            <NoDataPost
                                icon={LuMessageCircle}
                                title={__('No conversations found', 'zencommunity')}
                                subTitle={__('Try a different search term.', 'zencommunity')}
                            />
                        ) : (
                            messageableMembers
                                .filter(item => parseInt(item.id) !== parseInt(current_logged_user?.user_id) || item.name).map((user, idx) => {
                                    const currentUserId = Number(current_logged_user?.user_id);
                                    const receiverId = user?.receiver_id ?? user?.receiver?.id;
                                    const senderId = user?.sender_id ?? user?.sender?.id;
                                    const isUnread = user?.is_seen === false || user?.is_seen === 0;
                                    const isReceiverCurrent = receiverId ? Number(receiverId) === currentUserId : false;
                                    const isSenderCurrent = senderId ? Number(senderId) === currentUserId : false;
                                    const showHighlight = isUnread && isReceiverCurrent && !isSenderCurrent;

                                const username = user?.first_name ? (user?.first_name + " " + user?.last_name) : user.name;
                                const userAvatar = user.avatar_url ? user.avatar_url : "";
                                const calculatedTime = moment().diff(user?.sent_at, "days") > 2 ? moment.utc(user?.sent_at).format("YYYY-MM-DD") : moment.utc(user?.sent_at).fromNow();

                                return (
                                    <Flex
                                        key={idx}
                                        p={3}
                                        marginBottom={'8px'}
                                        cursor="pointer"
                                        _hover={{ bg: "var(--zencom-secondary-color)" }}
                                        align="center"
                                        justify="space-between"
                                        onClick={() => handleSelectUser(user)}
                                        background={showHighlight ? 'var(--zencom-secondary-color)' : undefined}
                                        borderRadius={'4px'}
                                        position={'relative'}
                                    >
                                        <Box position="relative" width="100%">
                                            <ZenComAvatar
                                                size='sm'
                                                variant="flat"
                                                userName={sliceString(username, 25, "...")}
                                                userID={user?.id}
                                                src={userAvatar}
                                                time={user?.sent_at ? calculatedTime : ''}
                                                message={sliceString(user?.message, 40) || sliceString(user?.description, 40)}
                                            />
                                            {isUnread && isReceiverCurrent && (
                                                <Box
                                                    width={'10px'}
                                                    height={'10px'}
                                                    borderRadius={'50%'}
                                                    backgroundColor={'#E2483D'}
                                                    border="2px solid var(--zencom-background)"
                                                    position={'absolute'}
                                                    bottom={'0'}
                                                    left={'22px'}
                                                />
                                            )}
                                        </Box>
                                    </Flex>
                                )
                            })
                        )}
                    </>
                ) : (
                    <>
                        {membersLoading ? (
                            <>
                                {[...Array(12)].map((_, idx) => (
                                    <Flex
                                        key={idx}
                                        p={3}
                                        borderBottom="1px solid"
                                        borderColor="var(--zencom-border-color)"
                                        cursor="pointer"
                                        align="center"
                                        justify="space-between"
                                    >
                                        {/* Left side - Avatar + Name/Message */}
                                        <Flex gap="8px" align="center">
                                            <SkeletonCircle size="10" />
                                            <Box>
                                                <Skeleton height="16px" width="120px" mb="6px" />
                                                <Skeleton height="14px" width="180px" />
                                            </Box>
                                        </Flex>
                                    </Flex>
                                ))}
                            </>
                        ) : (
                            <>
                                {filteredMembersMessages.length === 0 ? (
                                    <NoDataPost
                                        icon={LuMessageCircle}
                                        title={__('No conversations found', 'zencommunity')}
                                        subTitle={__('New conversations will show up here.', 'zencommunity')}
                                    />
                                ) : (
                                    filteredMembersMessages
                                    .map(({ other_user, sender, group, ...user }, idx, arr) => {
                                        const isLast = idx === arr.length - 1;
                                        const currentUserId = Number(current_logged_user?.user_id);
                                        const receiverId = user?.receiver_id ?? user?.receiver?.id;
                                        const isUnread = user?.is_seen === false || user?.is_seen === 0;
                                        const isReceiverCurrent = !group && receiverId ? Number(receiverId) === currentUserId : false;
                                        const isSenderCurrent = Number(sender?.id) === currentUserId;
                                        const highlight = (() => {
                                            if (selectedUser?.isGroup) {
                                                return group && Number(selectedUser?.id) === Number(group?.id);
                                            } else {
                                                return !group && Number(selectedUser?.id) === Number(other_user?.id);
                                            }
                                        })();

                                        let messageSender = '';
                                        if (group) {
                                            messageSender = isSenderCurrent ? "You: " : `${sender?.first_name}: `
                                        } else {
                                            messageSender = isReceiverCurrent ? `${other_user?.first_name}: ` : "You: "
                                        }

                                        return (
                                            <Flex
                                                key={idx}
                                                data-last-item={isLast}
                                                p={3}
                                                cursor="pointer"
                                                align="center"
                                                justify="space-between"
                                                onClick={() => handleSelectUser(group ? { ...group, isGroup: true } : other_user)}
                                                borderRadius={'4px'}
                                                marginBottom={'8px'}
                                                position={'relative'}
                                                borderColor={'var(--zencom-border-color)'}
                                                className={`zencom-menu zencom-menu--${highlight ? 'active' : 'inactive'} zencom-user`}
                                            >
                                                <Box position="relative" width="100%">
                                                    <ZenComAvatar
                                                        variant="flat"
                                                        userName={sliceString(group ? group.name : other_user?.first_name + " " + other_user?.last_name, "10", "...")}
                                                        src={other_user?.avatar_url || group ? `${site_url}${other_user?.avatar_url}` : ""}
                                                        time={moment().diff(user?.sent_at, "days") > 2 ? moment.utc(user?.sent_at).format("YYYY-MM-DD") : moment.utc(user?.sent_at).fromNow()}
                                                        message={messageSender + sliceString(user?.message, 40)}
                                                        messageFontWeight={isUnread ? '500' : '400'}
                                                        fontWeight={'500'}
                                                        fontSize={'16px'}
                                                        messageFontSize={'14px'}
                                                        messageFontType={isUnread ? 'bold' : 'simple'}
                                                        userID={group ? null : other_user?.id}
                                                        whiteSpace="nowrap"
                                                    />
                                                    {(isUnread && isReceiverCurrent) && (
                                                        <Box
                                                            width={'10px'}
                                                            height={'10px'}
                                                            borderRadius={'50%'}
                                                            backgroundColor={'#E2483D'}
                                                            border="2px solid var(--zencom-background)"
                                                            position={'absolute'}
                                                            bottom={'0'}
                                                            left={'22px'}
                                                        />
                                                    )}
                                                </Box>
                                            </Flex>
                                        );
                                    })
                                )}
                            </>
                        )}
                    </>
                )}
            </Box>
        </Flex>
    );
};

export default MessageLeftBar;
