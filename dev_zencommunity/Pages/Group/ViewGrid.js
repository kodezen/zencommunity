import React, { useState } from 'react';
import { GridItem, Image, Flex, Text, AvatarGroup, Avatar, Button, Grid, Span, Box } from '@chakra-ui/react';
import { AiOutlineEyeInvisible, AiOutlineGlobal, AiOutlineLock } from 'react-icons/ai';
import { __ } from '@wordpress/i18n';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getAvatarBg, getInitials, plugin_root_url, show_cover_placeholder } from '@Utils/helper';
import { joinGroup } from '@Redux/slices/groupSlice/groupSlice';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { useStyles } from '../../utils/chakra';
import Subtext from '@Components/Labels/Subtext';

const ViewGrid = ({ group, handleJoinGroup }) => {
    const { primaryBtnInsideContent, primaryBtnInsideContentTrans } = useStyles();
    const group_permissions = useSelector(state => state.auth.group_permissions)
    const isShowButton = group ? group_permissions?.[parseInt(group.id)] : false;
    const demoImg = plugin_root_url + "/assets/images/cover_placeholder.png";
    const [joinRequestPending, setJoinRequestPending] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const dispatch = useDispatch();

    const handleRequestToJoin = async () => {
        try {
            dispatch(joinGroup(parseInt(group.id))).then(res => {
                if (res.payload.success) {
                    dispatch(showNotification({
                        message: __('Request sent', 'zencommunity'),
                        isShow: true,
                        type: 'success',
                    }));
                }
            });
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <GridItem bg="var(--zencom-background)" borderRadius="4px" className='zencom-group-card' height="fit-content">
            {group?.meta?.cover_img_url || show_cover_placeholder ? (
                <Image
                    src={group?.meta?.cover_img_url ?? demoImg}
                    width={"full"}
                    height="185px"
                    alt={group?.name}
                    borderRadius="4px 4px 0 0"
                    className={!group?.meta?.cover_img_url ? 'zencom-cover-placeholder' : ''}
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
                        ) : group?.privacy === "public" ? (
                            <AiOutlineGlobal />
                        ) : null}
                        <span className='zencom-tags__label'>{group?.privacy}</span>
                    </span>

                    {group?.member_role && (
                        <span className='zencom-tags'><span className='zencom-tags__label'>{__(group?.member_role, 'zencommunity')}</span></span>
                    )}
                </Flex>

                {group?.privacy === "private" ? (
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
                        display="flex"
                        justifyContent="flex-start"
                        width="100%"
                        title={group?.name}
                        css={{ "& span": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", width: "100%" } }}
                    >
                        <span>{group?.name}</span>
                    </Button>
                ) : (
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
                )}

                {group?.description?.length === 0 ? (
                    <Span minH="69px" mt={1}>
                        <Subtext>
                            {__('No description found', 'zencommunity')}
                        </Subtext>
                    </Span>
                ) : group?.description?.length > 78 && !showMore ? (
                    <Flex flexDirection={'column'} alignItems={'flex-start'} gap='4px' p="0px 0" mt={1} marginBottom={'35px'}>
                        <Text 
                            fontSize="14px" 
                            fontWeight="400" 
                            lineHeight="24px" 
                            color="#738496"
                            whiteSpace={' nowrap'}
                            overflow={"hidden"}
                            textOverflow={"ellipsis"}
                            width={"100%"}
                        >
                            {group?.description}
                        </Text>
                        <Button
                            minW="fit-content"
                            p="0"
                            variant="plain"
                            m="8px 0 0 0"
                            height={0}
                            width={0}
                            color="var(--zencom-primary-color)"
                            onClick={() => setShowMore(true)}
                        >
                            {__('See more', 'zencommunity')}
                        </Button>
                    </Flex>
                ) : (
                    <Flex  flexDirection={'column'} alignItems={'flex-start'} p="0px 0" mt={1}>
                        <Text fontSize="14px" fontWeight="400" lineHeight="24px" color="#738496">
                            {group?.description}
                        </Text>
                        {group?.description?.length > 80 && (
                            <Button
                                minW="fit-content"
                                height="auto"
                                p="0"
                                variant="plain"
                                m="8px 0 0 0"
                                color="var(--zencom-primary-color)"
                                onClick={() => setShowMore(false)}
                            >
                                {__('See less', 'zencommunity')}
                            </Button>
                        )}
                    </Flex>
                )}

                <AvatarGroup gap="0" spaceX="-3" size="lg" m="16px 0">
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

                    <Span pl={group?.member_count > 0 ? "20px" : "0"} whiteSpace="nowrap" lineHeight="32px">
                        <Subtext>
                            {group?.member_count > 0 ? (
                                <>+ {group?.member_count} {__('members', 'zencommunity')}</>
                            ) : (
                                <>
                                    {__('N/A', 'zencommunity')} {__('members', 'zencommunity')}
                                </>
                            )}
                        </Subtext>
                    </Span>
                </AvatarGroup>

                {group?.privacy === "private" && !isShowButton ? (
                    <Link to={`/group/${group.id}`}>
                        <Button
                            {...primaryBtnInsideContentTrans}
                            width="100%"
                            spinnerPlacement="start"
                            onclick={handleRequestToJoin}
                        >
                            {__('Join group', 'zencommunity')}
                        </Button>
                    </Link>
                ) : (
                    <Grid gap={2} templateColumns={!isShowButton ? "repeat(2, 1fr)" : "repeat(1, 1fr)"}>
                        <Link to={`/group/${group.id}`}>
                            <Button
                                {...primaryBtnInsideContentTrans}
                                width={"100%"}
                            >
                                {__('View group', 'zencommunity')}
                            </Button>
                        </Link>

                        {!isShowButton && (
                            <Button
                                {...primaryBtnInsideContent}
                                width={"100%"}
                                disabled={!group.meta?.anyone_can_send_join_request}
                                onClick={async () => {
                                    try {
                                        setJoinRequestPending(true);
                                        const response = await handleJoinGroup(parseInt(group.id));
                                        setJoinRequestPending(false);
                                    } catch (error) { } finally {
                                    }
                                }}
                                loading={joinRequestPending}
                                spinnerPlacement="start"
                            >
                                {__('Join group', 'zencommunity')}
                            </Button>
                        )}
                    </Grid>
                )}
            </Flex>
        </GridItem>
    );
};

export default ViewGrid;
