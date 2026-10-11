import React from 'react';
import { Box, Flex, Text, Avatar, Separator } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { site_url, getInitials, getAvatarBg } from '@Utils/helper';
import NoDataPost from '@Components/NoDataPost';
import { RxActivityLog } from 'react-icons/rx';
import moment from 'moment';

const RecentActivities = ({ groupActivities }) => (
    <Box className="zencom-animate-fade" borderRadius="6px" bg={"var(--zencom-background)"} mb={{base:"50px", lg:"4"}}>
        <Text 
            fontSize='18px' 
            color='var(--zencom-font-color)' 
            fontWeight='500' 
            padding="12px 16px"
            whiteSpace="nowrap"
        >
            {__('Recent group activities', 'zencommunity')} 
        </Text>

        <Separator w={"100%"} margin='0 0 12px 0' borderColor="var(--zencom-border-color)" />

        {groupActivities.length === 0 ? (
            <NoDataPost
                icon={RxActivityLog}
                title={__('No activities found!', 'zencommunity')}
                subTitle={__('Add new to show start activities', 'zencommunity')}
                textAlign='center'
            />
        ) : (
            groupActivities.map((activity, idx, array) => (
                <Flex 
                    key={idx} 
                    alignItems={"flex-start"} 
                    gap={"8px"} 
                    justifyContent={"flex-start"} 
                    p="0 16px 16px 16px"
                >
                    <Avatar.Root>
                        <Avatar.Fallback 
                            bg={getAvatarBg(activity?.meta?.route?.user?.first_name + ' ' + activity?.meta?.route?.user?.first_name)}
                            color="white"
                            display='flex'
                            alignItems='center'
                            justifyContent='center'
                            width='100%'
                            height='100%'

                        >
                            {getInitials(activity?.meta?.route?.user?.first_name + ' ' + activity?.meta?.route?.user?.first_name)}
                        </Avatar.Fallback>
                        <Avatar.Image 
                            src={activity?.meta?.route?.user?.avatar_url ? site_url + activity?.meta?.route?.user?.avatar_url : ''} 
                            border={0} 
                            borderStyle={"solid"} 
                            borderColor={"var(--zencom-border-color)"} 
                            rounded={"full"} 
                        />
                    </Avatar.Root>
                    <Flex flexDirection={"column"} gap={"8px"} alignItems={"flex-start"}>
                        <Text 
                            truncate 
                            lineClamp="2" 
                            fontWeight="500" 
                            fontSize="14px" 
                            dangerouslySetInnerHTML={{
                                __html: activity?.meta?.message
                            }}
                            color='var(--zencom-font-color)'
                        />
                        <Text fontSize="12px" color='var(--zencom-font-color)'>
                            {moment(activity?.created_at, "YYYYMMDD").fromNow()}
                        </Text>
                    </Flex>
                </Flex>
            ))
        )}
    </Box>
);

export default RecentActivities;
