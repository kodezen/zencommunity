import { Box, Checkbox, Flex } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import {API, namespace, site_url, nonce } from '@Utils/helper';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import Select from '@Components/ReactSelect';
import { __ } from '@wordpress/i18n';
import { useFormikContext } from 'formik';
import IntegrationCard from './IntegrationCard';

const LifterLmsIntegrationSettings = () => {
    const [integrationEvents, setIntegrationEvents] = useState([]);
    const [lifterCourse, setLifterCourses] = useState([]);
    const { values: { llms_course_ids, llms_events }, setFieldValue } = useFormikContext();

     useEffect(() => {
        API.get(`${namespace}/lifterlms/events`)
            .then(res => setIntegrationEvents(res?.data || []))
    }, [llms_course_ids]);


    const fetchCourses = (searchkey = "") => {
        axios.get(`${site_url}/wp-json/llms/v1/courses`,
            {
                headers: {
                    'X-WP-Nonce': nonce
                }}
        )
        .then(res=> {
            if(res?.data?.length > 0){
                const newData = res?.data?.map(item=>({value: String(item?.id), label: item?.title?.rendered}
            )) 
            setLifterCourses(newData ?? [])
            }
        })
    }
   
    useEffect(() => {
        fetchCourses();
    }, []);

    return (
        <Flex direction="column" gap={5} bg="var(--zencom-background)" borderRadius="6px" p={6} marginTop="40px">
            <ZCLabel type={'heading'} label={__("Lifter LMS", 'zencommunity')} margin='0' padding='0 0 10px 0' borderBottomWidth="1px" />
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
                                    <ZCLabel type="basic" label={__("When a user enrolls in a course", 'zencommunity')} margin="0" />
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
                                    checked={llms_events.includes('course_enrollment')}
                                    onCheckedChange={(e) => {
                                        if (llms_events.includes('course_enrollment')) {
                                            const filtered = llms_events.filter(item => item !== 'course_enrollment');
                                            setFieldValue("llms_events", filtered)
                                        } else {
                                            setFieldValue("llms_events", [...llms_events, 'course_enrollment'])
                                        }
                                    }}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                                </Checkbox.Root>
                            }
                        />
                    )}
                    {/* {integrationEvents?.includes('topic_completed') && (
                        <Checkbox.Root
                            checked={llms_events.includes('topic_completed')}
                            onCheckedChange={(e) => {
                                if (llms_events.includes('topic_completed')) {
                                    const filtered = llms_events.filter(item => item !== 'topic_completed');
                                    setFieldValue("llms_events", filtered)
                                } else {
                                    setFieldValue("llms_events", [...llms_events, 'topic_completed'])
                                }
                            }}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                            <Checkbox.Label color={'var(--zencom-font-color)'}>{__("Topic Complete", 'zencommunity')}</Checkbox.Label>
                        </Checkbox.Root>
                    )} */}
                    {integrationEvents?.includes('course_complete') && (
                        <IntegrationCard
                            content={
                                <Flex direction="column" width="100%" gap="8px" >
                                    <ZCLabel type="basic" label={__("When a user completes a course", 'zencommunity')} margin="0" />
                                    <ZCLabel
                                        type="custom"
                                        label={__("Shares a community post when a student finishes a course.", 'zencommunity')}
                                        margin="0"
                                        color="#738496"
                                        fontSize="14px"
                                        fontWeight="500"
                                    />
                                </Flex>
                            }
                            checkbox={
                                <Checkbox.Root
                                    checked={llms_events.includes('course_complete')}
                                    onCheckedChange={(e) => {
                                        if (llms_events.includes('course_complete')) {
                                            const filtered = llms_events.filter(item => item !== 'course_complete');
                                            setFieldValue("llms_events", filtered)
                                        } else {
                                            setFieldValue("llms_events", [...llms_events, 'course_complete'])
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
                            checked={llms_events.includes('course_announcements')}
                            onCheckedChange={(e) => {
                                if (llms_events.includes('course_announcements')) {
                                    const filtered = llms_events.filter(item => item !== 'course_announcements');
                                    setFieldValue("llms_events", filtered)
                                } else {
                                    setFieldValue("llms_events", [...llms_events, 'course_announcements'])
                                }
                            }}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                            <Checkbox.Label>{__("Course Announcements", 'zencommunity')}</Checkbox.Label>
                        </Checkbox.Root>
                    )} */}
                    {integrationEvents?.includes('user_question') && (
                        <IntegrationCard
                            content={
                                <Flex direction="column" width="100%" gap="8px" >
                                    <ZCLabel type="basic" label={__("When a user submits a question", 'zencommunity')} margin="0" />
                                    <ZCLabel
                                        type="custom"
                                        label={__("Creates a community post when a learner asks a course question.", 'zencommunity')}
                                        margin="0"
                                        color="#738496"
                                        fontSize="14px"
                                        fontWeight="500"
                                    />
                                </Flex>
                            }
                            checkbox={
                                <Checkbox.Root
                                    checked={llms_events.includes('user_question')}
                                    onCheckedChange={(e) => {
                                        if (llms_events.includes('user_question')) {
                                            const filtered = llms_events.filter(item => item !== 'user_question');
                                            setFieldValue("llms_events", filtered)
                                        } else {
                                            setFieldValue("llms_events", [...llms_events, 'user_question'])
                                        }
                                    }}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                                </Checkbox.Root>
                            }
                        />
                    )}
                    {integrationEvents?.includes('question_answer') && (
                        <IntegrationCard
                            content={
                                <Flex direction="column" width="100%" gap="8px" >
                                    <ZCLabel type="basic" label={__("When a user answers a question", 'zencommunity')} margin="0" />
                                    <ZCLabel
                                        type="custom"
                                        label={__("Posts an update when a question receives an answer.", 'zencommunity')}
                                        margin="0"
                                        color="#738496"
                                        fontSize="14px"
                                        fontWeight="500"
                                    />
                                </Flex>
                            }
                            checkbox={
                                <Checkbox.Root
                                    checked={llms_events.includes('question_answer')}
                                    onCheckedChange={(e) => {
                                        if (llms_events.includes('question_answer')) {
                                            const filtered = llms_events.filter(item => item !== 'question_answer');
                                            setFieldValue("llms_events", filtered)
                                        } else {
                                            setFieldValue("llms_events", [...llms_events, 'question_answer'])
                                        }
                                    }}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                                </Checkbox.Root>
                            }
                        />
                    )}
                   {/* {integrationEvents?.includes('lesson_update') && (
                        <Checkbox.Root
                            checked={llms_events.includes('lesson_update')}
                            onCheckedChange={(e) => {
                                if (llms_events.includes('lesson_update')) {
                                    const filtered = llms_events.filter(item => item !== 'lesson_update');
                                    setFieldValue("llms_events", filtered)
                                } else {
                                    setFieldValue("llms_events", [...llms_events, 'lesson_update'])
                                }
                            }}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                            <Checkbox.Label>{__("Lesson Update", 'zencommunity')}</Checkbox.Label>
                        </Checkbox.Root>
                    )} */}
                    {integrationEvents?.includes('lesson_completion') && (
                        <IntegrationCard
                            content={
                                <Flex direction="column" width="100%" gap="8px" >
                                    <ZCLabel type="basic" label={__("When a user completes a lesson", 'zencommunity')} margin="0" />
                                    <ZCLabel
                                        type="custom"
                                        label={__("Creates a community post when a learner completes a lesson.", 'zencommunity')}
                                        margin="0"
                                        color="#738496"
                                        fontSize="14px"
                                        fontWeight="500"
                                    />
                                </Flex>
                            }
                            checkbox={
                                <Checkbox.Root
                                    checked={llms_events.includes('lesson_completion')}
                                    onCheckedChange={(e) => {
                                        if (llms_events.includes('lesson_completion')) {
                                            const filtered = llms_events.filter(item => item !== 'lesson_completion');
                                            setFieldValue("llms_events", filtered)
                                        } else {
                                            setFieldValue("llms_events", [...llms_events, 'lesson_completion'])
                                        }
                                    }}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                                </Checkbox.Root>
                            }
                        />
                    )}

                    {/* {integrationEvents?.includes('quiz_start') && (
                        <Checkbox.Root
                            checked={llms_events.includes('quiz_start')}
                            onCheckedChange={(e) => {
                                if (llms_events.includes('quiz_start')) {
                                    const filtered = llms_events.filter(item => item !== 'quiz_start');
                                    setFieldValue("llms_events", filtered)
                                } else {
                                    setFieldValue("llms_events", [...llms_events, 'quiz_start'])
                                }
                            }}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                            <Checkbox.Label color={'var(--zencom-font-color)'}>{__("Quiz Start", 'zencommunity')}</Checkbox.Label>
                        </Checkbox.Root>
                    )}  */}
                    {integrationEvents?.includes('quiz_end') && (
                        <IntegrationCard
                            content={
                                <Flex direction="column" width="100%" gap="8px" >
                                    <ZCLabel type="basic" label={__("When a user completes a quiz", 'zencommunity')} margin="0" />
                                    <ZCLabel
                                        type="custom"
                                        label={__("Shares quiz completion updates inside the community.", 'zencommunity')}
                                        margin="0"
                                        color="#738496"
                                        fontSize="14px"
                                        fontWeight="500"
                                    />
                                </Flex>
                            }
                            checkbox={
                                <Checkbox.Root
                                    checked={llms_events.includes('quiz_end')}
                                    onCheckedChange={(e) => {
                                        if (llms_events.includes('quiz_end')) {
                                            const filtered = llms_events.filter(item => item !== 'quiz_end');
                                            setFieldValue("llms_events", filtered)
                                        } else {
                                            setFieldValue("llms_events", [...llms_events, 'quiz_end'])
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
                    options={lifterCourse}
                    className="zen-com-select zen-com-select--width-full"
                    classNamePrefix="zen-com-select"
                    onInputChange={(searchkey) => fetchCourses(searchkey)}
                    value={
                        lifterCourse.filter((opt) =>
                            llms_course_ids?.includes(opt.value)
                        )
                    }
                    isMulti
                    menuPlacement="top"
                    getOptionLabel={(opt) => opt.label}
                    getOptionValue={(opt) => opt.value}
                    onChange={(selected) =>
                        setFieldValue(
                            'llms_course_ids',
                            selected.map((opt) => opt.value)
                        )
                    }
                />
            </Flex>
        </Flex>
    );
};

export default LifterLmsIntegrationSettings;