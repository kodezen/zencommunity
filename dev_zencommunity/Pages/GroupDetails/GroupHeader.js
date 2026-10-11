import React, { useState } from 'react';
import { Box, Flex, Avatar, Button, Icon } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { AiOutlineEyeInvisible, AiOutlineGlobal, AiOutlineLock } from 'react-icons/ai';
import { site_url, capitalizeFirstLetter, baseURL, getAvatarBg, getInitials } from '@Utils/helper';
import { LuImagePlus } from 'react-icons/lu';
import { FiShare, FiUsers } from 'react-icons/fi';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import GroupInvite from './GroupInvite';
import GroupUserConditions from './GroupUserConditions';
import ZenComShare from '@Components/ZenComShare';
import Tooltip from '@Components/Tooltip';
import { useStyles } from '../../utils/chakra';

const GroupHeader = ({
    id,
    groupData,
    isAdmin,
    isUserExistsInGroup,
    handleImageChange,
    handleJoinGroup,
    handleLeaveGroup,
    handleDeleteGroup,
    setInviteModal,
    profile,
    isShareOpen,
    setIsShareOpen,
}) => {
    const { primaryBtnInsideContent, primaryBtnInsideContentTrans } = useStyles();
    return (
        <>
            <Avatar.Root
                width={"100px"}
                height={"100px"}
                position="absolute"
                top={"250px"}
                left={"20px"}
                bg={"var(--zencom-background)"}
                borderRadius="full"
                boxShadow={"md"}
            >
                <Avatar.Fallback
                    bg={getAvatarBg(groupData?.name)}
                    color="white"
                    display='flex'
                    alignItems='center'
                    justifyContent='center'
                    width='100%'
                    height='100%'
                    fontSize='40px'
                    fontWeight='700'
                >
                    {getInitials(groupData?.name)}
                </Avatar.Fallback>
                <Avatar.Image
                    src={groupData?.featured_img ? site_url + groupData?.featured_img : ""}
                    border={0}
                    borderStyle={"solid"}
                    borderColor={"var(--zencom-border-color)"}
                    rounded={"full"}
                />

                {isAdmin && (
                    <Box
                        w="fit-content"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        bg={"var(--zencom-background)"}
                        borderRadius="100%"
                        padding={"5px"}
                        position="absolute"
                        bottom="0px"
                        right="-10px"
                    >
                        <Button
                            size="xs"
                            {...primaryBtnInsideContent}
                            borderRadius="100%"
                            padding={"5px"}
                            onClick={() => document.getElementById('group-profile-upload').click()}
                        >
                            <LuImagePlus />
                        </Button>

                        <input
                            id="group-profile-upload"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleImageChange(e, 'group_featured')}
                        />
                    </Box>
                )}
            </Avatar.Root>

            <Flex justify={"space-between"} padding="16px 24px" direction={{ base: "column", md: "row" }} rowGap={{ base: 4, md: 0 }}>
                <Flex direction={"column"} gap={2} marginTop="16px">
                    <Tooltip
                        openerContent={
                            <ZCLabel label={groupData?.name} type="heading" truncate maxWidth={{ base: "220px", md: "360px" }} />
                        }
                        one
                        placement="top-center"
                        arrow="center"
                        contentWidth="fit-content"
                    >
                        {groupData?.name}
                    </Tooltip>

                    <Flex gap="6px" alignItems="center">
                        {groupData?.privacy === "private" ? (
                            <Icon size="sm" as={AiOutlineLock} color="var(--zencom-font-color)" />
                        ) : groupData?.privacy === "hidden" ? (
                            <Icon size="sm" as={AiOutlineEyeInvisible} color="var(--zencom-font-color)" />
                        ) : groupData?.privacy === "public" ? (
                            <Icon size="sm" as={AiOutlineGlobal} color="var(--zencom-font-color)" />
                        ) : null}

                        <ZCLabel
                            label={__(`${capitalizeFirstLetter(groupData?.privacy)} Group`, "zencommunity")}
                            type='simple'
                        />
                        <ZCLabel label="•" type='simple' />
                        <ZCLabel
                            label={__(`${groupData?.member_count} Members`, "zencommunity")}
                            type='simple'
                        />
                    </Flex>
                </Flex>

                <Flex alignItems="center" gap="8px">
                    <Flex gap={3}>
                        {!isUserExistsInGroup ? (
                            <>
                                <Button
                                    {...primaryBtnInsideContent}
                                    disabled={!groupData.meta?.anyone_can_send_join_request}
                                    onClick={handleJoinGroup}
                                >
                                    <Icon as={FiUsers} size="sm" /> {__('Join group', 'zencommunity')}
                                </Button>

                                <Button
                                    {...primaryBtnInsideContentTrans}
                                    onClick={() => setIsShareOpen(!isShareOpen)}
                                >
                                    <Icon as={FiShare} size="sm" /> {__('Share', 'zencommunity')}
                                </Button>
                            </>
                        ) : (
                            <GroupInvite setInviteModal={setInviteModal} />
                        )}

                        {(isUserExistsInGroup || isAdmin) && (
                            <GroupUserConditions
                                id={id}
                                isAdmin={isAdmin}
                                handleLeaveGroup={handleLeaveGroup}
                                isShareOpen={isShareOpen} setIsShareOpen={setIsShareOpen}
                                isUserExistsInGroup={isUserExistsInGroup}
                                handleDeleteGroup={handleDeleteGroup}
                            // handleNotificationToggle={handleNotificationToggle}
                            />
                        )}
                    </Flex>
                </Flex>

                {isShareOpen && (
                    <ZenComShare sharableLink={baseURL(`/group/${id}`)} isShareOpen={isShareOpen} setIsShareOpen={setIsShareOpen} />
                )}
            </Flex>
        </>
    );
};

export default GroupHeader;
