import React, { useState } from 'react';
import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { HiSparkles } from 'react-icons/hi2';
import { API, namespace, active_addons, getAddonActiveStatus, current_user_can, global_roles } from '@Utils/helper';

/**
 * Small "AI" control for reply composers: Generate a reply from context, or
 * Rewrite the current draft. Calls the agent-only /ai-agent/compose endpoint and
 * passes the result to onResult (the composer replaces its draft with it).
 * Renders nothing unless the AI Agent addon is active.
 */
const AiCompose = ({ currentValue = '', context = '', onResult }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const enabled = getAddonActiveStatus(active_addons, 'AiAgent');
    const isAdminOrAgent = current_user_can?.manage_options || global_roles?.support_agent;
    const hasDraft = !!String(currentValue || '').trim();

    const run = async (mode) => {
        setOpen(false);
        setError('');
        if (loading) return;
        setLoading(true);
        try {
            const { data } = await API.post(`${namespace}/ai-agent/compose`, {
                mode,
                text: currentValue || '',
                context: context || '',
            });
            if (data?.message) {
                onResult?.(data.message);
            } else {
                setError(data?.error || __('No suggestion returned.', 'zencommunity'));
            }
        } catch (e) {
            setError(e?.response?.data?.error || e?.response?.data?.message || __('AI request failed.', 'zencommunity'));
        } finally {
            setLoading(false);
        }
    };

    if (!enabled) return null;
    if (!isAdminOrAgent) return null;

    return (
        <Box position="relative" display="inline-block">
            <Flex
                as="button"
                type="button"
                align="center"
                gap="4px"
                onClick={() => setOpen((o) => !o)}
                fontSize="13px"
                color="var(--zencom-primary-color)"
                cursor="pointer"
                title={__('AI assist', 'zencommunity')}
            >
                {loading ? <Spinner size="xs" /> : <HiSparkles />}
                <Text fontSize="13px">{__('AI', 'zencommunity')}</Text>
            </Flex>

            {open && !loading && (
                <>
                    {/* click-away */}
                    <Box position="fixed" inset="0" zIndex="40" onClick={() => setOpen(false)} />
                    <Box
                        position="absolute" bottom="100%" left="0" mb="6px" zIndex="50" minW="190px"
                        bg="var(--zencom-background)" border="1px solid var(--zencom-border-color)"
                        borderRadius="6px" boxShadow="0 8px 16px rgba(20,26,36,0.15)" overflow="hidden"
                    >
                        <Box as="button" type="button" display="block" width="100%" textAlign="left"
                            p="8px 12px" fontSize="13px" color="var(--zencom-font-color)"
                            _hover={{ bg: 'var(--zencom-secondary-color)' }} onClick={() => run('generate')}>
                            {__('✨ Generate a reply', 'zencommunity')}
                        </Box>
                        <Box as="button" type="button" display="block" width="100%" textAlign="left"
                            p="8px 12px" fontSize="13px"
                            color={hasDraft ? 'var(--zencom-font-color)' : 'var(--zencom-font-muted)'}
                            cursor={hasDraft ? 'pointer' : 'not-allowed'}
                            _hover={hasDraft ? { bg: 'var(--zencom-secondary-color)' } : {}}
                            onClick={() => hasDraft && run('rewrite')}
                            title={hasDraft ? '' : __('Write a draft first', 'zencommunity')}>
                            {__('Rewrite my draft', 'zencommunity')}
                        </Box>
                    </Box>
                </>
            )}

            {error && (
                <Text position="absolute" bottom="100%" left="0" mb="6px" whiteSpace="nowrap"
                    fontSize="11px" color="var(--zencom-warning)">{error}</Text>
            )}
        </Box>
    );
};

export default AiCompose;
