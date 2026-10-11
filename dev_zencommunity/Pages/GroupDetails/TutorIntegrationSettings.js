import { Box, Checkbox, Flex } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import {API, namespace, ajaxurl, site_url, nonce, tutor_nonce } from '@Utils/helper';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import Select from '@Components/ReactSelect';
import { __ } from '@wordpress/i18n';
import { useFormikContext } from 'formik';
import IntegrationCard from './IntegrationCard';

const TutorIntegrationSettings = () => {
    const [integrationEvents, setIntegrationEvents] = useState([]);
    const [tutorCourse, setTutorCourses] = useState([]);
    const { values: { tl_course_ids, tl_events }, setFieldValue } = useFormikContext();

     useEffect(() => {
        API.get(`${namespace}/tutorlms/events`)
            .then(res => setIntegrationEvents(res?.data || []))
    }, []);
   
        const fetchCourses = (searchkey = "") => {
            let url = '/wp-json/wp/v2/courses';
            if(searchkey) url += '?search='+searchkey 
            axios.get(site_url + url).then((res) => {
                const formatted = (res.data || []).map((item) => ({
                    value: String(item.id),
                    label:item?.title?.rendered
                }))
                setTutorCourses(formatted);
            })
        } 
      
     useEffect(() => {
        if (Array.isArray(tl_course_ids) && tl_course_ids.length > 0) {
            fetchCourses();
        }
    }, []);
       
    return (
        <Flex direction="column" gap={5} bg="var(--zencom-background)" borderRadius="6px" p={6} marginTop="40px">
            <ZCLabel type={'heading'} label={__("Tutor LMS", 'zencommunity')} margin='0' padding='0 0 10px 0' borderBottomWidth="1px" />
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
                                    checked={tl_events.includes('course_enrollment')}
                                    onCheckedChange={(e) => {
                                        if (tl_events.includes('course_enrollment')) {
                                            const filtered = tl_events.filter(item => item !== 'course_enrollment');
                                            setFieldValue("tl_events", filtered)
                                        } else {
                                            setFieldValue("tl_events", [...tl_events, 'course_enrollment'])
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
                                    <ZCLabel type="basic" label={__("User completes a topice", 'zencommunity')} margin="0" />
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
                                    checked={tl_events.includes('topic_completed')}
                                    onCheckedChange={(e) => {
                                        if (tl_events.includes('topic_completed')) {
                                            const filtered = tl_events.filter(item => item !== 'topic_completed');
                                            setFieldValue("tl_events", filtered)
                                        } else {
                                            setFieldValue("tl_events", [...tl_events, 'topic_completed'])
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
                                    checked={tl_events.includes('course_complete')}
                                    onCheckedChange={(e) => {
                                        if (tl_events.includes('course_complete')) {
                                            const filtered = tl_events.filter(item => item !== 'course_complete');
                                            setFieldValue("tl_events", filtered)
                                        } else {
                                            setFieldValue("tl_events", [...tl_events, 'course_complete'])
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
                            checked={tl_events.includes('course_announcements')}
                            onCheckedChange={(e) => {
                                if (tl_events.includes('course_announcements')) {
                                    const filtered = tl_events.filter(item => item !== 'course_announcements');
                                    setFieldValue("tl_events", filtered)
                                } else {
                                    setFieldValue("tl_events", [...tl_events, 'course_announcements'])
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
                            checked={tl_events.includes('user_question')}
                            onCheckedChange={(e) => {
                                if (tl_events.includes('user_question')) {
                                    const filtered = tl_events.filter(item => item !== 'user_question');
                                    setFieldValue("tl_events", filtered)
                                } else {
                                    setFieldValue("tl_events", [...tl_events, 'user_question'])
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
                            checked={tl_events.includes('question_answer')}
                            onCheckedChange={(e) => {
                                if (tl_events.includes('question_answer')) {
                                    const filtered = tl_events.filter(item => item !== 'question_answer');
                                    setFieldValue("tl_events", filtered)
                                } else {
                                    setFieldValue("tl_events", [...tl_events, 'question_answer'])
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
                            checked={tl_events.includes('lesson_update')}
                            onCheckedChange={(e) => {
                                if (tl_events.includes('lesson_update')) {
                                    const filtered = tl_events.filter(item => item !== 'lesson_update');
                                    setFieldValue("tl_events", filtered)
                                } else {
                                    setFieldValue("tl_events", [...tl_events, 'lesson_update'])
                                }
                            }}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                            <Checkbox.Label>{__("Lesson Update", 'zencommunity')}</Checkbox.Label>
                        </Checkbox.Root>
                    )} */}

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
                                    checked={tl_events.includes('quiz_start')}
                                    onCheckedChange={(e) => {
                                        if (tl_events.includes('quiz_start')) {
                                            const filtered = tl_events.filter(item => item !== 'quiz_start');
                                            setFieldValue("tl_events", filtered)
                                        } else {
                                            setFieldValue("tl_events", [...tl_events, 'quiz_start'])
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
                                    checked={tl_events.includes('quiz_end')}
                                    onCheckedChange={(e) => {
                                        if (tl_events.includes('quiz_end')) {
                                            const filtered = tl_events.filter(item => item !== 'quiz_end');
                                            setFieldValue("tl_events", filtered)
                                        } else {
                                            setFieldValue("tl_events", [...tl_events, 'quiz_end'])
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
                    options={tutorCourse}
                    className="zen-com-select zen-com-select--width-full"
                    classNamePrefix="zen-com-select"
                    onInputChange={(searchkey) => fetchCourses(searchkey)}
                    value={
                        tutorCourse.filter((opt) =>
                            tl_course_ids?.includes(opt.value)
                        )
                    }
                    isMulti
                    menuPlacement="top"
                    getOptionLabel={(opt) => opt.label}
                    getOptionValue={(opt) => opt.value}
                    onChange={(selected) =>
                        setFieldValue(
                            'tl_course_ids',
                            selected.map((opt) => opt.value)
                        )
                    }
                />
            </Flex>
        </Flex>
    );
};

export default TutorIntegrationSettings;