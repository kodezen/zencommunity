import { Box, Checkbox, Flex } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import {API, namespace, ajaxurl, site_url, nonce, learnpress_nonce } from '@Utils/helper';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import Select from '@Components/ReactSelect';
import { __ } from '@wordpress/i18n';
import { useFormikContext } from 'formik';
import IntegrationCard from './IntegrationCard';

const LearnPressIntegrationSettings = () => {
    const [integrationEvents, setIntegrationEvents] = useState([]);
    const [learnPressCourse, setLearnPressCourses] = useState([]);
    const { values: { lp_course_ids, lp_events = []}, setFieldValue } = useFormikContext();

     useEffect(() => {
        API.get(`${namespace}/learnpress/events`)
            .then(res => setIntegrationEvents(res?.data || []))
    }, [lp_course_ids]);
   
        const fetchCourses = (searchkey = "") => {
            let url = '/wp-json/learnpress/v1/courses';
            if(searchkey) url += '?search='+searchkey 
            axios.get(site_url + url).then((res) => {
                const formatted = (res.data || []).map((item) => ({
                    value: String(item.id),
                    label:item?.name
                }))
                setLearnPressCourses(formatted);
            })
        } 

    useEffect(() => {
        fetchCourses();
    }, []);

    return (
        <Flex direction="column" gap={5} bg="var(--zencom-background)" borderRadius="6px" p={6} marginTop="40px">
            <ZCLabel type={'heading'} label={__("LearnPress", 'zencommunity')} margin='0' padding='0 0 10px 0' borderBottomWidth="1px" />
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
                                    checked={lp_events.includes('course_enrollment')}
                                    onCheckedChange={(e) => {
                                        if (lp_events.includes('course_enrollment')) {
                                            const filtered = lp_events.filter(item => item !== 'course_enrollment');
                                            setFieldValue("lp_events", filtered)
                                        } else {
                                            setFieldValue("lp_events", [...lp_events, 'course_enrollment'])
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
                            checked={lp_events.includes('topic_completed')}
                            onCheckedChange={(e) => {
                                if (lp_events.includes('topic_completed')) {
                                    const filtered = lp_events.filter(item => item !== 'topic_completed');
                                    setFieldValue("lp_events", filtered)
                                } else {
                                    setFieldValue("lp_events", [...lp_events, 'topic_completed'])
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
                                    <ZCLabel type="basic" label={__("User completes a course", 'zencommunity')} margin="0" />
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
                                    checked={lp_events.includes('course_complete')}
                                    onCheckedChange={(e) => {
                                        if (lp_events.includes('course_complete')) {
                                            const filtered = lp_events.filter(item => item !== 'course_complete');
                                            setFieldValue("lp_events", filtered)
                                        } else {
                                            setFieldValue("lp_events", [...lp_events, 'course_complete'])
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
                            checked={lp_events.includes('course_announcements')}
                            onCheckedChange={(e) => {
                                if (lp_events.includes('course_announcements')) {
                                    const filtered = lp_events.filter(item => item !== 'course_announcements');
                                    setFieldValue("lp_events", filtered)
                                } else {
                                    setFieldValue("lp_events", [...lp_events, 'course_announcements'])
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
                                    <ZCLabel type="basic" label={__("User submits a question", 'zencommunity')} margin="0" />
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
                                    checked={lp_events.includes('user_question')}
                                    onCheckedChange={(e) => {
                                        if (lp_events.includes('user_question')) {
                                            const filtered = lp_events.filter(item => item !== 'user_question');
                                            setFieldValue("lp_events", filtered)
                                        } else {
                                            setFieldValue("lp_events", [...lp_events, 'user_question'])
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
                                    <ZCLabel type="basic" label={__("User answers a question", 'zencommunity')} margin="0" />
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
                                    checked={lp_events.includes('question_answer')}
                                    onCheckedChange={(e) => {
                                        if (lp_events.includes('question_answer')) {
                                            const filtered = lp_events.filter(item => item !== 'question_answer');
                                            setFieldValue("lp_events", filtered)
                                        } else {
                                            setFieldValue("lp_events", [...lp_events, 'question_answer'])
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
                            checked={lp_events.includes('lesson_update')}
                            onCheckedChange={(e) => {
                                if (lp_events.includes('lesson_update')) {
                                    const filtered = lp_events.filter(item => item !== 'lesson_update');
                                    setFieldValue("lp_events", filtered)
                                } else {
                                    setFieldValue("lp_events", [...lp_events, 'lesson_update'])
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
                                    <ZCLabel type="basic" label={__("User completes a lesson", 'zencommunity')} margin="0" />
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
                                    checked={lp_events.includes('lesson_completion')}
                                    onCheckedChange={(e) => {
                                        if (lp_events.includes('lesson_completion')) {
                                            const filtered = lp_events.filter(item => item !== 'lesson_completion');
                                            setFieldValue("lp_events", filtered)
                                        } else {
                                            setFieldValue("lp_events", [...lp_events, 'lesson_completion'])
                                        }
                                    }}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                                </Checkbox.Root>
                            }
                        />
                    )}

                    {integrationEvents?.includes('quiz_start') && (
                        <IntegrationCard
                            content={
                                <Flex direction="column" width="100%" gap="8px" >
                                    <ZCLabel type="basic" label={__("User starts a quiz", 'zencommunity')} margin="0" />
                                    <ZCLabel
                                        type="custom"
                                        label={__("Logs quiz participation as a community activity.", 'zencommunity')}
                                        margin="0"
                                        color="#738496"
                                        fontSize="14px"
                                        fontWeight="500"
                                    />
                                </Flex>
                            }
                            checkbox={
                                <Checkbox.Root
                                    checked={lp_events.includes('quiz_start')}
                                    onCheckedChange={(e) => {
                                        if (lp_events.includes('quiz_start')) {
                                            const filtered = lp_events.filter(item => item !== 'quiz_start');
                                            setFieldValue("lp_events", filtered)
                                        } else {
                                            setFieldValue("lp_events", [...lp_events, 'quiz_start'])
                                        }
                                    }}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                                </Checkbox.Root>
                            }
                        />
                    )} 
                    {integrationEvents?.includes('quiz_end') && (
                        <IntegrationCard
                            content={
                                <Flex direction="column" width="100%" gap="8px" >
                                    <ZCLabel type="basic" label={__("User completes a quiz", 'zencommunity')} margin="0" />
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
                                    checked={lp_events.includes('quiz_end')}
                                    onCheckedChange={(e) => {
                                        if (lp_events.includes('quiz_end')) {
                                            const filtered = lp_events.filter(item => item !== 'quiz_end');
                                            setFieldValue("lp_events", filtered)
                                        } else {
                                            setFieldValue("lp_events", [...lp_events, 'quiz_end'])
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
                    options={learnPressCourse}
                    className="zen-com-select zen-com-select--width-full"
                    classNamePrefix="zen-com-select"
                    onInputChange={(searchkey) => fetchCourses(searchkey)}
                    value={
                        learnPressCourse.filter((opt) =>
                            lp_course_ids?.includes(opt.value)
                        )
                    }
                    isMulti
                    menuPlacement="top"
                    getOptionLabel={(opt) => opt.label}
                    getOptionValue={(opt) => opt.value}
                    onChange={(selected) =>
                        setFieldValue(
                            'lp_course_ids',
                            selected.map((opt) => opt.value)
                        )
                    }
                />
            </Flex>
        </Flex>
    );
};

export default LearnPressIntegrationSettings;