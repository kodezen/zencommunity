import React, { useState } from 'react';
import { Formik } from 'formik';
import { useEffect } from 'react';
import ZenComTopBar from '../../../../Components/ZenComTopBar';
import { __ } from '@wordpress/i18n';
import { API, namespace } from '@Utils/helper';
import ZCLabel from '../../../../Components/Label';
import Subtext from '../../../../Components/Subtext';
import PolicySettings from './PolicySettings';
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

const AcademyIntegration = () => {
    const [integrationEvents, setIntegratinEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        API.get(namespace + '/academylms/events').then(res => {
            setIntegratinEvents(res?.data || [])
        }).finally(() => setLoading(false))
    }, [])

    const handleSubmit = (values, action) => {
        action.setSubmitting(true)
        const { event } = values;
        API.post(namespace + '/academylms/events', { "events": event }).then(res => {
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
                                title={__("Academy LMS Integration", "zencommunity")}
                                subtitle={__("Choose which Academy LMS activities should create posts in your community.", "zencommunity")}
                                rightContent={
                                    <PrimaryButton onClick={handleSubmit} disabled={!dirty}>{__("Save changes", "zencommunity")}</PrimaryButton>
                                }
                            />

                            <div className="tw-flex tw-flex-col tw-gap-5 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
                              {loading ? [...Array(8)].map((_, idx) => (
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
                                    label={__("User Enrolls in a Course", 'zencommunity')}
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
                                    label={__("Course Announcements", 'zencommunity')}
                                    desc={__("Publishes announcements directly to the community feed.", 'zencommunity')}
                                    checked={values?.event.includes('course_announcements')}
                                    onChange={() => {
                                        if (values.event.includes('course_announcements')) {
                                            const filtered = values.event.filter(item => item !== 'course_announcements');
                                            setFieldValue("event", filtered)
                                        } else {
                                            setFieldValue("event", [...values.event, 'course_announcements'])
                                        }
                                    }}
                                />
                                <EventToggle
                                    label={__("User submits a question", 'zencommunity')}
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
                                    label={__("User answers a question", 'zencommunity')}
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
                                    label={__("Lesson Update", 'zencommunity')}
                                    desc={__("Notifies the community when a lesson is added or updated.", 'zencommunity')}
                                    checked={values?.event.includes('lesson_update')}
                                    onChange={() => {
                                        if (values.event.includes('lesson_update')) {
                                            const filtered = values.event.filter(item => item !== 'lesson_update');
                                            setFieldValue("event", filtered)
                                        } else {
                                            setFieldValue("event", [...values.event, 'lesson_update'])
                                        }
                                    }}
                                />
                                <EventToggle
                                    label={__("User starts a quiz", 'zencommunity')}
                                    desc={__("Logs quiz participation as a community activity.", 'zencommunity')}
                                    checked={values?.event.includes('quiz_start')}
                                    onChange={() => {
                                        if (values.event.includes('quiz_start')) {
                                            const filtered = values.event.filter(item => item !== 'quiz_start');
                                            setFieldValue("event", filtered)
                                        } else {
                                            setFieldValue("event", [...values.event, 'quiz_start'])
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

                            <PolicySettings />
                        </>
                    )
                }}
            </Formik>
        </div>
    );
};

export default AcademyIntegration;
