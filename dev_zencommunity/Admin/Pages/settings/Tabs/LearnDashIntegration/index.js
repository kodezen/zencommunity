import React, { useState, useEffect } from 'react';
import { Formik } from 'formik';
import ZenComTopBar from '../../../../Components/ZenComTopBar';
import { __ } from '@wordpress/i18n';
import { API, namespace } from '@Utils/helper';
import ZCLabel from '../../../../Components/Label';
import Subtext from '../../../../Components/Subtext';
import { PrimaryButton, Checkbox, Skeleton } from '../../../../Components/ui';

const EventToggle = ({ label, desc, checked, onChange }) => (
    <div className="tw-flex tw-cursor-pointer tw-items-center tw-justify-between tw-gap-[10px]">
        <div className="tw-flex tw-w-full tw-flex-col tw-gap-2">
            <ZCLabel type={'basic'} label={label} margin='0' />
            <Subtext>{desc}</Subtext>
        </div>
        <Checkbox checked={checked} onChange={onChange} />
    </div>
);

const LearnDashIntegration = () => {
    const [integrationEvents, setIntegratinEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        API.get(namespace + '/learndash/events').then(res => {
            setIntegratinEvents(res?.data || [])
        }).finally(() => setLoading(false))
    }, [])

    const handleSubmit = (values, action) => {
        action.setSubmitting(true)
        const { event } = values;
        API.post(namespace + '/learndash/events', { "events": event }).then(res => {
            setIntegratinEvents(event)
            action.setSubmitting(false)
        })
    }
    return (
        <div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
            <Formik
                enableReinitialize={true}
                initialValues={{
                    event: integrationEvents
                }}
                onSubmit={handleSubmit}
            >
                {({ values, handleSubmit, setFieldValue, dirty }) => {
                    return (
                        <>
                            <ZenComTopBar
                                isStickyScroll={true}
                                title={__("LearnDash Integration", "zencommunity")}
                                subtitle={__("Choose which LearnDash activities should create posts in your community..", "zencommunity")}
                                rightContent={
                                    <PrimaryButton onClick={handleSubmit} disabled={!dirty}>{__("Save changes", "zencommunity")}</PrimaryButton>
                                }
                            />

                            <div className="tw-flex tw-flex-col tw-gap-5 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
                              {loading ? [...Array(4)].map((_, idx) => (
                                <div key={idx} className="tw-flex tw-items-center tw-justify-between tw-gap-[10px]">
                                    <div className="tw-flex tw-w-full tw-flex-col tw-gap-2">
                                        <Skeleton className="tw-h-3.5 tw-w-1/3" />
                                        <Skeleton className="tw-h-3 tw-w-2/3" />
                                    </div>
                                    <Skeleton className="tw-h-4 tw-w-4 tw-shrink-0 tw-rounded" />
                                </div>
                              )) : (
                                <>
                                <EventToggle
                                    label={__("User enrolls in a course", 'zencommunity')}
                                    desc={__("Automatically posts an update when a learner joins a course.", 'zencommunity')}
                                    checked={values?.event.includes('course_enrollment')}
                                    onChange={() => {
                                        if (values.event.includes('course_enrollment')) {
                                            const filtered = values.event.filter(item => item !== 'course_enrollment');
                                            setFieldValue("event", filtered)
                                        } else {
                                            setFieldValue("event", [...values.event, 'course_enrollment'])
                                        }
                                    }}
                                />

                                <EventToggle
                                    label={__("User completes a topic", 'zencommunity')}
                                    desc={__("Shares a community post when a student completes a topic.", 'zencommunity')}
                                    checked={values?.event.includes('topic_completed')}
                                    onChange={() => {
                                        if (values.event.includes('topic_completed')) {
                                            const filtered = values.event.filter(item => item !== 'topic_completed');
                                            setFieldValue("event", filtered)
                                        } else {
                                            setFieldValue("event", [...values.event, 'topic_completed'])
                                        }
                                    }}
                                />

                                <EventToggle
                                    label={__("User completes a course", 'zencommunity')}
                                    desc={__("Shares a community post when a student finishes a course.", 'zencommunity')}
                                    checked={values?.event.includes('course_complete')}
                                    onChange={() => {
                                        if (values.event.includes('course_complete')) {
                                            const filtered = values.event.filter(item => item !== 'course_complete');
                                            setFieldValue("event", filtered)
                                        } else {
                                            setFieldValue("event", [...values.event, 'course_complete'])
                                        }
                                    }}
                                />

                                <EventToggle
                                    label={__("User completes a quiz", 'zencommunity')}
                                    desc={__("Shares quiz completion updates inside the community.", 'zencommunity')}
                                    checked={values?.event.includes('quiz_end')}
                                    onChange={() => {
                                        if (values.event.includes('quiz_end')) {
                                            const filtered = values.event.filter(item => item !== 'quiz_end');
                                            setFieldValue("event", filtered)
                                        } else {
                                            setFieldValue("event", [...values.event, 'quiz_end'])
                                        }
                                    }}
                                />
                                </>
                              )}
                            </div>
                        </>
                    )
                }}
            </Formik>
        </div>
    );
};

export default LearnDashIntegration;
