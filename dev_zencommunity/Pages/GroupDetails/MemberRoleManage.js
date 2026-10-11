import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Button, Flex } from '@chakra-ui/react';
import ZenComMenu from '@Components/ZenComMenu';
import { personEdit, personJoined } from '../../../assets/staticIcons';
import { useNavigate } from 'react-router-dom';
import { API, current_user_can, namespace } from '@Utils/helper';
import { useSelector } from 'react-redux';
import { FaRegCheckSquare } from 'react-icons/fa';
import { IoIosClose } from 'react-icons/io';

const MemberRoleManage = ({ id, handleRemove, handleBan, handleUnban, handleMute, handleUnmute, handleUnsuspend, openWarnModal, openSuspendModal, openHistoryModal, setEditRole, member, fetchMembers, fetchPendingMembers, fetchBannedMembers, pendingMembers = [], bannedMembers = [], isAdmin, groupData, tab }) => {
    const group_permissions = useSelector(state => state.auth.group_permissions);
    const hasPermission = group_permissions?.[parseInt(id || groupData?.id)];
    const navigate = useNavigate();
    const isPending = pendingMembers.some(pending => Number(pending.id) === Number(member.id));

    const updateMemberStatus = async (status) => {
        try {
            if (hasPermission?.role === 'admin' || hasPermission?.role === 'moderator' || group_permissions?.manage_everything) {
                await API.post(`${namespace}/group/${id}/change-member-status`, {
                    id: member?.id,
                    status,
                });

                await fetchMembers();
                await fetchPendingMembers();
            }
        } catch (error) {
            console.error(`Failed to update status to ${status}`, error);
        }
    };

    const isAll = isAdmin && isPending;

    return (
        <>
            {tab === "all" && (
                <>
                    {isAdmin ? (
                        <Flex gap={1}>
                            {isPending && (
                                <>
                                    <Button
                                        color='var(--zencom-font-color)'
                                        size="sm"
                                        bg="#22A06B"
                                        border="1px solid #BAF3DB"
                                        onClick={() => updateMemberStatus('active')}
                                    >
                                        <FaRegCheckSquare /> {__('Approve request', 'zencommunity')}
                                    </Button>

                                    <Button
                                        size="sm"
                                        color={"#C9372C"}
                                        bg={"var(--zencom-background)"}
                                        onClick={() => handleRemove(member?.id)} // TODO: change to reject API
                                    >
                                        <IoIosClose /> {__('Reject', 'zencommunity')}
                                    </Button>
                                </>
                            )}

                            <ZenComMenu
                                options={[
                                    ...(!isPending ? [
                                        {
                                            label: __("Remove Member", "zencommunity"),
                                            icon: personJoined,
                                            type: "button",
                                            onClick: () => handleRemove(member?.id),
                                        },
                                        {
                                            label: __("Edit role", "zencommunity"),
                                            icon: personEdit,
                                            type: "button",
                                            onClick: () => setEditRole({
                                                isOpen: true,
                                                member
                                            }),
                                        },
                                        {
                                            label: __("Ban Member", "zencommunity"),
                                            icon: personJoined,
                                            type: "button",
                                            onClick: () => handleBan(member?.id),
                                        },
                                        {
                                            label: __("Warn Member", "zencommunity"),
                                            icon: personEdit,
                                            type: "button",
                                            onClick: () => openWarnModal(member),
                                        },
                                        {
                                            label: __("Mute Member", "zencommunity"),
                                            icon: personJoined,
                                            type: "button",
                                            onClick: () => handleMute(member?.id),
                                        },
                                        {
                                            label: __("Suspend Member", "zencommunity"),
                                            icon: personJoined,
                                            type: "button",
                                            onClick: () => openSuspendModal(member),
                                        },
                                        {
                                            label: __("View History", "zencommunity"),
                                            icon: personEdit,
                                            type: "button",
                                            onClick: () => openHistoryModal(member),
                                        },
                                    ] : []),
                                    {
                                        label: __("View profile", "zencommunity"),
                                        icon: personEdit,
                                        type: "link",
                                        onClick: () => navigate("/member/" + member?.id),
                                    },
                                ]}
                            />
                        </Flex>
                    ) : (
                        <Button
                            size="sm"
                            borderColor={"var(--zencom-border-color)"}
                            color='var(--zencom-font-color)'
                            variant="plain"
                            onClick={() => navigate("/member/" + member?.id)}
                        >
                            {__('View profile', 'zencommunity')}
                        </Button>
                    )}
                </>
            )}

            {tab === "pending" && (
                <>
                    {isAll ? (
                        <Flex gap={1}>
                            <Button
                                color='var(--zencom-font-color)'
                                size="sm"
                                bg="#22A06B"
                                border="1px solid #BAF3DB"
                                onClick={() => updateMemberStatus('active')}
                            >
                                <FaRegCheckSquare /> {__('Approve request', 'zencommunity')}
                            </Button>

                            <Button
                                size="sm"
                                color={"#C9372C"}
                                bg={"var(--zencom-background)"}
                                onClick={() => handleRemove(member?.id)} // TODO: change to reject API
                            >
                                <IoIosClose /> {__('Reject', 'zencommunity')}
                            </Button>

                            <Button
                                size="sm"
                                borderColor={"var(--zencom-border-color)"}
                                color='var(--zencom-font-color)'
                                variant="plain"
                                onClick={() => navigate("/member/" + member?.id)}
                            >
                                {__('View profile', 'zencommunity')}
                            </Button>
                        </Flex>
                    ) : !current_user_can?.manage_options ? (
                        <Button
                            borderColor={"var(--zencom-border-color)"}
                            color='var(--zencom-font-color)'
                            variant="plain"
                            onClick={() => navigate("/member/" + member?.id)}
                        >
                            {__('View profile', 'zencommunity')}
                        </Button>
                    ) : null}
                </>
            )}

            {tab === "banned" && (
                <Flex gap={1}>
                    {isAdmin && (
                        <Button
                            color='var(--zencom-font-color)'
                            size="sm"
                            bg="#22A06B"
                            border="1px solid #BAF3DB"
                            onClick={() => handleUnban(member?.id)}
                        >
                            <FaRegCheckSquare /> {__('Unban', 'zencommunity')}
                        </Button>
                    )}

                    <Button
                        size="sm"
                        borderColor={"var(--zencom-border-color)"}
                        color='var(--zencom-font-color)'
                        variant="plain"
                        onClick={() => navigate("/member/" + member?.id)}
                    >
                        {__('View profile', 'zencommunity')}
                    </Button>
                </Flex>
            )}

            {tab === "muted" && (
                <Flex gap={1}>
                    {isAdmin && (
                        <Button
                            color='var(--zencom-font-color)'
                            size="sm"
                            bg="#22A06B"
                            border="1px solid #BAF3DB"
                            onClick={() => handleUnmute(member?.id)}
                        >
                            <FaRegCheckSquare /> {__('Unmute', 'zencommunity')}
                        </Button>
                    )}

                    <Button
                        size="sm"
                        borderColor={"var(--zencom-border-color)"}
                        color='var(--zencom-font-color)'
                        variant="plain"
                        onClick={() => navigate("/member/" + member?.id)}
                    >
                        {__('View profile', 'zencommunity')}
                    </Button>
                </Flex>
            )}

            {tab === "suspended" && (
                <Flex gap={1}>
                    {isAdmin && (
                        <Button
                            color='var(--zencom-font-color)'
                            size="sm"
                            bg="#22A06B"
                            border="1px solid #BAF3DB"
                            onClick={() => handleUnsuspend(member?.id)}
                        >
                            <FaRegCheckSquare /> {__('Unsuspend', 'zencommunity')}
                        </Button>
                    )}

                    <Button
                        size="sm"
                        borderColor={"var(--zencom-border-color)"}
                        color='var(--zencom-font-color)'
                        variant="plain"
                        onClick={() => navigate("/member/" + member?.id)}
                    >
                        {__('View profile', 'zencommunity')}
                    </Button>
                </Flex>
            )}

            {/* {current_user_can?.manage_options && !isPending && (
                <ZenComMenu
                    options={[
                        {
                            label: __("Remove Member", "zencommunity"),
                            icon: personJoined,
                            type: "button",
                            onClick: () => handleRemove(member?.id),
                        },
                        {
                            label: __("Edit role", "zencommunity"),
                            icon: personEdit,
                            type: "button",
                            onClick: () => setEditRole({
                                isOpen: true,
                                member
                            }),
                        },
                        {
                            label: __("View profile", "zencommunity"),
                            icon: personEdit,
                            type: "link",
                            onClick: () => navigate("/member/" + member?.id),
                        },
                    ]}
                />
            )}

            {isAll ? (
                <Flex gap={1}>
                    <Button
                        borderColor={"var(--zencom-border-color)"}
                        color={"#454F59"}
                        variant="outline"
                        onClick={() => updateMemberStatus('active')}
                    >
                        {__('Approve request', 'zencommunity')}
                    </Button>

                    <Button
                        borderColor={"var(--zencom-border-color)"}
                        color={"#454F59"}
                        variant="outline"
                        onClick={() => handleRemove(member?.id)} // TODO: change to reject API
                    >
                        {__('Reject', 'zencommunity')}
                    </Button>

                    <Button
                        borderColor={"var(--zencom-border-color)"}
                        color={"#454F59"}
                        variant="outline"
                        onClick={() => navigate("/member/" + member?.id)}
                    >
                        {__('View profile', 'zencommunity')}
                    </Button>
                </Flex>
            ) : !current_user_can?.manage_options ? (
                <Button
                    borderColor={"var(--zencom-border-color)"}
                    color={"#454F59"}
                    variant="outline"
                    onClick={() => navigate("/member/" + member?.id)}
                >
                    {__('View profile', 'zencommunity')}
                </Button>
            ) : null} */}
        </>
    );
};

export default MemberRoleManage;
