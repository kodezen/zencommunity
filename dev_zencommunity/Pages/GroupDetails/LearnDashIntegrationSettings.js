import { Box, Checkbox, Flex } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import {API, namespace, ajaxurl, learndash_nonce, site_url, nonce } from '@Utils/helper';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import Select from '@Components/ReactSelect';
import { __ } from '@wordpress/i18n';
import { useFormikContext } from 'formik';
import IntegrationCard from './IntegrationCard';

const LearndashIntegrationSettings = () => {
    const [integrationEvents, setIntegratinEvents] = useState([]);
    const [learndashCourse, setLearndashCourses] = useState([]);
    const { values: { ld_course_ids, ld_events }, setFieldValue } = useFormikContext();

    useEffect(() => {
        fetchCourses()
        API.get(namespace + '/learndash/events').then(res => {
            setIntegratinEvents(res?.data || [])
        })
    }, [])

    const fetchCourses = (searchkey = "") => {
        axios.get(`${site_url}/wp-json/ldlms/v2/sfwd-courses?per_page=100`,
            {
                headers: {
                    'X-WP-Nonce': nonce
                }}
        )
        .then(res=> {
            if(res?.data?.length > 0){
                const newData = res?.data.map(item=>({value: String(item?.id), label: item?.title?.rendered})) 
            setLearndashCourses(newData ?? [])
            }
        })
    }

    return (
        <Flex direction="column" gap={5} bg="var(--zencom-background)" borderRadius="6px" p={6} marginTop="40px">
            <ZCLabel type={'heading'} label={__("Learndash", 'zencommunity')} margin='0' padding='0 0 10px 0' borderBottomWidth="1px" />
            <Flex direction="column" width="100%">
                <ZCLabel type={'basic'} label={__("Select course activities", 'zencommunity')} margin='0' />
                <ZCLabel type={'simple'} label={__("Which activities should display in this group?", 'zencommunity')} margin='0' />
            </Flex>
            {/* checkboxs */}
            <Flex gap={'30px'} w={'100%'} justifyContent={'space-between'}>
                <Flex direction={'column'} gap={'24px'} marginTop={'20px'} cursor={'pointer'} w={'100%'}>
                    {integrationEvents?.includes('course_enrollment') && (
                        <IntegrationCard
                            content={
                                <Flex direction="column" width="100%" gap="8px" >
                                    <ZCLabel type="basic" label={__("User enrolls in a course", 'zencommunity')} margin="0" />
                                    <ZCLabel
                                        type="custom"
                                        label={__("Automatically posts an update when a learner joins a course.", 'zencommunity')}
                                        margin="0"
                                        color="#738496"
                                        fontSize="14px"
                                        fontWeight="500"
                                    />
                                </Flex>
                            }
                            checkbox={
                                <Checkbox.Root
                                    checked={ld_events.includes('course_enrollment')}
                                    onCheckedChange={(e) => {
                                        if (ld_events.includes('course_enrollment')) {
                                            const filtered = ld_events.filter(item => item !== 'course_enrollment');
                                            setFieldValue("ld_events", filtered)
                                        } else {
                                            setFieldValue("ld_events", [...ld_events, 'course_enrollment'])
                                        }
                                    }}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                                </Checkbox.Root>
                            }
                        />
                    )}
                    {integrationEvents?.includes('topic_completed') && (
                        <IntegrationCard
                                content={
                                    <Flex direction="column" width="100%" gap="8px" >
                                        <ZCLabel type="basic" label={__("User completes a topic", 'zencommunity')} margin="0" />
                                        <ZCLabel
                                            type="custom"
                                            label={__("Shares a community post when a student completes a topic.", "zencommunity")}
                                            margin="0"
                                            color="#738496"
                                            fontSize="14px"
                                            fontWeight="500"
                                        />
                                    </Flex>
                                }
                                checkbox={
                                    <Checkbox.Root
                                        checked={ld_events.includes('topic_completed')}
                                        onCheckedChange={(e) => {
                                            if (ld_events.includes('topic_completed')) {
                                                const filtered = ld_events.filter(item => item !== 'topic_completed');
                                                setFieldValue("ld_events", filtered)
                                            } else {
                                                setFieldValue("ld_events", [...ld_events, 'topic_completed'])
                                            }
                                        }}
                                    >
                                        <Checkbox.HiddenInput />
                                        <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                                    </Checkbox.Root>
                                }
                            />
                    )}
                    {integrationEvents?.includes('course_complete') && (
                        <IntegrationCard

                                content={
                                    <Flex direction="column" width="100%" gap="8px" >
                                        <ZCLabel type="basic" label={__("User completes a course", 'zencommunity')} margin="0" />
                                        <ZCLabel
                                            type="custom"
                                            label={__("Shares a community post when a student finishes a course.", "zencommunity")}
                                            margin="0"
                                            color="#738496"
                                            fontSize="14px"
                                            fontWeight="500"
                                        />
                                    </Flex>
                                }
                                checkbox={
                                    <Checkbox.Root
                                        checked={ld_events.includes('course_complete')}
                                        onCheckedChange={(e) => {
                                            if (ld_events.includes('course_complete')) {
                                                const filtered = ld_events.filter(item => item !== 'course_complete');
                                                setFieldValue("ld_events", filtered)
                                            } else {
                                                setFieldValue("ld_events", [...ld_events, 'course_complete'])
                                            }
                                        }}
                                    >
                                        <Checkbox.HiddenInput />
                                        <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                                    </Checkbox.Root>
                                }
                            />
                    )}
                    {/* {integrationEvents?.includes('course_announcements') && (
                        <Checkbox.Root
                            checked={ld_events.includes('course_announcements')}
                            onCheckedChange={(e) => {
                                if (ld_events.includes('course_announcements')) {
                                    const filtered = ld_events.filter(item => item !== 'course_announcements');
                                    setFieldValue("ld_events", filtered)
                                } else {
                                    setFieldValue("ld_events", [...ld_events, 'course_announcements'])
                                }
                            }}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                            <Checkbox.Label>{__("Course Announcements", 'zencommunity')}</Checkbox.Label>
                        </Checkbox.Root>
                    )}
                    {integrationEvents?.includes('user_question') && (
                        <Checkbox.Root
                            checked={ld_events.includes('user_question')}
                            onCheckedChange={(e) => {
                                if (ld_events.includes('user_question')) {
                                    const filtered = ld_events.filter(item => item !== 'user_question');
                                    setFieldValue("ld_events", filtered)
                                } else {
                                    setFieldValue("ld_events", [...ld_events, 'user_question'])
                                }
                            }}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                            <Checkbox.Label>{__("User Question", 'zencommunity')}</Checkbox.Label>
                        </Checkbox.Root>
                    )}
                </Flex>
                <Flex direction={'column'} gap={'10px'} marginTop={'20px'} cursor={'pointer'} w={'100%'}>
                    {integrationEvents?.includes('question_answer') && (
                        <Checkbox.Root
                            checked={events.includes('question_answer')}
                            onCheckedChange={(e) => {
                                if (ld_events.includes('question_answer')) {
                                    const filtered = ld_events.filter(item => item !== 'question_answer');
                                    setFieldValue("ld_events", filtered)
                                } else {
                                    setFieldValue("ld_events", [...ld_events, 'question_answer'])
                                }
                            }}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                            <Checkbox.Label>{__("Question Answer", 'zencommunity')}</Checkbox.Label>
                        </Checkbox.Root>
                    )}
                    {integrationEvents?.includes('lesson_update') && (
                        <Checkbox.Root
                            checked={ld_events.includes('lesson_update')}
                            onCheckedChange={(e) => {
                                if (ld_events.includes('lesson_update')) {
                                    const filtered = ld_events.filter(item => item !== 'lesson_update');
                                    setFieldValue("ld_events", filtered)
                                } else {
                                    setFieldValue("ld_events", [...ld_events, 'lesson_update'])
                                }
                            }}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                            <Checkbox.Label>{__("Lesson Update", 'zencommunity')}</Checkbox.Label>
                        </Checkbox.Root>
                    )}
                    {integrationEvents?.includes('quiz_start') && (
                        <Checkbox.Root
                            checked={ld_events.includes('quiz_start')}
                            onCheckedChange={(e) => {
                                if (ld_events.includes('quiz_start')) {
                                    const filtered = ld_events.filter(item => item !== 'quiz_start');
                                    setFieldValue("ld_events", filtered)
                                } else {
                                    setFieldValue("ld_events", [...ld_events, 'quiz_start'])
                                }
                            }}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                            <Checkbox.Label>{__("Quiz Start", 'zencommunity')}</Checkbox.Label>
                        </Checkbox.Root>
                    )} */}
                    {integrationEvents?.includes('quiz_end') && (
                        <IntegrationCard

                                content={
                                    <Flex direction="column" width="100%" gap="8px" >
                                        <ZCLabel type="basic" label={__("User completes a quiz", 'zencommunity')} margin="0" />
                                        <ZCLabel
                                            type="custom"
                                            label={__("Shares quiz completion updates inside the community.", "zencommunity")}
                                            margin="0"
                                            color="#738496"
                                            fontSize="14px"
                                            fontWeight="500"
                                        />
                                    </Flex>
                                }
                                checkbox={
                                    <Checkbox.Root
                                        checked={ld_events.includes('quiz_end')}
                                        onCheckedChange={(e) => {
                                            if (ld_events.includes('quiz_end')) {
                                                const filtered = ld_events.filter(item => item !== 'quiz_end');
                                                setFieldValue("ld_events", filtered)
                                            } else {
                                                setFieldValue("ld_events", [...ld_events, 'quiz_end'])
                                            }
                                        }}
                                    >
                                        <Checkbox.HiddenInput />
                                        <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                                    </Checkbox.Root>
                                }
                            />
                    )}
                </Flex>
            </Flex>
            {/* select */}
            <Flex direction={'column'} gap={'10px'} marginTop={'20px'} cursor={'pointer'}>
                <Flex direction="column" width="100%">
                    <ZCLabel type={'basic'} label={__("Select course", 'zencommunity')} margin='0' />
                    <ZCLabel type={'simple'} label={__("Choose your course you would like to associate with this group", 'zencommunity')} margin='0' />
                </Flex>
                <Select
                    options={learndashCourse}
                    className="zen-com-select zen-com-select--width-full"
                    classNamePrefix="zen-com-select"
                    onInputChange={(searchkey) => fetchCourses(searchkey)}
                    value={
                        learndashCourse.filter((opt) =>
                            ld_course_ids?.includes(opt.value)
                        )
                    }
                    isMulti
                    menuPlacement="top"
                    getOptionLabel={(opt) => opt.label}
                    getOptionValue={(opt) => opt.value}
                    onChange={(selected) =>
                        setFieldValue(
                            'ld_course_ids',
                            selected.map((opt) => opt.value)
                        )
                    }
                />

            </Flex>
        </Flex>
    );
};

export default LearndashIntegrationSettings;