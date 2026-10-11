import React from 'react';
import { Box, Flex, Avatar } from '@chakra-ui/react';
import { __, sprintf } from '@wordpress/i18n';
import { site_url, namespace, API, getInitials, getAvatarBg } from '@Utils/helper';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import NoDataPost from '@Components/NoDataPost';
import { RxActivityLog } from 'react-icons/rx';
import moment from 'moment';
import { useEffect } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ActivitiesSkeleton from './ActivitiesSkeleton';

const RecentActivities = () => {
    const [recentActivities, setRecentActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await API.get(`${namespace}/tickets/activities?per_page=100`);
                setRecentActivities(res?.data?.records || []);
            } catch (error) {
                console.error("Failed to fetch activities:", error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <Box
            maxH="966px"
            overflow="auto"
            scrollbarWidth={'none'}
        >
            {loading ? (
                <>
                    <ActivitiesSkeleton />
                    <ActivitiesSkeleton />
                    <ActivitiesSkeleton />
                </>
            ) : recentActivities?.length === 0 ? (
                <NoDataPost
                    icon={RxActivityLog}
                    title={__('No activities found!', 'zencommunity')}
                />
            ) : (
                recentActivities.map((activity, idx) => {
                    const dynamicActivitiesMsg = activity?.type === 'ticket'
                        ? 'created a ticket'
                        : activity?.type === 'comment' && activity?.is_note
                            ? 'created a note'
                            : activity?.type === 'comment'
                                ? 'commented'
                                : 'replied';

                    return (
                        <Flex
                            key={idx}
                            p="12px"
                            gap="8px"
                            alignItems="flex-start"
                            mb="8px"
                            borderRadius="4px"
                            background={'var(--zencom-background)'} 
                            color={'var(--zencom-font-color)'}
                            cursor="pointer"
                            _hover={{ bg: "var(--zencom-secondary-color)" }}
                            transition="background 0.15s ease"
                            onClick={() => navigate(`/ticket/${activity?.ticket_id}`)}
                        >
                            <Avatar.Root>
                                <Avatar.Fallback 
                                    name={getInitials(activity.user.first_name + " " + activity.user.last_name)}
                                    bg={getAvatarBg(activity.user.first_name + " " + activity.user.last_name)} 
                                    color="white"
                                    display='flex'
                                    alignItems='center'
                                    justifyContent='center'
                                    width='100%'
                                    height='100%'
                                />
                                <Avatar.Image
                                    src={
                                        activity?.user?.avatar_url
                                            ? site_url + activity.user.avatar_url
                                            : ""
                                    }
                                    border={0}
                                    borderStyle="solid"
                                    borderColor="var(--zencom-border-color)"
                                    rounded="full"
                                />
                            </Avatar.Root>
                            <Flex direction="column" flex="1">
                                <ZCLabel
                                    label={sprintf(
                                        __(
                                            `%s %s ${dynamicActivitiesMsg} "%s"`,
                                            'zencommunity'
                                        ),
                                        activity?.user?.first_name,
                                        activity?.user?.last_name,
                                        activity?.ticket_title?.length > 35 ? activity?.ticket_title.slice(0, 35) + "..." : activity?.ticket_title
                                    )}
                                    fontSize="14px"
                                    fontWeight="400"
                                    color="var(--zencom-font-color)"
                                />
                                <ZCLabel
                                    label={sprintf(__(' %s ', 'zencommunity'),
                                        activity?.content?.length > 25
                                            ? activity?.content?.slice(0, 25) + "..."
                                            : activity?.content
                                    )}
                                    fontSize="14px"
                                    fontWeight="400"
                                    color="color-mix(in srgb, var(--zencom-font-color) 70%, transparent)"
                                />
                                <ZCLabel
                                    label={sprintf(
                                        __('%s', 'zencommunity'),
                                        moment.utc(activity?.created_at).local().fromNow()
                                    )}
                                    fontSize="12px"
                                    fontWeight="400"
                                    color="color-mix(in srgb, var(--zencom-font-color) 60%, transparent)"
                                />
                            </Flex>
                        </Flex>
                    )
                })
            )}
        </Box>
    );
};

export default RecentActivities;