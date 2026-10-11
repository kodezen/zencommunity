import React, { useState } from 'react';
import { Flex, Text, AvatarGroup, Avatar, Button, Grid, useBreakpointValue, Image, Span, Box } from '@chakra-ui/react';
import { AiOutlineEyeInvisible, AiOutlineGlobal, AiOutlineLock } from 'react-icons/ai';
import { __ } from '@wordpress/i18n';
import { Link } from 'react-router-dom';
import { current_logged_user, getAvatarBg, getInitials, plugin_root_url, sliceString, show_cover_placeholder } from '@Utils/helper';
import { useSelector } from 'react-redux';
import { useStyles } from '@Utils/chakra';
import Subtext from '@Components/Labels/Subtext';

const ViewList = ({ group, handleJoinGroup }) => {
    const { primaryBtnInsideContent, primaryBtnInsideContentTrans } = useStyles();
    const group_permissions = useSelector(state => state.auth.group_permissions)
    const isShowButton = group ? group_permissions?.[parseInt(group.id)] : false;
    const [joinRequestPending, setJoinRequestPending] = useState(false);
    const loggedIn = current_logged_user?.user_id;

    const demoImg = plugin_root_url + "/assets/images/cover_placeholder.png"

    return (
        <Flex bg="var(--zencom-background)" borderRadius="sm" direction={'column'}>
            <Flex gap={6}>
                {group?.meta?.cover_img_url || show_cover_placeholder ? (
                    <Image
                        src={group?.meta?.cover_img_url ?? demoImg}
                        minWidth={{ base: "130px", md: "292px" }}
                        height="192px"
                        objectFit="cover"
                        alt={group?.name}
                        borderRadius="md"
                        className={!group?.meta?.cover_img_url ? 'zencom-cover-placeholder' : ''}
                    />
                ) : (
                    <Box minWidth={{ base: "130px", md: "292px" }} height="192px" borderRadius="md" background="var(--zencom-secondary-color)" />
                )}

                <Flex flexDirection="column" justifyContent="space-between" width="100%" p="12px 16px 12px 0">
                    <Flex justifyContent="space-between">
                        <span className='zencom-tags'>
                            {group?.privacy === "private" ? (
                                <AiOutlineLock />
                            ) : group?.privacy === "hidden" ? (
                                <AiOutlineEyeInvisible />
                            ) : group?.privacy === "public" ? (
                                <AiOutlineGlobal />
                            ) : null}
                            <span className='zencom-tags__label'>{group?.privacy}</span>
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

                    <Text fontSize="14px" fontWeight="400" lineHeight="24px" color="#738496">
                        {group?.description === "" ? "—" : sliceString(group?.description, 80, "...")}
                    </Text>

                    <Flex justifyContent="space-between" alignItems="center" mt={4} display={{ base: "none", lg: loggedIn ? "flex" : "none" }}>
                        <AvatarGroup gap="0" spaceX="-3" size="lg">
                            {group?.meta?.top_members?.length > 0 && group?.meta?.top_members.slice(0, 2).map((member, midx) => {
                                return (
                                    <Avatar.Root size="xs" bg="transparent">
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
                                )
                            })}

                            <Span pl="16px">
                                <Subtext>
                                    + {group?.member_count} {__('members', 'zencommunity')}
                                </Subtext>
                            </Span>
                        </AvatarGroup>

                        <Grid gap={2} templateColumns={!isShowButton ? "repeat(2, 1fr)" : "repeat(1, 1fr)"}>
                            <Link to={`/group/${group.id}`}>
                                <Button
                                    width={"100%"}
                                    {...primaryBtnInsideContentTrans}
                                >
                                    {__('View group', 'zencommunity')}
                                </Button>
                            </Link>
                            {!isShowButton && (
                                <Button
                                    width={"100%"}
                                    {...primaryBtnInsideContent}
                                    disabled={!group.meta?.anyone_can_send_join_request}
                                    onClick={async () => {
                                        try {
                                            setJoinRequestPending(true);
                                            await handleJoinGroup(parseInt(group.id));
                                        } catch (error) { } finally {
                                            setJoinRequestPending(false);
                                        }
                                    }}
                                    loading={joinRequestPending}
                                    spinnerPlacement="start"
                                >
                                    {__('Join group', 'zencommunity')}
                                </Button>
                            )}
                        </Grid>
                    </Flex>
                </Flex>
            </Flex>

            <Flex justifyContent="space-between" alignItems="flex-start" mt={4} display={{ base: "flex", lg: loggedIn ? "none" : "flex" }} padding={loggedIn ? "0 16px 16px 16px" : "0 16px 16px 16px"}>
                <AvatarGroup gap="0" spaceX="-3" size="lg">
                    {group?.meta?.top_members?.length > 0 && group?.meta?.top_members.slice(0, 2).map((member, midx) => {
                        return (
                            <Avatar.Root size="xs" bg="transparent">
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
                        )
                    })}

                    <Span pl="16px">
                        <Subtext>
                            + {group?.member_count} {__('members', 'zencommunity')}
                        </Subtext>
                    </Span>
                </AvatarGroup>

                <Grid gap={2} templateColumns={!isShowButton ? "repeat(2, 1fr)" : "repeat(1, 1fr)"}>
                    <Link to={`/group/${group.id}`}>
                        <Button
                            width={"100%"}
                            {...primaryBtnInsideContentTrans}
                        >
                            {__('View group', 'zencommunity')}
                        </Button>
                    </Link>
                    {!isShowButton && (
                        <Button
                            width={"100%"}
                            {...primaryBtnInsideContent}
                            disabled={!group.meta?.anyone_can_send_join_request}
                            onClick={async () => {
                                try {
                                    setJoinRequestPending(true);
                                    await handleJoinGroup(parseInt(group.id));
                                } catch (error) { } finally {
                                    setJoinRequestPending(false);
                                }
                            }}
                            loading={joinRequestPending}
                            spinnerPlacement="start"
                        >
                            {__('Join group', 'zencommunity')}
                        </Button>
                    )}
                </Grid>
            </Flex>
        </Flex>
    );
};

export default ViewList;
