import React from 'react';
import { Box, Flex, Image, Button, Avatar, Icon, Separator } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { site_url, plugin_root_url, capitalizeFirstLetter, baseURL, current_user_can, show_cover_placeholder } from '@Utils/helper';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { AiOutlineLock } from 'react-icons/ai';
import ZenComShare from '@Components/ZenComShare';
import { FiShare, FiUsers } from 'react-icons/fi';
import { personJoined } from '../../../assets/staticIcons';
import { IoChevronBack } from 'react-icons/io5';
import NoDataPost from '@Components/NoDataPost';

const PrivateGroupRequestView = ({
    id,
    handleJoinGroup,
    groupData,
    requestStatus,
    navigate,
    cover,
    profile,
    isShareOpen,
    setIsShareOpen,
}) => {
    return (
        <>
            <Flex p={6}  direction="column" gap={10}>
                <Box bg="var(--zencom-background)" position="relative">
                    {(groupData?.meta?.cover_img_url || show_cover_placeholder) ? (
                        <Image
                            src={groupData?.meta?.cover_img_url ? site_url + groupData?.meta?.cover_img_url : cover}
                            alt={__("Group Cover", "zencommunity")}
                            borderRadius="md"
                            h="200px"
                            w="100%"
                            objectFit="cover"
                            mb={4}
                            className={!groupData?.meta?.cover_img_url ? 'zencom-cover-placeholder' : ''}
                        />
                    ) : (
                        <Box borderRadius="md" h="200px" w="100%" mb={4} background="var(--zencom-secondary-color)" />
                    )}

                    <Avatar.Root
                        width={"100px"}
                        height={"100px"}
                        position="absolute"
                        top={"136px"}
                        left={"20px"}
                        bg={"var(--zencom-background)"}
                        borderRadius="full"
                        boxShadow={"md"}
                    >
                        <Avatar.Fallback />
                        <Avatar.Image
                            src={groupData?.featured_img ? site_url + groupData?.featured_img : profile}
                            border={0}
                            borderStyle={"solid"}
                            borderColor={"#E0E4E8"}
                            rounded={"full"}
                        />
                    </Avatar.Root>

                    <Flex justify={"space-between"} padding="16px 24px">
                        <Flex direction={"column"} gap={2} marginTop="16px">
                            <ZCLabel
                                type='heading'
                                label={groupData?.name || __("Private Group", "zencommunity")}
                                mb={2}
                            />

                            <Flex gap="6px" alignItems="center">
                                {groupData?.privacy === "private" ? (
                                    <Icon size="sm" as={AiOutlineLock} color="var(--zencom-gray-color)" />
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

                        <Flex gap={2}>
                            {(requestStatus === "pending" || groupData?.member_status === 'pending') ? (
                                <Box>
                                    <Button
                                        size="sm"
                                        bg="var(--zencom-primary-color)"
                                        color="white"
                                        disabled
                                        cursor="not-allowed"
                                        opacity={0.6}
                                        _hover={{ bg: "var(--zencom-primary-color)" }}
                                    >
                                        <Icon as={personJoined} size="sm" />  {__('Request Sent', 'zencommunity')}
                                    </Button>
                                </Box>
                            ) : (
                                <Button
                                    size="sm"
                                    bg="var(--zencom-primary-color)"
                                    color="white"
                                    onClick={handleJoinGroup}
                                    loadingText={__('Sending Request...', 'zencommunity')}
                                    _hover={{
                                        bg: "var(--zencom-primary-color)",
                                        opacity: 0.9
                                    }}
                                >
                                    <Icon as={FiUsers} size="sm" /> {__('Request to Join', 'zencommunity')}
                                </Button>
                            )}

                            <Button
                                size="sm"
                                background="transparent"
                                border="1px solid var(--zencom-border-color)"
                                color="var(--zencom-font-color)"
                                onClick={() => setIsShareOpen(!isShareOpen)}
                            >
                                <Icon as={FiShare} size="sm" /> {__('Share', 'zencommunity')}
                            </Button>
                        </Flex>
                    </Flex>
                </Box>

                <Flex direction="row" justifyContent="space-between" gap={"20px"}>
                    <Box
                        borderRadius="md"
                        bg="var(--zencom-background)"
                        width={{ base: "100%", md: "100%", lg: "70%" }}
                    >
                        <Flex alignItems="center" justifyContent="center" gap={4} direction="column" height="60vh">
                            <Image src={plugin_root_url + "/assets/images/privateGroup.svg"} />
                            <ZCLabel type='simple' fontSize='20px' fontWeight='600' lineHeight="30px" color='var(--zencom-font-color)' label={__('This group is private', 'zencommunity')} />
                            <ZCLabel type='simple' fontSize='14px' fontWeight='400' lineHeight="20px" textAlign='center' color='var(--zencom-font-color)' label={
                                <>
                                    {__('Join this group to view', 'zencommunity')} < br /> {__(' or discussions.', 'zencommunity')}
                                </>
                            } />

                            <Button
                                size="sm"
                                bg="var(--zencom-primary-color)"
                                color="white"
                                mt={3}
                                onClick={() => navigate('/groups')}
                            >
                                <Icon as={IoChevronBack} size="sm" />  {__('Back to Groups', 'zencommunity')}
                            </Button>
                        </Flex>
                    </Box>

                    <Box borderRadius="6px" bg="var(--zencom-background)" mb={4} width={"30%"} display={{ base: "none", md: "none", lg: "block" }} height="fit-content">
                        <ZCLabel
                            fontSize='18px'
                            color='var(--zencom-font-color)'
                            fontWeight='500'
                            padding="12px 16px"
                            label={__('About', 'zencommunity')}
                        />

                        <Separator w={"100%"} borderColor="var(--zencom-border-color)" />

                        {groupData?.description ? (
                            <ZCLabel
                                fontSize='14px'
                                color='var(--zencom-font-color)'
                                fontWeight='400'
                                padding="16px"
                                label={groupData?.description}
                                enableSlice={true}
                                textAlign='justify'
                                sliceLength="90"
                                lineHeight="24px"
                            />
                        ) : (
                            <NoDataPost
                                title={__('No details found!', 'zencommunity')}
                                subTitle={current_user_can?.manage_options ? __('Please add Group description.', 'zencommunity') : ''}
                                subTitleWrap="nowrap"
                            />
                        )}

                        <Flex alignItems="flex-start" gap={2} p="0 16px 16px 16px">
                            {groupData?.privacy === "private" ? (
                                <Icon size="md" as={AiOutlineLock} color="var(--zencom-gray-color)" />
                            ) : groupData?.privacy === "hidden" ? (
                                <Icon size="md" as={AiOutlineEyeInvisible} color="var(--zencom-gray-color)" />
                            ) : groupData?.privacy === "public" ? (
                                <Icon size="md" as={AiOutlineGlobal} color="var(--zencom-gray-color)" />
                            ) : null}

                            <Flex direction="column" gap={1}>
                                <ZCLabel
                                    label={__(`${capitalizeFirstLetter(groupData?.privacy)}`, "zencommunity")}
                                    type='bold'
                                />

                                {groupData?.privacy === "public" ? (
                                    <ZCLabel
                                        label={__(`Anyone can see who's in the group and what they post.`, "zencommunity")}
                                        type='simple'
                                    />
                                ) : (
                                    <ZCLabel
                                        label={__(`Only members can see who's in the group and what they post.`, "zencommunity")}
                                        type='simple'
                                    />
                                )}
                            </Flex>
                        </Flex>
                    </Box>
                </Flex>
            </Flex>

            {isShareOpen && (
                <ZenComShare sharableLink={baseURL(`/group/${id}`)} isShareOpen={isShareOpen} setIsShareOpen={setIsShareOpen} />
            )}
        </>
    )
}

export default PrivateGroupRequestView;
