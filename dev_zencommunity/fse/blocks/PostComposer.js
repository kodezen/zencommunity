import React from 'react';
import { useDispatch } from 'react-redux';
import Posts from '@Components/Posts';
import { createFeedPost } from '@Redux/slices/feedSlice/feedSlice';
import { createTicket } from '@Redux/slices/ticketSlice/ticketSlice';
import { current_logged_user } from '@Utils/helper';

/**
 * Standalone "start a post" composer block. Reuses the same <Posts> composer
 * the feed uses; the submit handler mirrors Pages/Feed/FeedPosts.js so a post
 * created here behaves identically to one created from the feed.
 */
const PostComposer = () => {
    const dispatch = useDispatch();

    const onSubmitHandler = async (values, actions, setSelectedTab, selectedTab) => {
        try {
            actions.setSubmitting(true);
            let formData = {
                type: values.type,
                status: values.status,
                content: values.content,
                title: values.title,
                scheduled_at: values.scheduled_at ?? '',
                meta: {
                    ...values.meta,
                    is_anonymous: selectedTab === 'anonymous',
                },
            };

            if (values?.add_media_ids?.length > 0) {
                formData = { ...formData, add_media_ids: values.add_media_ids };
            }

            if (selectedTab === 'post' || selectedTab === 'anonymous' || selectedTab === 'poll' || selectedTab === 'video' || selectedTab === 'audio') {
                await dispatch(createFeedPost({ group_id: values.group_id, formData })).unwrap();
                actions.setValues({
                    group_id: 0,
                    title: '',
                    content: '',
                    status: 'published',
                    scheduled_at: '',
                    meta: {},
                });
            } else if (selectedTab === 'tickets') {
                await dispatch(
                    createTicket({
                        title: values.title,
                        content: values.content,
                        product_id: values.product_id,
                        type_id: values.type_id,
                        priority_id: values.priority_id,
                    })
                ).unwrap();
                actions.setValues({
                    title: '',
                    content: '',
                    product_id: 0,
                    type_id: 0,
                    priority_id: 0,
                });
            }
            actions.resetForm();
            setSelectedTab(null);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Form submission failed:', error);
        } finally {
            actions.setSubmitting(false);
        }
    };

    if (!current_logged_user?.user_id) return null;

    return <Posts onSubmitHandler={onSubmitHandler} />;
};

export default PostComposer;
