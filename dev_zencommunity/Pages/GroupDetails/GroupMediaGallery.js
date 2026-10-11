import React, { useEffect, useRef, useState } from 'react';
import { Box, Grid, Image, Icon, Portal } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { API, namespace, site_url } from '@Utils/helper';
import NoDataPost from '@Components/NoDataPost';
import ZenComLoader from '@Components/ZenComLoader';
import { IoClose } from 'react-icons/io5';

const GroupMediaGallery = ({ id }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selected, setSelected] = useState(null);
    const sentinelRef = useRef(null);
    const pageRef = useRef(1);

    const fetchPage = async (pageNum) => {
        setLoading(true);
        try {
            const { data: { records, pages } } = await API.get(
                `${namespace}/group/${id}/attachments?page=${pageNum}&per_page=20`
            );
            setItems(prev => pageNum === 1 ? (records || []) : [...prev, ...(records || [])]);
            setHasMore(pageNum < (pages || 1));
        } catch {}
        finally { setLoading(false); }
    };

    useEffect(() => {
        pageRef.current = 1;
        setPage(1);
        fetchPage(1);
    }, [id]);

    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loading) {
                const next = pageRef.current + 1;
                pageRef.current = next;
                setPage(next);
                fetchPage(next);
            }
        });
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading]);

    useEffect(() => {
        if (!selected) return;
        const onKey = (e) => { if (e.key === 'Escape') setSelected(null); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [selected]);

    if (loading && !items.length) return <ZenComLoader />;

    if (!items.length) return (
        <NoDataPost
            title={__('No media yet', 'zencommunity')}
            subTitle={__('Images posted in this group will appear here.', 'zencommunity')}
        />
    );

    const getUrl = (item) => item?.path ? site_url + item.path : (item?.url || '');

    return (
        <Box>
            <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap="4px">
                {items.map((item, idx) => (
                    <Box
                        key={item.id || idx}
                        position="relative"
                        paddingTop="100%"
                        overflow="hidden"
                        cursor="pointer"
                        borderRadius="4px"
                        onClick={() => setSelected(getUrl(item))}
                    >
                        <Image
                            src={getUrl(item)}
                            position="absolute"
                            top="0"
                            left="0"
                            w="100%"
                            h="100%"
                            objectFit="cover"
                            _hover={{ opacity: 0.85 }}
                            transition="opacity 0.15s"
                        />
                    </Box>
                ))}
            </Grid>

            {hasMore && <Box ref={sentinelRef} h="32px" />}
            {loading && items.length > 0 && <ZenComLoader />}

            {selected && (
                <Portal>
                    <Box
                        position="fixed"
                        top="0"
                        left="0"
                        w="100vw"
                        h="100vh"
                        bg="rgba(0,0,0,0.9)"
                        zIndex={9999}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        onClick={() => setSelected(null)}
                    >
                        <Icon
                            as={IoClose}
                            color="white"
                            boxSize={8}
                            position="absolute"
                            top="16px"
                            right="16px"
                            cursor="pointer"
                        />
                        <Image
                            src={selected}
                            maxW="90vw"
                            maxH="90vh"
                            objectFit="contain"
                            onClick={e => e.stopPropagation()}
                        />
                    </Box>
                </Portal>
            )}
        </Box>
    );
};

export default GroupMediaGallery;
