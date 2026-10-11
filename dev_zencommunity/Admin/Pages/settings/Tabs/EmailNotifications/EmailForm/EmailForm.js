import React, { useState } from 'react';
import ZCLabel from '../../../../../Components/Label';
import { __ } from '@wordpress/i18n';
import { Formik } from 'formik';
import CheckBoxAndSwitch from '../../../../../Components/CheckBoxAndSwitch';
import AutoSave from '../../../../../Components/AutoSave';
import { useDispatch } from 'react-redux';
import { updateCommunityEamilTemplate } from '@Redux/slices/settingsSlice/settingsSlice';
import { API, namespace } from '@Utils/helper';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import BlockEditor from '../../../../../Components/BlockEditor';
import Subtext from '../../../../../Components/Subtext';
import { Modal, Field } from '../../../../../Components/ui';

const EmailForm = ({ item, parentIdx }) => {
    const [openModal, setOpenModal] = useState(false);
    const [testMailLoading, setTestMailLoading] = useState(false);
    const dispatch = useDispatch();
    const descriptionVariable = {
        new_ticket: '{author_name} {ticket_title} {ticket_url} {conversation_url} {conversation_rendered}',
        ticket_conversation_created: '{author_name} {conversation_rendered} {ticket_url} {conversation_url}',
        ticket_reply_created: '{author_name} {conversation_rendered} {ticket_url} {conversation_url}',
        ticket_closed: '{ticket_title} {ticket_url}',
        ticket_reopened: '{ticket_title} {ticket_url}',
        ticket_assigned: '{author_name} {ticket_title} {ticket_url}',

        new_follower: '{follower_username}',

        feed_posted: '{author_name} {group_name} {feed_title} {feed_url}',
        feed_comment: '{author_name} {feed_title} {comment_rendered}',
        comment_reply: '{author_name} {feed_title} {comment_rendered}',

        mentioned_in_comment: '{author_name} {feed_title} {comment_rendered}',
        mentioned_in_feed: '{author_name} {feed_title}'
    };

    const onSubmitHandler = (values) => {
        dispatch(updateCommunityEamilTemplate({ parentIdx, formData: values }));
    }
    const handleSendTestMail = async (values) => {
        setTestMailLoading(true)
        try {
            const response = await API.post(namespace + '/email/test', {
                event: item.event
            })
            dispatch(
                showNotification({
                    message: __("Test Email Sent!", "zencommunity"),
                    isShow: true,
                    type: 'success',
                })
            );
        } catch (error) { } finally {
            setTestMailLoading(false)
        }
    }
    return (
        <Formik
            enableReinitialize={true}
            initialValues={{
                event: "",
                event_title: "",
                heading: "",
                status: "inactive",
                subject: "",
                template: "",
                ...item
            }}
            onSubmit={onSubmitHandler}
        >
            {({ values, setFieldValue }) => {
                return (
                    <>
                        <AutoSave debounceMs={1000} />
                        <div className="tw-flex tw-items-center tw-justify-between">
                            <div className="tw-flex tw-flex-col tw-items-start tw-gap-1">
                                <span className="tw-text-[14px] tw-font-medium" style={{ color: 'var(--zencom-font-color)' }}>{values.event_title}</span>
                                <Subtext>
                                    {values.heading}
                                </Subtext>
                            </div>
                            <div className="tw-flex tw-items-center tw-gap-6">
                                <button
                                    type="button"
                                    className="tw-inline-flex tw-cursor-pointer tw-items-center tw-rounded tw-border-0 tw-bg-zc-primary tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white hover:tw-opacity-90"
                                    onClick={() => setOpenModal(true)}
                                >
                                    {__("Customize", "zencommunity")}
                                </button>
                                <CheckBoxAndSwitch
                                    name=""
                                    w="100%"
                                    isChecked={values.status === "active"}
                                    onChange={(e) => {
                                        const checked = e;
                                        setFieldValue("status", checked ? "active" : "inactive")
                                    }}
                                />
                            </div>
                        </div>

                        {openModal && (
                            <Modal
                                title={<ZCLabel label={__('Email', 'zencommunity')} />}
                                onClose={() => setOpenModal(false)}
                                size="lg"
                            >
                                <div className="tw-flex tw-flex-col tw-gap-4 lg:tw-flex-row">
                                    <div className="tw-flex-1 tw-pr-4 lg:tw-border-0 lg:tw-border-r lg:tw-border-solid lg:tw-border-zc-border">
                                        <div
                                            className="tw-flex tw-h-[48px] tw-items-center tw-border-0 tw-border-b tw-border-solid tw-border-zc-border tw-bg-[var(--zencom-body-background)] tw-px-6"
                                        >
                                            <span
                                                className="tw-h-6 tw-text-[16px] tw-font-medium"
                                                style={{ color: 'var(--zencom-font-color)' }}
                                            >
                                                {__("Details", "zencommunity")}
                                            </span>
                                        </div>
                                        <div className="tw-flex tw-w-full tw-flex-col tw-gap-4 tw-py-6 tw-pl-0 tw-pr-6">
                                            <Field label={__("Subject", "zencommunity")} required>
                                                <input
                                                    type="text"
                                                    name="subject"
                                                    placeholder={__("Enter subject", "zencommunity")}
                                                    value={values.subject}
                                                    onChange={(e) => setFieldValue("subject", e.target.value)}
                                                    className="tw-m-0 tw-block tw-w-full tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-2 tw-text-sm tw-text-zc-fg focus:tw-border-zc-primary focus:tw-outline-none"
                                                />
                                            </Field>
                                            <Field label={__("Email heading", "zencommunity")} required>
                                                <input
                                                    type="text"
                                                    name="heading"
                                                    placeholder={__("Enter email heading", "zencommunity")}
                                                    value={values.heading}
                                                    onChange={(e) => setFieldValue("heading", e.target.value)}
                                                    className="tw-m-0 tw-block tw-w-full tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-2 tw-text-sm tw-text-zc-fg focus:tw-border-zc-primary focus:tw-outline-none"
                                                />
                                            </Field>
                                            <div>
                                                <span className="tw-mb-1.5 tw-block tw-text-[14px] tw-font-medium tw-text-zc-fg">{__("Footer text", "zencommunity")}</span>
                                                <BlockEditor
                                                    placeholder={__('Thank you', 'zencommunity')}
                                                    defaultValue={values?.template}
                                                    name={'template'}
                                                    saveValueHandler={setFieldValue}
                                                    suffix={'email-footer' + parentIdx}
                                                    maxHeight="572px"
                                                />
                                                <div className="tw-mt-1 tw-text-right">
                                                    <ZCLabel type='subtitle' fontSize='12px' fontWeight='500' lineHeight={'20px'} label={__('Variables:', 'zencommunity') + " " + descriptionVariable[item?.event]} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="tw-flex tw-flex-1 tw-flex-col">
                                        <div className="tw-flex tw-h-[48px] tw-shrink-0 tw-items-center tw-justify-between tw-border-0 tw-border-b tw-border-solid tw-border-zc-border tw-bg-[var(--zencom-body-background)] tw-px-6">
                                            <span
                                                className="tw-h-6 tw-text-[16px] tw-font-medium"
                                                style={{ color: 'var(--zencom-font-color)' }}
                                            >
                                                {__("Preview", "zencommunity")}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleSendTestMail}
                                                disabled={testMailLoading}
                                                className="tw-inline-flex tw-max-h-[26px] tw-cursor-pointer tw-items-center tw-gap-1.5 tw-rounded tw-border-0 tw-bg-[#22A06B] tw-p-[8px]  tw-text-sm tw-font-medium tw-leading-4 tw-text-white disabled:tw-cursor-not-allowed disabled:tw-opacity-50"
                                            >
                                                {testMailLoading && (
                                                    <span className="tw-h-3 tw-w-3 tw-animate-spin tw-rounded-full tw-border-2 tw-border-white/40 tw-border-t-white" />
                                                )}
                                                {__("Send test mail", "zencommunity")}
                                            </button>
                                        </div>

                                        <div className="tw-flex tw-flex-1 tw-flex-col tw-py-6 tw-pl-0 tw-pr-0">
                                            <div
                                                className="tw-pointer-events-none tw-min-h-[300px] tw-flex-1 tw-rounded tw-bg-white tw-border tw-border-solid tw-border-zc-border"
                                            >
                                                <iframe
                                                    width={'100%'}
                                                    height={'100%'}
                                                    title={__('Template Preview', 'zencommunity')}
                                                    srcDoc={values.template}
                                                ></iframe>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Modal>
                        )}
                    </>
                );
            }}
        </Formik>
    );
};

export default EmailForm;
