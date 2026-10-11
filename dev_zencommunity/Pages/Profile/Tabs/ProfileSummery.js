import React, { useEffect, useState } from 'react';
import { Avatar, Button, Flex, Text } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { API, current_logged_user, getAvatarBg, getInitials, media_url, namespace, site_url } from '@Utils/helper';
import { useNavigate } from 'react-router-dom';
import { __ } from '@wordpress/i18n';
import moment from 'moment';
import { useStyles } from '../../../utils/chakra';

const ProfileSummery = ({ userId }) => {
    const navigate = useNavigate();
    const reUserId = userId ?? current_logged_user?.user_id;
    const [profileData, setProfileData] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const { primaryBtnInsideContent } = useStyles();
    useEffect(() => {
        if (!reUserId) return;
        const url =
            Number(reUserId) === Number(current_logged_user?.user_id)
                ? `/member/profile`
                : `/member/${reUserId}`;

        API.get(namespace + url)
            .then(({ data }) => setProfileData(data))
            .finally(() => setProfileLoading(false));
    }, [reUserId]);

    useEffect(() => {
        setProfileData(false);
        setProfileLoading(true);
    }, [reUserId]);

    const joiningDate = profileData?.created_at
        ? moment(profileData?.created_at).format('MMMM Do YYYY')
        : 'Unknown';

    if (profileLoading || !profileData) return null;

    return (
        <>
            <Flex background={"var(--zencom-background)"} p={4} borderRadius='4px'>
                <Avatar.Root size="lg">
                    <Avatar.Fallback
                        bg={getAvatarBg(`${profileData?.first_name} ${profileData?.last_name}`)}
                        color="white"
                        display='flex'
                        alignItems='center'
                        justifyContent='center'
                        width='100%'
                        height='100%'
                    >
                        {getInitials(`${profileData?.first_name} ${profileData?.last_name}`)}
                    </Avatar.Fallback>
                    <Avatar.Image
                        src={media_url(profileData?.avatar_url)}
                        border={0}
                        borderStyle="solid"
                        borderColor="#E0E4E8"
                        rounded="full"
                    />
                </Avatar.Root>

                <Flex gap="2px" justify={"space-between"} px={"20px"} alignItems={'flex-start'} direction={'column'} color={"var(--zencom-font-color)"}>
                    <Flex gap="2px" justify={"space-between"} alignItems={'center'}>
                        <ZCLabel label={`${profileData?.first_name} ${profileData?.last_name}`} type='title' />
                        <ZCLabel label={'@' + profileData?.username} type='simple' fontSize='14px' />
                    </Flex>

                    <Text fontSize="14px" color="gray.500">
                        {__("Joined on", "zencommunity")} {joiningDate}
                    </Text>

                    <Button
                        size="xs"
                        {...primaryBtnInsideContent}
                        onClick={() => navigate("/member/" + profileData?.id)}
                    >
                        {__('View profile', 'zencommunity')}
                    </Button>
                </Flex>
            </Flex>
        </>
    );
};

export default ProfileSummery;