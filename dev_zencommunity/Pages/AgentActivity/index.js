import React, { useEffect, useState } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { Box, Flex, Skeleton, Tabs, Text } from '@chakra-ui/react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RiDeleteBinLine, RiRobot2Line, RiExternalLinkLine, RiPencilLine } from 'react-icons/ri';
import { useStyles } from '../../utils/chakra';
import moment from 'moment';
import { fetchAiMessages, deleteAiMessage, updateAiMessage, purgeAiMessages } from '@Redux/slices/aiAgentSlice/aiAgentSlice';
import LeftContainer from '@Components/Layouts/LeftContainer';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';
import CenterContainer from '@Components/Layouts/CenterContainer';
import KnowledgeGapsTab from './KnowledgeGapsTab';
import { thStyle, tdStyle, actionBtnStyle } from './styles';

const COL_HEADERS = ['#', 'Model', 'Provider', 'AI Response', 'Ref ID', 'Date', ''];

const MODEL_COLORS = {
    comment:   { bg: '#EBEDFF', color: '#2A3BEE' },
    ticket:    { bg: '#DCFFF1', color: '#1F845A' },
    live_chat: { bg: '#FFF3CD', color: '#856404' },
};

// Where a logged response can be opened. Each model keeps its own id space, so
// the row's model decides which id means anything.
const sourceLink = (rec) => {
    if (rec?.model === 'live_chat' && rec?.chat_id) {
        return { path: `/live-chat?chat_id=${rec.chat_id}`, label: __('View in Chat', 'zencommunity') };
    }
    if (rec?.model === 'ticket' && rec?.ticket_id) {
        return { path: `/ticket/${rec.ticket_id}`, label: __('View ticket', 'zencommunity') };
    }
    return null;
};

const shortProvider = (provider) => {
    if (!provider) return '—';
    const parts = provider.split(/[\\\/]/);
    return parts[parts.length - 1] ?? provider;
};

const dateInputStyle = {
    padding: '6px 8px',
    borderRadius: '4px',
    border: '1px solid var(--zencom-border-color)',
    background: 'var(--zencom-secondary-color)',
    color: 'var(--zencom-font-color)',
    fontSize: '13px',
    colorScheme: 'light dark',
};

const SkeletonRow = () => (
    <tr>
        {COL_HEADERS.map((_, i) => (
            <td key={i} style={tdStyle}>
                <Skeleton height="14px" width={i === 0 || i === 6 ? '24px' : '80%'} />
            </td>
        ))}
    </tr>
);

const PER_PAGE = 15;

const AgentActivity = () => {
    const { responsiveContent3 } = useStyles();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { records, status, total, per_page } = useSelector((state) => state.aiAgent.messages);
    const gapsTotal = useSelector((state) => state.aiAgent.knowledgeGaps.total);
    const isLoading = status === 'loading';

    const [activeTab, setActiveTab] = useState('activity');
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState({ id: null, text: '', error: null, saving: false });

    // The window the list is showing, and the window a purge would clear - one
    // and the same, so what is about to be deleted is what is on screen.
    // Dates are picked in the reader's own timezone and sent as UTC, which is
    // what the rows are stamped in.
    const [range, setRange] = useState({ from: '', to: '' });
    const [purging, setPurging] = useState(false);
    const hasRange = Boolean(range.from || range.to);

    const utcBounds = () => ({
        from: range.from ? moment(range.from).startOf('day').utc().format('YYYY-MM-DD HH:mm:ss') : '',
        to:   range.to   ? moment(range.to).endOf('day').utc().format('YYYY-MM-DD HH:mm:ss')     : '',
    });

    useEffect(() => {
        dispatch(fetchAiMessages({ page, per_page: PER_PAGE, ...utcBounds() }));
    }, [page, range.from, range.to]);

    // Any change of window starts again at the first page: page 4 of an
    // unfiltered log is rarely page 4 of a filtered one, and landing on an
    // empty page reads as "nothing in this range".
    const setRangePart = (part, value) => {
        setPage(1);
        setRange(prev => ({ ...prev, [part]: value }));
    };

    const handlePurge = async () => {
        if (!hasRange) return;
        const scope = total === 1
            ? __('Delete the 1 log entry in this range?', 'zencommunity')
            : sprintf(__('Delete all %d log entries in this range?', 'zencommunity'), total);
        if (!window.confirm(`${scope}\n\n${__('The replies themselves stay in their chats and tickets — only the log is cleared.', 'zencommunity')}`)) return;

        setPurging(true);
        const result = await dispatch(purgeAiMessages(utcBounds()));
        setPurging(false);
        if (purgeAiMessages.fulfilled.match(result)) {
            setPage(1);
            dispatch(fetchAiMessages({ page: 1, per_page: PER_PAGE, ...utcBounds() }));
        }
    };

    const handleDelete = (id) => {
        if (!window.confirm(__('Delete this message record?', 'zencommunity'))) return;
        dispatch(deleteAiMessage(id));
    };

    const handleEditStart = (rec) => {
        setEditing({ id: rec.id, text: rec.meta?.message ?? '', error: null, saving: false });
    };

    const handleEditCancel = () => {
        setEditing({ id: null, text: '', error: null, saving: false });
    };

    const handleEditSave = async () => {
        setEditing((prev) => ({ ...prev, saving: true, error: null }));
        const result = await dispatch(updateAiMessage({ id: editing.id, message: editing.text }));
        if (updateAiMessage.fulfilled.match(result)) {
            setEditing({ id: null, text: '', error: null, saving: false });
        } else {
            setEditing((prev) => ({
                ...prev,
                saving: false,
                error: result.payload?.message ?? __('Failed to save. Please try again.', 'zencommunity'),
            }));
        }
    };

    return (
        <>
            <LeftContainer>
                <LeftSidebar />
            </LeftContainer>

            <CenterContainer>
                <Flex {...responsiveContent3} direction="column" height="100%" bg="var(--zencom-body-background)" overflow="hidden">
                    {/* Header */}
                    <Flex
                        direction="column"
                        gap="4px"
                        p="20px 0"
                        flexShrink={0}
                    >
                        <Flex align="center" gap="10px">
                            <RiRobot2Line size={22} color="var(--zencom-primary-color)" />
                            <Text fontSize="20px" fontWeight="600" color="var(--zencom-font-color)">
                                {__('Agent Activity', 'zencommunity')}
                            </Text>
                            {activeTab === 'activity' && !isLoading && total > 0 && (
                                <Box
                                    ml="2px"
                                    px="8px"
                                    py="2px"
                                    borderRadius="full"
                                    bg="var(--zencom-secondary-color)"
                                    fontSize="12px"
                                    fontWeight="600"
                                    color="var(--zencom-font-color)"
                                >
                                    {total}
                                </Box>
                            )}
                            {activeTab === 'knowledge-gaps' && gapsTotal > 0 && (
                                <Box
                                    ml="2px"
                                    px="8px"
                                    py="2px"
                                    borderRadius="full"
                                    bg="var(--zencom-secondary-color)"
                                    fontSize="12px"
                                    fontWeight="600"
                                    color="var(--zencom-font-color)"
                                >
                                    {gapsTotal}
                                </Box>
                            )}
                        </Flex>
                        <Text fontSize="13px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">
                            {activeTab === 'activity'
                                ? __('A log of AI agent responses across tickets, comments and live chats.', 'zencommunity')
                                : __('Questions the assistant could not answer from the knowledge base. The same question recurring is one row with a growing count, not ten scattered tickets.', 'zencommunity')}
                        </Text>

                        <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)} variant="unstyled" mt="10px">
                            <Tabs.List borderBottom="1px solid var(--zencom-border-color)" width={'100%'}>
                                <Tabs.Trigger
                                    value="activity"
                                    color="var(--zencom-font-color)"
                                    padding="2 !important"
                                    borderBottom="2px solid transparent"
                                    _selected={{
                                        borderBottomColor: "var(--zencom-primary-color)",
                                        color: "var(--zencom-primary-color)"
                                    }}
                                >
                                    {__('Activity', 'zencommunity')}
                                </Tabs.Trigger>
                                <Tabs.Trigger
                                    value="knowledge-gaps"
                                    color="var(--zencom-font-color)"
                                    padding="2 !important"
                                    borderBottom="2px solid transparent"
                                    _selected={{
                                        borderBottomColor: "var(--zencom-primary-color)",
                                        color: "var(--zencom-primary-color)"
                                    }}
                                >
                                    {__('Knowledge Gaps', 'zencommunity')}
                                </Tabs.Trigger>
                            </Tabs.List>
                        </Tabs.Root>

                        {/* Narrow the log to a window, then clear that window.
                            The list and the delete read the same two dates, so
                            what disappears is what was on screen. */}
                        {activeTab === 'activity' && (
                        <Flex align="center" gap="8px" mt="12px" wrap="wrap">
                            <Text fontSize="12px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">
                                {__('From', 'zencommunity')}
                            </Text>
                            <input
                                type="date"
                                value={range.from}
                                max={range.to || undefined}
                                onChange={(e) => setRangePart('from', e.target.value)}
                                style={dateInputStyle}
                            />
                            <Text fontSize="12px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)">
                                {__('to', 'zencommunity')}
                            </Text>
                            <input
                                type="date"
                                value={range.to}
                                min={range.from || undefined}
                                onChange={(e) => setRangePart('to', e.target.value)}
                                style={dateInputStyle}
                            />

                            {hasRange && (
                                <button
                                    type="button"
                                    onClick={() => { setPage(1); setRange({ from: '', to: '' }); }}
                                    style={{ ...dateInputStyle, cursor: 'pointer', border: 'none', background: 'none', color: 'var(--zencom-primary-color)', padding: '6px 4px' }}
                                >
                                    {__('Clear', 'zencommunity')}
                                </button>
                            )}

                            <Box flex="1" />

                            <button
                                type="button"
                                onClick={handlePurge}
                                disabled={!hasRange || purging || total === 0}
                                title={hasRange
                                    ? __('Delete every log entry in this range', 'zencommunity')
                                    : __('Pick a date range first', 'zencommunity')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '7px 12px',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    border: '1px solid',
                                    borderColor: (hasRange && total > 0) ? '#E53E3E' : 'var(--zencom-border-color)',
                                    color: (hasRange && total > 0) ? '#E53E3E' : 'color-mix(in srgb, var(--zencom-font-color) 45%, transparent)',
                                    background: 'transparent',
                                    cursor: (hasRange && total > 0 && !purging) ? 'pointer' : 'not-allowed',
                                }}
                            >
                                <RiDeleteBinLine size={14} />
                                {purging
                                    ? __('Deleting…', 'zencommunity')
                                    : (hasRange && total > 0
                                        ? sprintf(__('Delete %d in range', 'zencommunity'), total)
                                        : __('Delete in range', 'zencommunity'))}
                            </button>
                        </Flex>
                        )}
                    </Flex>

                    {/* Table area */}
                    <Box flex="1" overflow="auto" p="20px 2px">
                        {activeTab === 'knowledge-gaps' ? (
                            <KnowledgeGapsTab />
                        ) : (
                        <>
                        {/* Empty state */}
                        {!isLoading && records.length === 0 && (
                            <Flex
                                direction="column"
                                align="center"
                                justify="center"
                                gap="10px"
                                height="300px"
                                borderRadius="4px"
                            >
                                <RiRobot2Line size={32} color="var(--zencom-border-color)" />
                                <Text fontSize="14px" fontWeight="500" color="var(--zencom-font-color)">
                                    {__('No activity recorded yet', 'zencommunity')}
                                </Text>
                                <Text fontSize="13px" color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)" textAlign="center" maxWidth="320px">
                                    {__('AI responses to tickets, comments and live chats will show up here once the agent starts replying.', 'zencommunity')}
                                </Text>
                            </Flex>
                        )}

                        {/* Table */}
                        {(isLoading || records.length > 0) && (
                            <Box
                                borderRadius="4px"
                                border="1px solid var(--zencom-border-color)"
                                overflow="hidden"
                            >
                                <Box overflowX="auto">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                        <colgroup>
                                            <col style={{ width: '40px' }} />
                                            <col style={{ width: '100px' }} />
                                            <col style={{ width: '110px' }} />
                                            <col />
                                            <col style={{ width: '160px' }} />
                                            <col style={{ width: '140px' }} />
                                            <col style={{ width: '80px' }} />
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
                                                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                                : records.map((rec, idx) => {
                                                    const modelColors = MODEL_COLORS[rec.model] ?? { bg: 'var(--zencom-secondary-color)', color: 'var(--zencom-font-color)' };
                                                    const aiResponse = rec.meta?.message ?? '—';
                                                    const isEditingThis = editing.id === rec.id;

                                                    return (
                                                        <tr
                                                            key={rec.id}
                                                            style={{ background: 'var(--zencom-background)' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--zencom-secondary-color)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--zencom-background)'; }}
                                                        >
                                                            <td style={{ ...tdStyle, borderBottom: idx === records.length - 1 ? undefined : "1px solid var(--zencom-border-color)", opacity: 0.5 }} >
                                                                {(page - 1) * PER_PAGE + idx + 1}
                                                            </td>
                                                            <td style={{...tdStyle, borderBottom: idx === records.length - 1 ? undefined : "1px solid var(--zencom-border-color)",}}>
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '11px',
                                                                    fontWeight: '600',
                                                                    background: modelColors.bg,
                                                                    color: modelColors.color,
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.4px',
                                                                }}>
                                                                    {rec.model ?? '—'}
                                                                </span>
                                                            </td>
                                                            <td style={{ ...tdStyle, borderBottom: idx === records.length - 1 ? undefined : "1px solid var(--zencom-border-color)", fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {shortProvider(rec.provider)}
                                                            </td>
                                                            <td style={{ ...tdStyle, borderBottom: idx === records.length - 1 ? undefined : "1px solid var(--zencom-border-color)", whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                                {isEditingThis ? (
                                                                    <div>
                                                                        <textarea
                                                                            value={editing.text}
                                                                            onChange={(e) => setEditing((prev) => ({ ...prev, text: e.target.value }))}
                                                                            rows={4}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '6px 8px',
                                                                                fontSize: '13px',
                                                                                borderRadius: '4px',
                                                                                border: '1px solid var(--zencom-border-color)',
                                                                                background: 'var(--zencom-background)',
                                                                                color: 'var(--zencom-font-color)',
                                                                                resize: 'vertical',
                                                                                fontFamily: 'inherit',
                                                                            }}
                                                                        />
                                                                        {editing.error && (
                                                                            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#E53E3E' }}>
                                                                                {editing.error}
                                                                            </p>
                                                                        )}
                                                                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                                                            <button
                                                                                type="button"
                                                                                disabled={editing.saving}
                                                                                onClick={handleEditSave}
                                                                                style={{
                                                                                    padding: '4px 10px',
                                                                                    fontSize: '12px',
                                                                                    fontWeight: '600',
                                                                                    borderRadius: '4px',
                                                                                    border: 'none',
                                                                                    cursor: editing.saving ? 'not-allowed' : 'pointer',
                                                                                    background: '#2A3BEE',
                                                                                    color: '#fff',
                                                                                    opacity: editing.saving ? 0.6 : 1,
                                                                                }}
                                                                            >
                                                                                {editing.saving ? __('Saving…', 'zencommunity') : __('Save', 'zencommunity')}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                disabled={editing.saving}
                                                                                onClick={handleEditCancel}
                                                                                style={{
                                                                                    padding: '4px 10px',
                                                                                    fontSize: '12px',
                                                                                    fontWeight: '600',
                                                                                    borderRadius: '4px',
                                                                                    border: '1px solid var(--zencom-border-color)',
                                                                                    cursor: 'pointer',
                                                                                    background: 'transparent',
                                                                                    color: 'var(--zencom-font-color)',
                                                                                }}
                                                                            >
                                                                                {__('Cancel', 'zencommunity')}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    typeof aiResponse === 'string'
                                                                        ? aiResponse.slice(0, 300) + (aiResponse.length > 300 ? '…' : '')
                                                                        : '—'
                                                                )}
                                                            </td>
                                                            <td style={{ ...tdStyle,borderBottom: idx === records.length - 1 ? undefined : "1px solid var(--zencom-border-color)", fontFamily: 'monospace', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {rec.ref_id ?? '—'}
                                                            </td>
                                                            <td style={{ ...tdStyle,borderBottom: idx === records.length - 1 ? undefined : "1px solid var(--zencom-border-color)", whiteSpace: 'nowrap', fontSize: '12px' }}>
                                                                {rec.created_at
                                                                    ? moment.utc(rec.created_at).local().format('YYYY-MM-DD HH:mm')
                                                                    : '—'}
                                                            </td>
                                                            <td style={{ ...tdStyle,borderBottom: idx === records.length - 1 ? undefined : "1px solid var(--zencom-border-color)", textAlign: 'center' }}>
                                                                <div style={{ display: 'flex', gap: '2px', justifyContent: 'center' }}>
                                                                    {/* Where this response actually went. Only live chats
                                                                        had one, so a ticket row named the reply and then
                                                                        left you to go and find the ticket yourself. */}
                                                                    {sourceLink(rec) && (
                                                                        <button
                                                                            type="button"
                                                                            title={sourceLink(rec).label}
                                                                            onClick={() => navigate(sourceLink(rec).path)}
                                                                            style={{ ...actionBtnStyle, color: '#2A3BEE' }}
                                                                        >
                                                                            <RiExternalLinkLine size={15} />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        title={__('Edit response', 'zencommunity')}
                                                                        onClick={() => handleEditStart(rec)}
                                                                        style={{ ...actionBtnStyle, color: 'var(--zencom-font-color)' }}
                                                                    >
                                                                        <RiPencilLine size={15} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        title={__('Delete', 'zencommunity')}
                                                                        onClick={() => handleDelete(rec.id)}
                                                                        style={{ ...actionBtnStyle, color: '#E53E3E' }}
                                                                    >
                                                                        <RiDeleteBinLine size={15} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            }
                                        </tbody>
                                    </table>
                                </Box>
                            </Box>
                        )}

                        {/* Pagination */}
                        {(() => {
                            const totalPages = total > 0 ? Math.ceil(total / PER_PAGE) : 1;
                            if (totalPages <= 1) return null;
                            return (
                                <Flex align="center" justify="flex-end" gap="8px" mt="16px" px="4px">
                                    <button
                                        type="button"
                                        disabled={page === 1 || isLoading}
                                        onClick={() => setPage((p) => p - 1)}
                                        style={{
                                            padding: '4px 12px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            border: '1px solid var(--zencom-border-color)',
                                            background: 'var(--zencom-background)',
                                            color: 'var(--zencom-font-color)',
                                            cursor: page === 1 || isLoading ? 'not-allowed' : 'pointer',
                                            opacity: page === 1 || isLoading ? 0.4 : 1,
                                        }}
                                    >
                                        {__('Prev', 'zencommunity')}
                                    </button>
                                    <Text fontSize="13px" color="var(--zencom-font-color)">
                                        {__('Page', 'zencommunity')} {page} {__('of', 'zencommunity')} {totalPages}
                                    </Text>
                                    <button
                                        type="button"
                                        disabled={page >= totalPages || isLoading}
                                        onClick={() => setPage((p) => p + 1)}
                                        style={{
                                            padding: '4px 12px',
                                            fontSize: '13px',
                                            borderRadius: '4px',
                                            border: '1px solid var(--zencom-border-color)',
                                            background: 'var(--zencom-background)',
                                            color: 'var(--zencom-font-color)',
                                            cursor: page >= totalPages || isLoading ? 'not-allowed' : 'pointer',
                                            opacity: page >= totalPages || isLoading ? 0.4 : 1,
                                        }}
                                    >
                                        {__('Next', 'zencommunity')}
                                    </button>
                                </Flex>
                            );
                        })()}
                        </>
                        )}
                    </Box>
                </Flex>
            </CenterContainer>
        </>
    );
};

export default AgentActivity;
