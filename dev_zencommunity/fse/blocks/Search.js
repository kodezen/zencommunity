import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Box, Input, Flex, Spinner } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { IoSearchOutline } from 'react-icons/io5';
import { __ } from '@wordpress/i18n';
import debounce from 'just-debounce-it';
import { API, namespace, sliceString, hideHtmlTags } from '@Utils/helper';

/**
 * Standalone community search block — searches the feed (same endpoint as the
 * header search) and shows a results dropdown linking to each post.
 */
const Search = ({ placeholder }) => {
    const [key, setKey] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const boxRef = useRef(null);

    const runSearch = async (q) => {
        if (!q) {
            setResults([]);
            setLoading(false);
            return;
        }
        try {
            const res = await API.get(`${namespace}/feeds?search=${encodeURIComponent(q)}`);
            setResults(res?.data?.records ?? []);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const debounced = useMemo(() => debounce((q) => runSearch(q), 500), []);

    const onChange = (e) => {
        const value = e.target.value;
        setKey(value);
        setOpen(true);
        setLoading(!!value);
        debounced(value);
    };

    // Close the dropdown when clicking outside.
    useEffect(() => {
        const handler = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, []);

    const label = (item) => sliceString(hideHtmlTags(item.title || item.content || ''), 60, '…') || __('Untitled', 'zencommunity');

    return (
        <Box ref={boxRef} position="relative" width="100%" maxW="360px">
            <Flex align="center" gap="8px" px="12px" py="8px" borderRadius="8px" border="1px solid var(--zencom-border-color)" bg="var(--zencom-background)">
                <IoSearchOutline color="var(--zencom-font-muted)" />
                <Input
                    variant="unstyled"
                    value={key}
                    placeholder={placeholder || __('Search posts…', 'zencommunity')}
                    onChange={onChange}
                    onFocus={() => key && setOpen(true)}
                    color="var(--zencom-font-color)"
                />
            </Flex>

            {open && key && (
                <Box
                    position="absolute"
                    top="calc(100% + 4px)"
                    left="0"
                    right="0"
                    zIndex="20"
                    bg="var(--zencom-background)"
                    border="1px solid var(--zencom-border-color)"
                    borderRadius="8px"
                    boxShadow="var(--zencom-shadow)"
                    maxH="320px"
                    overflowY="auto"
                >
                    {loading ? (
                        <Flex p="12px" justify="center"><Spinner size="sm" /></Flex>
                    ) : results.length ? (
                        results.map((item) => (
                            <Link
                                key={item.id}
                                to={`/feed/${item.id}`}
                                onClick={() => setOpen(false)}
                                style={{ textDecoration: 'none', display: 'block' }}
                            >
                                <Box px="12px" py="10px" _hover={{ background: 'var(--zencom-secondary-color)' }} color="var(--zencom-font-color)" fontSize="14px">
                                    {label(item)}
                                </Box>
                            </Link>
                        ))
                    ) : (
                        <Box p="12px" color="var(--zencom-font-muted)" fontSize="14px">{__('No results', 'zencommunity')}</Box>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default Search;
