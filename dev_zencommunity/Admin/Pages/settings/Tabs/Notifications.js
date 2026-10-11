import React from 'react';
import { __ } from '@wordpress/i18n';
import { PrimaryButton } from '../../../Components/ui';
import ZenComTopBar from '../../../Components/ZenComTopBar';
import Checkbox from '../../../Components/FormikToggle';
import { useFormikContext } from 'formik';

/**
 * Site-wide master toggles, one per notification category. Mirrors the
 * per-user category list a member sees on their own Preferences page
 * (`zencommunity_notification_pref_categories()`) so admins can see and
 * control the same set from Settings. When a category is off here, it's
 * never dispatched to anyone, regardless of each member's own preference.
 */
const CATEGORIES = [
    {
        name: 'notification.posts',
        title: __('New posts in groups', 'zencommunity'),
        subtitle: __('Notify group members when a new post is published.', 'zencommunity'),
    },
    {
        name: 'notification.comments',
        title: __('Comments & replies', 'zencommunity'),
        subtitle: __('Notify authors when someone comments on their post or replies to their comment.', 'zencommunity'),
    },
    {
        name: 'notification.mentions',
        title: __('Mentions', 'zencommunity'),
        subtitle: __('Notify a user when they are mentioned in a post or comment.', 'zencommunity'),
    },
    {
        name: 'notification.reactions',
        title: __('Reactions', 'zencommunity'),
        subtitle: __('Notify authors when someone reacts to their post or comment.', 'zencommunity'),
        comingSoon: true,
    },
    {
        name: 'notification.groups',
        title: __('Group activity', 'zencommunity'),
        subtitle: __('Notify members of group invites and role changes.', 'zencommunity'),
    },
    {
        name: 'notification.tickets',
        title: __('Support ticket updates', 'zencommunity'),
        subtitle: __('Notify users of updates to their support tickets.', 'zencommunity'),
        comingSoon: true,
    },
    {
        name: 'notification.messages',
        title: __('Direct & group messages', 'zencommunity'),
        subtitle: __('Notify users of new direct and group messages.', 'zencommunity'),
        comingSoon: true,
    },
];

const Notifications = () => {
    const { handleSubmit, dirty } = useFormikContext();

    return (
        <div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
            <ZenComTopBar
                isStickyScroll={true}
                title={__("Notifications", "zencommunity")}
                subtitle={__("Choose which notification categories are enabled site-wide.", "zencommunity")}
                rightContent={
                    <PrimaryButton onClick={handleSubmit} disabled={!dirty}>{__("Save changes", "zencommunity")}</PrimaryButton>
                }
            />

            <ZenComTopBar
                title={__("Notification categories", "zencommunity")} titleSize="16px"
                subtitle={__("Turning a category off stops it from being sent to anyone, regardless of each member's own preference.", "zencommunity")} subtitleSize="sm" subtitleWeight="normal"
                marginBottom="16px"
                padding="0"
                borderBottomWidth="0"
            />
            <div className="tw-flex tw-flex-col tw-gap-6 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
                {CATEGORIES.map(({ name, title, subtitle, comingSoon }) => (
                    <Checkbox
                        key={name}
                        title={comingSoon ? `${title} ${__('(coming soon)', 'zencommunity')}` : title}
                        subtitle={subtitle}
                        name={name}
                    />
                ))}
            </div>
        </div>
    );
};

export default Notifications;
