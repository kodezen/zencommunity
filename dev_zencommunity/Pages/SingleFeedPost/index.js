import React, { useState } from 'react';
import { Box, Flex, Button, Text } from "@chakra-ui/react";
import { baseURL, copyToClipboard, current_logged_user, feelingsOptions, plugin_root_url, site_url } from '@Utils/helper';
import { __ } from '@wordpress/i18n';
import { FaRegThumbsUp } from 'react-icons/fa6';
import { LuFlag } from 'react-icons/lu';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import Comments from '@Components/PostCard/Steps/Comments';
import { useNavigate, useParams } from 'react-router-dom';
import MentionParser from '@Components/Mention/MentionParser';
import { useStyles } from '../../utils/chakra';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import ZenComMenu from '@Components/ZenComMenu';
import ZenComLoader from '@Components/ZenComLoader';
import { deleteFeedPost, fetchSingleFeed, reactToFeedPost, updateFeedPost, toggleBookmark, featureFeedPost, approveFeedPost, rejectFeedPost, applyReactionToPost } from '@Redux/slices/feedSlice/feedSlice';
import { FiLink } from 'react-icons/fi';
import { edit } from '../../../assets/staticIcons';
import { FaRegTrashAlt } from 'react-icons/fa';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import ZenComShare from '@Components/ZenComShare';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { PostActionBar, PostSummaryRow } from '@Components/PostCard/PostEngagement';
import PostEditForm from '@Components/PostForm/PostEditForm';
import CenterContainer from '@Components/Layouts/CenterContainer';
import LeftContainer from '@Components/Layouts/LeftContainer';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';
import RightSidebar from '@Components/Sidebar/RightSidebar';
import RightContainer from '@Components/Layouts/RightContainer';
import { MdOutlineBookmarkBorder, MdBookmark, MdOutlineStarBorder, MdOutlineStar } from 'react-icons/md';
import PollDisplay from '@Components/PollDisplay/PollDisplay';
import EventCard from '@Components/EventCard/EventCard';
import ReportModal from '@Components/ReportModal';
import ConfirmPopup from '@Components/ConfirmPopup';


const SingleFeedPost = () => {
    const { responsiveContent1 } = useStyles();
    const { id } = useParams();
    const feeds = useSelector((state) => state.feeds);
    const feedData = feeds?.data?.find(item => parseInt(item?.id) === parseInt(id))
    const group_permissions = useSelector(state => state.auth.group_permissions)
    const navigate = useNavigate();
    const [singleFeedData, setSingleFeedData] = useState(null);
    const [activeView, setActiveView] = useState("comments");
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [dataFetchLoading, setDataFetchLoading] = useState(!feedData);
    const [editContent, setEditContent] = useState(singleFeedData?.content || "");
    const [isOpenPostEdit, setIsOpenPostEdit] = useState(false);
    const [confirmedPopUp, setConfirmedPopUp] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [approvalLoading, setApprovalLoading] = useState(null);
    const [localEvent, setLocalEvent] = useState(null);
    const [pollOptions, setPollOptions] = useState([]);
    const [showCommentField, setShowCommentField] = useState(true);
    const [composerFocusKey, setComposerFocusKey] = useState(0);

    const permissions = group_permissions?.manage_everything ? group_permissions : group_permissions?.[parseInt(singleFeedData?.group_id)] || null;
    const itemReaction = singleFeedData?.is_liked ? <FaRegThumbsUp fill='var(--zencom-primary-color)' /> : <FaRegThumbsUp />;
    const postOwner = parseInt(singleFeedData?.user_id) === parseInt(current_logged_user?.user_id);
    const canDelete = postOwner || group_permissions?.manage_everything;
    const isGroupAdmin = permissions?.role === 'admin' || !!group_permissions?.manage_everything;
    const isAnonymous = !!singleFeedData?.meta?.is_anonymous;
    const isAnonymousPlaceholder = isAnonymous ? plugin_root_url + '/assets/images/anonymous_placeholder.jpg' : '';
    const isTeamPost = !!singleFeedData?.meta?.posted_as_team;
    const dispatch = useDispatch();

    useEffect(() => {
        (async () => {
            if (!feedData) {
                setDataFetchLoading(true);
                const response = await dispatch(fetchSingleFeed(parseInt(id))).unwrap()
                setSingleFeedData(response)
                setLocalEvent(response?.meta?.event ?? null);
                setPollOptions(response?.type === 'poll' ? (response?.meta?.poll?.options ?? []) : []);
                setDataFetchLoading(false);
            } else {
                setSingleFeedData(feedData)
                setLocalEvent(feedData?.meta?.event ?? null);
                setPollOptions(feedData?.type === 'poll' ? (feedData?.meta?.poll?.options ?? []) : []);
            }
        })()
    }, [id]);

    const handleEditPost = async (itemData) => {
        try {
            await dispatch(
                updateFeedPost({
                    feedId: itemData?.id,
                    formData: {
                        ...itemData
                    },
                })
            ).then(res => setSingleFeedData(res.payload.data))
            setIsOpenPostEdit(false);
        } catch (err) {
            console.error("Failed to update feed:", err);
        }
    };

    const handleDeletePost = async () => {
        if (!canDelete) return;

        try {
            await dispatch(deleteFeedPost(parseInt(singleFeedData?.id)));
            dispatch(
                showNotification({
                    message: __("Post deleted successfully", "zencommunity"),
                    isShow: true,
                    type: "success",
                })
            );
            navigate('/');
        } catch (error) {
            console.error("Failed to delete post:", error);
            dispatch(
                showNotification({
                    message: __("Failed to delete post", "zencommunity"),
                    isShow: true,
                    type: "error",
                })
            );
        } finally {
            setConfirmedPopUp(false);
        }
    };

    const handleApprovePost = async () => {
        setApprovalLoading('approve');
        try {
            await dispatch(approveFeedPost(singleFeedData?.id));
            dispatch(showNotification({ message: __('Post approved.', 'zencommunity'), isShow: true, type: 'success' }));
            setSingleFeedData(prev => prev ? { ...prev, status: 'approved' } : prev);
        } catch (err) {
            dispatch(showNotification({ message: __('Failed to approve post.', 'zencommunity'), isShow: true, type: 'error' }));
        } finally {
            setApprovalLoading(null);
        }
    };

    const handleRejectPost = async () => {
        setApprovalLoading('reject');
        try {
            await dispatch(rejectFeedPost(singleFeedData?.id));
            dispatch(showNotification({ message: __('Post rejected.', 'zencommunity'), isShow: true, type: 'success' }));
            setSingleFeedData(prev => prev ? { ...prev, status: 'rejected' } : prev);
        } catch (err) {
            dispatch(showNotification({ message: __('Failed to reject post.', 'zencommunity'), isShow: true, type: 'error' }));
        } finally {
            setApprovalLoading(null);
        }
    };

    const deleteBtn = postOwner ? [
        {
            label: __("Delete", "zencommunity"),
            icon: FaRegTrashAlt,
            type: "button",
            onClick: () => setConfirmedPopUp(true),
            disabled: !canDelete,
        },
    ] : [];

    const userCanEdit = postOwner ? [
        {
            label: __("Edit", "zencommunity"),
            icon: edit,
            type: "button",
            onClick: () => { setIsOpenPostEdit(true) },
            hasBorder: true,
        },
    ] : [];

    const handleCopyLink = () => {
        const sharableLink = baseURL(`/feed/${singleFeedData?.id}`);

        copyToClipboard(sharableLink);

        dispatch(
            showNotification({
                message: __("Link copied", "zencommunity"),
                isShow: true,
                type: "success",
            })
        );
    };

    const bookmarkBtn = current_logged_user?.user_id ? [
        {
            label: singleFeedData?.is_bookmarked ? __("Remove Bookmark", "zencommunity") : __("Bookmark", "zencommunity"),
            icon: singleFeedData?.is_bookmarked ? MdBookmark : MdOutlineBookmarkBorder,
            type: "button",
            onClick: () => {
                const wasBookmarked = !!singleFeedData?.is_bookmarked;
                dispatch(toggleBookmark({ feedId: singleFeedData?.id })).then(() => {
                    setSingleFeedData(prev => prev ? { ...prev, is_bookmarked: !prev.is_bookmarked } : prev);
                    dispatch(showNotification({
                        message: wasBookmarked ? __('Bookmark removed', 'zencommunity') : __('Bookmarked', 'zencommunity'),
                        isShow: true,
                        type: 'success',
                    }));
                });
            },
        },
    ] : [];

    const featureBtn = (isGroupAdmin && singleFeedData?.group_id) ? [
        {
            label: Number(singleFeedData?.is_featured) === 1 ? __('Remove from Featured', 'zencommunity') : __('Feature Post', 'zencommunity'),
            icon: Number(singleFeedData?.is_featured) === 1 ? MdOutlineStar : MdOutlineStarBorder,
            type: 'button',
            onClick: () => {
                dispatch(featureFeedPost({ feedId: singleFeedData?.id })).then(() => {
                    setSingleFeedData(prev => prev ? { ...prev, is_featured: Number(prev.is_featured) === 1 ? 0 : 1 } : prev);
                });
            },
        },
    ] : [];

    const reportBtn = (current_logged_user?.user_id && !postOwner) ? [
        {
            label: __("Report", "zencommunity"),
            icon: LuFlag,
            type: "button",
            onClick: () => setReportOpen(true),
        },
    ] : [];

    const menuOptions = [
        ...bookmarkBtn,
        {
            label: __("Copy the link", "zencommunity"),
            icon: FiLink,
            type: "button",
            onClick: handleCopyLink,
        },
        ...userCanEdit,
        ...featureBtn,
        ...reportBtn,
        ...deleteBtn,
    ];

    const bgTextStyle = singleFeedData?.meta?.background_color ? {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        justifyContent: 'center',
        padding: '40px',
        height: "345px",
        background: singleFeedData?.meta?.background_color,
        borderRadius: '4px',
        wordBreak: "break-all",
    } : {}

    return (
        <>
            <LeftContainer>
                <LeftSidebar />
            </LeftContainer>
            <CenterContainer>
                <Box
                    bg="var(--zencom-background)"
                    marginTop={{ base: "48px", lg: "24px" }}
                    height="fit-content"
                    borderRadius="8px"
                    minW={{ base: "calc(100% - 30px)", md: "calc(100% - 30px)", lg: "680px" }}
                    maxW={{ base: "calc(100% - 30px)", md: "calc(100% - 30px)", lg: "680px"}}
                >
                    {dataFetchLoading ? (
                        <ZenComLoader maxW={{ base: "100%", md: "100%", lg: "600px" }} margin="20px auto" />
                    ) : (
                        <>
                            <Flex direction="column" gap={6} padding={4}>
                                {isOpenPostEdit ? (
                                    <Box p="16px" border="1px solid var(--zencom-border-color)" borderRadius="4px">
                                        <PostEditForm item={singleFeedData} onSubmitHandler={handleEditPost} cancelHandler={() => setIsOpenPostEdit(false)} />
                                    </Box>
                                ) : (
                                    <>
                                        <Flex alignItems="center" justifyContent="space-between">
                                            <ZenComAvatar
                                                variant="post-card"
                                                size='sm'
                                                fontWeight="500"
                                                userName={isAnonymous ? __('Anonymous member', 'zencommunity') : singleFeedData?.user_first_name + " " + singleFeedData?.user_last_name}
                                                userID={singleFeedData?.user_id}
                                                src={(!isAnonymous && singleFeedData?.user_avatar_url) ? site_url + singleFeedData?.user_avatar_url : (isAnonymousPlaceholder || plugin_root_url + "/assets/images/avatar_placeholder.png")}
                                                message={singleFeedData?.created_at}
                                                isTeamPost={isTeamPost}
                                                groupName={singleFeedData?.group_name}
                                                groupID={singleFeedData?.group_id}
                                                feeling={feelingsOptions.find(item => item?.value === singleFeedData?.meta?.feeling)}
                                                hasPermission={
                                                    singleFeedData?.author_role?.role === 'admin'
                                                        ? __('Admin', 'zencommunity')
                                                        : singleFeedData?.author_role?.role === 'moderator'
                                                            ? __('Moderator', 'zencommunity')
                                                            : null
                                                }
                                            />

                                            <ZenComMenu
                                                variant="transparent"
                                                options={menuOptions}
                                                suffix="postcard"
                                            />
                                        </Flex>

                                        {singleFeedData?.status === 'pending' && postOwner && (
                                            <Box
                                                bg="var(--zencom-secondary-color)"
                                                border="1px solid #f59e0b"
                                                borderRadius="4px"
                                                px={3}
                                                py={1}
                                                display="inline-flex"
                                                alignItems="center"
                                                gap={1}
                                            >
                                                <Text fontSize="12px" fontWeight="600" color="#b45309">
                                                    {__('Pending Approval', 'zencommunity')}
                                                </Text>
                                            </Box>
                                        )}

                                        <Box style={{ ...bgTextStyle }}>
                                            <MentionParser
                                                htmlString={singleFeedData?.rendered}
                                                isShowMoreOption={true}
                                                stringLength={250}
                                                background={singleFeedData?.meta?.background_color ?? ""}
                                            />
                                        </Box>

                                        {singleFeedData?.type === 'poll' && singleFeedData?.meta?.poll && (
                                            <PollDisplay
                                                feedId={singleFeedData.id}
                                                options={pollOptions}
                                                totalVotes={singleFeedData.meta.poll.total_votes ?? 0}
                                                userVotedOptionIds={singleFeedData.meta.poll.user_voted_option_ids ?? []}
                                                allowMultiple={singleFeedData.meta.poll.allow_multiple ?? false}
                                                expiresAt={singleFeedData.meta.poll.expires_at}
                                                isExpired={
                                                    singleFeedData.meta.poll.expires_at
                                                        ? new Date(singleFeedData.meta.poll.expires_at) < new Date()
                                                        : false
                                                }
                                            />
                                        )}

                                        {singleFeedData?.type === 'event' && localEvent && (
                                            <EventCard
                                                event={localEvent}
                                                onRsvpChange={(updatedEvent) => setLocalEvent(updatedEvent)}
                                            />
                                        )}

                                        {singleFeedData?.meta?.image_url && (
                                            <Box borderRadius="md" overflow="hidden">
                                                <img src={site_url + singleFeedData.meta.image_url} alt={__('Post image', 'zencommunity')} style={{ width: '100%' }} />
                                            </Box>
                                        )}
                                    </>
                                )}
                            </Flex>

                            <PostSummaryRow
                                feedItemData={singleFeedData}
                                onCommentsClick={() => setActiveView(activeView === "comments" ? '' : 'comments')}
                            />

                            {singleFeedData?.status === 'pending' && isGroupAdmin && (
                                <Flex gap={3} px={4} pb={3}>
                                    <Button
                                        variant="plain"
                                        size="sm"
                                        bg="var(--zencom-primary-color)"
                                        color="white"
                                        loading={approvalLoading === 'approve'}
                                        onClick={handleApprovePost}
                                    >
                                        {__('Approve', 'zencommunity')}
                                    </Button>
                                    <Button
                                        variant="plain"
                                        size="sm"
                                        border="1px solid"
                                        borderColor="var(--zencom-danger-color, #ef4444)"
                                        color="var(--zencom-danger-color, #ef4444)"
                                        bg="transparent"
                                        _hover={{ bg: 'var(--zencom-danger-color, #ef4444)', color: 'white' }}
                                        loading={approvalLoading === 'reject'}
                                        onClick={handleRejectPost}
                                    >
                                        {__('Reject', 'zencommunity')}
                                    </Button>
                                </Flex>
                            )}
                            <PostActionBar
                                feedItemData={singleFeedData}
                                reactToPost={(itemID, reactType = 'like') => {
                                    dispatch(reactToFeedPost({ feedId: parseInt(itemID), reactType })).then(() => {
                                        setSingleFeedData(applyReactionToPost(singleFeedData, reactType))
                                    })
                                }}
                                onCommentClick={() => {
                                    setActiveView('comments');
                                    setShowCommentField(true);
                                    setComposerFocusKey((key) => key + 1);
                                }}
                                onShareClick={() => setIsShareOpen(true)}
                            />

                            {activeView === "comments" && (
                                <Comments
                                    {...singleFeedData}
                                    permissions={permissions}
                                    showCommentField={showCommentField}
                                    setShowCommentField={setShowCommentField}
                                    composerFocusKey={composerFocusKey}
                                />
                            )}

                            {isShareOpen && (
                                <ZenComShare sharableLink={baseURL(`/feed/${singleFeedData?.id}`)} isShareOpen={isShareOpen} setIsShareOpen={setIsShareOpen} />
                            )}

                            <ConfirmPopup
                                isOpen={confirmedPopUp}
                                onConfirm={handleDeletePost}
                                onClose={() => setConfirmedPopUp(false)}
                                title={__('Delete post', 'zencommunity')}
                                message={<>
                                    <ZCLabel label={__('Are you sure you want to delete this Post?', 'zencommunity')} />
                                    <br />
                                    <ZCLabel type='simpleLight' color='#738496' label={__('Note: This action cannot be undone.', 'zencommunity')} />
                                </>}
                            />

                            <ReportModal
                                isOpen={reportOpen}
                                onClose={() => setReportOpen(false)}
                                objectType="feed"
                                objectId={singleFeedData?.id}
                            />
                        </>
                    )}
                </Box>
            </CenterContainer>
            <RightContainer>
                <RightSidebar />
            </RightContainer>
        </>
    )
};

export default SingleFeedPost;
