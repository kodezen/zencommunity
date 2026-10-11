import React, { useEffect, useState } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { Box, Flex, Skeleton, Text } from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { RiFileAddLine, RiCloseLine, RiLightbulbFlashLine } from 'react-icons/ri';
import { fetchKnowledgeGaps, dismissKnowledgeGap, promoteToKnowledgeBase } from '@Redux/slices/aiAgentSlice/aiAgentSlice';
import { thStyle, tdStyle, actionBtnStyle } from './styles';

const COL_HEADERS = ['Question', 'Source', 'Seen', ''];

/**
 * Questions the assistant escalated, or answered with nothing from the
 * knowledge base behind them — logged by TicketProcess/LivechatProcess
 * (see KnowledgeGap::log() in zencommunity-pro) whenever "Log unanswered
 * questions" is on in AI Agent → Preferences. Promoting one drafts a KB
 * article for review; it never publishes on its own, even with auto-publish
 * enabled elsewhere, since a gap here already means a human is looking at it.
 */
const KnowledgeGapsTab = () => {
    const dispatch = useDispatch();
    const gaps = useSelector((state) => state.aiAgent.knowledgeGaps.records);
    const status = useSelector((state) => state.aiAgent.knowledgeGaps.status);
    const [promotingId, setPromotingId] = useState(null);

    useEffect(() => {
        dispatch(fetchKnowledgeGaps({ status: 'open' }));
    }, [dispatch]);

    const handleDismiss = (id) => {
        dispatch(dismissKnowledgeGap(id));
    };

    const handlePromote = async (gap) => {
        setPromotingId(gap.id);
        await dispatch(promoteToKnowledgeBase({ gap_id: gap.id }));
        setPromotingId(null);
    };

    const sourceLabel = (gap) =>
        'livechat' === gap.source
            ? sprintf(__('Live chat #%s', 'zencommunity'), gap.source_id)
            : sprintf(__('Ticket #%s', 'zencommunity'), gap.source_id);

    const isLoading = status === 'loading' && gaps.length === 0;

    if (!isLoading && gaps.length === 0) {
        return (
            <Flex
                direction="column"
                align="center"
                justify="center"
                gap="10px"
                height="300px"
                borderRadius="4px"
                boxShadow="var(--zencom-shadow)"
            >
                <RiLightbulbFlashLine size={32} color="var(--zencom-border-color)" />
                <Text fontSize="14px" fontWeight="500" color="var(--zencom-font-color)">
                    {__('No open gaps', 'zencommunity')}
                </Text>
                <Text fontSize="13px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)" textAlign="center" maxWidth="360px">
                    {__('Either everything is being answered from the knowledge base, or gap logging is turned off in AI Agent → Preferences.', 'zencommunity')}
                </Text>
            </Flex>
        );
    }

    return (
        <Box borderRadius="4px" border="1px solid var(--zencom-border-color)" overflow="hidden">
            <Box overflowX="auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                        <col />
                        <col style={{ width: '160px' }} />
                        <col style={{ width: '90px' }} />
                        <col style={{ width: '90px' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            {COL_HEADERS.map((h, i) => (
                                <th key={i} style={thStyle}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading
                            ? Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    {COL_HEADERS.map((_, j) => (
                                        <td key={j} style={tdStyle}><Skeleton height="14px" width={j === 0 ? '80%' : '50%'} /></td>
                                    ))}
                                </tr>
                            ))
                            : gaps.map((gap, idx) => (
                                <tr
                                    key={gap.id}
                                    style={{ background: 'var(--zencom-background)' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--zencom-secondary-color)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--zencom-background)'; }}
                                >
                                    <td style={{ ...tdStyle, borderBottom: idx === gaps.length - 1 ? undefined : '1px solid var(--zencom-border-color)', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                        {gap.question}
                                    </td>
                                    <td style={{ ...tdStyle, borderBottom: idx === gaps.length - 1 ? undefined : '1px solid var(--zencom-border-color)' }}>
                                        {sourceLabel(gap)}
                                    </td>
                                    <td style={{ ...tdStyle, borderBottom: idx === gaps.length - 1 ? undefined : '1px solid var(--zencom-border-color)' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            background: '#fefce8',
                                            color: '#854d0e',
                                        }}>
                                            {/* translators: %d: number of times this question recurred. */}
                                            {sprintf(__('%d×', 'zencommunity'), gap.occurrences ?? 1)}
                                        </span>
                                    </td>
                                    <td style={{ ...tdStyle, borderBottom: idx === gaps.length - 1 ? undefined : '1px solid var(--zencom-border-color)', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                                            <button
                                                type="button"
                                                title={promotingId === gap.id ? __('Drafting…', 'zencommunity') : __('Add to Knowledge Base', 'zencommunity')}
                                                disabled={promotingId === gap.id}
                                                onClick={() => handlePromote(gap)}
                                                style={{ ...actionBtnStyle, color: '#2A3BEE', opacity: promotingId === gap.id ? 0.5 : 1 }}
                                            >
                                                <RiFileAddLine size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                title={__('Dismiss', 'zencommunity')}
                                                onClick={() => handleDismiss(gap.id)}
                                                style={{ ...actionBtnStyle, color: 'var(--zencom-font-color)' }}
                                            >
                                                <RiCloseLine size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </Box>
        </Box>
    );
};

export default KnowledgeGapsTab;
