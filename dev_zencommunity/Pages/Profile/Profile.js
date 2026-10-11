import React, { useEffect, useState } from 'react';
import { Box, Flex, Image, Avatar, Tabs, Button, Separator, Menu, useBreakpointValue, Portal, CloseButton, SkeletonCircle, Skeleton, Stack, Icon } from '@chakra-ui/react';
import { LuImagePlus, LuPlus } from "react-icons/lu"
import Post from './Tabs/Post';
import About from './Tabs/About';
import Group from './Tabs/Group';
import Courses from './Tabs/Courses';
import Leaderboard from './Tabs/Leaderboard';
import { __ } from '@wordpress/i18n';
import { API, current_logged_user, getAddonActiveStatus, getAvatarBg, getDisplayName, getInitials, media_url, mediaFileUploader, namespace, plugin_root_url, site_url, sliceString, show_cover_placeholder } from '@Utils/helper';
import NoDataPost from '@Components/NoDataPost';
import LoadingProfile from '@Components/ZenComLoader/Types/LoadingProfile';
import { HiDotsHorizontal } from 'react-icons/hi';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import ProfilePanel from '@Components/Gamification/ProfilePanel';
import { BadgeList } from '@Components/Badges/BadgeChip';
import { useStyles } from '../../utils/chakra';
import moment from 'moment';
import { message } from '../../../assets/staticIcons';
import Ticket from './Tabs/Ticket';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import Connections from './Tabs/Connections';
import ScheduledPosts from './Tabs/ScheduledPosts';
import FeedPosts from '../Feed/FeedPosts';
import { CgUnblock } from 'react-icons/cg';
import { MdBlock } from 'react-icons/md';
import { RxActivityLog } from 'react-icons/rx';
import { BiMinusCircle } from 'react-icons/bi';

const Profile = () => {
    const { primaryBtnInsideContent, responsiveContent3, primaryBtnInsideContentTrans } = useStyles();
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const userID = id ? id : current_logged_user?.user_id;
    const isOwnProfile = !id || id === current_logged_user?.user_id;
    const cover = plugin_root_url + "/assets/images/cover_placeholder.png";
    const [profileData, setProfileData] = useState(false);
    const [coverImage, setCoverImage] = useState(cover);
    const [recentActivities, setRecentActivities] = useState(false);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [activeSections, setActiveSections] = useState(null);
    const [schedulePosts, setSchedulePosts] = useState(null);
    const isMobile = useBreakpointValue({ base: true, lg: false });
    const menus = useSelector((state) => state.menus);
    const activeAddons = useSelector(state => state?.addons?.activeAddons);
    const isCurrentUser = id ? Number(id) === Number(current_logged_user?.user_id) : true;
    // "Connection" requires the FollowerAndBlocker addon, and "Bookmarked"
    // only makes sense on the viewer's own profile — both regardless of
    // their configured enable/order state (same two-layer pattern as Courses
    // requiring the LMS addon). Everything else in profile_menu is shown
    // purely based on the admin's Menu Settings configuration.
    const profileMenuItems = (menus?.profile_menu?.items || []).filter(item => {
        if (item?.label === 'Connection') return getAddonActiveStatus(activeAddons, "FollowerAndBlocker");
        if (item?.label === 'Bookmarked') return isCurrentUser;
        return true;
    });
    const defaultLabel = current_logged_user?.user_id ? (profileMenuItems?.[0]?.label || 'Feeds') : "About";
    const initialTabFromState = location?.state?.tab;
    const [activeTab, setActiveTab] = useState(initialTabFromState || defaultLabel);
    const dispatch = useDispatch();

    const handleImageChange = async (event, type) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const res = await mediaFileUploader(type, file);
            if (res?.id) {
                const { data } = await API.post(namespace + `/member/profile`, { media_ids: [res.id] });
                window.ZencommunityGlobal.current_logged_user.avatar_url = data.avatar_url;
                setProfileData({ ...profileData, ...data });
                setCoverImage(profileData?.meta?.cover_img_url);
            }
        } catch (err) {
            console.error("Upload failed", err);
        }
    };

    const RecentActivities = ({ title }) => (
        <>
            {isMobile ? (
                <Flex justifyContent="space-between" alignItems="center" mb={4} className="zencom-animate-fade">
                    <ZCLabel fontSize='18px' fontWeight='700' color='var(--zencom-font-color)' label={title ?? __('Recent Activities', 'zencommunity')} />
                    <CloseButton onClick={() => setActiveSections(null)} />
                </Flex>
            ) : (
                <ZCLabel fontSize='18px' fontWeight='700' color='var(--zencom-font-color)' margin='0 0 16px 0' label={title ?? __('Recent Activities', 'zencommunity')} />
            )}

            <Separator pb={4} w={"100%"} borderColor="var(--zencom-border-color)" />

            {activitiesLoading ? (
                <>
                    {[...Array(3)].map((_, idx) => (
                        <Flex alignItems="center" gap="5px" justifyContent="space-between" w={'full'} key={idx}>
                            <SkeletonCircle size="10" />
                            <Flex flexDirection="column" gap="8px" alignItems="flex-start" flex="1">
                                <Skeleton height="12px" width="100%" maxW="220px" />
                                <Skeleton height="10px" width="80px" />
                            </Flex>
                        </Flex>
                    ))}
                </>
            ) : (
                <>
                    {recentActivities?.length > 0 ? (
                        recentActivities.slice(0, 10)?.map((item, idx, array) => (
                            <Flex key={idx} alignItems={"center"} gap={"8px"} marginBottom={idx === array.length - 1 ? "0" : "24px"}>
                                <ZenComAvatar
                                    variant="simple"
                                    userName={`${item?.meta?.route?.user?.first_name} ${item?.meta?.route?.user?.last_name}`}
                                    src={item?.meta?.route?.user?.avatar_url ? site_url + item?.meta?.route?.user?.avatar_url : ""}
                                />
                                <Stack gap="0">
                                    <ZCLabel truncate lineClamp="2" type='basic' label={sliceString(item?.meta?.message, 42, "...")} />
                                    <ZCLabel type='simpleLight' label={moment(item?.created_at, "YYYYMMDD").fromNow()} />
                                </Stack>
                            </Flex>
                        ))
                    ) : (
                        <NoDataPost
                            title={__('No activities found!', 'zencommunity')}
                            subTitle={__('Add new to show start activities', 'zencommunity')}
                            padding='16px'
                            textAlign='center'
                        />
                    )}
                </>
            )}
        </>
    );

    useEffect(() => {
        const url = Number(userID) === Number(current_logged_user?.user_id)
            ? `/member/profile`
            : `/member/${userID}`;

        API.get(namespace + url).then(({ data }) => {
            setProfileData(data);
            setIsFollowing(!!data?.is_following);
            setIsBlock(!!data?.is_blocked);
            setProfileLoading(false);
        });
    }, [userID]);

    useEffect(() => {
        setActivitiesLoading(true);
        API.get(namespace + `/member/${userID}/activities`).then(({ data: { records } }) => {
            setRecentActivities(records);
            setActivitiesLoading(false);
        });
    }, []);

    const handleRemoveCoverImg = async () => {
        const { data } = await API.post(namespace + `/member/profile`, { remove_media: "profile_cover" });
        setProfileData({
            ...profileData,
            ...data,
            meta: { ...data.meta, cover_img_url: null }
        });
        setCoverImage(null);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'About':
                return <About RecentActivities={RecentActivities} activeSections={activeSections} profileData={profileData} setProfileData={setProfileData} />;
            case 'Connection':
                return <Connections profileData={profileData} />;
            case 'Feeds':
                return <Post
                    RecentActivities={RecentActivities}
                    activeSections={activeSections}
                    profileData={profileData}
                    setProfileData={setProfileData}
                    isCurrentUser={isCurrentUser}
                    schedulePosts={schedulePosts}
                    setActiveTab={setActiveTab}
                />;
            case 'schedule-post':
                return <ScheduledPosts
                    RecentActivities={RecentActivities}
                    activeSections={activeSections}
                    schedulePosts={schedulePosts}
                    setSchedulePosts={setSchedulePosts}
                />;
            case 'Groups':
                return <Group />;
            case 'Courses':
                return <Courses userId={userID} />;
            case 'Leaderboard':
                return <Leaderboard userId={userID} />;
            case 'Ticket':
                return <Ticket RecentActivities={RecentActivities} activeSections={activeSections} isCurrentUser={isCurrentUser} />;
            case 'Bookmarked':
                return <FeedPosts bookmarked />;
            default:
                return null;
        }
    };

    const handleMessageClick = () => {
        localStorage.setItem("zcui", JSON.stringify(userID));
        navigate("/chat");
    };

    const showMessage = getAddonActiveStatus(activeAddons, "Messaging") && current_logged_user && userID !== current_logged_user?.user_id;
    const [isBlock, setIsBlock] = useState(false);
    const showFollow = getAddonActiveStatus(activeAddons, "FollowerAndBlocker") && current_logged_user && userID !== current_logged_user?.user_id;
    const [isFollowing, setIsFollowing] = useState(false);

    const handleFollow = async () => {
        if (!current_logged_user || isBlock) return;

        try {
            if (isFollowing) {
                await API.post(`${namespace}/unfollow/${userID}`);
                setIsFollowing(false);

                dispatch(showNotification({
                    message: __('Unfollowed successfully!', 'zencommunity'),
                    isShow: true,
                    type: 'success',
                }));
            } else {
                await API.post(`${namespace}/follow/${userID}`);
                setIsFollowing(true);
                dispatch(showNotification({
                    message: __('Followed successfully!', 'zencommunity'),
                    isShow: true,
                    type: 'success',
                }));
            }
        } catch (error) {
            dispatch(showNotification({
                message: error?.response?.data?.message || __('Failed to update follow status', 'zencommunity'),
                isShow: true,
                type: 'error',
            }));
            console.error("Follow toggle failed", error);
        }
    };

    const handleBlock = async () => {
        if (!current_logged_user) return;

        try {
            if (isBlock) {
                await API.post(`${namespace}/unblock/${userID}`);
                setIsBlock(false);

                dispatch(showNotification({
                    message: __('Unblocked successfully!', 'zencommunity'),
                    isShow: true,
                    type: 'success',
                }));
            } else {
                await API.post(`${namespace}/block/${userID}`);
                setIsBlock(true);
                dispatch(showNotification({
                    message: __('Blocked successfully!', 'zencommunity'),
                    isShow: true,
                    type: 'success',
                }));
            }
        } catch (error) {
            dispatch(showNotification({
                message: error?.response?.data?.message || __('Failed to update block status', 'zencommunity'),
                isShow: true,
                type: 'error',
            }));
            console.error("block toggle failed", error);
        }
    };

    // Revoke a badge directly from where it's shown, rather than requiring an
    // admin to go back to Settings > Badges > Assign and re-search for this
    // same member. Only rendered for site admins (see BadgeList's onRemove
    // prop above) - the same admin_can gate the REST endpoint enforces.
    const handleRemoveBadge = async (badge) => {
        try {
            await API.delete(`${namespace}/badges/member/${userID}/${badge.id}`);
            setProfileData((prev) => ({
                ...prev,
                badges: (prev?.badges || []).filter((b) => b.id !== badge.id),
            }));
            dispatch(showNotification({
                message: __('Badge removed.', 'zencommunity'),
                isShow: true,
                type: 'success',
            }));
        } catch (error) {
            dispatch(showNotification({
                message: error?.response?.data?.message || __('Failed to remove badge', 'zencommunity'),
                isShow: true,
                type: 'error',
            }));
        }
    };

    const fetchScheduledPost = async (page = 1, per_page = 15) => {
        let params = {
            status: "scheduled"
        };
        if (page) params.page = page;
        if (per_page) params.per_page = per_page;
        API.get(namespace + `/member/${userID}/feeds`, { params }).then(res => {
            setSchedulePosts(res.data)
        })
    }

    useEffect(() => {
        if (Number(userID) === Number(current_logged_user?.id)) {
            fetchScheduledPost()
        }
    }, [userID, current_logged_user]);

    return (
        <Box {...responsiveContent3} className="zencom-animate-fade">
            {profileLoading || !profileData ? (
                <LoadingProfile />
            ) : (
                <>
                    <ZCLabel label={Number(userID) === Number(current_logged_user?.user_id) ? __('My Profile', 'zencommunity') : getDisplayName(profileData) + __("'s Profile", 'zencommunity')} type='heading' margin="0 0 24px 0" />

                    <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)} variant="unstyled">
                        <Box position={"relative"} display="flex" flexDirection={"column"} gap={4} borderRadius="4px" bg="var(--zencom-background)">
                            <Box position={"relative"}>
                                <Box h="320px" w="100%" display="flex" alignItems="center" justifyContent="center" borderRadius="4px 4px 0 0" bg="gray.100" position="relative">
                                    {(profileData?.meta?.cover_img_url || show_cover_placeholder) && (
                                        <Image
                                            src={profileData?.meta?.cover_img_url ? site_url + profileData?.meta?.cover_img_url : cover}
                                            alt="Group Cover"
                                            h="320px"
                                            w="100%"
                                            objectFit="cover"
                                            borderRadius="4px 4px 0 0"
                                            className={!profileData?.meta?.cover_img_url ? 'zencom-cover-placeholder' : ''}
                                        />
                                    )}
                                    {Number(userID) === Number(current_logged_user?.user_id) && (
                                        <Flex gap={"10px"} position="absolute" top="10px" right="10px" >
                                            <Button size="sm" {...primaryBtnInsideContent} border={'none'} onClick={() => document.getElementById('cover-upload').click()}>
                                                {__('Change Cover', 'zencommunity')}
                                            </Button>
                                            {profileData?.meta?.cover_img_url && (
                                                <Button bg={"red"} size="sm" border={'none'} onClick={handleRemoveCoverImg}>
                                                    {__('Remove', 'zencommunity')}
                                                </Button>
                                            )}
                                            <input id="cover-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'profile_cover')} />
                                        </Flex>
                                    )}
                                </Box>

                                <Avatar.Root width={"100px"} height={"100px"} position="absolute" top={"250px"} left={"20px"} bg={"white"} borderRadius="full" boxShadow={"md"}>
                                    <Avatar.Fallback
                                        bg={getAvatarBg(getDisplayName(profileData))}
                                        color="white"
                                        display='flex'
                                        alignItems='center'
                                        justifyContent='center'
                                        width='100%'
                                        height='100%'
                                        fontSize='40px'
                                    >
                                        {getInitials(getDisplayName(profileData))}
                                    </Avatar.Fallback>
                                    <Avatar.Image src={media_url(profileData?.avatar_url)} border={0} borderStyle={"solid"} borderColor={"#E0E4E8"} rounded={"full"} />
                                    {Number(userID) === Number(current_logged_user?.user_id) && (
                                        <Box w="fit-content" display="flex" alignItems="center" justifyContent="center" bg="gray.200" borderRadius="100%" padding={"5px"} position="absolute" bottom="0px" right="-10px">
                                            <Button size="xs" bg={"var(--zencom-primary-color)"} borderRadius="100%" padding={"5px"} onClick={() => document.getElementById('profile-upload').click()}>
                                                <LuImagePlus color='var(--zencom-body-background)' />
                                            </Button>
                                            <input id="profile-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageChange(e, 'profile_avatar')} />
                                        </Box>
                                    )}
                                </Avatar.Root>
                            </Box>

                            <Flex justifyContent="space-between" alignItems="center" mt={"32px"} >
                                <Flex alignItems="flex-start" justifyContent="space-between" gap={2} width="100%" direction={isOwnProfile ? "row" : { base: "column", md: "row" }}>
                                    <Flex direction={"column"} gap="2px" justify={"space-between"} px={"20px"}>
                                        <Flex align="center" gap={2} wrap="wrap">
                                            <ZCLabel label={getDisplayName(profileData)} type='heading' />
                                            {profileData?.meta?.pronouns && (
                                                <ZCLabel label={`(${profileData.meta.pronouns})`} type='simple' fontSize='14px' color='gray.500' />
                                            )}
                                            <BadgeList
                                                badges={profileData?.badges}
                                                size="sm"
                                                onRemove={current_logged_user?.is_site_admin ? handleRemoveBadge : undefined}
                                            />
                                        </Flex>
                                        <ZCLabel label={'@' + profileData?.username} type='simple' fontSize='16px' />
                                    </Flex>

                                    <Flex gap={2}>
                                        {showFollow && (
                                            <>
                                                {!isBlock ? (
                                                    <Button
                                                        onClick={handleFollow}
                                                        marginLeft={{ base: "20px", md: "0" }}
                                                        isDisabled={isBlock}
                                                        minWidth="auto"
                                                        padding="8px 16px"
                                                        {...(isFollowing ? primaryBtnInsideContentTrans : primaryBtnInsideContent)}
                                                    >
                                                        {isFollowing ? <><BiMinusCircle /> {__('Unfollow', 'zencommunity')}</> : <> <LuPlus /> {__('Follow', 'zencommunity')} </>}
                                                    </Button>
                                                ) : (
                                                    <Button onClick={handleBlock} marginLeft={{ base: "20px", md: "0" }} background={"var(--zencom-warning)"} isDisabled={isBlock} border={"1px solid var(--zencom-warning)"} height="auto" minWidth="auto">
                                                        <CgUnblock /> {__('Unblock', 'zencommunity')}
                                                    </Button>
                                                )}
                                            </>
                                        )}

                                        {showMessage && (
                                            <Button onClick={handleMessageClick} {...primaryBtnInsideContent} minWidth="auto" padding="8px 16px" marginRight={isBlock ? { base: 0, lg: 5 } : 0}>
                                                {message()}
                                            </Button>
                                        )}

                                        {showFollow && (
                                            <>
                                                {!isBlock && (
                                                    <Menu.Root positioning={{ placement: "bottom" }}>
                                                        <Menu.Trigger asChild>
                                                            <Button variant="ghost" size="md" color={'var(--zencom-font-color)'} marginRight="20px" minWidth="auto" height="auto" border="1px solid var(--zencom-border-color)" padding="0 8px" rounded="md" display={{ base: "none", lg: "block" }} focusRing="none">
                                                                <HiDotsHorizontal size={20} />
                                                            </Button>
                                                        </Menu.Trigger>
                                                        <Portal>
                                                            <Menu.Positioner>
                                                                <Menu.Content background={"var(--zencom-background)"}>
                                                                    <Menu.Item color={isBlock ? "var(--zencom-warning)" : "var(--zencom-font-color)"} onClick={handleBlock}>
                                                                        {isBlock ? (
                                                                            <>
                                                                                <CgUnblock />
                                                                                {__("Unblock", "zencommunity")}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Icon as={MdBlock} color="var(--zencom-warning)" />
                                                                                {__("Block", "zencommunity")}
                                                                            </>
                                                                        )}
                                                                    </Menu.Item>
                                                                </Menu.Content>
                                                            </Menu.Positioner>
                                                        </Portal>
                                                    </Menu.Root>
                                                )}
                                            </>
                                        )}

                                        {isMobile && (
                                            <Menu.Root positioning={{ placement: "bottom-start" }}>
                                                <Menu.Trigger asChild>
                                                    <Button variant="plain" size="md" color={'var(--zencom-font-color)'} marginRight="20px" minWidth="auto" height="auto" border="1px solid var(--zencom-border-color)" padding="0 8px" rounded="md" focusRing="none">
                                                        <HiDotsHorizontal size={20} />
                                                    </Button>
                                                </Menu.Trigger>
                                                <Portal>
                                                    <Menu.Positioner>
                                                        <Menu.Content background={"var(--zencom-background)"}>
                                                            <Menu.Item value="members" color={"var(--zencom-font-color)"} onClick={() => setActiveSections((prev) => prev === "recent-activities" ? null : "recent-activities")}><RxActivityLog /> {__(" Recent activities", "zencommunity")}</Menu.Item>
                                                            {!isBlock && (
                                                                <Menu.Item display={isOwnProfile ? "none" : "block"} color={isBlock ? "var(--zencom-warning)" : "var(--zencom-font-color)"} onClick={handleBlock}>
                                                                    {isBlock ? (
                                                                        <>
                                                                            <CgUnblock />
                                                                            {__(" Unblock", "zencommunity")}
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Icon as={MdBlock} color="var(--zencom-warning)" />
                                                                            {__(" Block", "zencommunity")}
                                                                        </>
                                                                    )}
                                                                </Menu.Item>
                                                            )}
                                                        </Menu.Content>
                                                    </Menu.Positioner>
                                                </Portal>
                                            </Menu.Root>
                                        )}
                                    </Flex>
                                </Flex>
                            </Flex>

                            <Tabs.List>
                                {profileMenuItems.map(item => (
                                    <Tabs.Trigger
                                        key={item?.id}
                                        value={item?.label}
                                        className="zc-tab"
                                        padding="2 !important"
                                    >
                                        {item?.label}
                                    </Tabs.Trigger>
                                ))}
                            </Tabs.List>
                        </Box>

                        <Box mb={4}>
                            <ProfilePanel userId={userID} />
                        </Box>

                        <Tabs.Content value={activeTab} p={0}>
                            {renderTabContent()}
                        </Tabs.Content>
                    </Tabs.Root>
                </>
            )}
        </Box>
    );
};

export default Profile;
