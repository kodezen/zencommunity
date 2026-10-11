import React from 'react';
import { Box, Button, Flex } from '@chakra-ui/react';
import ZenComPopover from '@Components/ZenComPopHover';
import { __ } from '@wordpress/i18n';
import Select, { components } from '@Components/ReactSelect';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import { useState, useEffect } from 'react';
import { API, current_logged_user, namespace } from '@Utils/helper';
import { takeBootstrapValue } from '@Utils/bootstrap';
import { LuTag, LuTimer, LuUser, LuFlag } from "react-icons/lu";
import { useDispatch } from 'react-redux';
import { useStyles } from '../../../../utils/chakra';
import { resetTicketFilters } from '../../helper';

const typeLabelPlaceholder = (props) => (
    <components.Placeholder {...props}>
        <Flex alignItems="center" gap="8px">
            <LuTag />
            <span>{props.children}</span>
        </Flex>
    </components.Placeholder>
);

const supportStaffPlaceholder = (props) => (
    <components.Placeholder {...props}>
        <Flex alignItems="center" gap="8px">
            <LuUser />
            <span>{props.children}</span>
        </Flex>
    </components.Placeholder>
);
const timePlaceholder = (props) => (
    <components.Placeholder {...props}>
        <Flex alignItems="center" gap="8px">
            <LuTimer />
            <span>{props.children}</span>
        </Flex>
    </components.Placeholder>
);

const priorityPlaceholder = (props) => (
    <components.Placeholder {...props}>
        <Flex alignItems="center" gap="8px">
            <LuFlag />
            <span>{props.children}</span>
        </Flex>
    </components.Placeholder>
);

const timeOptions = [
    // Ticket Type and Priority reset by picking their own "All" row; time and
    // support staff had none and leaned on the clear button, so they get one
    // rather than becoming a choice that cannot be undone.
    { label: __("Any time", "zencommunity"), value: '' },
    { label: __("Today", "zencommunity"), value: 'today' },
    { label: __("This week", "zencommunity"), value: 'this_week' },
    { label: __("This month", "zencommunity"), value: 'this_month' },
]

const AdvanceFilter = ({
    typeLabelsOptions,
    priorityLabelsOptions = [],
    setSearchParams,
    handleQueryParams,
    selectedTicket,
    filterValues
}) => {
    const [supportAgentOptions, setSupportAgentOptions] = useState([]);
    const dispatch = useDispatch();

    useEffect(() => {
        (async () => {
            const preloaded = await takeBootstrapValue('support_agents', 'ticket');

            await (undefined !== preloaded ? Promise.resolve({ data: preloaded }) : API.get(`${namespace}/members?role=support_agent`))
                .then(res => {
                    const options = res?.data?.records?.map((item) => ({
                        label: `${item.first_name} ${item.last_name}`,
                        value: item.id,
                        avatar: item.avatar_url
                    }))
                    setSupportAgentOptions(options);
                })
        })()
    }, [])

    const handleFilterReset = () => resetTicketFilters({
        setSearchParams,
        handleQueryParams,
        selectedTicket,
        currentUserId: current_logged_user?.id,
    });

    const { primaryBtn } = useStyles();

    return (
        <ZenComPopover
            trigger={
                <Button
                    color="var(--zencom-primary-color)"
                    fontSize="14px"
                    fontWeight="500"
                    textDecoration="underline"
                    bg="transparent"
                    p={0}
                    minWidth="auto"
                >
                    {__("Advance filter", "zencommunity")}
                </Button>
            }
            size='md'
        >
            <Flex
                p="16px"
                flexDirection="column"
                gap="16px"
            >
                <ZCLabel
                    label={__(
                        "Advance filters",
                        "zencommunity"
                    )}
                    type="subTitle"
                    fontSize="16px"
                    fontWeight="500"
                />
                <Select
                    placeholder={__("Ticket Type", "zencommunity")}
                    className="zen-com-select"
                    classNamePrefix="zen-com-select"
                    options={[
                        { label: "All Tickets", value: 0 },
                        ...typeLabelsOptions
                    ]}
                    value={
                        filterValues.typeLabel
                            ? typeLabelsOptions.find((opt) => Number(opt.value) === Number(filterValues.typeLabel))
                            : null
                    }
                    onChange={(opt) => handleQueryParams({ qtypeLabel: opt?.value ?? 0 })}
                    components={{
                        Placeholder: typeLabelPlaceholder,
                    }}
                />
                <Select
                    placeholder={__("Priority", "zencommunity")}
                    className="zen-com-select"
                    classNamePrefix="zen-com-select"
                    options={[
                        { label: __("All Priorities", "zencommunity"), value: 0 },
                        ...priorityLabelsOptions
                    ]}
                    value={
                        filterValues.priority
                            ? priorityLabelsOptions.find((opt) => Number(opt.value) === Number(filterValues.priority))
                            : null
                    }
                    onChange={(opt) => handleQueryParams({ qpriority: opt?.value ?? 0 })}
                    components={{
                        Placeholder: priorityPlaceholder,
                    }}
                />
                <Select
                    placeholder={__("Support staff", "zencommunity")}
                    className="zen-com-select"
                    classNamePrefix="zen-com-select"
                    options={[
                        { label: __("Anyone", "zencommunity"), value: 0 },
                        ...supportAgentOptions
                    ]}
                    value={
                        filterValues.supportStaff
                            ? supportAgentOptions.find((opt) => Number(opt.value) === Number(filterValues.supportStaff))
                            : null
                    }
                    onChange={(opt) => handleQueryParams({ qsupportStaff: opt?.value ?? "" })}
                    components={{
                        Placeholder: supportStaffPlaceholder,
                    }}
                />
                <Select
                    placeholder={__("Time", "zencommunity")}
                    className="zen-com-select"
                    classNamePrefix="zen-com-select"
                    options={timeOptions}
                    value={
                        filterValues.time
                            ? timeOptions.find((opt) => opt.value === filterValues.time)
                            : null
                    }
                    onChange={(opt) => handleQueryParams({ qtime: opt?.value ?? "" })}
                    components={{
                        Placeholder: timePlaceholder,
                    }}
                />
                <Box textAlign="end">
                    <Button
                        {...primaryBtn}
                        onClick={handleFilterReset}
                    >
                        {__('Reset Filters', 'zencommunity')}
                    </Button>
                </Box>
            </Flex>

        </ZenComPopover>
    );
};

export default AdvanceFilter;

