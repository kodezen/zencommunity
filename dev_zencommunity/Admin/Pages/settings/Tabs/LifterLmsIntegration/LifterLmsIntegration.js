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

const LifterLmsIntegration = () => {
    const [integrationEvents, setIntegratinEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        API.get(namespace + '/lifterlms/events').then(res => {
            setIntegratinEvents(res?.data || [])
        }).finally(() => setLoading(false))
    }, [])

    const handleSubmit = (values, action) => {
        action.setSubmitting(true)
        const { event } = values;
        API.post(namespace + '/lifterlms/events', { "events": event }).then(res => {
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
                                title={__("LifterLMS Integration", "zencommunity")}
                                subtitle={__("Choose which LifterLMS activities should create posts in your community.", "zencommunity")}
                                rightContent={
                                    <PrimaryButton onClick={handleSubmit} disabled={!dirty}>{__("Save changes", "zencommunity")}</PrimaryButton>
                                }
                            />

                            <div className="tw-flex tw-flex-col tw-gap-5 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
                              {loading ? [...Array(6)].map((_, idx) => (
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
                                    label={__("When a user enrolls in a course", 'zencommunity')}
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
                                    label={__("When a user completes a course", 'zencommunity')}
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
                                    label={__("When a user submits a question", 'zencommunity')}
                                    desc={__("Creates a community post when a learner asks a course question.", 'zencommunity')}
                                    checked={values?.event.includes('user_question')}
                                    onChange={() => {
                                        if (values.event.includes('user_question')) {
                                            const filtered = values.event.filter(item => item !== 'user_question');
                                            setFieldValue("event", filtered)
                                        } else {
                                            setFieldValue("event", [...values.event, 'user_question'])
                                        }
                                    }}
                                />

                                <EventToggle
                                    label={__("When a user answers a question", 'zencommunity')}
                                    desc={__("Posts an update when a question receives an answer.", 'zencommunity')}
                                    checked={values?.event.includes('question_answer')}
                                    onChange={() => {
                                        if (values.event.includes('question_answer')) {
                                            const filtered = values.event.filter(item => item !== 'question_answer');
                                            setFieldValue("event", filtered)
                                        } else {
                                            setFieldValue("event", [...values.event, 'question_answer'])
                                        }
                                    }}
                                />

                                <EventToggle
                                    label={__("When a user completes a lesson", 'zencommunity')}
                                    desc={__("Creates a community post when a learner completes a lesson.", 'zencommunity')}
                                    checked={values?.event.includes('lesson_completion')}
                                    onChange={() => {
                                        if (values.event.includes('lesson_completion')) {
                                            const filtered = values.event.filter(item => item !== 'lesson_completion');
                                            setFieldValue("event", filtered)
                                        } else {
                                            setFieldValue("event", [...values.event, 'lesson_completion'])
                                        }
                                    }}
                                />

                                <EventToggle
                                    label={__("When a user completes a quiz", 'zencommunity')}
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

export default LifterLmsIntegration;
