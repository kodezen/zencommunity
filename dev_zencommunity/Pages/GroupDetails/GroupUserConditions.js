import React, { useState } from 'react';
import { __ } from '@wordpress/i18n';
import ZenComMenu from '@Components/ZenComMenu';
import { FiShare } from 'react-icons/fi';
import { IoSettingsOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { message, notifyBellIcon, outlineArrowRightIcon } from '../../../assets/staticIcons';
import ZenComShare from '@Components/ZenComShare';
import { baseURL, current_logged_user, current_user_can, getAddonActiveStatus, site_url } from '@Utils/helper';
import { Box, Button } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { useStyles } from '../../utils/chakra';

const GroupUserConditions = ({ id, isAdmin, handleDeleteGroup, handleLeaveGroup, handleNotificationToggle, isShareOpen, setIsShareOpen, isUserExistsInGroup }) => {
    const navigate = useNavigate();
    const activeAddons = useSelector(state => state?.addons?.activeAddons);
    const { primaryBtnInsideContentTrans } = useStyles();
    const handleMessageClick = () => {
        localStorage.setItem("zcui", JSON.stringify(`group_${id}`));
        navigate("/chat");
    };

    const showMessage = getAddonActiveStatus(activeAddons, "Messaging") && isUserExistsInGroup && current_logged_user;
    
    return (
        <>
            {showMessage && (
                <Button onClick={handleMessageClick} {...primaryBtnInsideContentTrans} minWidth="auto" padding="8px 16px">
                    {message()}
                </Button>
            )}

            <Box className="zencom-animate-fade" height={'36px'} border="1px solid var(--zencom-border-color)" padding="4px" borderRadius={4} alignItems={'center'}>
                <ZenComMenu
                variant="transparent"
                options={[
                    // Non-admin members get a notification toggle here;
                    // admins get direct access to the group settings page.
                    ...((current_user_can?.manage_options || isAdmin) ? [{
                        label: __('Group settings', 'zencommunity'),
                        icon: IoSettingsOutline,
                        type: 'button',
                        onClick: () => navigate(`/group/${id}/settings`),
                    }] : [{
                        label: __('Get notifications', 'zencommunity'),
                        icon: notifyBellIcon,
                        type: 'button',
                        // onClick: () => handleNotificationToggle()
                    }]),
                    {
                        label: __('Share', 'zencommunity'),
                        icon: FiShare,
                        type: 'button',
                        onClick: () => setIsShareOpen(!isShareOpen),
                    },
                    ...(isUserExistsInGroup ? [{
                        label: __('Leave', 'zencommunity'),
                        icon: outlineArrowRightIcon,
                        type: 'button',
                        onClick: handleLeaveGroup,
                        textColor: 'red',
                        iconColor: 'red',
                    }] : []),
                ]}
                suffix="joined-group"
            />
            </Box>

            {isShareOpen && (
                <ZenComShare sharableLink={baseURL(`/group/${id}`)} isShareOpen={isShareOpen} setIsShareOpen={setIsShareOpen} />
            )}
        </>
    );
};

export default GroupUserConditions;
