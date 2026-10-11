import React, { useEffect, useState } from 'react';
import { GridItem, Image, Flex, Text, AvatarGroup, Avatar, Button, Grid, Skeleton, HStack, SkeletonCircle, Box, Span } from '@chakra-ui/react';
import { AiOutlineEyeInvisible, AiOutlineGlobal, AiOutlineLock } from 'react-icons/ai';
import { __ } from '@wordpress/i18n';
import { Link, useParams } from 'react-router-dom';
import { API, current_logged_user, getAvatarBg, getInitials, namespace, plugin_root_url, sliceString, show_cover_placeholder } from '@Utils/helper';
import NoDataPost from '@Components/NoDataPost';
import { useStyles } from '../../../utils/chakra';
import Subtext from '@Components/Labels/Subtext';

const Group = () => {
  const { id } = useParams();
  const userID = id ? id : current_logged_user?.user_id;
  const [groupsData, setGroupsData] = useState(false);
  const [loading, setLoading] = useState(true);
  const { primaryBtn } = useStyles();
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const { data: { records } } = await API.get(namespace + `/member/${userID}/groups`, {
          user_id: userID
        });
        setGroupsData(records);
      } catch (error) {
        console.error('Failed to fetch groups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [])

  return (
    <Grid mt="24px" templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={6} className="zencom-animate-fade" minH={'475px'} >
      {loading ? (
        <>
          {[1, 2, 3].map((_, idx) => (
            <GridItem key={idx} bg="var(--zencom-background)" borderRadius="4px" height="fit-content" minH={'475px'}>
              <Skeleton height="180px" borderRadius="4px 4px 0 0" />

              <Flex justifyContent="space-between" alignItems="center" p="16px 16px 0 16px">
                <Skeleton height="24px" width="60px" borderRadius="full" />
                <Skeleton height="24px" width="50px" borderRadius="full" />
              </Flex>

              <Flex flexDirection="column" gap={4} p={4}>
                <Skeleton height="20px" width="80%" />
                <Skeleton height="16px" width="100%" />

                <Flex alignItems="center">
                  <HStack spacing="-2">
                    <SkeletonCircle size="8" />
                    <SkeletonCircle size="8" />
                    <SkeletonCircle size="8" />
                  </HStack>
                  <Skeleton height="16px" width="40px" ml="4" />
                </Flex>

                <Grid gap={2} templateColumns="repeat(2, 1fr)">
                  <Skeleton height="32px" />
                  <Skeleton height="32px" />
                </Grid>
              </Flex>
            </GridItem>
          ))}
        </>
      ) : (
        <>
          {groupsData?.length > 0 ? (
            <>
              {groupsData.map((group, idx) => (
                <GridItem key={idx} bg="var(--zencom-background)" borderRadius="4px" className='zencom-group-card' height="fit-content">
                  {group?.featured_img || show_cover_placeholder ? (
                    <Image
                      src={group?.featured_img ?? plugin_root_url + "/assets/images/cover_placeholder.png"}
                      width={"full"}
                      height="185px"
                      alt={group?.name}
                      borderRadius="4px 4px 0 0"
                      objectFit="cover"
                      className={!group?.featured_img ? 'zencom-cover-placeholder' : ''}
                    />
                  ) : (
                    <Box width="full" height="185px" borderRadius="4px 4px 0 0" background="var(--zencom-secondary-color)" />
                  )}

                  <Flex flexDirection="column" p="16px" className='zencom-group-card__inner'>
                    <Flex justifyContent="space-between" width="100%" mb={4}>
                      <span className='zencom-tags'>
                        {group?.privacy === "private" ? (
                          <AiOutlineLock />
                        ) : group?.privacy === "hidden" ? (
                          <AiOutlineEyeInvisible />
                        ) : (
                          <AiOutlineGlobal />
                        )}
                        <span className='zencom-tags__label'>{group?.privacy ?? __('Public', 'zencommunity')}</span>
                      </span>

                      {group?.member_role && (
                        <span className='zencom-tags'><span className='zencom-tags__label'>{__(group?.member_role, 'zencommunity')}</span></span>
                      )}
                    </Flex>

                    <Link to={`/group/${group.id}`} style={{ width: "100%" }}>
                      <Button
                        padding={0}
                        border={"none"}
                        outline={"none"}
                        bg={"transparent"}
                        minWidth="auto"
                        color="var(--zencom-font-color)"
                        fontSize="18px"
                        fontWeight="600"
                        lineHeight="28px"
                        width="100%"
                        title={group?.name}
                        css={{ "& span": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", width: "100%" } }}
                      >
                        <span>{group?.name}</span>
                      </Button>
                    </Link>

                    <Span minH="69px" mt={1}>
                      <Subtext>
                        {group?.description ? sliceString(group?.description, 100, "...") : __('No description found', 'zencommunity')}
                      </Subtext>
                    </Span>

                    <AvatarGroup gap="0" spaceX="-3" size="lg" m="16px 0">
                      {group?.meta?.top_members?.length > 0 && group?.meta?.top_members.slice(0, 2).map((member, midx) => (
                        <Avatar.Root key={midx} size="xs" bg="transparent">
                          <Avatar.Fallback
                            bg={getAvatarBg(member?.first_name + " " + member?.last_name)}
                            color="white"
                            display='flex'
                            alignItems='center'
                            justifyContent='center'
                            width='100%'
                            height='100%'
                          >
                            {getInitials(member?.first_name + " " + member?.last_name)}
                          </Avatar.Fallback>
                          <Avatar.Image src={member?.avatar_url ? plugin_root_url + member?.avatar_url : ""} />
                        </Avatar.Root>
                      ))}

                      <Span pl={group?.member_count > 0 ? "16px" : "0"} lineHeight="32px">
                          <Subtext>
                            {group?.member_count > 0 ? (
                              <>+ {group?.member_count} {__('members', 'zencommunity')}</>
                            ) : (
                              <>{__('N/A', 'zencommunity')} {__('members', 'zencommunity')}</>
                            )}
                          </Subtext>
                      </Span>
                    </AvatarGroup>

                    <Grid gap={2} templateColumns="repeat(1, 1fr)">
                      <Link to={`/group/${group.id}`}>
                        <Button width={"100%"} {...primaryBtn}>
                          {__('View group', 'zencommunity')}
                        </Button>
                      </Link>
                    </Grid>
                  </Flex>
                </GridItem>
              ))}
            </>
          ) : (
            <Box gridColumn="1 / -1" color="var(--zencom-font-color)">
              <NoDataPost
                title={__("No Groups Found!", 'zencommunity')}
                subTitle={__("Add new group to show!", 'zencommunity')}
              />
            </Box>
          )
          }
        </>
      )}
    </Grid>
  );
};

export default Group;
