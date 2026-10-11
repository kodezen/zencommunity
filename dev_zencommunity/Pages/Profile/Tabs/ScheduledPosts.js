import React, { useEffect, useState } from 'react';
import { Box, Flex, Icon, } from '@chakra-ui/react';
import { __, sprintf } from '@wordpress/i18n';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { MdDateRange } from 'react-icons/md';
import SchedulePostCard from '@Components/PostCard/SchedulePostCard';

const ScheduledPosts = ({ RecentActivities, activeSections, schedulePosts, setSchedulePosts}) => {
    return (
        <Flex mt="24px" gap={{ base: "0", md: "0", lg: "20px" }}>
            <Flex width={{ base: "100%", md: "100%", lg: "70%" }} direction={"column"} gap={"20px"}>
                <Box flex="1" maxWidth="100%">
                    {activeSections && (
                        <Flex flexDirection="column" gap={"16px"} borderRadius="4px" bg="var(--zencom-background)" p={"20px"} marginBottom={6} width={{ base: "100%", md: "100%", lg: "30%" }} display={{ base: "block", md: "block", lg: "none" }}>
                            <RecentActivities />
                        </Flex>
                    )}
                    <Flex 
                        alignItems={'center'}  
                        borderRadius={'4px'}
                        marginBottom={'24px'}
                        gap={'8px'}
                    >
                        <Icon as={MdDateRange} width={'40px'} height={'40px'} color={'var(--zencom-font-color)'} />
                        <Flex direction={'column'} alignItems={'flex-start'}>
                            <ZCLabel
                                label={__("Scheduled Posts", "zencommunity")}
                                type='bold'
                                fontSize={'18px'}
                                // fontWeight={'500'}
                                // lineHeight={'24px'}
                                />
                            <ZCLabel
                                label={sprintf(__("You have %s scheduled posts", "zencommunity"), schedulePosts?.total)}
                                type='simple'
                                // fontSize={'14px'}
                                // fontWeight={'500'}
                                // lineHeight={'20px'}
                            
                            />
                        </Flex>
                    </Flex>

                    <Flex direction={'column'} gap={'24px'} marginTop={'24px'}>
                        {schedulePosts.records.map(item => {
                            return (
                                <SchedulePostCard 
                                    feedItemData={item}
                                    setSchedulePosts={setSchedulePosts}
                                />
                            )
                        })}
                    </Flex>
                </Box>
            </Flex>

            <Flex flexDirection="column" gap={"16px"} borderRadius="4px" bg="var(--zencom-background)" p={"20px"} height="fit-content" width={{ base: "100%", md: "100%", lg: "30%" }} display={{ base: "none", md: "none", lg: "block" }}>
                <RecentActivities />
            </Flex>
        </Flex>
    )
}

export default ScheduledPosts;
