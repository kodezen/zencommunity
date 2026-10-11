import React, { useState } from 'react';
import { Box, Flex, Separator } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import Select from '@Components/ReactSelect';
import Posts from '@Components/Posts';
import Members from './Members';
import About from './About';
import RecentActivities from './RecentActivities';
import GroupStatsBanner from './GroupStatsBanner';
import { useDispatch, useSelector } from 'react-redux';
import { current_logged_user, feed_default_sort_by, getAddonActiveStatus, sortingListArray } from '@Utils/helper';
import { groupDataSortBy } from './helper';

const defaultSortBy = sortingListArray.includes(feed_default_sort_by) ? feed_default_sort_by : "created_at";

const Discussion = ({
    isMobile,
    id,
    groupData,
    renderInfiniteLoaderContent,
    groupActivities,
    hasPermission,
    isAdmin,
    canPostAsTeam,
    onSubmitHandler,
    isNotLoggedAndGust,
    handleTabNavigation,
    sortHandler,
    featuredCount = 0,
    pendingCount = 0,
    eventCount = 0,
}) => {
    
  const activeAddons = useSelector(state => state?.addons?.activeAddons);
  const showFollow = getAddonActiveStatus(activeAddons, "FollowerAndBlocker") && !!current_logged_user;

 const baseSortOptions = showFollow
  ? [
      ...groupDataSortBy,
      { label: __("From Followings", 'zencommunity'), value: "from_followers" },
    ]
  : groupDataSortBy;

    const dispatch = useDispatch();
    const [selectedOrderby, setSelectedOrderby] = useState(feed_default_sort_by || "created_at");
    return (
        <Flex gap={"20px"} className="zencom-animate-fade">
            <Flex width={{ base: "100%", md: "100%", lg: "70%" }} direction={"column"} gap={"20px"}>
                {(hasPermission || isAdmin) && (<Posts onSubmitHandler={onSubmitHandler} groupID={id} isGroupDisabled={true} allowAnonymous={!!groupData?.meta?.allow_anonymous_feed} canPostAsTeam={canPostAsTeam} />)}

                {isAdmin && (featuredCount > 0 || pendingCount > 0 || eventCount > 0) && (
                    <GroupStatsBanner
                        featuredCount={featuredCount}
                        pendingCount={pendingCount}
                        eventCount={eventCount}
                        onNavigate={handleTabNavigation}
                    />
                )}

                <Box display={"flex"} justifyContent={"space-between"} alignItems={"center"} gap="16px">
                    <Separator size={"md"} my={4} flex="1" borderColor="var(--zencom-border-color)" />
                    <Select
                        options={baseSortOptions}
                        placeholder={__('Sort by', 'zencommunity')}
                        className="zen-com-select zen-com-select--180"
                        classNamePrefix="zen-com-select"
                        value={baseSortOptions.find(item => item.value === selectedOrderby)}
                        onChange={option => {
                            if (!option) {
                                setSelectedOrderby('created_at');
                                sortHandler('created_at', false);
                                return;
                            }

                            if (option.value === 'from_followers') {
                                setSelectedOrderby('created_at');
                                sortHandler('created_at', true);
                            } else {
                                setSelectedOrderby(option.value);
                                sortHandler(option.value, false);
                            }
                        }}
                    />
                </Box>
                {renderInfiniteLoaderContent()}
            </Flex>

            <Box width={"30%"} display={{ base: "none", md: "none", lg: "block" }}>
                {!isNotLoggedAndGust && <Members isAdmin={isAdmin} isMobile={isMobile} handleTabNavigation={handleTabNavigation} groupID={id} />}
                <About groupData={groupData} />
                {!isNotLoggedAndGust && <RecentActivities groupActivities={groupActivities} />}
            </Box>
        </Flex>
    );
};

export default Discussion;
