import { LuColumns2 } from 'react-icons/lu';
import React, { useEffect, useState } from 'react';
import {
  Box,
  Flex,
  Button,
  Grid,
  Icon,
  HStack,
  Image,
  GridItem,
  Skeleton,
  useBreakpointValue,
} from '@chakra-ui/react';
import { LuLayoutList } from "react-icons/lu";
import { __ } from '@wordpress/i18n';
import ViewGrid from './ViewGrid';
import ViewList from './ViewList';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllGroups, joinGroup } from '@Redux/slices/groupSlice/groupSlice';
import { groupPermissions } from '@Redux/slices/authSlice/authSlice';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import Select from '@Components/ReactSelect';
import { API, namespace, plugin_root_url, theme_settings, current_logged_user } from '@Utils/helper';
import ZenComSearch from '@Components/Chakra/Search';
import { useStyles } from '../../utils/chakra';
import classNames from 'classnames';
import Subtext from '@Components/Labels/Subtext';
import LeftContainer from '@Components/Layouts/LeftContainer';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';
import CenterContainer from '@Components/Layouts/CenterContainer';

const options = [
  { label: "Active", value: "active" },
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Date", value: "date" },
];

const Group = () => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { responsiveContent3 } = useStyles();
  const [viewMode, setViewMode] = useState(() =>
    localStorage.getItem('group-view') || 'grid'
  );

  const { data: groupData } = useSelector(state => state.groups);
  const group_permissions = useSelector(state => state.auth.group_permissions);
  const [searchText, setSearchText] = useState("");
  const [allGroups, setAllGroups] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loader, setLoader] = useState(groupData.length === 0);
  const dispatch = useDispatch();

  useEffect(() => {
    if (isMobile) {
      setViewMode('grid');
      localStorage.setItem('group-view', 'grid');
    }
  }, [isMobile]);

  useEffect(() => {
    setLoader(true);
    dispatch(fetchAllGroups()).then(() => setLoader(false));
  }, [dispatch]);

  // Per-card join/joined state (ViewGrid/ViewList) reads group_permissions,
  // which the SPA <Layout> bootstraps. In Gutenberg (FSE) render mode the
  // content-outlet (and standalone groups-view block) mounts without <Layout>,
  // so fetch it here too. No-op in SPA where Layout already loaded it.
  useEffect(() => {
    if (current_logged_user && !group_permissions) {
      dispatch(groupPermissions());
    }
  }, [group_permissions, dispatch]);

  const handleJoinGroup = async (id) => {
    return await dispatch(joinGroup(id)).then(res => {
      if (res.payload.success) dispatch(fetchAllGroups());
    });
  };

  const handleSearch = async (searchKey) => {
    setSearchText(searchKey);

    if (!searchKey) {
      setAllGroups([]);
      return;
    }

    setSearching(true);

    try {
      setLoader(true);
      const response = await API.get(
        `${namespace}/groups?search=${encodeURIComponent(searchKey)}`
      );
      setAllGroups(response.data.records || []);
    } catch (error) {
      console.error("Group search failed", error);
    } finally {
      setSearching(false);
      setLoader(false);
    }
  };

  const isThemeDark = theme_settings?.theme_mode === "dark";

  return (
    <>
      <LeftContainer>
          <LeftSidebar />
      </LeftContainer>

      <CenterContainer>
        <Box p={6} {...responsiveContent3}>
          <Flex align="center" justify="space-between" width="100%">
            <Flex align="center" justify="space-between" width="100%">
              <ZCLabel type='heading' label={__('Group', 'zencommunity')} />

              <Flex alignItems="center" gap={3}>
                <ZenComSearch
                  value={searchText}
                  changeHandler={(e) => handleSearch(e.target.value)}
                  display={{ base: 'none', md: 'block' }}
                  width="260px"
                />
              </Flex>
            </Flex>
          </Flex>

          <ZenComSearch
            value={searchText}
            changeHandler={(e) => handleSearch(e.target.value)}
            display={{ base: 'block', md: 'none' }}
            margin="12px 0 0 0"
          />

          <Flex mt={4} mb="2rem" justifyContent="space-between">
            <HStack gap={2}>
              <Subtext fontSize="16px">
                  {__('Filter by', 'zencommunity')}
              </Subtext>
              <Select
                className="zen-com-select zen-com-select--150"
                classNamePrefix="zen-com-select"
                options={options}
                onChange={(option) => {
                  // 
                }}
              />
            </HStack>

            <Flex gap={2} display={{ base: 'none', md: 'flex' }}>
              <button
                type='button'
                onClick={() => {
                  setViewMode('grid');
                  localStorage.setItem('group-view', 'grid');
                }}
                className={classNames(
                  "zencom-top-menu",
                  `zencom-top-menu--${isThemeDark ? "dark" : "light"}`,
                  { "zencom-top-menu--active": viewMode === "grid" }
                )}
              >
                <Icon as={LuColumns2} color="var(--zencom-font-color)" />
              </button>

              <button
                type='button'
                onClick={() => {
                  setViewMode('list');
                  localStorage.setItem('group-view', 'list');
                }}
                className={classNames(
                  "zencom-top-menu",
                  `zencom-top-menu--${isThemeDark ? "dark" : "light"}`,
                  { "zencom-top-menu--active": viewMode === "list" }
                )}
              >
                <Icon as={LuLayoutList} color="var(--zencom-font-color)" />
              </button>
            </Flex>
          </Flex>

          {loader ? (
            <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={6}>
              {[1, 2, 3].map((i) => (
                <GridItem
                  key={i}
                  bg="var(--zencom-background)"
                  borderRadius="4px"
                  overflow="hidden"
                >
                  <Skeleton height="185px" />
                  <Flex justifyContent="space-between" p="16px 16px 0 16px">
                    <Skeleton height="24px" width="80px" />
                    <Skeleton height="24px" width="60px" />
                  </Flex>
                  <Flex direction="column" gap={4} p={4}>
                    <Skeleton height="20px" width="70%" />
                    <Skeleton height="16px" width="90%" />
                    <Skeleton height="16px" width="60%" />
                    <Flex ml="52px" gap="8px">
                      <Skeleton circle height="24px" width="24px" />
                      <Skeleton height="16px" width="80px" />
                    </Flex>
                    <Grid gap={2} templateColumns="repeat(2, 1fr)">
                      <Skeleton height="36px" />
                      <Skeleton height="36px" />
                    </Grid>
                  </Flex>
                </GridItem>
              ))}
            </Grid>
          ) : (
            <>
              {(searchText ? allGroups.length === 0 : groupData.length === 0) ? (
                <Flex direction="column" align="center" justify="center" height="60vh" gap={4}>
                  <Image src={plugin_root_url + "/assets/images/nothingFound.svg"} />
                  <ZCLabel
                    type='simple'
                    fontSize='20px'
                    fontWeight='600'
                    label={__('No groups right now', 'zencommunity')}
                  />
                  <ZCLabel
                    type='simple'
                    fontSize='14px'
                    label={__('Currently, there are no groups available. Check back later.', 'zencommunity')}
                  />
                </Flex>
              ) : (
                <>
                  {(isMobile || viewMode === 'grid') ? (
                    <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={6}>
                      {(searchText ? allGroups : groupData).map(group => (
                        <ViewGrid
                          key={group.id}
                          group={group}
                          handleJoinGroup={handleJoinGroup}
                        />
                      ))}
                    </Grid>
                  ) : (
                    <Flex direction="column" gap={6}>
                      {(searchText ? allGroups : groupData).map(group => (
                        <ViewList
                          key={group.id}
                          group={group}
                          handleJoinGroup={handleJoinGroup}
                        />
                      ))}
                    </Flex>
                  )}
                </>
              )}
            </>
          )}
        </Box>
      </CenterContainer>
    </>
  );
};

export default Group;
