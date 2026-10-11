import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Box, Flex, Icon, Text, Textarea } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import ZenComLoader from '@Components/ZenComLoader';
import CustomSwitch from '@Components/CustomSwitch';
import { active_addons, API, getAddonActiveStatus, getAvatarBg, getInitials, namespace, site_url } from '@Utils/helper';
import Select from '@Components/ReactSelect';
import { __, sprintf } from '@wordpress/i18n';
import { FiUser } from 'react-icons/fi';
import { MdOutlineLocationOn } from 'react-icons/md';
import { CiClock2, CiCloud } from 'react-icons/ci';
import { LuEarth, LuImage, LuMonitor } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import ImageFullScreenPreview from '@Components/ImageFullScreenPreview';
import FileAttachmentCard from '@Components/FileAttachmentCard';
import NoDataPost from '@Components/NoDataPost';


const getCountryFlag = (code) => {
    if (!code || code.length !== 2) return '';
    return [...code.toUpperCase()].map(c =>
        String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
    ).join('');
};


const ticketStatusStyle = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'open') return { color: '#1F845A', background: '#DCFFF1' };
    if (s === 'closed' || s === 'resolved') return { color: '#454F59', background: '#E0E4E8' };
    return { color: '#454F59', background: '#E0E4E8' };
};

// One consistent section label style used throughout the panel — small,
// uppercase, muted — so sections read as headers without needing a heavy
// border above *and* below every one of them (the previous per-section
// borderTop+borderBottom combo doubled up into two adjacent lines wherever
// sections met).
const SectionHeader = ({ children }) => (
    <Text
        fontSize="12px"
        fontWeight="600"
        color="var(--zencom-font-color)"
        opacity={0.6}
        textTransform="uppercase"
        letterSpacing="0.04em"
        padding="0 16px"
        marginBottom="10px"
    >
        {children}
    </Text>
);

// A single icon-chip + text row, used for every plain fact in the panel
// (location, timezone, current page, user agent, IP) so they all line up
// the same way instead of each having its own ad-hoc icon/padding.
const InfoRow = ({ icon, children }) => (
    <Flex align="center" gap="10px" padding="6px 16px">
        <Flex
            align="center"
            justify="center"
            boxSize="28px"
            borderRadius="8px"
            bg="var(--zencom-secondary-color)"
            color="var(--zencom-font-color)"
            flexShrink={0}
        >
            <Icon as={icon} boxSize="14px" />
        </Flex>
        <Box fontSize="13px" color="var(--zencom-font-color)" minWidth={0} flex="1">
            {children}
        </Box>
    </Flex>
);

const MessageRightDetailsBar = ({
    dataLoading,
    selectedUser,
    setSelectedUser,
}) => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('info');
    const [info,setInfo] = useState(false);
    const [assigneeOptions, setAssigneeOptions] = useState([]);
    const [note, setNote] = useState(selectedUser?.meta?.note ?? "")
    const [tickets, setTickets] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [isAiEnabled, setIsAiEnabled] = useState(selectedUser?.meta?.is_ai_enabled ?? true);
    const isAiAgentActive = getAddonActiveStatus(active_addons, 'AiAgent');

    // Same message list ChatBox renders from — read here rather than
    // fetched again, so Media reflects exactly what the thread shows.
    const supportMessages = useSelector(state => state.supportLiveChat.supportMessages);
    const conversationMessages = supportMessages?.[selectedUser?.id] || [];

    const { images: mediaImages, files: mediaFileAttachments } = useMemo(() => {
        const images = [];
        const files = [];
        conversationMessages.forEach((msg) => {
            const attachments = msg?.meta?.attachments?.live_chat_message_attachments || [];
            attachments.forEach((attachment) => {
                if (attachment?.meta?.image) {
                    images.push(attachment);
                } else if (attachment?.meta?.type !== 'audio') {
                    files.push(attachment);
                }
            });
        });
        return { images, files };
    }, [conversationMessages]);

    const handleSaveNotes = () => {
        API.post( namespace + `/live-chat/${selectedUser?.id}/note`, {note} )
    }

    const fetchUserTickets = async (user_id, email) => {
        setTicketsLoading(true);
        try {
            let res;
            // if (user_id) {
            //     res = await API.get(namespace + '/member/' + user_id + '/tickets?per_page=20');
            // } else 
                if (email) {
                res = await API.get(namespace + '/member/tickets/by-email?email=' + encodeURIComponent(email) + '&per_page=20');
            } else {
                setTickets([]);
                return;
            }
            setTickets(res.data?.records ?? []);
        } finally {
            setTicketsLoading(false);
        }
    };

    useEffect(() => {
        if(selectedUser?.id) {
            API.get( namespace + `/live-chat/chat/${selectedUser?.id}/info` ).then(res=> {
                setInfo(res.data);
                fetchUserTickets(res.data?.user_id, res.data?.email);
            });
        }
        setTickets([]);
        setNote(selectedUser?.meta?.note ?? "");
        setIsAiEnabled(selectedUser?.meta?.is_ai_enabled ?? true);
    }, [selectedUser]);

    const handleAiToggle = async (value) => {
        const prev = isAiEnabled;
        setIsAiEnabled(value);
        try {
            const res = await API.post(namespace + '/live-chat/' + selectedUser?.id, {
                meta: { is_ai_enabled: value },
            });
            if (setSelectedUser && res?.data) {
                setSelectedUser(prev => ({ ...prev, meta: { ...(prev?.meta ?? {}), is_ai_enabled: value } }));
            }
        } catch {
            setIsAiEnabled(prev);
            dispatch(showNotification({
                message: __('Failed to update AI setting.', 'zencommunity'),
                isShow: true,
                type: 'error',
            }));
        }
    };

    useEffect(() => {
        (async () => {
            await API.get(`${namespace}/members?role=support_agent`)
                .then(res => {
                    const options = res.data.records.map((item) => ({
                        label: `${item.first_name} ${item.last_name}`,
                        value: item.id,
                        avatar: item.avatar_url
                    }))
                    setAssigneeOptions(options);
                })
        })()
    }, [selectedUser])

    return (
        <Box
            bg="var(--zencom-background)"
            width={{ lg: "100%", xl: "360px" }}
            borderLeft="1px solid var(--zencom-border-color)"
            height="calc(100vh - 57px)"
            display="flex"
            flexDirection="column"
            overflow="hidden"
        >
            {dataLoading ? (
                <ZenComLoader type="profile" />
            ) : (
                <>
                    <Flex gap="12px" padding={'11px 16px'} alignItems={'center'} borderBottom="1px solid var(--zencom-border-color)">
                        <Avatar.Root boxSize="32px">
                            <Avatar.Fallback 
                                bg={getAvatarBg(selectedUser.name)} 
                                color="white"
                                display='flex'
                                alignItems='center'
                                justifyContent='center'
                                width='100%'
                                height='100%'
                            >
                                {getInitials(selectedUser.name)}
                            </Avatar.Fallback>
                            <Avatar.Image 
                                src={(selectedUser?.avatar) ? `${selectedUser?.avatar.includes('https://') ? "" : site_url}${selectedUser.avatar}` : ""}
                            />
                        </Avatar.Root>

                        <Flex direction={'column'}>
                            <ZCLabel type='bold' label={selectedUser?.name} />
                            <ZCLabel type='basic' label={selectedUser?.email} />
                        </Flex>
                    </Flex>

                    <Flex borderBottom="1px solid var(--zencom-border-color)">
                        {[
                            { key: 'info', label: __('Info', 'zencommunity') },
                            { key: 'media', label: __('Media', 'zencommunity') + (mediaImages.length + mediaFileAttachments.length > 0 ? ` (${mediaImages.length + mediaFileAttachments.length})` : '') },
                        ].map((tab) => (
                            <Box
                                key={tab.key}
                                as="button"
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`zc-tab${activeTab === tab.key ? ' is-active' : ''}`}
                                aria-pressed={activeTab === tab.key}
                                flex="1"
                                textAlign="center"
                                padding="10px 12px"
                                fontSize="13px"
                                fontWeight={activeTab === tab.key ? '600' : '400'}
                                background="transparent"
                                border="none"
                                cursor="pointer"
                            >
                                {tab.label}
                            </Box>
                        ))}
                    </Flex>

                    {/* Only this body scrolls — the avatar header and the Info/Media
                        tabs above stay put, matching the fixed-header/scrolling-body
                        pattern the chat list and message thread already use. */}
                    <Box
                        flex="1"
                        minHeight={0}
                        overflowY="auto"
                        css={{
                            '&::-webkit-scrollbar': { width: '6px' },
                            '&::-webkit-scrollbar-track': { width: '6px' },
                            '&::-webkit-scrollbar-thumb': { background: "#CBD1D7", borderRadius: '9999px' },
                        }}
                    >
                    {activeTab === 'media' ? (
                        <Box padding="16px">
                            {mediaImages.length === 0 && mediaFileAttachments.length === 0 ? (
                                <NoDataPost
                                    icon={LuImage}
                                    title={__('No media shared yet', 'zencommunity')}
                                    subTitle={__('Photos and files shared in this conversation will show up here.', 'zencommunity')}
                                />
                            ) : (
                                <Flex direction="column" gap="20px">
                                    {mediaImages.length > 0 && (
                                        <Box>
                                            <ZCLabel type="boldLight" label={sprintf(__('Photos (%d)', 'zencommunity'), mediaImages.length)} padding="0 0 8px 0" />
                                            <Flex flexWrap="wrap" gap="8px">
                                                {mediaImages.map((attachment, idx) => (
                                                    <ImageFullScreenPreview key={idx} attachment={attachment} idx={idx} />
                                                ))}
                                            </Flex>
                                        </Box>
                                    )}
                                    {mediaFileAttachments.length > 0 && (
                                        <Box>
                                            <ZCLabel type="boldLight" label={sprintf(__('Files (%d)', 'zencommunity'), mediaFileAttachments.length)} padding="0 0 8px 0" />
                                            <Flex direction="column" gap="8px">
                                                {mediaFileAttachments.map((attachment, idx) => (
                                                    <FileAttachmentCard key={idx} attachment={attachment} />
                                                ))}
                                            </Flex>
                                        </Box>
                                    )}
                                </Flex>
                            )}
                        </Box>
                    ) : (
                    <>
                    <Box borderBottom="1px solid var(--zencom-border-color)" paddingY="14px">
                        <SectionHeader>{__("Tickets", "zencommunity")}</SectionHeader>
                        {ticketsLoading ? (
                            <ZenComLoader maxW="100%" margin="12px auto" />
                        ) : !info?.user_id ? (
                            <Text fontSize="13px" color="var(--zencom-font-color)" opacity={0.6} padding="0 16px">
                                {__("No account – no tickets", "zencommunity")}
                            </Text>
                        ) : tickets.length === 0 ? (
                            <Text fontSize="13px" color="var(--zencom-font-color)" opacity={0.6} padding="0 16px">
                                {__("No tickets yet", "zencommunity")}
                            </Text>
                        ) : (
                            <Box
                                maxH="190px"
                                overflowY="auto"
                                css={{
                                    '&::-webkit-scrollbar': { width: '6px' },
                                    '&::-webkit-scrollbar-track': { width: '6px' },
                                    '&::-webkit-scrollbar-thumb': { background: '#CBD1D7', borderRadius: '9999px' },
                                }}
                            >
                                {tickets.map((ticket) => (
                                    <Flex
                                        key={ticket.id}
                                        as={Link}
                                        to={`/ticket/${ticket.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        margin="0 8px"
                                        padding="8px 10px"
                                        gap="8px"
                                        alignItems="center"
                                        borderRadius="8px"
                                        _hover={{ bg: "var(--zencom-secondary-color)" }}
                                    >
                                        <Text
                                            flex="1"
                                            fontSize="13px"
                                            color="var(--zencom-font-color)"
                                            noOfLines={1}
                                            minWidth={0}
                                        >
                                            {`#${ticket.id} · ${ticket.title}`}
                                        </Text>
                                        <Box
                                            as="span"
                                            style={ticketStatusStyle(ticket.status)}
                                            borderRadius="4px"
                                            padding="2px 6px"
                                            fontSize="11px"
                                            whiteSpace="nowrap"
                                            textTransform="capitalize"
                                            flexShrink={0}
                                        >
                                            {ticket.status}
                                        </Box>
                                    </Flex>
                                ))}
                            </Box>
                        )}
                    </Box>

                    <Box borderBottom="1px solid var(--zencom-border-color)" paddingY="14px">
                        <SectionHeader>{__("Assignee", "zencommunity")}</SectionHeader>
                        <Flex alignItems="center" gap="10px" padding="0 16px">
                            <Icon as={FiUser} boxSize="16px" color="var(--zencom-font-color)" flexShrink={0} />
                            <Box flex="1" minWidth={0}>
                                <Select
                                    className="zen-com-select zen-com-select--300"
                                    classNamePrefix="zen-com-select"
                                    options={assigneeOptions}
                                    value={assigneeOptions.find(option => parseInt(option.value) === parseInt(info?.assignee_id))}
                                    isClearable
                                    onChange={(option) => {
                                        let assignee_id = 0;
                                        if(option) assignee_id = option?.value;
                                        API.post(namespace + '/live-chat/' + selectedUser?.id, {
                                            assignee_id
                                        }).then(response => {
                                            setInfo(response?.data)
                                        })
                                    }}
                                />
                            </Box>
                        </Flex>
                    </Box>

                    {isAiAgentActive && (
                        <Box borderBottom="1px solid var(--zencom-border-color)" paddingY="14px">
                            <SectionHeader>{__("AI Assistance", "zencommunity")}</SectionHeader>
                            <Flex alignItems="center" justify="space-between" padding="0 16px">
                                <Text fontSize="13px" color="var(--zencom-font-color)">
                                    {__("Reply automatically with AI", "zencommunity")}
                                </Text>
                                <CustomSwitch
                                    value={isAiEnabled}
                                    onChange={() => handleAiToggle(!isAiEnabled)}
                                />
                            </Flex>
                        </Box>
                    )}

                    <Box borderBottom="1px solid var(--zencom-border-color)" paddingY="14px">
                        <SectionHeader>{__("Main Information", "zencommunity")}</SectionHeader>
                        <Flex direction="column" gap="2px">
                            <InfoRow icon={MdOutlineLocationOn}>
                                {info?.country_name ? `${getCountryFlag(info.country)} ${info.country_name ?? info.country}` : __("N/A", "zencommunity")}
                            </InfoRow>
                            <InfoRow icon={CiClock2}>
                                {info?.timezone || __("N/A", "zencommunity")}
                            </InfoRow>
                            <InfoRow icon={LuEarth}>
                                {info?.current_url ? (
                                    <Text
                                        as="a"
                                        href={info.current_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        color="var(--zencom-primary-color)"
                                        fontSize="13px"
                                        noOfLines={1}
                                        display="block"
                                    >
                                        {info.current_url}
                                    </Text>
                                ) : __("N/A", "zencommunity")}
                            </InfoRow>
                        </Flex>
                    </Box>

                    <Box borderBottom="1px solid var(--zencom-border-color)" paddingY="14px">
                        <SectionHeader>{__("Visitor device", "zencommunity")}</SectionHeader>
                        <Flex direction="column" gap="2px">
                            <InfoRow icon={LuMonitor}>
                                <Text fontSize="13px" noOfLines={2} title={info?.user_agent || ''}>
                                    {info?.user_agent ?? __("N/A", "zencommunity")}
                                </Text>
                            </InfoRow>
                            <InfoRow icon={CiCloud}>
                                {info?.ip ?? __("N/A", "zencommunity")}
                            </InfoRow>
                        </Flex>
                    </Box>

                    <Box paddingY="14px">
                        <SectionHeader>{__("Private Note", "zencommunity")}</SectionHeader>
                        <Box padding="0 16px">
                            <Textarea
                                placeholder={__("Add user note...", "zencommunity")}
                                bg="var(--zencom-background)"
                                borderRadius="10px"
                                size="sm"
                                value={note}
                                width="100%"
                                h="100px"
                                color={'var(--zencom-font-color)'}
                                onBlur={(e) => {
                                    if(!note) return;
                                    handleSaveNotes()
                                }}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </Box>
                    </Box>
                    </>
                    )}
                    </Box>
                </>
            )}
        </Box>
    );
};

export default MessageRightDetailsBar;
