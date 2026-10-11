import React, { useState } from 'react';
import { Box, Flex, Separator, Button, Icon } from '@chakra-ui/react';
import { FaFacebook, FaInstagram, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { FaXTwitter } from "react-icons/fa6";
import { __, sprintf } from '@wordpress/i18n';
import EditAbout from './EditAbout';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import NoDataPost from '@Components/NoDataPost';
import { GoPerson, GoPlus } from 'react-icons/go';
import { edit } from '../../../../../assets/staticIcons';
import { useLocation, useParams } from 'react-router-dom';
import { current_logged_user } from '@Utils/helper';
import { useStyles } from '@Utils/chakra';
import Subtext from '@Components/Labels/Subtext';

const About = ({ RecentActivities, profileData, setProfileData, activeSections }) => {
    const { id } = useParams();
    const location = useLocation();
    const {state} = location;
    const isCurrentUser = id ? Number(id) === Number(current_logged_user?.user_id) : true   ;
    const [isEdit, setIsEdit] = useState(false);
    const hasDetails = !!profileData?.bio || !!profileData?.first_name || !!profileData?.last_name;
    const socialLinks = profileData?.meta?.social_links || {};
    const hasSocialLinks = Object.values(socialLinks).some(link => !!link);
    const { primaryBtnInsideContent, primaryBtnInsideContentTrans } = useStyles();

    const isProfile = ({label, btnLabel}) => {
        return (
            <Flex width="100%" justifyContent="space-between" alignItems="center" background="var(--zencom-background)">
                <ZCLabel
                    label={label}
                    fontWeight="700"
                    fontSize="18px"
                    color='var(--zencom-font-color)'
                />
                {hasDetails || hasSocialLinks ? (
                    <Icon onClick={() => setIsEdit(true)} cursor="pointer">
                        {edit()}
                    </Icon>
                ) : (
                    <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => setIsEdit(true)}
                    >
                        {btnLabel}
                    </Button>
                )}
            </Flex>
        )
    };

    return (
        <>
            {isEdit ? (
                <EditAbout
                    profileData={profileData}
                    setIsEdit={setIsEdit}
                    setProfileData={setProfileData}
                />
            ) : (
                <Flex gap={"20px"} className="zencom-animate-fade">
                    <Flex width={{ base: "100%", md: "100%", lg: "70%" }} direction={"column"} gap={"20px"}>
                        {/* Recent Activities for mobile */}
                        {activeSections && (
                            <Flex flexDirection="column" gap={"16px"} borderRadius="4px" bg="var(--zencom-background)" p={"20px"} marginBottom={6} width={{ base: "100%", md: "100%", lg: "30%" }} display={{ base: "block", md: "block", lg: "none" }}>
                                <RecentActivities />
                            </Flex>
                        )}

                        {isCurrentUser && Number.isFinite(profileData?.profile_completion) && profileData.profile_completion < 100 && (
                            <Box borderRadius="4px" bg="var(--zencom-background)" p={"20px"}>
                                <Flex justifyContent="space-between" alignItems="center" mb="8px">
                                    <ZCLabel label={__('Profile completion', 'zencommunity')} fontWeight="600" fontSize="14px" color='var(--zencom-font-color)' />
                                    <ZCLabel label={`${profileData.profile_completion}%`} fontWeight="600" fontSize="14px" color='var(--zencom-primary-color)' />
                                </Flex>
                                <Box w="100%" h="8px" borderRadius="full" bg="var(--zencom-border-color)" overflow="hidden">
                                    <Box w={`${profileData.profile_completion}%`} h="100%" borderRadius="full" bg="var(--zencom-primary-color)" transition="width 0.3s ease" />
                                </Box>
                            </Box>
                        )}

                        {profileData.bio === null ? (
                            <>
                                <NoDataPost
                                    icon={GoPerson}
                                    title={__('No info found!', 'zencommunity')}
                                    subTitle={isCurrentUser ? __('Add your profile details.', 'zencommunity') : ""}
                                    background="var(--zencom-background)"
                                    margin='0 0 20px 0'
                                    borderRadius='4px'
                                    buttons={isCurrentUser && (
                                        <Flex gap={4} alignItems={"center"}>
                                            <Button {...primaryBtnInsideContent} onClick={() => setIsEdit(true)}>
                                                <GoPlus /> {__('Add details', 'zencommunity')}
                                            </Button>
                                            
                                            <Button {...primaryBtnInsideContentTrans} onClick={() => setIsEdit(true)}>
                                                <GoPlus /> {__('Add social links', 'zencommunity')}
                                            </Button>
                                        </Flex>
                                    )}
                                />
                            </>
                        ) : (
                            <>
                                <Box display={"flex"} flexDirection={"column"} alignItems={"start"} gap={"16px"} borderRadius="4px" bg="var(--zencom-background)" p={"20px"}>
                                    {isCurrentUser && isProfile({label: __('About', 'zencommunity'), btnLabel: __('Add Details', 'zencommunity')})}

                                    <Separator size={"md"} w={"100%"} borderColor="var(--zencom-border-color)" />

                                    {hasDetails ? (
                                        <>
                                            <ZCLabel
                                                label={sprintf(__('%s', 'zencommunity'), String(profileData?.bio || 'Please add a bio to your profile.'))}
                                                fontSize="16px"
                                                fontWeight="400"
                                                color='var(--zencom-font-color)'
                                            />
                                            {profileData?.meta?.pronouns && (
                                                <Subtext fontSize='14px' fontWeight='400'>
                                                    {sprintf(__('Pronouns: %s', 'zencommunity'), profileData.meta.pronouns)}
                                                </Subtext>
                                            )}
                                        </>
                                    ) : (
                                        <Subtext fontSize='16px' fontWeight='400'>
                                            {__(`No details added yet. Click "Add Details" to complete your profile.`, "zencommunity")}
                                        </Subtext>
                                    )}
                                </Box>

                                <Box display={"flex"} flexDirection={"column"} alignItems={"start"} gap={"16px"} borderRadius="4px" bg="var(--zencom-background)" p={"20px"} mb="40px">
                                    {isCurrentUser && isProfile({label: __('Social links', 'zencommunity'), btnLabel: __('Add Social Link', 'zencommunity')})}

                                    <Separator size={"md"} w={"100%"} borderColor="var(--zencom-border-color)" />

                                    {hasSocialLinks ? (
                                        <>
                                            {socialLinks.facebook && (
                                                <Flex alignItems={"center"} gap={"12px"} justifyContent={"space-between"}>
                                                    <FaFacebook color='#454F59' size={"35px"} />
                                                    <Flex flexDirection={"column"} alignItems={"flex-start"} w={"100%"}>
                                                        <ZCLabel
                                                            label={__('Facebook', 'zencommunity')}
                                                            fontSize="14px"
                                                            fontWeight="400"
                                                            color='gray.500'
                                                        />
                                                        <a href={`https://facebook.com/${socialLinks.facebook}`} target='_blank' rel='noreferrer'>
                                                            <ZCLabel
                                                                label={`https://facebook.com/${socialLinks.facebook}`}
                                                                fontSize="16px"
                                                                fontWeight="400"
                                                                color='var(--zencom-font-color)'
                                                            />
                                                        </a>
                                                    </Flex>
                                                </Flex>
                                            )}
                                            {socialLinks.instagram && (
                                                <Flex alignItems={"center"} gap={"12px"} justifyContent={"space-between"}>
                                                    <FaInstagram color='#454F59' size={"35px"} />
                                                    <Flex flexDirection={"column"} alignItems={"flex-start"} w={"100%"}>
                                                        <ZCLabel
                                                            label={__('Instagram', 'zencommunity')}
                                                            type="subTitle"
                                                            fontWeight="400"
                                                            color='gray.500'
                                                        />
                                                        <a href={`https://instagram.com/${socialLinks.instagram}`} target='_blank' rel='noreferrer'>
                                                            <ZCLabel
                                                                label={`https://instagram.com/${socialLinks.instagram}`}
                                                            />
                                                        </a>
                                                    </Flex>
                                                </Flex>
                                            )}
                                            {socialLinks.linkedin && (
                                                <Flex alignItems={"center"} gap={"12px"} justifyContent={"space-between"}>
                                                    <FaLinkedin color='#454F59' size={"35px"} />
                                                    <Flex flexDirection={"column"} alignItems={"flex-start"} w={"100%"}>
                                                        <ZCLabel
                                                            label={__('Linkedin', 'zencommunity')}
                                                            type="subTitle"
                                                            fontWeight="400"
                                                            color='gray.500'
                                                        />
                                                        <a href={`https://linkedin.com/in/${socialLinks.linkedin}`} target='_blank' rel='noreferrer'>
                                                            <ZCLabel
                                                                label={`https://linkedin.com/in/${socialLinks.linkedin}`}
                                                            />
                                                        </a>
                                                    </Flex>
                                                </Flex>
                                            )}
                                            {socialLinks.x && (
                                                <Flex alignItems={"center"} gap={"12px"} justifyContent={"space-between"}>
                                                    <FaXTwitter color='#454F59' size={"35px"} />
                                                    <Flex flexDirection={"column"} alignItems={"flex-start"} w={"100%"}>
                                                        <ZCLabel
                                                            label={__('Twitter/X', 'zencommunity')}
                                                            type="subTitle"
                                                            fontWeight="400"
                                                            color='gray.500'
                                                        />
                                                        <a href={`https://x.com/${socialLinks.x}`}>
                                                            <ZCLabel
                                                                label={`https://x.com/${socialLinks.x}`}
                                                            />
                                                        </a>
                                                    </Flex>
                                                </Flex>
                                            )}
                                            {socialLinks.youtube && (
                                                <Flex alignItems={"center"} gap={"12px"} justifyContent={"space-between"}>
                                                    <FaYoutube color='#454F59' size={"35px"} />
                                                    <Flex flexDirection={"column"} alignItems={"flex-start"} w={"100%"}>
                                                        <ZCLabel
                                                            label={__('Youtube', 'zencommunity')}
                                                            type="subTitle"
                                                            fontWeight="400"
                                                            color='gray.500'
                                                        />
                                                        <a href={`https://youtube.com/${socialLinks.youtube}`} target='_blank' rel='noreferrer'>
                                                            <ZCLabel
                                                                label={`https://youtube.com/${socialLinks.youtube}`}
                                                            />
                                                        </a>
                                                    </Flex>
                                                </Flex>
                                            )}
                                        </>
                                    ) : (
                                        <Subtext fontSize='16px' fontWeight='400'>
                                            {__("No social links added yet.", "zencommunity")}
                                        </Subtext>
                                    )}
                                </Box>
                            </>
                        )}
                    </Flex>

                    {/* Recent Activities for desktop */}
                    <Flex flexDirection="column" gap={"16px"} borderRadius="4px" bg="var(--zencom-background)" p={"20px"} height="fit-content" maxHeight="80vh" width={{ base: "100%", md: "100%", lg: "30%" }} display={{ base: "none", md: "none", lg: "block" }}>
                        <RecentActivities />
                    </Flex>
                </Flex>
            )}
        </>
    )
}

export default About;
