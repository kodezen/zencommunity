import { __ } from '@wordpress/i18n';
import React, { useState } from 'react';
import { Text, Tabs } from '@chakra-ui/react';
import Views from './Views';
import RecentActivity from './RecentActivities';
import { current_logged_user, global_roles } from '@Utils/helper';


const TicketsLeftSidebar = ({
    selectedTicket,
    setSelectedTicket,
    totalTickets,
    stats
}) => {
    const [selectedTab, setSelectedTab] = useState('views');
    const isAdminOrSupportAgent = current_logged_user?.is_site_admin || global_roles?.support_agent;

    const tabs = [
        {
            label: __('Views', 'zencommunity'),
            value: 'views',
        },
        ...(isAdminOrSupportAgent
            ? [
                {
                    label: __('Recent Activity', 'zencommunity'),
                    value: 'recent-activity',
                },
            ]
            : []),
    ];

    const renderTabContent = () => {
        switch (selectedTab) {
            case 'views':
                return <Views
                    selectedTicket={selectedTicket}
                    setSelectedTicket={setSelectedTicket}
                    totalTickets={totalTickets}
                    stats={stats}
                />;
            case 'recent-activity':
                return <RecentActivity />;
            default:
                return <Views />;
        }
    };

    return (
        <Tabs.Root
            value={selectedTab}
            onValueChange={(val) => setSelectedTab(val?.value)}
            variant="unstyled"
            fitted
        >
            <Tabs.List
                color="var(--zencom-font-color)"
                borderBottom="1px solid var(--zencom-border-color)"
                marginBottom={'12px'}
            >
                {tabs.map((tab) => (
                    <Tabs.Trigger
                        key={tab.value}
                        value={tab.value}
                        className="zc-tab"
                        padding="8px 14px"
                        fontWeight="500"
                    >
                        {tab.label}
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
            
            <Tabs.Content value={selectedTab} padding={'0 12px'}>
                {renderTabContent()}
            </Tabs.Content>
        </Tabs.Root>
    );
};

export default TicketsLeftSidebar;

