import React, { useEffect, useRef, useState } from 'react';
import { Box, Flex, Icon, Input, Skeleton, SkeletonCircle, Text } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { useNavigate } from 'react-router-dom';
import { IoIosSearch } from 'react-icons/io';
import moment from 'moment';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { API, current_logged_user, namespace, sliceString } from '@Utils/helper';

const ChatHeadPanel = ({ onSelectConversation, onClose }) => {
    const navigate = useNavigate();
    const panelRef = useRef(null);
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const [localMessages, setLocalMessages] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);

    const scrollBoxRef = useRef(null);
    const sentinelRef = useRef(null);
    const intervalRef = useRef(null);

    const fetchPage = async (pageNum, replace = false) => {
        try {
            const { data } = await API.get(namespace + `/messages?page=${pageNum}&per_page=15`);
            const groups = (data.records || [])
                .filter(item => !item.is_private)
                .map(({ id, ...item }) => ({ ...item, isGroup: true, group_id: id }));
            const privates = (data.records || []).filter(item => item.is_private);
            const batch = [...groups, ...privates];
            setLocalMessages(prev => replace ? batch : [...prev, ...batch]);
            setTotalPages(data.pages ?? 1);
            setPage(pageNum);
        } catch {}
    };

    useEffect(() => {
        setInitialLoading(true);
        fetchPage(1, true).finally(() => setInitialLoading(false));
        intervalRef.current = setInterval(() => fetchPage(1, true), 10000);
        return () => clearInterval(intervalRef.current);
    }, []);

    useEffect(() => {
        if (page >= totalPages || loadingMore) return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setLoadingMore(true);
                    fetchPage(page + 1).finally(() => setLoadingMore(false));
                }
            },
            { root: scrollBoxRef.current, rootMargin: '50px', threshold: 0.1 }
        );
        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [page, totalPages, loadingMore, localMessages.length]);

    useEffect(() => {
        if (!searchText.trim()) { setSearchResults([]); return; }
        const controller = new AbortController();
        setSearchLoading(true);
        API.get(namespace + '/chat-partner-search?search=' + encodeURIComponent(searchText), { signal: controller.signal })
            .then(res => {
                const results = (res.data.records || [])
                    .filter(r => Number(r.id) !== Number(current_logged_user?.user_id))
                    .map(r => r.type === 'group'
                        ? { id: r.id, isGroup: true, name: r.first_name, avatar_url: r.avatar_url }
                        : { id: r.id, isGroup: false, first_name: r.first_name, last_name: r.last_name, avatar_url: r.avatar_url }
                    );
                const existingIds = new Set(
                    (localMessages || []).map(m => `${m.group || m.isGroup ? 'g' : 'p'}-${m.group?.id || m.group_id || m.other_user?.id}`)
                );
                setSearchResults(results.filter(r => !existingIds.has(`${r.isGroup ? 'g' : 'p'}-${r.id}`)));
            })
            .catch(() => {})
            .finally(() => setSearchLoading(false));
        return () => controller.abort();
    }, [searchText]);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                onClose?.();
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [onClose]);

    const filtered = (localMessages || []).filter(item => {
        if (!searchText.trim()) return true;
        const name = item.group
            ? (item.group.name || '')
            : [(item.other_user?.first_name || ''), (item.other_user?.last_name || '')].join(' ');
        return name.toLowerCase().includes(searchText.toLowerCase());
    }).filter(item => {
        if (!item.other_user) return true;
        return Number(item.other_user?.id) !== Number(current_logged_user?.user_id);
    });

    const buildConversation = (item) => {
        if (item.isGroup && !item.group) {
            return {
                id: item.id,
                isGroup: true,
                name: item.name || item.first_name || __('Group', 'zencommunity'),
                first_name: item.name || item.first_name || '',
                last_name: '',
                avatar_url: item.avatar_url || null,
            };
        }
        if (item.group || item.isGroup) {
            const g = item.group || item;
            return {
                id: g.id || item.group_id,
                isGroup: true,
                name: g.name || g.first_name || __('Group', 'zencommunity'),
                first_name: g.name || g.first_name || '',
                last_name: '',
                avatar_url: g.avatar_url || null,
            };
        }
        if (!item.other_user && !item.group) {
            return {
                id: item.id,
                isGroup: false,
                first_name: item.first_name || '',
                last_name: item.last_name || '',
                name: null,
                avatar_url: item.avatar_url || null,
            };
        }
        const u = item.other_user || item;
        return {
            id: u.id,
            isGroup: false,
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            name: null,
            avatar_url: u.avatar_url || null,
        };
    };

    const displayItems = searchText.trim()
        ? [...filtered, ...searchResults]
        : filtered;

    const isSearchActive = !!searchText.trim();

    return (
        <Box
            ref={panelRef}
            position="fixed"
            top="60px"
            right="16px"
            width={{ base: "calc(100vw - 32px)", md: "320px" }}
            minWidth={{ md: "320px" }}
            minHeight="400px"
            maxHeight={{ base: "calc(100vh - 80px)", md: "480px" }}
            display="flex"
            flexDirection="column"
            bg="var(--zencom-background)"
            border="1px solid var(--zencom-border-color)"
            borderRadius="8px"
            boxShadow="0 4px 20px rgba(0,0,0,0.15)"
            // See ChatHeadBubble.js — must out-rank ordinary in-page popovers
            // (z-index 100000), which otherwise render on top of this panel.
            zIndex={100099}
            overflow="hidden"
        >
            {/* Header */}
            <Flex
                alignItems="center"
                justifyContent="space-between"
                padding="12px 14px 8px"
                borderBottom="1px solid var(--zencom-border-color)"
                flexShrink={0}
            >
                <ZCLabel label={__('Messages', 'zencommunity')} type="bold" fontSize="15px" />
            </Flex>

            {/* Search */}
            <Box padding="8px 12px" flexShrink={0} position="relative">
                <Icon as={IoIosSearch} color="gray.400" size={14} style={{ position: 'absolute', top: '50%', left: '22px', transform: 'translateY(-50%)' }} />
                <Input
                    fontSize="13px"
                    placeholder={__('Search...', 'zencommunity')}
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    paddingLeft={8}
                    height="32px"
                    border="1px solid var(--zencom-border-color)"
                    borderRadius="16px"
                    color="var(--zencom-font-color)"
                    bg="var(--zencom-background)"
                    _focus={{ borderColor: 'var(--zencom-primary-color)', outline: 'none' }}
                />
            </Box>

            {/* Conversation list */}
            <Box ref={scrollBoxRef} overflowY="auto" flex="1">
                {initialLoading ? (
                    [...Array(5)].map((_, i) => (
                        <Flex key={i} alignItems="center" gap={3} padding="8px 12px">
                            <SkeletonCircle size="8" />
                            <Box flex="1">
                                <Skeleton height="12px" mb="4px" borderRadius="4px" />
                                <Skeleton height="10px" width="70%" borderRadius="4px" />
                            </Box>
                        </Flex>
                    ))
                ) : (isSearchActive && searchLoading) ? (
                    [...Array(3)].map((_, i) => (
                        <Flex key={i} alignItems="center" gap={3} padding="8px 12px">
                            <SkeletonCircle size="8" />
                            <Box flex="1">
                                <Skeleton height="12px" mb="4px" borderRadius="4px" />
                                <Skeleton height="10px" width="70%" borderRadius="4px" />
                            </Box>
                        </Flex>
                    ))
                ) : displayItems.length === 0 ? (
                    <Text fontSize="13px" color="var(--zencom-font-muted)" textAlign="center" p={4}>
                        {__('No conversations found.', 'zencommunity')}
                    </Text>
                ) : (
                    <>
                        {displayItems.map((item, idx) => {
                            const conv = buildConversation(item);
                            const displayName = conv.isGroup
                                ? conv.name
                                : [conv.first_name, conv.last_name].filter(Boolean).join(' ') || __('Unknown', 'zencommunity');
                            const preview = sliceString(item.message || '', 40);
                            const isUnread = item.is_seen === false || item.is_seen === 0;
                            const formattedTime = item.sent_at
                                ? (moment().diff(item.sent_at, 'days') > 2
                                    ? moment.utc(item.sent_at).format('YYYY-MM-DD')
                                    : moment.utc(item.sent_at).fromNow())
                                : null;

                            return (
                                <Flex
                                    key={idx}
                                    alignItems="center"
                                    gap={3}
                                    padding="8px 12px"
                                    cursor="pointer"
                                    _hover={{ bg: 'var(--zencom-secondary-color)' }}
                                    onClick={() => onSelectConversation(conv)}
                                    bg={isUnread ? 'var(--zencom-secondary-color)' : 'transparent'}
                                >
                                    <ZenComAvatar
                                        src={conv.avatar_url}
                                        userID={conv.isGroup ? null : conv.id}
                                        groupID={conv.isGroup ? conv.id : null}
                                        size="sm"
                                        userName={displayName}
                                        showUserName={false}
                                    />
                                    <Box flex="1" minW={0}>
                                        <Flex alignItems="center" justifyContent="space-between">
                                            <Text
                                                fontSize="13px"
                                                fontWeight={isUnread ? '600' : '500'}
                                                color="var(--zencom-font-color)"
                                                noOfLines={1}
                                            >
                                                {displayName}
                                            </Text>
                                            <Flex alignItems="center" gap="6px">
                                                {formattedTime && (
                                                    <Text fontSize="11px" color="var(--zencom-font-muted)" flexShrink={0}>
                                                        {formattedTime}
                                                    </Text>
                                                )}
                                                {isUnread && (
                                                    <Box
                                                        w="8px"
                                                        h="8px"
                                                        borderRadius="50%"
                                                        bg="var(--zencom-primary-color)"
                                                        flexShrink={0}
                                                    />
                                                )}
                                            </Flex>
                                        </Flex>
                                        {preview && (
                                            <Text fontSize="11px" color="var(--zencom-font-muted)" noOfLines={1}>
                                                {preview}
                                            </Text>
                                        )}
                                    </Box>
                                </Flex>
                            );
                        })}

                        {/* Sentinel for IntersectionObserver */}
                        {!isSearchActive && <Box ref={sentinelRef} h="1px" />}

                        {/* Loading skeleton for next-page fetch */}
                        {loadingMore && (
                            <Flex alignItems="center" gap={3} padding="8px 12px">
                                <SkeletonCircle size="8" />
                                <Box flex="1">
                                    <Skeleton height="12px" mb="4px" borderRadius="4px" />
                                    <Skeleton height="10px" width="70%" borderRadius="4px" />
                                </Box>
                            </Flex>
                        )}
                    </>
                )}
            </Box>

            {/* Footer */}
            <Flex
                justifyContent="center"
                padding="10px 12px"
                borderTop="1px solid var(--zencom-border-color)"
                flexShrink={0}
            >
                <Text
                    as="button"
                    type="button"
                    fontSize="13px"
                    fontWeight="600"
                    color="var(--zencom-primary-color)"
                    cursor="pointer"
                    background="none"
                    border="none"
                    padding="0"
                    onClick={() => {
                        navigate('/chat');
                        onClose?.();
                    }}
                >
                    {__('See all messages', 'zencommunity')}
                </Text>
            </Flex>
        </Box>
    );
};

export default ChatHeadPanel;
