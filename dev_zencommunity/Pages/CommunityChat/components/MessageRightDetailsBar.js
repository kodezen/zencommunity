import React from 'react';
import { Avatar, Flex, Icon, VStack } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import ZenComLoader from '@Components/ZenComLoader';
import { getAvatarBg, getInitials, site_url, sliceString } from '@Utils/helper';
import { LuCalendar } from 'react-icons/lu';
import { CiClock2 } from 'react-icons/ci';
import { __ } from '@wordpress/i18n';
import ZenComTooltip from '@Components/ZenComTooltip';

const MessageRightDetailsBar = ({
    dataLoading,
    selectedUser,
}) => {
    return (
        <>
            <ZCLabel label={__("User info", "zencommunity")} type="bold" fontSize="18px" padding="16px" lineHeight="35px" margin="0 0 16px 0" borderBottomWidth="1px" borderColor="var(--zencom-border-color)" />

            {dataLoading ? (
                <ZenComLoader type="profile" />
            ) : (
                <>
                    <VStack gap="3">
                        <Avatar.Root size="2xl">
                            <Avatar.Fallback
                                bg={getAvatarBg(selectedUser.isGroup ? selectedUser?.name : selectedUser?.first_name + " " + selectedUser?.last_name)}
                                color="white"
                                display='flex'
                                alignItems='center'
                                justifyContent='center'
                                width='100%'
                                height='100%'
                            >
                                {getInitials(selectedUser.isGroup ? selectedUser?.name : selectedUser?.first_name + " " + selectedUser?.last_name)}
                            </Avatar.Fallback>
                            <Avatar.Image src={(selectedUser?.avatar_url || selectedUser?.featured_img) ? `${site_url}${selectedUser.avatar_url ?? selectedUser?.featured_img}` : ""} />
                        </Avatar.Root>

                        <ZenComTooltip content={selectedUser.isGroup ? selectedUser?.name : selectedUser?.first_name + " " + selectedUser?.last_name} position='left'>
                            <ZCLabel type='bold' label={sliceString(selectedUser.isGroup ? selectedUser?.name : selectedUser?.first_name + " " + selectedUser?.last_name, 25, "...")} />
                        </ZenComTooltip>
                    </VStack>

                    <Flex alignItems="center" justifyContent="space-between" padding="24px">
                        <Flex alignItems="center" gap={1} width="50%">
                            <Icon as={LuCalendar} boxSize="16px" color="var(--zencom-font-color)" />
                            <ZCLabel type='simple' color="var(--zencom-font-color)" label={__("Joined", "zencommunity")} />
                        </Flex>
                        <Flex alignItems="center" width="50%">
                            <ZCLabel type='basic' label={__(moment(selectedUser.last_activity).format('YYYY-MM-DD'), "zencommunity")} />
                        </Flex>
                    </Flex>

                    {selectedUser?.last_activity && (
                        <Flex alignItems="center" justifyContent="space-between" padding="0 24px">
                            <Flex alignItems="center" gap={1} width="50%">
                                <Icon as={CiClock2} boxSize="16px" color="var(--zencom-font-color)" />
                                <ZCLabel type='simple' color="var(--zencom-font-color)" label={__("Last seen", "zencommunity")} />
                            </Flex>
                            <Flex alignItems="center" width="50%">
                                <ZCLabel type='basic' label={moment().diff(selectedUser.last_activity, "days") > 2 ? moment(selectedUser.last_activity, "YYYY-MM-DD HH:mm:ss").format("YYYY-MM-DD") : moment(selectedUser.last_activity, "YYYY-MM-DD HH:mm:ss").fromNow()} />
                            </Flex>
                        </Flex>
                    )}
                </>
            )}

            {/* this is for ticket */}
            {/* 
            <ZenComAvatar
                userID={selectedUser?.id}
                variant="default"
                userName={selectedUser?.first_name + " " + selectedUser?.last_name}
                userMail={'johnsmith@gmail.com'}
                src={selectedUser?.avatar_url ?? plugin_root_url + "/assets/images/avatar_placeholder.png"}
                padding="12px"
                borderBottomWidth="1px"
                borderColor="var(--zencom-border-color)"
            />
            
            <ZCLabel
                label={__("Assignee", "zencommunity")}
                padding="12px 12px"
                type="basic"
                borderBottomWidth="1px"
                borderColor="var(--zencom-border-color)"
            />

            <Flex gap={4} alignItems="center" p={3} borderBottomWidth="1px" borderColor="var(--zencom-border-color)">
                <CiUser />
                <Select
                    placeholder={__('Select', 'zencommunity')}
                    className="zen-com-select zen-com-select--width-full"
                    classNamePrefix="zen-com-select"
                />
            </Flex>

            <ZCLabel
                label={__("Main Information", "zencommunity")}
                padding="12px 12px"
                margin="0 0 16px 0"
                type="basic"
                borderBottomWidth="1px"
                borderColor="var(--zencom-border-color)"
            />

            <ZCLabel
                label={__("Nantes, France", "zencommunity")}
                icon={<MdOutlineLocationOn />}
                type="boldLight"
                padding="0 0 16px 12px"
            />
            <ZCLabel
                label={__("1:34pm (UTC+1)", "zencommunity")}
                icon={<CiClock2 />}
                type="boldLight"
                padding="0 0 16px 12px"
            />
            <ZCLabel
                label={__("1:34pm (UTC+1)", "zencommunity")}
                icon={<LuEarth />}
                type="boldLight"
                padding="0 0 16px 12px"
                borderBottomWidth="1px"
                borderColor="var(--zencom-border-color)"
            />

            <ZCLabel
                label={__("Visitor device", "zencommunity")}
                padding="12px 12px"
                margin="0 0 16px 0"
                type="basic"
                borderBottomWidth="1px"
                borderColor="var(--zencom-border-color)"
            />

            <ZCLabel
                label={__("Safari 9 on macOS", "zencommunity")}
                icon={<MdOutlineLocationOn />}
                type="boldLight"
                padding="0 0 16px 12px"
            />

            <ZCLabel
                label={__("93.177.84.1", "zencommunity")}
                icon={<CiCloud />}
                type="boldLight"
                padding="0 0 16px 12px"
                borderBottomWidth="1px"
                borderColor="var(--zencom-border-color)"
            />

            <ZCLabel
                label={__("Private Note", "zencommunity")}
                padding="12px 12px"
                margin="0 0 16px 0"
                type="basic"
                borderBottomWidth="1px"
                borderColor="var(--zencom-border-color)"
            />
            <Textarea
                placeholder={__("Add user note...", "zencommunity")}
                bg="#FFF7D6"
                size="sm"
                width="calc(100% - 24px)"
                marginLeft="12px"
            /> */}
        </>
    );
};

export default MessageRightDetailsBar;
