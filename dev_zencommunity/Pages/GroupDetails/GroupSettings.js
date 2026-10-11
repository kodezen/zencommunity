import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Box, Button } from '@chakra-ui/react';
import { useStyles } from '../../utils/chakra';
import { LuImage, LuInfo, LuLayoutList, LuMessagesSquare, LuPlug, LuSave, LuScrollText, LuShieldCheck, LuUsers } from 'react-icons/lu';
import { GroupSettingsHeader, GroupSettingsNav, GroupSettingsSection } from './GroupSettingsLayout';
import { useNavigate, useParams } from 'react-router-dom';
import Checkbox from '@Components/Formik/Checkbox';
import { Formik } from 'formik';
import BasicInfoFields from '@Components/GroupSettings/BasicInfoFields';
import ImageUploadField from '@Components/GroupSettings/ImageUploadField';
import SettingsFields from '@Components/GroupSettings/SettingsFields';
import TabOrderField from '@Components/GroupSettings/TabOrderField';
import { defaultEnabledTabs, normalizeTabOrder } from '@Utils/groupTabs';
import BlockEditor from '../../Admin/Components/BlockEditor';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroupById } from '@Redux/slices/groupSlice/groupSlice';
import { API, media_url, getAddonActiveStatus, is_academy_active, is_learndash_active, is_learnpress_active, is_lifterlms_active, is_masterstudy_active, is_tutorlms_active, namespace } from '@Utils/helper';
import ZenComSeparator from '@Components/ZenComSeparator';
import AcademyIntegrationSettings from './AcademyIntegrationSettings';
import LearndashIntegrationSettings from './LearnDashIntegrationSettings';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import TutorIntegrationSettings from './TutorIntegrationSettings';
import LearnPressIntegrationSettings from './LearnPressIntegrationSettings';
import LifterLmsIntegrationSettings from './LifterLmsIntegrationSettings';
import MasterStudyIntegrationSettings from './MasterStudyIntegrationSettings';
import Notification from '@Components/Notification';
import GroupSettingsLoader from '@Components/ZenComLoader/Types/GroupSettingsLoader';

const GroupSettings = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const activeAddons = useSelector(state => state?.addons?.activeAddons);
    const academyIntegration = getAddonActiveStatus(activeAddons, "AcademyLms");
    const learndashIntegration = getAddonActiveStatus(activeAddons, "Learndash");
    const tutorlmsIntegration = getAddonActiveStatus(activeAddons, "TutorLMS");
    const learnpressIntegration = getAddonActiveStatus(activeAddons, "LearnPress");
    const lifterIntegration = getAddonActiveStatus(activeAddons, "LifterLms");
    const masterStudyIntegration = getAddonActiveStatus(activeAddons, "Masterstudy");
    const { id } = useParams();
    const [groupData, setGroupData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { primaryBtn } = useStyles();
    
    useEffect(() => {
        const fetchGroup = async () => {
            try {
                const result = await dispatch(fetchGroupById(id));
                setGroupData(result.payload);
            } catch (error) {
                console.error("Error fetching group data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchGroup();
        }
    }, [id, dispatch]);

    const academyIntegrationData = academyIntegration ? {
        course_ids: groupData?.courses?.courses?.map(item => `${item.id}`) || {},
        events: groupData?.courses.events || {},
        course_category_ids: groupData?.courses?.category_ids?.map(catId => `${catId}`) || [],
        course_settings: groupData?.courses?.settings || {},
    } : {};
    const learndashIntegrationData = learndashIntegration ? {
        ld_course_ids: groupData?.ld_courses?.courses?.map(item => `${item.id}`) || {},
        ld_events: groupData?.ld_courses?.events || {},
    } : {};
    const tutorIntegrationData = tutorlmsIntegration ? {
        tl_course_ids: groupData?.tutorlms_courses?.courses?.map(item => `${item.id}`) || {},
        tl_events: groupData?.tutorlms_courses?.events || {},
    } : {};
    const learnpressIntegrationData = learnpressIntegration ? {
        lp_course_ids: groupData?.lp_course?.courses?.map(item => `${item.id}`) || {},
        lp_events: groupData?.lp_course?.events || [],
    } : {};
    const lifterIntegrationData = lifterIntegration ? {
        llms_course_ids: groupData?.llms_course?.courses?.map(item => `${item.id}`) || [],
        llms_events: groupData?.llms_course?.events || {},
    } : {};
    const masterStudyIntegrationData = masterStudyIntegration ? {
        ms_course_ids: groupData?.ms_course?.courses?.map(item => `${item.id}`) || [],
        ms_events: groupData?.ms_course?.events || [],
    } : {};

    const initialValues = groupData ? {
        name: groupData.name ?? '',
        slug: groupData.slug ?? '',
        description: groupData.description || '',
        coverImage: groupData.meta?.cover_img_url || null,
        featureImage: groupData.featured_img || null,
        privacy: groupData.privacy ?? 'public',
        anyone_can_send_join_request: groupData.meta?.anyone_can_send_join_request ?? false,
        members_visibility: groupData.meta?.members_visibility ?? 'members_only',
        meta: {
            approval_required: groupData.privacy !== 'public',
            allow_anonymous_feed: groupData?.meta?.allow_anonymous_feed ?? false,
            allow_anonymous_comment: groupData?.meta?.allow_anonymous_comment ?? false,
            post_approval_required: groupData?.meta?.post_approval_required ?? false,
            post_approval_first_post_only: groupData?.meta?.post_approval_first_post_only ?? false,
            enabled_tabs: { ...defaultEnabledTabs(), ...groupData?.meta?.enabled_tabs },
            tab_order: normalizeTabOrder(groupData?.meta?.tab_order),
            rules: groupData?.meta?.rules ?? '',
        },
        group_chat_enabled: groupData.meta?.group_chat_enabled ?? false,
        category_id: groupData?.category_id,
        ...academyIntegrationData,
        ...learndashIntegrationData,
        ...tutorIntegrationData,
        ...learnpressIntegrationData,
        ...lifterIntegrationData,
        ...masterStudyIntegrationData
    } : {};
    
    const handleSubmit = async (values, actions) => {
        actions.setSubmitting(true);
        try {
            const media_ids = [];
            let featured_img = null;

            if (values.coverImage && (typeof values.coverImage === 'number' || !isNaN(parseInt(values.coverImage)))) {
                media_ids.push(parseInt(values.coverImage));
            }

            if (values.featureImage && (typeof values.featureImage === 'number' || !isNaN(parseInt(values.featureImage)))) {
                featured_img = parseInt(values.featureImage);
                media_ids.push(featured_img);
            }

            const payload = {
                ...values,
                media_ids,
                featured_img
            };

            const { data } = await API.post(`${namespace}/group/${id}`, payload);
            setGroupData(prev => ({ ...prev, ...data }));
            dispatch(
            showNotification({
                isShow: true,
                type: "success",
                message: __("Group settings saved successfully!", "zencommunity"),
            })
        )} catch (error) {
            console.error("Error updating group:", error);
            dispatch(
            showNotification({
                isShow: true,
                type: "error",
                message: __("Failed to save group settings.", "zencommunity"),
            })
        )} finally {
            actions.setSubmitting(false);
        }
    };

    const hasIntegrations = (academyIntegration && is_academy_active)
        || (learndashIntegration && is_learndash_active)
        || (tutorlmsIntegration && is_tutorlms_active)
        || (learnpressIntegration && is_learnpress_active)
        || (lifterIntegration && is_lifterlms_active)
        || (masterStudyIntegration && is_masterstudy_active);

    const sections = [
        { id: 'gs-basic', label: __('Basic', 'zencommunity'), icon: LuInfo },
        { id: 'gs-images', label: __('Images', 'zencommunity'), icon: LuImage },
        { id: 'gs-chat', label: __('Group chat', 'zencommunity'), icon: LuMessagesSquare },
        { id: 'gs-access', label: __('Access & posting', 'zencommunity'), icon: LuShieldCheck },
        { id: 'gs-tabs', label: __('Tabs', 'zencommunity'), icon: LuLayoutList },
        { id: 'gs-rules', label: __('Rules', 'zencommunity'), icon: LuScrollText },
        ...(hasIntegrations ? [{ id: 'gs-integrations', label: __('Integrations', 'zencommunity'), icon: LuPlug }] : []),
    ];

    if (loading) {
        return <GroupSettingsLoader />;
    }

    if (!groupData) {
        return <Box>{__("Group not found", "zencommunity")}</Box>;
    }

    return (
        <>
            <Notification />
            <Formik
                enableReinitialize={true}
                initialValues={initialValues}
                onSubmit={handleSubmit}
            >
                {({ handleSubmit, dirty, isSubmitting, setFieldValue }) => (
                    <div className="zc-gs zencom-animate-fade">
                        <GroupSettingsHeader
                            title={__("Group settings", "zencommunity")}
                            subtitle={<><strong>{groupData?.name}</strong> · {__("Manage preferences, notifications and admin controls", "zencommunity")}</>}
                            image={groupData?.featured_img ? media_url(groupData.featured_img) : ''}
                            fallbackIcon={LuUsers}
                            onBack={() => navigate(-1)}
                            dirty={dirty}
                            action={
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!dirty || isSubmitting}
                                    isLoading={isSubmitting}
                                    {...primaryBtn}
                                >
                                    <LuSave /> {__("Save changes", "zencommunity")}
                                </Button>
                            }
                        />

                        <div className="zc-gs__layout">
                            <GroupSettingsNav sections={sections} />

                            <div className="zc-gs__sections">
                                <GroupSettingsSection id="gs-basic" icon={LuInfo} title={__("Basic", "zencommunity")} subtitle={__("Name, slug, description and collection.", "zencommunity")}>
                                    <BasicInfoFields variant="settings" groupData={groupData} />
                                </GroupSettingsSection>

                                <GroupSettingsSection id="gs-images" icon={LuImage} title={__("Images", "zencommunity")} subtitle={__("Cover photo and the thumbnail shown on the group card.", "zencommunity")}>
                                    <ImageUploadField type="cover" variant="settings" defaultImage={groupData?.meta?.cover_img_url} />
                                    <ZenComSeparator />
                                    <ImageUploadField type="feature" variant="settings" defaultImage={groupData?.featured_img} />
                                </GroupSettingsSection>

                                <GroupSettingsSection id="gs-chat" icon={LuMessagesSquare} title={__("Group chat", "zencommunity")} subtitle={__("Enable and manage group communication.", "zencommunity")}>
                                    <Checkbox
                                        variant="bold"
                                        title={__("Enable group chat", "zencommunity")}
                                        subtitle={__("Give members a shared chat room for this group.", "zencommunity")}
                                        suffix='group-chat-enabled'
                                        name='group_chat_enabled'
                                    />
                                </GroupSettingsSection>

                                <GroupSettingsSection id="gs-access" icon={LuShieldCheck} title={__("Access & posting", "zencommunity")} subtitle={__("Group privacy, member visibility and posting rights.", "zencommunity")}>
                                    <SettingsFields variant="settings" groupData={groupData} />
                                </GroupSettingsSection>

                                <GroupSettingsSection id="gs-tabs" icon={LuLayoutList} title={__("Tabs", "zencommunity")} subtitle={__("Choose which tabs show and drag to reorder them. Discussion and Featured are always shown.", "zencommunity")}>
                                    <TabOrderField groupType={groupData?.type} />
                                </GroupSettingsSection>

                                <GroupSettingsSection id="gs-rules" icon={LuScrollText} title={__("Rules", "zencommunity")} subtitle={__("Guidelines for members. Leave blank to hide the Rules section.", "zencommunity")}>
                                    <BlockEditor
                                        name="meta.rules"
                                        defaultValue={groupData?.meta?.rules}
                                        saveValueHandler={setFieldValue}
                                        suffix={`group-rules-${id}`}
                                    />
                                </GroupSettingsSection>

                                {hasIntegrations && (
                                    <div id="gs-integrations" className="zc-gs-integrations zc-gs-section--anchor">
                                        {(academyIntegration && is_academy_active) && <AcademyIntegrationSettings />}
                                        {(learndashIntegration && is_learndash_active) && <LearndashIntegrationSettings/>}
                                        {(tutorlmsIntegration && is_tutorlms_active) && <TutorIntegrationSettings/>}
                                        {(learnpressIntegration && is_learnpress_active) && <LearnPressIntegrationSettings/>}
                                        {(lifterIntegration && is_lifterlms_active) && <LifterLmsIntegrationSettings/>}
                                        {(masterStudyIntegration && is_masterstudy_active) && <MasterStudyIntegrationSettings/>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Formik>
        </>
    );
};

export default GroupSettings;
