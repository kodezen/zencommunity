import React, { useRef, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Box, Flex, Icon, Input, Menu, Portal, Skeleton, SkeletonCircle, Text } from '@chakra-ui/react';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import { API, current_logged_user, namespace, plugin_root_url, sliceString } from '@Utils/helper';
import { IoIosSearch } from 'react-icons/io';
import { BsThreeDots } from 'react-icons/bs';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { useDispatch, useSelector } from 'react-redux';
import { MdBlock, MdFilterList } from 'react-icons/md';
import { FaRegTrashAlt } from 'react-icons/fa';
import { HiArrowTurnUpLeft, HiArrowTurnUpRight } from "react-icons/hi2";
import { useScrollFetchData } from '@Hooks/useScrollFetchData';
import Select, { components } from '@Components/ReactSelect';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { getSupportProducts } from '@Redux/slices/supportLiveChatSlice/supportLiveChatSlice';
import { useStyles } from '../../../utils/chakra';
import { CiUnread, CiRead } from 'react-icons/ci';
import { IoCheckmark } from 'react-icons/io5';
import { LuMessageCircle } from 'react-icons/lu';
import useThemeStyles from '@Hooks/useThemeStyles';
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

const CustomControl = (props) => (
    <components.Control {...props}>
        <MdFilterList size={18} style={{ marginLeft: 8, marginRight: 4 }} color='var(--zencom-font-color)' />
        {props.children}
    </components.Control>
);

const MessageLeftBar = ({
    unreadCount = 0,
    searchText,
    messageableMembers,
    handleSelectUser,
    membersLoading,
    membersMessages,
    setMembersMessages,
    leftSidebarOpen,
    selectedUser,
    handleSearchChat,
    membersPagination,
    setMembersPagination,
    setSelectedUser,
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { commonInput, isDark } = useStyles();
    const handleUpdateParam = (name, val) => {
        if ('' === val || null === val)
            searchParams.delete(name);
        else
            searchParams.set(name, val);
        setSearchParams(searchParams);
    };

    const dispatch = useDispatch();
    const { records: productsData } = useSelector(state => state.supportLiveChat.products)
    const [filterBy, setFilterBy] = useState('all');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [hoveredItemId, setHoveredItemId] = useState(null);
    const [products, setProducts] = useState(productsData.length > 0 ? productsData.map(({ id, name }) => ({ label: name, value: id })) : []);
    const [productId, setProductId] = useState(searchParams.get('product_id') ?? "");

    useEffect(() => {
        setProductId(searchParams.get('product_id'));

        if (!productsData || (productsData && productsData.length <= 1)) {
            dispatch(getSupportProducts()).then(({ payload }) => {
                setProducts(payload.records.map(({ id, name }) => ({ label: name, value: id })));
            })
        }
    }, [])

    const selectedOption = products.find(opt => opt.value == productId);
    const barContainerRef = useRef(null);

    const filter = [
        { value: 'all', label: 'All' },
        { value: 'unread', label: 'Unread' },
        { value: 'resolved', label: 'Resolved' },
        { value: 'unresolved', label: 'Unresolved' },
        { value: 'blocked', label: 'Blocked' },
        { value: 'longest-waiting', label: 'Longest waiting' },
        { value: 'current_user', label: 'Current User' },
        { value: 'has-feedback', label: 'Recent Feedback' },
        { value: 'unread-feedback', label: 'Unread Feedback' },
    ];

    const fetchNext = async (page = 1) => {
        const container = barContainerRef.current;
        if (!container) return;

        // Prevent multiple concurrent fetches
        if (membersPagination?.fetchingOlder || page > membersPagination?.pages) return;

        setMembersPagination(prev => ({ ...prev, fetchingOlder: true }));

        try {
            // Carry over the active filter/search/product params — otherwise
            // scrolling past the first page while filtered silently spliced
            // in unfiltered chats from page 2 onward.
            const params = new URLSearchParams(searchParams);
            params.delete('chat_id');
            params.set('page', page);
            const res = await API.get(`${namespace}/live-chat/index?${params.toString()}`);
            const { records, ...rest } = res.data;

            // Append new page data at the bottom; browser overflow-anchor keeps viewport stable
            setMembersMessages(prev => [...prev, ...records]);
            setMembersPagination({
                ...rest,
                fetchingOlder: false,
            });
        } catch (err) {
            setMembersPagination(prev => ({ ...prev, fetchingOlder: false }));
        }
    };

    useScrollFetchData(membersMessages, membersPagination, fetchNext, false, barContainerRef);

    const countryToFlag = (code) =>
        code ? String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : null;

    const filteredSearchMembers = Array.isArray(messageableMembers)
        ? messageableMembers.filter(item => parseInt(item.id) !== parseInt(current_logged_user?.user_id) || item.name)
        : [];

    const filteredMembersMessages = (membersMessages || []).filter(item => {
        if (filterBy === 'all') return item;
        if (filterBy === 'current') return item;
        else if (filterBy === 'unread') return !item?.last_msg.is_seen
    });

    return (
        <>
            <Flex alignItems="center" justifyContent="space-between" padding="16px" margin="0 0 16px 0" borderBottom="1px solid var(--zencom-border-color)">
                <Flex alignItems="center" gap="8px">
                    <Text fontWeight="500" fontSize="18px" lineHeight="34px" color="var(--zencom-font-color)">
                        {__("Support Chat", "zencommunity")}
                    </Text>
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

            <Flex
                alignItems="center"
                position={"relative"}
                padding="0 16px 16px 16px"
            >
                <Icon 
                    as={IoIosSearch} 
                    color={isDark ? "color-mix(in srgb, var(--zencom-font-color) 60%, transparent) !important" : "color-mix(in srgb, var(--zencom-font-color) 60%, transparent) !important"} 
                    opacity={0.6} 
                    size={14} 
                    style={{ position: "absolute", left: "26px", zIndex: 9 }} 
                />
                <Input
                    {...commonInput}
                    placeholder={__('Search Chats...', 'zencommunity')}
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

            <Flex justifyContent="space-between" padding="0 16px 16px 16px" gap={'8px'}>
                <Select
                    options={products}
                    placeholder={__('All', 'zencommunity')}
                    value={selectedOption || null}
                    onChange={(option) => {
                        if (!option) {
                            handleUpdateParam('product_id', null)
                            setProductId(null);
                            return
                        }
                        handleUpdateParam('product_id', option.value)
                        setProductId(searchParams.get('product_id'));
                    }}
                    className="zen-com-select zen-com-select--width-full zen-com-select--chat"
                    classNamePrefix="zen-com-select"
                    isClearable={true}
                />

                <Select
                    options={filter}
                    placeholder={__('Filter', 'zencommunity')}
                    value={filter.find(opt => opt.value === ((function (val) {
                        if (searchParams.get('unread_feedback')) {
                            return 'unread-feedback';
                        }
                        else if (searchParams.get('has_feedback')) {
                            return 'has-feedback';
                        }
                        else if (searchParams.get('waiting')) {
                            return 'longest-waiting';
                        }
                        else if (0 == searchParams.get('is_resolved')) {
                            return 'unresolved';
                        }
                        else if (1 == searchParams.get('is_resolved')) {
                            return 'resolved';
                        }
                        else if (1 == searchParams.get('is_blocked')) {
                            return 'blocked';
                        }
                        else if (searchParams.get('assignee_id')) {
                            return 'current_user';
                        }
                        else if (searchParams.get('unread')) {
                            return 'unread';
                        }
                        else {
                            return 'all'
                        }
                    })(opt.value)))}
                    isClearable={true}
                    onChange={(option) => {
                        let optionType = option?.value;
                        if (!option) {
                            optionType = 'all'
                        }
                        // Every option starts from the same clean slate — only the
                        // params relevant to the chosen filter get set below.
                        handleUpdateParam('waiting', null);
                        handleUpdateParam('is_resolved', null);
                        handleUpdateParam('is_blocked', null);
                        handleUpdateParam('assignee_id', null);
                        handleUpdateParam('unread', null);
                        handleUpdateParam('has_feedback', null);
                        handleUpdateParam('unread_feedback', null);
                        switch (optionType) {
                            case 'all':
                                break;
                            case 'longest-waiting':
                                handleUpdateParam('waiting', 1);
                                break;
                            case 'resolved':
                                handleUpdateParam('is_resolved', 1);
                                break;
                            case 'unresolved':
                                handleUpdateParam('is_resolved', 0);
                                break;
                            case 'blocked':
                                handleUpdateParam('is_blocked', 1);
                                break;
                            case 'current_user':
                                handleUpdateParam('assignee_id', window.ZencommunityGlobal.current_logged_user.id);
                                break;
                            case 'unread':
                                handleUpdateParam('unread', 1);
                                break;
                            case 'has-feedback':
                                handleUpdateParam('has_feedback', 1);
                                break;
                            case 'unread-feedback':
                                handleUpdateParam('unread_feedback', 1);
                                break;
                        }
                    }}
                    components={{
                        Control: CustomControl,
                        DropdownIndicator: () => null,
                        IndicatorSeparator: () => null
                    }}
                    className="zen-com-select zen-com-select--width-full zen-com-select--chat"
                    classNamePrefix="zen-com-select"
                />
            </Flex>

            {/* <Flex gap={2} mb={4} padding="0 16px">
                <Button onClick={() => {
                    fetchMessages("", false)
                    setFilterBy('all')
                }} borderWidth="1px" borderColor="var(--zencom-border-color)" bg={filterBy === 'all' ? 'var(--zencom-primary-color)' : "transparent"} color={filterBy === 'all' ? "white" : "var(--zencom-font-color)"}>
                    {__("All", "zencommunity")}
                </Button>
                <Button onClick={() => setFilterBy('unread')} borderWidth="1px" borderColor="var(--zencom-border-color)" bg={filterBy === 'unread' ? 'var(--zencom-primary-color)' : "transparent"} color={filterBy === 'unread' ? "white" : "var(--zencom-font-color)"}>
                    {__("Unread", "zencommunity")}
                </Button>
                <Button onClick={() => {
                    fetchMessages("", true)
                    setFilterBy('current')
                }} borderWidth="1px" borderColor="var(--zencom-border-color)" bg={filterBy === 'current' ? 'var(--zencom-primary-color)' : "transparent"} color={filterBy === 'current' ? "white" : "var(--zencom-font-color)"}>
                    {__("Current Agent", "zencommunity")}
                </Button>
            </Flex> */}

            <Box
                align="stretch"
                maxHeight="calc(100% - 198px)"
                overflowY="auto"
                ref={barContainerRef}
                padding="0 8px"
            >
                {searchText ? (
                    <>
                        {filteredSearchMembers.length === 0 ? (
                            <NoDataPost
                                icon={LuMessageCircle}
                                title={__('No conversations found', 'zencommunity')}
                                subTitle={__('Try a different search term.', 'zencommunity')}
                            />
                        ) : (
                            filteredSearchMembers.map((user, idx) => {
                                    const isUnread = user?.last_msg?.is_seen === false || user?.last_msg?.is_seen === 0;
                                    const showHighlight = isUnread;

                                    const username = user?.first_name ? (user?.first_name + " " + user?.last_name) : user.name;
                                    const userAvatar = (user?.first_name && user?.last_name) ? user.avatar_url : ( user?.featured_img || '' );
                                    const calculatedTime = moment().diff(user?.sent_at, "days") > 2 ? moment.utc(user?.sent_at).format("YYYY-MM-DD") : moment.utc(user?.sent_at).fromNow();

                                    return (
                                        <Flex
                                            key={idx}
                                            padding="12px"
                                            marginBottom={'8px'}
                                            cursor="pointer"
                                            _hover={{ bg: "var(--zencom-secondary-color)" }}
                                            align="center"
                                            justify="space-between"
                                            onClick={() => handleSelectUser(user)}
                                            background={showHighlight ? 'var(--zencom-secondary-color)' : undefined}
                                            borderRadius={'10px'}
                                            position={'relative'}
                                        >
                                            <Box position="relative" width="100%">
                                                <ZenComAvatar
                                                    size='sm'
                                                    variant="flat"
                                                    userName={username}
                                                    userID={user?.id}
                                                    src={userAvatar}
                                                    time={user?.sent_at ? calculatedTime : ''}
                                                    message={sliceString(user?.message, 40) || sliceString(user?.description, 40)}
                                                />
                                                {isUnread && (
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
                                        borderColor="gray.200"
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
                                    .map(({ sender, ...user }, idx) => {
                                        const isUnread =
                                            (user?.last_msg?.is_seen === false || user?.last_msg?.is_seen === 0) &&
                                            !user?.last_msg?.agent_id;
                                        // Menu toggle uses is_seen only — no agent_id gate
                                        const isSeenFalsy = user?.last_msg?.is_seen === false || user?.last_msg?.is_seen === 0;

                                        const isReceiverCurrent = !user?.last_msg?.agent_id;
                                        const highlight = Number(selectedUser?.id) === Number(user?.id);

                                        const messageSender = <Icon as={isReceiverCurrent ? HiArrowTurnUpLeft : HiArrowTurnUpRight} width={'10px'} />
                                        const createdAt = moment.utc(user?.created_at);
                                        const now = moment();

                                        const diffInMinutes = now.diff(createdAt, 'minutes');
                                        let short = '';

                                        if (diffInMinutes < 60) {
                                            short = diffInMinutes + 'm';
                                        } else if (diffInMinutes < 1440) {
                                            short = Math.floor(diffInMinutes / 60) + 'h';
                                        } else {
                                            short = Math.floor(diffInMinutes / 1440) + 'd';
                                        }

                                        const displayTime = moment().diff(createdAt, 'days') > 2 ? createdAt.format("YYYY-MM-DD") : short;
                                        const isLast = idx === filteredMembersMessages.length - 1;

                                        return (
                                            <Flex
                                                key={idx}
                                                data-last-item={isLast}
                                                padding="12px"
                                                marginBottom={'8px'}
                                                cursor="pointer"
                                                _focus={{ outline: 'none' }}
                                                _hover={{ bg: highlight ? undefined : "var(--zencom-secondary-color)" }}
                                                borderRadius={'4px'}
                                                align="center"
                                                justify="space-between"
                                                onClick={() => handleSelectUser(user)}
                                                position={'relative'}
                                                onMouseEnter={() => setHoveredItemId(user.id)}
                                                onMouseLeave={() => {
                                                    setOpenMenuId(null)
                                                    setHoveredItemId(null)
                                                }}
                                                color={'var(--zencom-font-color)'}
                                                bg={highlight ? "var(--zencom-secondary-color)" : 'transparent'}
                                                className={`zencom-menu zencom-menu--${highlight ? 'active' : 'inactive'} zencom-user`}
                                            >
                                                <Flex
                                                    justifyContent={'space-between'}
                                                    width={'100%'}
                                                >
                                                    <Box position="relative" display="inline-block">
                                                        <ZenComAvatar
                                                            size='sm'
                                                            variant="flat"
                                                            userName={sliceString(user?.name, 16, "...")}
                                                            src={user?.avatar || ''}
                                                            message={sliceString((user?.last_msg?.message || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(), 20, "...")}
                                                            messageFontWeight={isUnread ? '600' : '400'}
                                                            fontWeight={'500'}
                                                            fontSize={'16px'}
                                                            messageFontSize={'14px'}
                                                            messageFontType={isUnread ? 'bold' : 'simple'}
                                                            userID={user?.id}
                                                            color={(highlight || Number(hoveredItemId) === Number(user.id)) ? isDark ? '#fff' : 'var(--zencom-font-color)' : 'var(--zencom-font-color)' }
                                                        />
                                                        {/* Unread marker, on the avatar rather than floating at
                                                            the row's far edge — the same edge the three-dot menu
                                                            and the time both occupy, which it used to sit under. */}
                                                        {isUnread && (
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
                                                        {user?.country && (
                                                            <Box
                                                                position="absolute"
                                                                bottom="2px"
                                                                left="18px"
                                                                width="16px"
                                                                height="16px"
                                                                borderRadius="50%"
                                                                bg="var(--zencom-background)"
                                                                lineHeight="16px"
                                                                textAlign="center"
                                                                fontSize="11px"
                                                                overflow="hidden"
                                                                border="1px solid var(--zencom-border-color)"
                                                            >
                                                                {countryToFlag(user.country)}
                                                            </Box>
                                                        )}
                                                    </Box>

                                                    {/* Time display: shown only when not hovered (not the trigger) */}
                                                    {hoveredItemId !== user.id && (
                                                        <Box
                                                            position="absolute"
                                                            right="10px"
                                                            top="50%"
                                                            transform="translateY(-50%)"
                                                            fontSize="12px"
                                                            fontWeight="600"
                                                            color="var(--zencom-font-color)"
                                                            pointerEvents="none"
                                                        >
                                                            {displayTime}
                                                        </Box>
                                                    )}

                                                    <Menu.Root
                                                        open={openMenuId === user.id}
                                                        onOpen={() => setOpenMenuId(user.id)}
                                                        onClose={() => { setOpenMenuId(null); setHoveredItemId(null); }}
                                                        positioning={{
                                                            placement: "bottom-end",
                                                            gutter: 4,
                                                        }}
                                                    >
                                                        <Menu.Trigger
                                                            asChild
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(user.id);
                                                            }}
                                                        >
                                                            {/* Always in DOM — visibility toggled so the anchor never shifts */}
                                                            <Icon
                                                                as={BsThreeDots}
                                                                width="16px"
                                                                cursor="pointer"
                                                                visibility={hoveredItemId === user.id ? 'visible' : 'hidden'}
                                                                color={(highlight || Number(hoveredItemId) === Number(user.id)) ? isDark ? '#fff' : 'var(--zencom-font-color)' : 'var(--zencom-font-color)'}
                                                            />
                                                        </Menu.Trigger>
                                                        <Portal className="zencom-menu-portal">
                                                            <Menu.Positioner>
                                                                <Menu.Content color={'var(--zencom-font-color)'} bg="var(--zencom-background)">
                                                                    {isSeenFalsy && (
                                                                        <Menu.Item
                                                                            cursor='pointer'
                                                                            color='var(--zencom-font-color)'
                                                                            _hover={{ bg: 'var(--zencom-secondary-color)' }}
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                const res = await API.post(namespace + `/live-chat/agent/message/${user.last_msg.id}/read`)
                                                                                if (res.data.success) {
                                                                                    setMembersMessages(prev => prev.map(item => {
                                                                                        if (parseInt(item.id) === parseInt(user?.id)) {
                                                                                            return { ...item, last_msg: { ...item.last_msg, is_seen: 1 } }
                                                                                        }
                                                                                        return item;
                                                                                    }))
                                                                                    dispatch(
                                                                                        showNotification({
                                                                                            message: __("Marked As Read", "zencommunity"),
                                                                                            isShow: true,
                                                                                            type: "success",
                                                                                        })
                                                                                    );
                                                                                }
                                                                            }}
                                                                        >
                                                                            <CiRead marginRight="10px" />
                                                                            {__('Mark as Read', "zencommunity")}
                                                                        </Menu.Item>
                                                                    )}
                                                                    {!isSeenFalsy && (
                                                                        <Menu.Item
                                                                            cursor='pointer'
                                                                            color='var(--zencom-font-color)'
                                                                            _hover={{ bg: 'var(--zencom-secondary-color)' }}
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                const res = await API.post(namespace + `/live-chat/agent/message/${user.last_msg.id}/unread`)
                                                                                if (res.data.success) {
                                                                                    localStorage.removeItem("zcci")
                                                                                    setSelectedUser(false)
                                                                                    setMembersMessages(prev => prev.map(item => {
                                                                                        if (parseInt(item.id) === parseInt(user?.id)) {
                                                                                            return { ...item, last_msg: { ...item.last_msg, is_seen: 0 } }
                                                                                        }
                                                                                        return item;
                                                                                    }))
                                                                                    dispatch(
                                                                                        showNotification({
                                                                                            message: __("Marked As Unread", "zencommunity"),
                                                                                            isShow: true,
                                                                                            type: "success",
                                                                                        })
                                                                                    );
                                                                                }
                                                                            }}
                                                                        >
                                                                            <CiUnread marginRight="10px" />
                                                                            {__('Mark as Unread', "zencommunity")}
                                                                        </Menu.Item>
                                                                    )}
                                                                    <Menu.Item
                                                                        color='var(--zencom-font-color)'
                                                                        cursor='pointer'
                                                                        _hover={{ bg: 'var(--zencom-secondary-color)' }}
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const isCurrentlyResolved = user?.is_resolved === "1" || user?.is_resolved === 1;

                                                                            const res = await API.post(namespace + "/live-chat/" + user?.id, {
                                                                                is_resolved: isCurrentlyResolved ? 0 : 1
                                                                            })
                                                                            setMembersMessages(membersMessages.map(item => {
                                                                                if (parseInt(item.id) === parseInt(user?.id)) {
                                                                                    return { ...item, is_resolved: 1 }
                                                                                }
                                                                                return item;
                                                                            }))
                                                                            dispatch(
                                                                                showNotification({
                                                                                    message: __("Conversation Marked Resolved", "zencommunity"),
                                                                                    isShow: true,
                                                                                    type: "success",
                                                                                })
                                                                            );
                                                                        }}
                                                                    >
                                                                        <IoCheckmark marginRight="10px" />
                                                                        {__('Mark as resolved', "zencommunity")}
                                                                    </Menu.Item>
                                                                    <Menu.Item
                                                                        cursor='pointer'
                                                                        color='var(--zencom-font-color)'
                                                                        _hover={{ bg: 'var(--zencom-secondary-color)' }}
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const isCurrentlyBlocked = user?.is_blocked === "1" || user?.is_blocked === 1;

                                                                            const res = await API.post(namespace + "/live-chat/" + user?.id, {
                                                                                is_blocked: isCurrentlyBlocked ? 0 : 1
                                                                            })
                                                                            setMembersMessages(membersMessages.map(item => {
                                                                                if (parseInt(item.id) !== parseInt(res?.data?.id)) {
                                                                                    return { ...item, ...res?.data }
                                                                                }
                                                                                return item;
                                                                            }))
                                                                            dispatch(
                                                                                showNotification({
                                                                                    message: isCurrentlyBlocked
                                                                                        ? __("User has been unblocked", "zencommunity")
                                                                                        : __("User has been blocked", "zencommunity"),
                                                                                    isShow: true,
                                                                                    type: "success",
                                                                                })
                                                                            );
                                                                        }}
                                                                    >
                                                                        <MdBlock marginRight="10px" />
                                                                        {(user?.is_blocked === "1" || user?.is_blocked === 1)
                                                                            ? __('Unblock', "zencommunity") + " " + user?.name
                                                                            : __('Block', "zencommunity") + " " + user?.name
                                                                        }
                                                                    </Menu.Item>
                                                                    <Menu.Separator />
                                                                    <Menu.Item
                                                                        cursor='pointer'
                                                                        color="#E2483D"
                                                                        _hover={{ bg: 'var(--zencom-secondary-color)' }}
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            const res = await API.delete(namespace + "/live-chat/" + user?.id)
                                                                            setMembersMessages(membersMessages.filter(item => parseInt(item.id) !== parseInt(res?.data?.object_id)))
                                                                            dispatch(
                                                                                showNotification({
                                                                                    message: __("Conversation Removed", "zencommunity"),
                                                                                    isShow: true,
                                                                                    type: "success",
                                                                                })
                                                                            );
                                                                        }}
                                                                    >
                                                                        <FaRegTrashAlt color='#E2483D' marginRight="10px" />
                                                                        {__('Delete convesation', "zencommunity")}
                                                                    </Menu.Item>
                                                                </Menu.Content>
                                                            </Menu.Positioner>
                                                        </Portal>
                                                    </Menu.Root>
                                                </Flex>
                                            </Flex>
                                        );
                                    })
                                )}
                            </>
                        )}
                    </>
                )}
            </Box>
        </>
    );
};

export default MessageLeftBar;
