import React, { useEffect } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { Formik } from 'formik';
import { useDispatch, useSelector } from 'react-redux';
import { useAdminRouter } from '../../Components/AdminRouter';
import { fetchCommunitySettings, updateCommunitySettings } from '@Redux/slices/settingsSlice/settingsSlice';
import { current_logged_user, is_pro_active, site_url } from '@Utils/helper';
import { useLocationQuery } from '@Hooks/index';
import { LuPuzzle, LuSettings, LuWrench } from 'react-icons/lu';
import LeftBar, { useSettingsMenu } from '../../Components/LeftBar';
import { EmptyState, GhostButton, PageHeader, Skeleton } from '../../Components/ui';
import ProLockedPanel from '../../Components/ProLockedPanel';
import CommunitySettings from './Tabs/CommunitySettings';
import MenuSettings from './Tabs/MenuSettings';
import MemberVisibility from './Tabs/MemberVisibility';
import RoleAndPermission from './Tabs/RoleAndPermission';
import Privacy from './Tabs/Privacy';
import LoginRegistration from './Tabs/LoginRegistration';
import Sidebar from './Tabs/Sidebar';
import Badges from './Tabs/Badges';
import Addons from './Tabs/Addons';
import Notifications from './Tabs/Notifications';
import Customization from './Tabs/Customization';
import SupportLiveChat from './Tabs/SupportLiveChat';
import TicketSettings from './Tabs/TicketSettings';
import EmailNotifications from './Tabs/EmailNotifications';
import BrandStyles from './Tabs/BrandStyles';
import UpgradeMessage from '../../Components/UpgradeMessage';
import AcademyIntegration from './Tabs/AcademyIntegration';
import SocialLogin from './Tabs/SocialLogin';
import LearnDashIntegration from './Tabs/LearnDashIntegration';
import TutorIntegration from './Tabs/TutorIntegration';
import LearnPressIntegration from './Tabs/LearnPressIntegration/LearnPressIntegration';
import WelcomeBanner from './Tabs/WelcomeBanner';
import LifterLmsIntegration from './Tabs/LifterLmsIntegration/LifterLmsIntegration';
import MasterStudyIntegration from './Tabs/MasterStudyIntegration/MasterStudyIntegration';
import FollowingFlower from './Tabs/FollowSettings';
import Topics from './Tabs/ManageTopics';
import AiAgent from './Tabs/AiAgent';
import Gamification from './Tabs/Gamification';
import License from './Tabs/License';
import Migration from './Tabs/Migration';
import Comments from './Tabs/Comments';

// Tabs rendered inside the shared Formik below — the only ones whose content
// actually depends on the fetchCommunitySettings() request, so the loading
// skeleton only applies when one of these is active (every other tab further
// down owns its own independent fetch/loading state).
const GENERAL_FAMILY_TABS = new Set([
    'general', 'color-mode', 'notifications', 'privacy',
    'login-registration', 'social-login', 'customization', 'user-interaction',
]);

// Tabs that only exist while their add-on is active (see useSettingsMenu()).
// Opened by URL with the add-on off, their API routes aren't registered, so
// they're replaced by a notice instead of mounting and 404ing.
const ADDON_TABS = new Set([
    'email-notifications', 'user-interaction', 'ai-agent', 'gamification', 'comments', 'migration',
    'academyLms', 'learndashLms', 'tutorLms', 'learnpressLms', 'lifterLms', 'masterstudyLms',
]);

// Page header per wp-admin page sharing this shell (see FullSettings).
const SECTIONS = {
    settings: {
        icon: LuSettings,
        title: __('Settings', 'zencommunity'),
        subtitle: __('Configure how your community looks, who can join, and what members can do.', 'zencommunity'),
    },
    tools: {
        icon: LuWrench,
        title: __('Tools', 'zencommunity'),
        subtitle: __('AI assistance and data migration for your community.', 'zencommunity'),
    },
    addons: {
        icon: LuPuzzle,
        title: __('Add-ons', 'zencommunity'),
        subtitle: __('Turn features on or off for your community.', 'zencommunity'),
    },
};

const Settings = ({ section = 'settings' }) => {
    const locationQuery = useLocationQuery();
    const menuGroups = useSettingsMenu(section);
    const menuItems = menuGroups.flatMap((group) => group.items);
    const tab = locationQuery.get('tab') || menuItems[0]?.key;
    const { data: settingsData, status } = useSelector(state => state.settings);
    const dispatch = useDispatch();
    const { navigate: adminNavigate } = useAdminRouter();
    const menuItem = menuItems.find((item) => item.key === tab);
    const tabLabel = menuItem?.label;
    const page = SECTIONS[section] || SECTIONS.settings;
    const hasSidebar = section !== 'addons';
    // A tab the sidebar won't open (Pro without Pro, add-on switched off) can
    // still be reached by URL; show why instead of mounting it.
    const proLocked = !!menuItem && menuItem.isPro && !is_pro_active;
    const addonInactive = (!!menuItem && !proLocked && menuItem.disabled) || (!menuItem && ADDON_TABS.has(tab));
    const activeTab = proLocked || addonInactive ? null : tab;

    const openAddons = () => adminNavigate('zencommunity-addons');

    const onSubmit = (values, action) => {
        const { websock_status, ...rest } = values;
        dispatch(updateCommunitySettings({ ...rest, websock_status: websock_status ? 'running' : 'stopped' })).then(({ payload }) => {
            action.setSubmitting(false)
            if(payload?.settings?.path !== settingsData.settings?.path) {
                window.location.href = site_url + "/" + payload?.settings?.path + "/settings?tab=general";
            }
        });
    };

    useEffect(() => {
        dispatch(fetchCommunitySettings());
    }, []);

    // Jump back to the top of the page whenever the active settings tab
    // changes — otherwise switching from a long tab leaves the new (often
    // shorter) tab scrolled partway down. Mirrors AdminRouter's navigation.
    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [tab]);

    return (
        <div className="tw-pb-[100px]">
            <PageHeader
                icon={page.icon}
                title={page.title}
                subtitle={page.subtitle}
                breadcrumbs={hasSidebar && tabLabel ? [{ label: page.title }] : []}
                currentLabel={hasSidebar ? tabLabel : undefined}
            />

            <div className="tw-flex tw-w-full tw-flex-col tw-items-start tw-gap-6 lg:tw-flex-row">
                {hasSidebar && <LeftBar section={section} title={page.title} />}

                <section className="zc-settings-content zc-settings-panel" aria-label={tabLabel || __('Settings', 'zencommunity')}>
                <UpgradeMessage />

                {proLocked && (
                    <ProLockedPanel
                        title={tabLabel}
                        description={__('This setting is part of ZenCommunity Pro. Upgrade to configure it.', 'zencommunity')}
                    />
                )}
                {addonInactive && (
                    <EmptyState icon={LuPuzzle}>
                        <span>{tabLabel
                            // translators: %s: add-on name, e.g. "AI Agent".
                            ? sprintf(__('Turn on the %s add-on to use it.', 'zencommunity'), tabLabel)
                            : __('This add-on is not active.', 'zencommunity')}</span>
                        <GhostButton onClick={openAddons}>{__('Go to Add-ons', 'zencommunity')}</GhostButton>
                    </EmptyState>
                )}

                {status === 'loading' && !settingsData?.settings && GENERAL_FAMILY_TABS.has(activeTab) ? (
                    <div className="tw-flex tw-w-full tw-flex-col tw-gap-4 tw-rounded-xl tw-bg-zc-bg tw-p-6 tw-border tw-border-solid tw-border-zc-border">
                        <Skeleton className="tw-h-3.5 tw-w-32" />
                        <Skeleton className="tw-h-9 tw-w-full tw-rounded" />
                        <Skeleton className="tw-h-3.5 tw-w-40" />
                        <Skeleton className="tw-h-9 tw-w-full tw-rounded" />
                        <Skeleton className="tw-h-3.5 tw-w-28" />
                        <Skeleton className="tw-h-24 tw-w-full tw-rounded" />
                        <Skeleton className="tw-h-9 tw-w-32 tw-rounded-md" />
                    </div>
                ) : (
                    <Formik
                        enableReinitialize={true}
                        initialValues={{
                            ...settingsData.settings,
                            websock_status: settingsData?.settings?.websock_status === "running"
                        } ?? {}}
                        onSubmit={onSubmit}
                    >
                        {() => (
                            <>
                                {activeTab === 'general' && current_logged_user?.is_site_admin && <CommunitySettings />}
                                {activeTab === 'color-mode' && current_logged_user?.is_site_admin && <BrandStyles />}
                                {activeTab === 'notifications' && current_logged_user?.is_site_admin && <Notifications />}
                                {activeTab === 'privacy' && current_logged_user?.is_site_admin && <Privacy />}
                                {activeTab === 'login-registration' && current_logged_user?.is_site_admin && <LoginRegistration />}
                                {activeTab === 'social-login' && current_logged_user?.is_site_admin && <SocialLogin />}
                                {activeTab === 'customization' && current_logged_user?.is_site_admin && <Customization />}
                                {activeTab === 'user-interaction' && current_logged_user?.is_site_admin && <FollowingFlower />}
                            </>
                        )}
                    </Formik>
                )}

                {activeTab === 'welcome-banner' && current_logged_user?.is_site_admin && <WelcomeBanner />}
                {activeTab === 'email-notifications' && current_logged_user?.is_site_admin && <EmailNotifications />}
                {activeTab === 'role-and-permission' && current_logged_user?.is_site_admin && <RoleAndPermission />}
                {activeTab === 'menu-settings' && current_logged_user?.is_site_admin && <MenuSettings />}
                {activeTab === 'sidebar' && current_logged_user?.is_site_admin && <Sidebar />}
                {activeTab === 'badges' && current_logged_user?.is_site_admin && <Badges />}
                {activeTab === 'group' && current_logged_user?.is_site_admin && <MemberVisibility />}
                {activeTab === 'manage-topics' && current_logged_user?.is_site_admin && <Topics />}
                {activeTab === 'ticket-settings' && current_logged_user?.is_site_admin && <TicketSettings />}
                {activeTab === 'add-ons' && current_logged_user?.is_site_admin && <Addons showHeader={false} />}
                {activeTab === 'license' && current_logged_user?.is_site_admin && <License />}
                {activeTab === 'live-chat' && current_logged_user?.is_site_admin && <SupportLiveChat />}
                {activeTab === 'academyLms' && current_logged_user?.is_site_admin && <AcademyIntegration />}
                {activeTab === 'learndashLms' && current_logged_user?.is_site_admin && <LearnDashIntegration />}
                {activeTab === 'tutorLms' && current_logged_user?.is_site_admin && <TutorIntegration/>}
                {activeTab === 'learnpressLms' && current_logged_user?.is_site_admin && <LearnPressIntegration/>}
                {activeTab === 'lifterLms' && current_logged_user?.is_site_admin && <LifterLmsIntegration/>}
                {activeTab === 'masterstudyLms' && current_logged_user?.is_site_admin && <MasterStudyIntegration/>}
                {activeTab === 'ai-agent' && current_logged_user?.is_site_admin && <AiAgent/>}
                {activeTab === 'gamification' && current_logged_user?.is_site_admin && <Gamification/>}
                {activeTab === 'migration' && current_logged_user?.is_site_admin && <Migration/>}
                {activeTab === 'comments' && current_logged_user?.is_site_admin && <Comments/>}
                </section>
            </div>
        </div>
    );
};

export default Settings;
