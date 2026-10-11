import { Box, Checkbox, Flex } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { academy_nonce, API, namespace, ajaxurl } from '@Utils/helper';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import Select from '@Components/ReactSelect';
import { __ } from '@wordpress/i18n';
import { useFormikContext } from 'formik';
import IntegrationCard from './IntegrationCard';
import Subtext from '@Components/Labels/Subtext';

const AcademyIntegrationSettings = () => {
    const [integrationEvents, setIntegratinEvents] = useState([]);
    const [academyCourse, setAcademyCourses] = useState([]);
    const [academyCategories, setAcademyCategories] = useState([]);
    const { values: { course_ids, events, course_category_ids = [], course_settings = {} }, setFieldValue } = useFormikContext();

    const overrideValue = (key) => {
        const v = course_settings?.[key];
        if (v === undefined || v === null || v === '') return 'inherit';
        if (key === 'auto_join_role') return v;
        return v ? 'yes' : 'no';
    };
    const setOverride = (key, raw) => {
        const next = { ...(course_settings || {}) };
        if (raw === 'inherit') delete next[key];
        else if (key === 'auto_join_role') next[key] = raw;
        else next[key] = raw === 'yes';
        setFieldValue('course_settings', next);
    };
    const boolOpts = [
        { value: 'inherit', label: __('Default', 'zencommunity') },
        { value: 'yes', label: __('Enabled', 'zencommunity') },
        { value: 'no', label: __('Disabled', 'zencommunity') },
    ];

    // How an enabled event is delivered to the group: to the feed, as a
    // notification to group admins/moderators, or both.
    const deliveryOpts = [
        { value: 'feed', label: __('Post to feed', 'zencommunity') },
        { value: 'feed_and_notification', label: __('Feed + notification', 'zencommunity') },
        { value: 'notification', label: __('Notification only', 'zencommunity') },
    ];
    const deliveryMode = (key) => course_settings?.event_delivery?.[key] || 'feed';
    const setDeliveryMode = (key, mode) => {
        const next = {
            ...(course_settings || {}),
            event_delivery: { ...(course_settings?.event_delivery || {}), [key]: mode },
        };
        setFieldValue('course_settings', next);
    };
    const policyRows = [
        { key: 'membership_grants_access', label: __('Members get this course free', 'zencommunity'), opts: boolOpts },
        { key: 'auto_join_on_enroll', label: __('Auto-join this space on enrollment', 'zencommunity'), opts: boolOpts },
        { key: 'revoke_on_leave', label: __('Revoke access on leave / refund', 'zencommunity'), opts: boolOpts },
        { key: 'auto_join_role', label: __('Role when auto-joined', 'zencommunity'), opts: [
            { value: 'inherit', label: __('Default', 'zencommunity') },
            { value: 'member', label: __('Member', 'zencommunity') },
            { value: 'moderator', label: __('Moderator', 'zencommunity') },
        ] },
    ];

    useEffect(() => {
        fetchCourses()
        API.get(namespace + '/academylms/events').then(res => {
            setIntegratinEvents(res?.data || [])
        })
        API.get(namespace + '/academy/course-categories').then(res => {
            setAcademyCategories((res?.data || []).map(cat => ({ value: `${cat.id}`, label: `${cat.name} (${cat.count})` })))
        }).catch(() => {})
    }, [])

    const fetchCourses = (searchkey = "") => {
        let form_data = new FormData(); // eslint-disable-line
        if (!form_data.security) {
            form_data.append('security', academy_nonce);
        }
        form_data.append('action', `academy/fetch_posts`);
        form_data.append('postType', 'academy_courses');
        if (searchkey) form_data.append('search', searchkey);
        axios.post(ajaxurl, form_data).then(response => {
            const data = response?.data?.data?.map(item => ({ value: `${item?.value}`, label: item?.label }))
            setAcademyCourses(data ?? []);
        });
    }

    const toggleEvent = (key) => {
        if (events.includes(key)) {
            setFieldValue("events", events.filter(item => item !== key));
        } else {
            setFieldValue("events", [...events, key]);
        }
    };

    const eventDefinitions = [
        { key: 'course_enrollment', label: __("User Enrolls in a Course", 'zencommunity'), description: __("Automatically posts an update when a learner joins a course.", 'zencommunity') },
        { key: 'course_complete', label: __("User completes a course", 'zencommunity'), description: __("Shares a community post when a student finishes a course.", 'zencommunity') },
        { key: 'course_announcements', label: __("Course Announcements", 'zencommunity'), description: __("Publishes announcements directly to the community feed.", 'zencommunity') },
        { key: 'user_question', label: __("User submits a question", 'zencommunity'), description: __("Creates a community post when a learner asks a course question.", 'zencommunity') },
        { key: 'question_answer', label: __("User answers a question", 'zencommunity'), description: __("Posts an update when a question receives an answer.", 'zencommunity') },
        { key: 'lesson_update', label: __("Lesson Update", 'zencommunity'), description: __("Notifies the community when a lesson is added or updated.", 'zencommunity') },
        { key: 'quiz_start', label: __("User starts a quiz", 'zencommunity'), description: __("Logs quiz participation as a community activity.", 'zencommunity') },
        { key: 'quiz_end', label: __("User completes a quiz", 'zencommunity'), description: __("Shares quiz completion updates inside the community.", 'zencommunity') },
    ];

    const integrationData = eventDefinitions.map(({ key, label, description }) => ({
        key,
        label,
        description,
        content: (
            <>
                {integrationEvents?.includes(key) && (
                    <Flex alignItems="center" gap="12px">
                        {events.includes(key) && (
                            <Select
                                options={deliveryOpts}
                                className="zen-com-select zen-com-select--200"
                                classNamePrefix="zen-com-select"
                                value={deliveryOpts.find((o) => o.value === deliveryMode(key))}
                                onChange={(option) => setDeliveryMode(key, option.value)}
                            />
                        )}
                        <Checkbox.Root
                            checked={events.includes(key)}
                            onCheckedChange={() => toggleEvent(key)}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control colorPalette={'blue'} borderRadius="4px" cursor={'pointer'} />
                        </Checkbox.Root>
                    </Flex>
                )}
            </>
        ),
    }));

    return (
        <Flex direction="column" gap={5} bg="var(--zencom-background)" borderRadius="4px" p={6} marginTop="40px">
            <ZCLabel type={'heading'} label={__("Academy LMS", 'zencommunity')} padding='0 0 10px 0' margin='0' borderBottomWidth="1px" borderColor='var(--zencom-border-color)' />
            <Flex direction="column" width="100%">
                <ZCLabel type={'basic'} fontSize='16px' label={__("Select course activities", 'zencommunity')} margin='0' />
                <Subtext>
                    {__("Which activities should display in this group?", "zencommunity")}
                </Subtext>
            </Flex>

            {/* checkboxs */}
            <Flex direction={'column'} w={'100%'} alignItems="flex-start" gap="24px" bg={'var(--zencom-background)'}>
                <Flex direction={'column'} gap={'10px'} marginTop={'20px'} cursor={'pointer'} w={'100%'}>
                    <Flex direction={'column'} w={'100%'} alignItems="flex-start" gap="24px">
                        {integrationData.map(item => (
                            <IntegrationCard
                                key={item?.key}
                                content={
                                    <Flex direction="column" width="100%" gap="8px" >
                                        <ZCLabel type="basic" label={item?.label} margin="0" />
                                        <Subtext fontSize="14px">
                                            {item?.description}
                                        </Subtext>
                                    </Flex>
                                }
                                checkbox={item?.content}
                            />
                        ))}
                    </Flex>
                </Flex>
            </Flex>

            {/* select */}
            <Flex direction={'row'} gap={'16px'} marginTop={'20px'} cursor={'pointer'}>
                <Flex direction="column" width="100%">
                    <ZCLabel type={'basic'} label={__("Select course", 'zencommunity')} margin='0' />
                    <Subtext>
                        {__("Choose your course you would like to associate with this group", 'zencommunity')}
                    </Subtext>
                </Flex>
                <Select
                    options={academyCourse}
                    className="zen-com-select zen-com-select--width-full"
                    classNamePrefix="zen-com-select"
                    onInputChange={(searchkey) => fetchCourses(searchkey)}
                    value={
                        academyCourse.filter((opt) =>
                            course_ids?.includes(opt.value)
                        )
                    }
                    isMulti
                    menuPlacement="top"
                    getOptionLabel={(opt) => opt.label}
                    getOptionValue={(opt) => opt.value}
                    onChange={(selected) =>
                        setFieldValue(
                            'course_ids',
                            selected.map((opt) => opt.value)
                        )
                    }
                />
            </Flex>

            {/* category select — surface all courses from chosen categories */}
            <Flex direction={'row'} gap={'16px'} marginTop={'10px'} cursor={'pointer'}>
                <Flex direction="column" width="100%">
                    <ZCLabel type={'basic'} label={__("Show courses by category", 'zencommunity')} margin='0' />
                    <Subtext>
                        {__("Every published course in the selected categories is shown in this group automatically — no need to pick them one by one.", 'zencommunity')}
                    </Subtext>
                </Flex>
                <Select
                    options={academyCategories}
                    className="zen-com-select zen-com-select--width-full"
                    classNamePrefix="zen-com-select"
                    value={
                        academyCategories.filter((opt) =>
                            course_category_ids?.includes(opt.value)
                        )
                    }
                    isMulti
                    menuPlacement="top"
                    getOptionLabel={(opt) => opt.label}
                    getOptionValue={(opt) => opt.value}
                    onChange={(selected) =>
                        setFieldValue(
                            'course_category_ids',
                            selected.map((opt) => opt.value)
                        )
                    }
                />
            </Flex>

            {/* per-group policy overrides */}
            <Flex direction={'column'} gap={'4px'} marginTop={'20px'}>
                <ZCLabel type={'basic'} label={__("Access policy", 'zencommunity')} margin='0' />
                <Subtext>
                    {__("Override the site-wide Academy defaults for this space. Leave on “Default” to inherit.", 'zencommunity')}
                </Subtext>
                <Box mt="12px">
                    {policyRows.map((row, idx) => (
                        <Flex key={row.key} alignItems="center" justifyContent="space-between" gap="16px" p="12px 0">
                            <ZCLabel type="basic" label={row.label} margin="0" />
                            <Select
                                options={row.opts}
                                className="zen-com-select zen-com-select--150"
                                classNamePrefix="zen-com-select"
                                value={row.opts.find((o) => o.value === overrideValue(row.key))}
                                onChange={(option) => setOverride(row.key, option.value)}
                                menuPlacement="auto"
                            />
                        </Flex>
                    ))}
                </Box>
            </Flex>
        </Flex>
    );
};

export default AcademyIntegrationSettings;
