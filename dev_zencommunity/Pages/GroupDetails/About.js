import React from 'react';
import { Box, Flex, Icon, Separator } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import NoDataPost from '@Components/NoDataPost';
import { capitalizeFirstLetter, current_user_can } from '@Utils/helper';
import { AiOutlineEyeInvisible, AiOutlineGlobal, AiOutlineLock } from 'react-icons/ai';

const About = ({ groupData }) => {
    return (
        <>
            <Box className="zencom-animate-fade" borderRadius="6px" bg={"var(--zencom-background)"} mb={{base:"50px", lg:"4"}}>
                <ZCLabel
                    fontSize='18px'
                    color='var(--zencom-font-color)'
                    fontWeight='500'
                    padding="12px 16px"
                    label={__('About', 'zencommunity')}
                />
                <Separator w={"100%"} borderColor="var(--zencom-border-color)" />

                {groupData?.description ? (
                    <Box
                        padding={'16px'}
                    >
                        <ZCLabel
                            fontSize='14px'
                            type='custom'
                            color='var(--zencom-font-color)'
                            fontWeight='400'
                            padding="0"
                            label={groupData?.description}
                            enableSlice={true}
                            textAlign='justify'
                            sliceLength={"140"}
                            lineHeight="24px"
                            whiteSpace={'nowrap'}
                            customStyles={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                width: "calc(100% - 16px )",
                                textWrap: 'none'
                            }}
                        />
                    </Box>
                ) : (
                    <NoDataPost
                        title={__('No details found!', 'zencommunity')}
                        subTitle={current_user_can?.manage_options ? __('Please add Group description.', 'zencommunity') : ''}
                        subTitleWrap="nowrap"
                    />
                )}

                <Flex alignItems="flex-start" gap={2} p="16px 16px 16px 16px">
                    {groupData?.privacy === "private" ? (
                        <Icon size="md" as={AiOutlineLock} color='var(--zencom-font-color)' />
                    ) : groupData?.privacy === "hidden" ? (
                        <Icon size="md" as={AiOutlineEyeInvisible} color='var(--zencom-font-color)' />
                    ) : groupData?.privacy === "public" ? (
                        <Icon size="md" as={AiOutlineGlobal} color='var(--zencom-font-color)' />
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

            {groupData?.meta?.rules && (
                <Box className="zencom-animate-fade" borderRadius="6px" bg={"var(--zencom-background)"} mb={{base:"50px", lg:"4"}}>
                    <ZCLabel
                        fontSize='18px'
                        color='var(--zencom-font-color)'
                        fontWeight='500'
                        padding="12px 16px"
                        label={__('Rules', 'zencommunity')}
                    />
                    <Separator w={"100%"} borderColor="var(--zencom-border-color)" />

                    {/* groupData.meta.rules is sanitized server-side with
                    Sanitizer::HTML (wp_kses_post) on save, same as the
                    Info Box widget's content, so rendering it as-is is safe. */}
                    <Box
                        padding={'16px'}
                        color='var(--zencom-font-color)'
                        fontSize='14px'
                        lineHeight="24px"
                        dangerouslySetInnerHTML={{ __html: groupData.meta.rules }}
                    />
                </Box>
            )}
        </>
    );
};

export default About;
