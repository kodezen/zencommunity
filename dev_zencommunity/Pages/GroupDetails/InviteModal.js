import React, { useCallback, useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Avatar, Box, Button, HStack, Skeleton, Stack, Text } from '@chakra-ui/react';
import ZenComSearch from '@Components/Chakra/Search';
import ZenComModal from '@Components/ZenComModal/ZenComModal';
import { API, namespace, reactDebounce } from '@Utils/helper';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { useStyles } from '@Utils/chakra';

const InviteModal = ({inviteModal, setInviteModal, groupId }) => {
    const [canInviteMembers, setCanInviteMembers] = useState(false);
    const [memberFetching, setMemberFetching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [invitedIds, setInvitedIds] = useState([]);
    const { primaryBtnInsideContentTrans, primaryBtnInsideContent } = useStyles();

    const fetchHandler = async ({searchKey, page = 1, per_page= 100}) => {
        try {
            setMemberFetching(true)
            let url = namespace + `/group/${groupId}/members?invitable_members=true`
            if(searchKey) {
                url+= `&search=${searchKey}`
            }
            if(page) {
                url+= `&page=${page}`
            }
            if(per_page) {
                url+= `&per_page=${per_page}`
            }
            const response = await API.get(url);
            setCanInviteMembers(response.data)
        } catch (error) {
            console.warn({error})
        } finally {
            setMemberFetching(false)
        }
    };

    const debouncedFetch = useCallback(
        reactDebounce((key) => fetchHandler({ searchKey: key }), 500),
        []
    );

    useEffect(() => {
        fetchHandler({});
    }, []);

    const handleInvite = async (itemData) => {
        try {
            setLoading(itemData.id)
            const response = await API.post(namespace + `/group/${groupId}/add-member`, {
                id: itemData.id,
                role: 'member',
                status: "active"
            })
            if(response.data.success) {
                setInvitedIds([...invitedIds, itemData.id])
            }
        } catch (e) {
            console.error({e})
        } finally {
            setLoading(false)
        }
    };

    return (
        <ZenComModal
            isOpen={inviteModal}
            onRequestClose={() => {
                setInviteModal(!inviteModal)
            }}
            size="small"
            position='top'
            isEnabledFooter={true}
            isFooter={true}
            title={__("Invite member", "zencommunity")}
            suffix='group-invite'
            isFooterContent={
                <>
                    <Button
                        size="sm"
                        {...primaryBtnInsideContentTrans}
                        onClick={() => setInviteModal(false)}
                    >
                        {__('Cancel', 'zencommunity')}
                    </Button>
                </>
            }
        >
            <ZenComSearch
                margin="0 0 24px 0"
                value={searchText}
                isLoading={memberFetching}
                changeHandler={(e) => {
                    setSearchText(e.target.value)
                    debouncedFetch(e.target.value)
                }}
            />

            {memberFetching && !canInviteMembers ? (
                <Box>
                    <Skeleton height="80px" marginBottom="8px" />
                    <Skeleton height="80px" marginBottom="8px" />
                    <Skeleton height="80px" marginBottom="8px" />
                    <Skeleton height="80px" marginBottom="8px" />
                    <Skeleton height="80px" marginBottom="8px" />
                </Box>
            ) : (
                <Box opacity={memberFetching ? 0.5 : 1} transition="opacity 0.15s ease" pointerEvents={memberFetching ? 'none' : 'auto'}>
                    {canInviteMembers?.records?.length === 0 && (
                        <ZCLabel type='heading' textAlign='center' label={__("No Members are available to invite.", "zencommunity")} />
                    )}

                    {canInviteMembers?.records?.length > 0 && canInviteMembers.records.map((item, idx, array) => {
                        return (
                            <Box marginBottom={idx === array.length - 1 ? "" : "8px"} display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
                                <HStack key={idx}>
                                    <Avatar.Root>
                                        <Avatar.Fallback name={item.first_name + " " + item.last_name} />
                                        <Avatar.Image src={item.avatar_url} />
                                    </Avatar.Root>
                                    <Stack gap="0">
                                        <Text fontSize="14px" fontWeight="400" color="var(--zencom-font-color)">
                                            {item.first_name + " " + item.last_name}
                                        </Text>
                                    </Stack>
                                </HStack>
                                {!invitedIds.includes(item.id) && (
                                    <Button
                                        loading={parseInt(item.id) === parseInt(loading)}
                                        disabled={parseInt(item.id) === parseInt(loading)}
                                        onClick={() => handleInvite(item)}
                                        padding={"8px 16px"}
                                        height={'auto'}
                                        {...primaryBtnInsideContent}
                                    >
                                        {__("Send","zencommunity")}
                                    </Button>
                                )}
                            </Box>
                        )
                    })}
                </Box>
            )}
        </ZenComModal>
    );
};

export default InviteModal;
