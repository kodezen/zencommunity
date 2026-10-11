import { Box, Checkbox, Flex } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import {API, namespace, ajaxurl, site_url, nonce } from '@Utils/helper';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import Select from '@Components/ReactSelect';
import { __ } from '@wordpress/i18n';
import { useFormikContext } from 'formik';
import IntegrationCard from './IntegrationCard';

const MasterStudyIntegrationSettings = () => {
    const [integrationEvents, setIntegrationEvents] = useState([]);
    const [masterStudyCourse, setMasterStudyCourses] = useState([]);
    const { values: { ms_course_ids, ms_events = []}, setFieldValue } = useFormikContext();

     useEffect(() => {
        API.get(`${namespace}/masterstudy/events`)
            .then(res => setIntegrationEvents(res?.data || []))
    }, [ms_course_ids]);
   

    const fetchCourses = (searchkey = "", page = 1, perPage = 100) => {
    let url = `${site_url}/wp-json/zencommunity/v1/masterstudy/courses?per_page=${perPage}&page=${page}`;

    if (searchkey) {
        url += `&search=${encodeURIComponent(searchkey)}`;
    }

    axios
        .get(url, {
        headers: {
            'X-WP-Nonce': nonce,
        },
        })
        .then((res) => {
        const records = res?.data?.records || [];

        if (records.length > 0) {
            const newData = records.map((item) => ({
            value: String(item?.ID),
            label: item?.post_title,
            }));

            setMasterStudyCourses(newData ?? []);
        } 
        })
    };
 


    useEffect(() => {
        fetchCourses();
    }, []);

    return (
        <Flex direction="column" gap={5} bg="var(--zencom-background)" borderRadius="6px" p={6} marginTop="40px">
            <ZCLabel type={'heading'} label={__("MasterStudy", 'zencommunity')} margin='0' padding='0 0 10px 0' borderBottomWidth="1px" />
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
                                    checked={ms_events.includes('course_enrollment')}
                                    onCheckedChange={(e) => {
                                        if (ms_events.includes('course_enrollment')) {
                                            const filtered = ms_events.filter(item => item !== 'course_enrollment');
                                            setFieldValue("ms_events", filtered)
                                        } else {
                                            setFieldValue("ms_events", [...ms_events, 'course_enrollment'])
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
                            checked={ms_events.includes('topic_completed')}
                            onCheckedChange={(e) => {
                                if (ms_events.includes('topic_completed')) {
                                    const filtered = ms_events.filter(item => item !== 'topic_completed');
                                    setFieldValue("ms_events", filtered)
                                } else {
                                    setFieldValue("ms_events", [...ms_events, 'topic_completed'])
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
                                    checked={ms_events.includes('course_complete')}
                                    onCheckedChange={(e) => {
                                        if (ms_events.includes('course_complete')) {
                                            const filtered = ms_events.filter(item => item !== 'course_complete');
                                            setFieldValue("ms_events", filtered)
                                        } else {
                                            setFieldValue("ms_events", [...ms_events, 'course_complete'])
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
                            checked={ms_events.includes('course_announcements')}
                            onCheckedChange={(e) => {
                                if (ms_events.includes('course_announcements')) {
                                    const filtered = ms_events.filter(item => item !== 'course_announcements');
                                    setFieldValue("ms_events", filtered)
                                } else {
                                    setFieldValue("ms_events", [...ms_events, 'course_announcements'])
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
                                    checked={ms_events.includes('user_question')}
                                    onCheckedChange={(e) => {
                                        if (ms_events.includes('user_question')) {
                                            const filtered = ms_events.filter(item => item !== 'user_question');
                                            setFieldValue("ms_events", filtered)
                                        } else {
                                            setFieldValue("ms_events", [...ms_events, 'user_question'])
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
                                    checked={ms_events.includes('question_answer')}
                                    onCheckedChange={(e) => {
                                        if (ms_events.includes('question_answer')) {
                                            const filtered = ms_events.filter(item => item !== 'question_answer');
                                            setFieldValue("ms_events", filtered)
                                        } else {
                                            setFieldValue("ms_events", [...ms_events, 'question_answer'])
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
                            checked={ms_events.includes('lesson_update')}
                            onCheckedChange={(e) => {
                                if (ms_events.includes('lesson_update')) {
                                    const filtered = ms_events.filter(item => item !== 'lesson_update');
                                    setFieldValue("ms_events", filtered)
                                } else {
                                    setFieldValue("ms_events", [...ms_events, 'lesson_update'])
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
                                    checked={ms_events.includes('lesson_completion')}
                                    onCheckedChange={(e) => {
                                        if (ms_events.includes('lesson_completion')) {
                                            const filtered = ms_events.filter(item => item !== 'lesson_completion');
                                            setFieldValue("ms_events", filtered)
                                        } else {
                                            setFieldValue("ms_events", [...ms_events, 'lesson_completion'])
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
                                    checked={ms_events.includes('quiz_start')}
                                    onCheckedChange={(e) => {
                                        if (ms_events.includes('quiz_start')) {
                                            const filtered = ms_events.filter(item => item !== 'quiz_start');
                                            setFieldValue("ms_events", filtered)
                                        } else {
                                            setFieldValue("ms_events", [...ms_events, 'quiz_start'])
                                        }
                                    }}
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                                </Checkbox.Root>
                            }
                        />
                    )}  */}
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
                                    checked={ms_events.includes('quiz_end')}
                                    onCheckedChange={(e) => {
                                        if (ms_events.includes('quiz_end')) {
                                            const filtered = ms_events.filter(item => item !== 'quiz_end');
                                            setFieldValue("ms_events", filtered)
                                        } else {
                                            setFieldValue("ms_events", [...ms_events, 'quiz_end'])
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
                    options={masterStudyCourse}
                    className="zen-com-select zen-com-select--width-full"
                    classNamePrefix="zen-com-select"
                    onInputChange={(searchkey) => fetchCourses(searchkey)}
                     value={
                        masterStudyCourse.filter((opt) =>
                            ms_course_ids?.includes(opt.value)
                        )
                    }
                    isMulti
                    menuPlacement="top"
                    getOptionLabel={(opt) => opt.label}
                    getOptionValue={(opt) => opt.value}
                    onChange={(selected) =>
                        setFieldValue(
                            'ms_course_ids',
                            selected.map((opt) => opt.value)
                        )
                    }
                />
            </Flex>
        </Flex>
    );
};

export default MasterStudyIntegrationSettings;