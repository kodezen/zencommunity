import React, { useEffect, useState } from 'react';
import { Box, Flex, Button, Avatar, Icon, Separator, AvatarGroup, HStack, Stack, Tabs, Textarea, useBreakpointValue } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { site_url, plugin_root_url, API, namespace, current_user_can } from '@Utils/helper';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { arrowRight, } from '../../../assets/staticIcons';
import { GoDotFill } from 'react-icons/go';
import ZenComSearch from '@Components/Chakra/Search';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import ZenComModal from '@Components/ZenComModal/ZenComModal';
import Select from '@Components/ReactSelect';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { useDispatch, useSelector } from 'react-redux';
import MemberRoleManage from './MemberRoleManage';
import NoDataPost from '@Components/NoDataPost';
import { PiUsersThreeThin } from 'react-icons/pi';
import { MemberSkeleton } from './helper';
import { useParams } from 'react-router-dom';
import { useStyles } from '../../utils/chakra';

const Members = ({ isAdmin, isMobile, type, handleTabNavigation, groupID, isUserExistsInGroup, groupData }) => {
    const dispatch = useDispatch();
    const { id } = useParams();
    const [membersData, setMembersData] = useState([]);
    const [editRole, setEditRole] = useState({
        isOpen: false,
        member: {}
    });
    const [searching, setSearching] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [pendingMembers, setPendingMembers] = useState([]);
    const [bannedMembers, setBannedMembers] = useState([]);
    const [mutedMembers, setMutedMembers] = useState([]);
    const [suspendedMembers, setSuspendedMembers] = useState([]);
    const [warnModal, setWarnModal] = useState({ isOpen: false, member: {}, reason: '' });
    const [suspendModal, setSuspendModal] = useState({ isOpen: false, member: {}, reason: '', duration: '1d' });
    const [historyModal, setHistoryModal] = useState({ isOpen: false, member: {}, actions: [], loading: false });
    // Built-in (admin/moderator/member) plus any custom roles - fetched
    // rather than hardcoded so a role created in Settings > Role and
    // Permission shows up here immediately.
    const [roleOptions, setRoleOptions] = useState([]);
    const group_permissions = useSelector(state => state.auth.group_permissions);
    const hasPermission = group_permissions?.[parseInt(id || groupData?.id)];
    const isGroupManager = current_user_can?.manage_options || hasPermission?.role === 'admin' || hasPermission?.role === 'moderator';
    const { commonInput, primaryBtnInsideContent } = useStyles();

    const suspensionDurationOptions = [
        { label: __('1 hour', 'zencommunity'), value: '1h' },
        { label: __('1 day', 'zencommunity'), value: '1d' },
        { label: __('3 days', 'zencommunity'), value: '3d' },
        { label: __('7 days', 'zencommunity'), value: '7d' },
        { label: __('30 days', 'zencommunity'), value: '30d' },
    ];

    const fetchMembers = async () => {
        setSearching(true)
        try {
            const { data: { records: membersRecords } } = await API.get(`${namespace}/group/${groupID}/members`);
            setMembersData(membersRecords);
        } catch (error) {
            console.error(error);
        } finally {
            setSearching(false)
        }
    }

    const fetchPendingMembers = async () => {
        try {
            const response = await API.get(`${namespace}/group/${groupID}/members?status=pending`);
            const records = response?.data?.records ?? [];
            setPendingMembers(records);
        } catch (error) {
            console.error('Error fetching pending members:', error);
            setPendingMembers([]);
        }
    };

    const fetchBannedMembers = async () => {
        try {
            const response = await API.get(`${namespace}/group/${groupID}/members?status=banned`);
            const records = response?.data?.records ?? [];
            setBannedMembers(records);
        } catch (error) {
            console.error('Error fetching banned members:', error);
            setBannedMembers([]);
        }
    };

    const fetchSuspendedMembers = async () => {
        try {
            const response = await API.get(`${namespace}/group/${groupID}/members?status=suspended`);
            const records = response?.data?.records ?? [];
            setSuspendedMembers(records);
        } catch (error) {
            console.error('Error fetching suspended members:', error);
            setSuspendedMembers([]);
        }
    };

    const fetchMutedMembers = async () => {
        try {
            const response = await API.get(`${namespace}/group/${groupID}/muted-members`);
            const records = response?.data?.records ?? [];
            setMutedMembers(records);
        } catch (error) {
            console.error('Error fetching muted members:', error);
            setMutedMembers([]);
        }
    };

    useEffect(() => {
        fetchMembers();
        if (isGroupManager) {
            fetchPendingMembers();
            fetchBannedMembers();
            fetchSuspendedMembers();
            fetchMutedMembers();
        }
    }, [id]);

    useEffect(() => {
        API.get(`${namespace}/roles/group`)
            .then(({ data }) => setRoleOptions((data || []).map((r) => ({ label: r.label, value: r.slug }))))
            .catch(() => setRoleOptions([]));
    }, []);

    const handleSearch = async (searchKey) => {
        setSearchText(searchKey)
        let url = `/group/${groupID}/members`
        if (searchKey) {
            url += `?per_page=100&search=${searchKey}`
        }

        setSearching(true)
        const response = await API.get(namespace + url);

        if (response.data.records) {
            setMembersData(response.data.records)
        }
        setSearching(false)
    }

    const handleRoleUpdate = async (role) => {
        let url = namespace + `/group/${groupID}/change-member-role`
        try {
            await API.post(url, {
                id: parseInt(editRole.member.id),
                role
            });
            dispatch(showNotification({
                message: __('User Role Updated', 'zencommunity'),
                isShow: true,
                type: 'success',
            }))
            fetchMembers();
        } catch (error) {
            dispatch(showNotification({
                message: error.response.data.message || error.message,
                isShow: true,
                type: 'error',
            }))
        }
    }

    const handleRemove = async (id) => {
        let url = namespace + `/group/${groupID}/remove-member`
        try {
            await API.post(url, {
                id,
            });
            dispatch(showNotification({
                message: __('User has been Removed from Group', 'zencommunity'),
                isShow: true,
                type: 'success',
            }))
            setMembersData(membersData.filter(item => Number(item.id) !== Number(id)))
        } catch (error) {
            dispatch(showNotification({
                message: error.response.data.message || error.message,
                isShow: true,
                type: 'error',
            }))
        }
    }

    const handleBan = async (id) => {
        let url = namespace + `/group/${groupID}/change-member-status`
        try {
            await API.post(url, {
                id,
                status: 'banned',
            });
            dispatch(showNotification({
                message: __('User has been Banned from Group', 'zencommunity'),
                isShow: true,
                type: 'success',
            }))
            setMembersData(membersData.filter(item => Number(item.id) !== Number(id)))
            fetchBannedMembers();
        } catch (error) {
            dispatch(showNotification({
                message: error.response.data.message || error.message,
                isShow: true,
                type: 'error',
            }))
        }
    }

    const handleUnban = async (id) => {
        let url = namespace + `/group/${groupID}/change-member-status`
        try {
            await API.post(url, {
                id,
                status: 'active',
            });
            dispatch(showNotification({
                message: __('User has been Unbanned', 'zencommunity'),
                isShow: true,
                type: 'success',
            }))
            setBannedMembers(bannedMembers.filter(item => Number(item.id) !== Number(id)))
            fetchMembers();
        } catch (error) {
            dispatch(showNotification({
                message: error.response.data.message || error.message,
                isShow: true,
                type: 'error',
            }))
        }
    }

    const handleWarnSubmit = async () => {
        const memberId = warnModal.member?.id;
        let url = namespace + `/group/${groupID}/warn-member`
        try {
            await API.post(url, {
                id: memberId,
                reason: warnModal.reason,
            });
            dispatch(showNotification({
                message: __('Warning has been issued', 'zencommunity'),
                isShow: true,
                type: 'success',
            }))
            setWarnModal({ isOpen: false, member: {}, reason: '' });
        } catch (error) {
            dispatch(showNotification({
                message: error.response.data.message || error.message,
                isShow: true,
                type: 'error',
            }))
        }
    }

    const handleMute = async (id) => {
        let url = namespace + `/group/${groupID}/mute-member`
        try {
            await API.post(url, { id });
            dispatch(showNotification({
                message: __('Member has been muted', 'zencommunity'),
                isShow: true,
                type: 'success',
            }))
            fetchMutedMembers();
        } catch (error) {
            dispatch(showNotification({
                message: error.response.data.message || error.message,
                isShow: true,
                type: 'error',
            }))
        }
    }

    const handleUnmute = async (id) => {
        let url = namespace + `/group/${groupID}/unmute-member`
        try {
            await API.post(url, { id });
            dispatch(showNotification({
                message: __('Member has been unmuted', 'zencommunity'),
                isShow: true,
                type: 'success',
            }))
            setMutedMembers(mutedMembers.filter(item => Number(item.id) !== Number(id)))
        } catch (error) {
            dispatch(showNotification({
                message: error.response.data.message || error.message,
                isShow: true,
                type: 'error',
            }))
        }
    }

    const handleSuspendSubmit = async () => {
        const memberId = suspendModal.member?.id;
        let url = namespace + `/group/${groupID}/suspend-member`
        try {
            await API.post(url, {
                id: memberId,
                reason: suspendModal.reason,
                duration: suspendModal.duration,
            });
            dispatch(showNotification({
                message: __('Member has been suspended', 'zencommunity'),
                isShow: true,
                type: 'success',
            }))
            setSuspendModal({ isOpen: false, member: {}, reason: '', duration: '1d' });
            setMembersData(membersData.filter(item => Number(item.id) !== Number(memberId)))
            fetchSuspendedMembers();
        } catch (error) {
            dispatch(showNotification({
                message: error.response.data.message || error.message,
                isShow: true,
                type: 'error',
            }))
        }
    }

    const handleUnsuspend = async (id) => {
        let url = namespace + `/group/${groupID}/unsuspend-member`
        try {
            await API.post(url, { id });
            dispatch(showNotification({
                message: __('Member has been unsuspended', 'zencommunity'),
                isShow: true,
                type: 'success',
            }))
            setSuspendedMembers(suspendedMembers.filter(item => Number(item.id) !== Number(id)))
            fetchMembers();
        } catch (error) {
            dispatch(showNotification({
                message: error.response.data.message || error.message,
                isShow: true,
                type: 'error',
            }))
        }
    }

    const openHistoryModal = async (member) => {
        setHistoryModal({ isOpen: true, member, actions: [], loading: true });
        try {
            const response = await API.get(`${namespace}/group/${groupID}/member-actions?id=${member.id}`);
            setHistoryModal({ isOpen: true, member, actions: response?.data?.actions ?? [], loading: false });
        } catch (error) {
            console.error('Error fetching member history:', error);
            setHistoryModal({ isOpen: true, member, actions: [], loading: false });
        }
    }

    const MembersSkeletonLoader = ({ count = 5 }) => (
        <Stack gap="8px" p="0 16px 12px 16px">
            {Array.from({ length: count }, (_, index) => (
                <MemberSkeleton key={index} />
            ))}
        </Stack>
    );

    const visibleMembersCount = useBreakpointValue({      
        lg: -4,      
        xl: -6,      
    });

    return (
        <>
            {type === "tab" ? (
                <Box className="zencom-animate-fade" borderRadius="6px" bg={"var(--zencom-background)"} width="100%" mb={{base:"50px", lg:"4"}}>
                    <Tabs.Root defaultValue="all" variant="plain" size="sm" p={4}>
                        <Flex borderBottom="1px solid var(--zencom-border-color)" justifyContent="space-between" alignItems="center" mb={4} pb={2}>
                            <HStack gap="8px" >
                                <ZCLabel fontSize='18px' fontWeight='500' color='var(--zencom-font-color)' label={__('Total members', 'zencommunity')} />
                                <Icon as={GoDotFill} size="xs" color='var(--zencom-font-color)' />
                                <ZCLabel type='simple' color='var(--zencom-font-color)' label={membersData.length} />
                            </HStack>

                            <ZenComSearch width='50%' value={searchText} changeHandler={(e) => handleSearch(e.target.value)} />
                        </Flex>

                        <Flex justifyContent="space-between" alignItems="center" >
                            {isGroupManager && (
                                <Tabs.List rounded="l3" p="1" bg={"var(--zencom-background)"} defaultValue="all" border={'1px solid var(--zencom-border-color)'}>
                                    <Tabs.Trigger value="all" className="zc-tab-segment">
                                        {__('All', 'zencommunity')}
                                    </Tabs.Trigger>
                                    <Tabs.Trigger value="pending" className="zc-tab-segment">
                                        {__('Pending', 'zencommunity')}
                                    </Tabs.Trigger>
                                    <Tabs.Trigger value="banned" className="zc-tab-segment">
                                        {__('Banned', 'zencommunity')}
                                    </Tabs.Trigger>
                                    <Tabs.Trigger value="muted" className="zc-tab-segment">
                                        {__('Muted', 'zencommunity')}
                                    </Tabs.Trigger>
                                    <Tabs.Trigger value="suspended" className="zc-tab-segment">
                                        {__('Suspended', 'zencommunity')}
                                    </Tabs.Trigger>
                                    <Tabs.Indicator rounded="l2" />
                                </Tabs.List>
                            )}
                        </Flex>

                        <Tabs.Content value="all" p={0}>
                            {/* <HStack gap="8px" p="16px">
                                <ZCLabel fontSize='16px' fontWeight='500' color='var(--zencom-font-color)' label={__('Admin and moderators', 'zencommunity')} />
                                <Icon as={GoDotFill} size="xs" />
                                <ZCLabel type='simple' color='#586774' label={__('100', 'zencommunity')} />
                            </HStack> */}

                            {/* TODO: SHOW THE ADMIN & MODERATOR */}
                            {/* map this */}
                            {/* <Stack gap="8px" p="0 16px 12px 16px">
                                <Flex gap="8px" alignItems="center" justifyContent="space-between" >
                                    <ZenComAvatar
                                        size='sm'
                                        variant=""
                                        userName=""
                                        userMail=""
                                    />
                                    <MemberRoleManage isAdmin={isAdmin} />
                                </Flex>
                                <Separator w={"100%"} borderColor="var(--zencom-border-color)" />
                            </Stack> */}

                            <HStack gap="8px" p="16px 0">
                                <ZCLabel fontSize='16px' fontWeight='500' color='var(--zencom-font-color)' label={__('Members', 'zencommunity')} />
                                <Icon as={GoDotFill} size="xs" color='var(--zencom-font-color)'/>
                                <ZCLabel type='simple' color='var(--zencom-font-color)' label={membersData.length} />
                            </HStack>

                            <Stack gap="8px" p="0 0px 12px 0px">
                                {searching ? (
                                    <MembersSkeletonLoader count={6} />
                                ) : (
                                    membersData.length > 0 && membersData.map(member => {
                                        return (
                                            <Flex key={member.id} gap="8px" alignItems="center" justifyContent="space-between">
                                                <ZenComAvatar
                                                    userID={member?.user_id ?? member?.id}
                                                    size='sm'
                                                    variant=""
                                                    userName={member?.first_name + " " + member?.last_name}
                                                    userMail={member.role ?? 'member'}
                                                    src={member?.avatar_url ? site_url + member?.avatar_url : ""}
                                                />

                                                <MemberRoleManage
                                                    tab="all"
                                                    id={id}
                                                    isAdmin={isAdmin}
                                                    handleRemove={handleRemove}
                                                    handleBan={handleBan}
                                                    handleMute={handleMute}
                                                    openWarnModal={(member) => setWarnModal({ isOpen: true, member, reason: '' })}
                                                    openSuspendModal={(member) => setSuspendModal({ isOpen: true, member, reason: '', duration: '1d' })}
                                                    openHistoryModal={openHistoryModal}
                                                    isUserExistsInGroup={isUserExistsInGroup}
                                                    setEditRole={setEditRole}
                                                    member={member}
                                                    pendingMembers={pendingMembers}
                                                    fetchMembers={fetchMembers}
                                                    fetchPendingMembers={fetchPendingMembers}
                                                    groupData={groupData}
                                                />
                                            </Flex>
                                        )
                                    })
                                )}
                            </Stack>
                        </Tabs.Content>

                        {isGroupManager && (
                            <>
                                <Tabs.Content value="pending" p={0}>
                                    <HStack gap="8px" p="16px 0">
                                        <ZCLabel fontSize='16px' fontWeight='500' color='var(--zencom-font-color)' label={__('Pending members', 'zencommunity')} />
                                        <Icon as={GoDotFill} size="xs" color='var(--zencom-font-color)'/>
                                        <ZCLabel type='simple' color='var(--zencom-font-color)' label={pendingMembers.length} />
                                    </HStack>

                                    <Separator w={"100%"} borderColor="var(--zencom-border-color)" />

                                    <Stack gap="8px" p="0 0px 12px 0px">
                                        {searching ? (
                                            <MembersSkeletonLoader count={6} />
                                        ) : (
                                            pendingMembers.length > 0 ? (
                                                pendingMembers
                                                    .map(member => {
                                                        return (
                                                            <Flex key={member.id} gap="8px" alignItems="center" justifyContent="space-between">
                                                                <ZenComAvatar
                                                                    userID={member?.user_id ?? member?.id}
                                                                    size='sm'
                                                                    variant=""
                                                                    userName={member?.first_name + " " + member?.last_name}
                                                                    userMail={member.role ?? 'member'}
                                                                    src={member?.avatar_url ? site_url + member?.avatar_url : ""}
                                                                />

                                                                <MemberRoleManage
                                                                    tab="pending"
                                                                    id={id}
                                                                    isAdmin={isAdmin}
                                                                    handleRemove={handleRemove}
                                                                    isUserExistsInGroup={isUserExistsInGroup}
                                                                    setEditRole={setEditRole}
                                                                    member={member}
                                                                    pendingMembers={pendingMembers}
                                                                    fetchMembers={fetchMembers}
                                                                    fetchPendingMembers={fetchPendingMembers}
                                                                    groupData={groupData}
                                                                />
                                                            </Flex>
                                                        )
                                                    })
                                            ) : (
                                                <NoDataPost
                                                    icon={PiUsersThreeThin}
                                                    title={__('No pending members found!', 'zencommunity')}
                                                    subTitle={__('All member requests have been processed', 'zencommunity')}
                                                />
                                            )
                                        )}
                                    </Stack>
                                </Tabs.Content>

                                <Tabs.Content value="banned" p={0}>
                                    <HStack gap="8px" p="16px 0">
                                        <ZCLabel fontSize='16px' fontWeight='500' color='var(--zencom-font-color)' label={__('Banned members', 'zencommunity')} />
                                        <Icon as={GoDotFill} size="xs" color='var(--zencom-font-color)'/>
                                        <ZCLabel type='simple' color='var(--zencom-font-color)' label={bannedMembers.length} />
                                    </HStack>

                                    <Separator w={"100%"} borderColor="var(--zencom-border-color)" />

                                    <Stack gap="8px" p="0 0px 12px 0px">
                                        {searching ? (
                                            <MembersSkeletonLoader count={6} />
                                        ) : (
                                            bannedMembers.length > 0 ? (
                                                bannedMembers
                                                    .map(member => {
                                                        return (
                                                            <Flex key={member.id} gap="8px" alignItems="center" justifyContent="space-between">
                                                                <ZenComAvatar
                                                                    userID={member?.user_id ?? member?.id}
                                                                    size='sm'
                                                                    variant=""
                                                                    userName={member?.first_name + " " + member?.last_name}
                                                                    userMail={member.role ?? 'member'}
                                                                    src={member?.avatar_url ? site_url + member?.avatar_url : ""}
                                                                />

                                                                <MemberRoleManage
                                                                    tab="banned"
                                                                    id={id}
                                                                    isAdmin={isAdmin}
                                                                    handleRemove={handleRemove}
                                                                    handleUnban={handleUnban}
                                                                    isUserExistsInGroup={isUserExistsInGroup}
                                                                    setEditRole={setEditRole}
                                                                    member={member}
                                                                    bannedMembers={bannedMembers}
                                                                    fetchMembers={fetchMembers}
                                                                    fetchBannedMembers={fetchBannedMembers}
                                                                    groupData={groupData}
                                                                />
                                                            </Flex>
                                                        )
                                                    })
                                            ) : (
                                                <NoDataPost
                                                    icon={PiUsersThreeThin}
                                                    title={__('No banned members found!', 'zencommunity')}
                                                    subTitle={__('Members you ban from this group will show up here', 'zencommunity')}
                                                />
                                            )
                                        )}
                                    </Stack>
                                </Tabs.Content>

                                <Tabs.Content value="muted" p={0}>
                                    <HStack gap="8px" p="16px 0">
                                        <ZCLabel fontSize='16px' fontWeight='500' color='var(--zencom-font-color)' label={__('Muted members', 'zencommunity')} />
                                        <Icon as={GoDotFill} size="xs" color='var(--zencom-font-color)'/>
                                        <ZCLabel type='simple' color='var(--zencom-font-color)' label={mutedMembers.length} />
                                    </HStack>

                                    <Separator w={"100%"} borderColor="var(--zencom-border-color)" />

                                    <Stack gap="8px" p="0 0px 12px 0px">
                                        {searching ? (
                                            <MembersSkeletonLoader count={6} />
                                        ) : (
                                            mutedMembers.length > 0 ? (
                                                mutedMembers
                                                    .map(member => {
                                                        return (
                                                            <Flex key={member.id} gap="8px" alignItems="center" justifyContent="space-between">
                                                                <ZenComAvatar
                                                                    userID={member?.user_id ?? member?.id}
                                                                    size='sm'
                                                                    variant=""
                                                                    userName={member?.first_name + " " + member?.last_name}
                                                                    userMail={member.role ?? 'member'}
                                                                    src={member?.avatar_url ? site_url + member?.avatar_url : ""}
                                                                />

                                                                <MemberRoleManage
                                                                    tab="muted"
                                                                    id={id}
                                                                    isAdmin={isAdmin}
                                                                    handleUnmute={handleUnmute}
                                                                    isUserExistsInGroup={isUserExistsInGroup}
                                                                    setEditRole={setEditRole}
                                                                    member={member}
                                                                    fetchMembers={fetchMembers}
                                                                    fetchMutedMembers={fetchMutedMembers}
                                                                    groupData={groupData}
                                                                />
                                                            </Flex>
                                                        )
                                                    })
                                            ) : (
                                                <NoDataPost
                                                    icon={PiUsersThreeThin}
                                                    title={__('No muted members found!', 'zencommunity')}
                                                    subTitle={__('Members you mute in this group will show up here', 'zencommunity')}
                                                />
                                            )
                                        )}
                                    </Stack>
                                </Tabs.Content>

                                <Tabs.Content value="suspended" p={0}>
                                    <HStack gap="8px" p="16px 0">
                                        <ZCLabel fontSize='16px' fontWeight='500' color='var(--zencom-font-color)' label={__('Suspended members', 'zencommunity')} />
                                        <Icon as={GoDotFill} size="xs" color='var(--zencom-font-color)'/>
                                        <ZCLabel type='simple' color='var(--zencom-font-color)' label={suspendedMembers.length} />
                                    </HStack>

                                    <Separator w={"100%"} borderColor="var(--zencom-border-color)" />

                                    <Stack gap="8px" p="0 0px 12px 0px">
                                        {searching ? (
                                            <MembersSkeletonLoader count={6} />
                                        ) : (
                                            suspendedMembers.length > 0 ? (
                                                suspendedMembers
                                                    .map(member => {
                                                        return (
                                                            <Flex key={member.id} gap="8px" alignItems="center" justifyContent="space-between">
                                                                <ZenComAvatar
                                                                    userID={member?.user_id ?? member?.id}
                                                                    size='sm'
                                                                    variant=""
                                                                    userName={member?.first_name + " " + member?.last_name}
                                                                    userMail={member.role ?? 'member'}
                                                                    src={member?.avatar_url ? site_url + member?.avatar_url : ""}
                                                                />

                                                                <MemberRoleManage
                                                                    tab="suspended"
                                                                    id={id}
                                                                    isAdmin={isAdmin}
                                                                    handleUnsuspend={handleUnsuspend}
                                                                    isUserExistsInGroup={isUserExistsInGroup}
                                                                    setEditRole={setEditRole}
                                                                    member={member}
                                                                    fetchMembers={fetchMembers}
                                                                    fetchSuspendedMembers={fetchSuspendedMembers}
                                                                    groupData={groupData}
                                                                />
                                                            </Flex>
                                                        )
                                                    })
                                            ) : (
                                                <NoDataPost
                                                    icon={PiUsersThreeThin}
                                                    title={__('No suspended members found!', 'zencommunity')}
                                                    subTitle={__('Members you suspend in this group will show up here', 'zencommunity')}
                                                />
                                            )
                                        )}
                                    </Stack>
                                </Tabs.Content>
                            </>
                        )}
                    </Tabs.Root>
                </Box>
            ) : (
                <Box className="zencom-animate-fade" borderRadius="6px" bg={"var(--zencom-background)"} mb={4}>
                    <ZCLabel fontSize='18px' color='var(--zencom-font-color)' fontWeight='500' padding="12px 16px" label={__('Members', 'zencommunity')} />

                    <Separator w={"100%"} borderColor="var(--zencom-border-color)" />

                    {membersData?.length === 0 ? (
                        <NoDataPost
                            icon={PiUsersThreeThin}
                            title={__('No member found!', 'zencommunity')}
                            subTitle={__('Invite members to see all members', 'zencommunity')}
                        />
                    ) : (
                        <Flex direction={isMobile ? "row" : "column"} justifyContent={isMobile && "space-between"} alignItems={!isMobile && "flex-start"} p="16px">
                            <AvatarGroup gap="0" spaceX="-3" size="lg">
                                {membersData?.length > 0 && membersData.slice(visibleMembersCount).map(member => {
                                    return (
                                        <Avatar.Root>
                                            <Avatar.Fallback name={member?.first_name + " " + member?.last_name} />
                                            <Avatar.Image src={member?.avatar_url ? site_url + member?.avatar_url :  ""} />
                                        </Avatar.Root>
                                    )
                                })}
                            </AvatarGroup>

                            <Button
                                onClick={() => {
                                    handleTabNavigation('members')
                                }}
                                bg={"none"}
                                color={"var(--zencom-font-color)"}
                                fontSize={"14px"} border="1px solid var(--zencom-border-color)"
                                borderRadius="4px" width="100%" marginTop="24px"
                            >
                                {__("Show all", "zencommunity")} <Icon width="16px" height="16px">{arrowRight()}</Icon>
                            </Button>
                        </Flex>
                    )}
                </Box>
            )}

            <ZenComModal
                isOpen={editRole.isOpen}
                onRequestClose={() => setEditRole({
                    isOpen: false,
                    member: {}
                })}
                size="small"
                position='center'
                title={__("Edit role", "zencommunity")}
                suffix='edit-role'
            >
                <ZenComAvatar
                    userID={editRole.member?.user_id ?? editRole.member?.id}
                    size='sm'
                    variant="default"
                    src={editRole.member?.avatar_url ? site_url + editRole.member?.avatar_url : plugin_root_url + "/assets/images/avatar_placeholder.png"}
                    userName={editRole.member.first_name + " " + editRole.member.last_name}
                    userMail=""
                />

                <ZCLabel type='basic' label={__('Select role', 'zencommunity')} margin='24px 0 6px 0' />

                <Select
                    options={roleOptions}
                    placeholder={__('Choose role', 'zencommunity')}
                    className="zen-com-select"
                    classNamePrefix="zen-com-select"
                    onChange={(option) => handleRoleUpdate(option.value)}
                />
            </ZenComModal>

            <ZenComModal
                isOpen={warnModal.isOpen}
                onRequestClose={() => setWarnModal({ isOpen: false, member: {}, reason: '' })}
                size="small"
                position='center'
                title={__("Warn member", "zencommunity")}
                suffix='warn-member'
            >
                <ZenComAvatar
                    userID={warnModal.member?.user_id ?? warnModal.member?.id}
                    size='sm'
                    variant="default"
                    src={warnModal.member?.avatar_url ? site_url + warnModal.member?.avatar_url : plugin_root_url + "/assets/images/avatar_placeholder.png"}
                    userName={(warnModal.member.first_name || '') + " " + (warnModal.member.last_name || '')}
                    userMail=""
                />

                <ZCLabel type='basic' label={__('Reason', 'zencommunity')} margin='24px 0 6px 0' />

                <Textarea
                    size="xl"
                    placeholder={__('Why is this member being warned?', 'zencommunity')}
                    value={warnModal.reason}
                    onChange={(e) => setWarnModal({ ...warnModal, reason: e.target.value })}
                    {...commonInput}
                />

                <Button
                    marginTop="16px"
                    width="100%"
                    {...primaryBtnInsideContent}
                    onClick={handleWarnSubmit}
                >
                    {__('Send warning', 'zencommunity')}
                </Button>
            </ZenComModal>

            <ZenComModal
                isOpen={suspendModal.isOpen}
                onRequestClose={() => setSuspendModal({ isOpen: false, member: {}, reason: '', duration: '1d' })}
                size="small"
                position='center'
                title={__("Suspend member", "zencommunity")}
                suffix='suspend-member'
            >
                <ZenComAvatar
                    userID={suspendModal.member?.user_id ?? suspendModal.member?.id}
                    size='sm'
                    variant="default"
                    src={suspendModal.member?.avatar_url ? site_url + suspendModal.member?.avatar_url : plugin_root_url + "/assets/images/avatar_placeholder.png"}
                    userName={(suspendModal.member.first_name || '') + " " + (suspendModal.member.last_name || '')}
                    userMail=""
                />

                <ZCLabel type='basic' label={__('Duration', 'zencommunity')} margin='24px 0 6px 0' />

                <Select
                    options={suspensionDurationOptions}
                    value={suspensionDurationOptions.find(o => o.value === suspendModal.duration)}
                    className="zen-com-select"
                    classNamePrefix="zen-com-select"
                    onChange={(option) => setSuspendModal({ ...suspendModal, duration: option.value })}
                />

                <ZCLabel type='basic' label={__('Reason', 'zencommunity')} margin='16px 0 6px 0' />

                <Textarea
                    size="xl"
                    placeholder={__('Why is this member being suspended?', 'zencommunity')}
                    value={suspendModal.reason}
                    onChange={(e) => setSuspendModal({ ...suspendModal, reason: e.target.value })}
                    {...commonInput}
                />

                <Button
                    marginTop="16px"
                    width="100%"
                    {...primaryBtnInsideContent}
                    onClick={handleSuspendSubmit}
                >
                    {__('Suspend member', 'zencommunity')}
                </Button>
            </ZenComModal>

            <ZenComModal
                isOpen={historyModal.isOpen}
                onRequestClose={() => setHistoryModal({ isOpen: false, member: {}, actions: [], loading: false })}
                size="small"
                position='center'
                title={__("Moderation history", "zencommunity")}
                suffix='member-history'
            >
                <ZenComAvatar
                    userID={historyModal.member?.user_id ?? historyModal.member?.id}
                    size='sm'
                    variant="default"
                    src={historyModal.member?.avatar_url ? site_url + historyModal.member?.avatar_url : plugin_root_url + "/assets/images/avatar_placeholder.png"}
                    userName={(historyModal.member.first_name || '') + " " + (historyModal.member.last_name || '')}
                    userMail=""
                />

                <Stack gap="8px" marginTop="16px">
                    {historyModal.loading ? (
                        <ZCLabel type='simple' color='var(--zencom-font-color)' label={__('Loading...', 'zencommunity')} />
                    ) : historyModal.actions.length > 0 ? (
                        historyModal.actions.map((action) => (
                            <Box key={action.id} borderBottom="1px solid var(--zencom-border-color)" paddingBottom="8px">
                                <ZCLabel type='bold' color='var(--zencom-font-color)' label={action.type} margin="0" />
                                {action.reason && (
                                    <ZCLabel type='simple' color='var(--zencom-font-color)' label={action.reason} margin="0" />
                                )}
                                <ZCLabel type='simple' color='var(--zencom-font-color)' label={action.created_at} margin="0" />
                            </Box>
                        ))
                    ) : (
                        <ZCLabel type='simple' color='var(--zencom-font-color)' label={__('No moderation actions recorded yet.', 'zencommunity')} />
                    )}
                </Stack>
            </ZenComModal>
        </>
    )
};

export default Members;
