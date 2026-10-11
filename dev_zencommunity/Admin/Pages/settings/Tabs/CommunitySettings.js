import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useFormikContext } from 'formik';
import Select from 'react-select';
import { useDispatch, useSelector } from 'react-redux';
import ZenComTopBar from '../../../Components/ZenComTopBar';
import { FileUpload, PrimaryButton, GhostButton, RadioGroup } from '../../../Components/ui';
import ZCLabel from '../../../Components/Label';
import Checkbox from '../../../Components/FormikToggle';
import { mediaFileUploader, site_url, API, namespace, is_pro_active, zenc_SOCKET, is_block_theme } from '@Utils/helper';
import { updateCommunitySettings } from '@Redux/slices/settingsSlice/settingsSlice';
import { MdOutlineFileUpload } from "react-icons/md";
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import Subtext from '../../../Components/Subtext';

const radioItems = [
    {
        label: __("Everyone", "zencommunity"),
        value: "guest",
    },
    {
        label: __("Only logged in members", "zencommunity"),
        value: "logged",
    },
    {
        label: __("Only selected user role", "zencommunity"),
        value: "roles",
    },
];

const renderModeItems = [
    {
        label: __("React SPA interface (default)", "zencommunity"),
        value: "spa",
    },
    {
        label: __("Gutenberg blocks (FSE)", "zencommunity"),
        value: "fse",
    },
];

const notificationPositions = [
    {
        label: __("Top Left", "zencommunity"),
        value: "top-left",
    },
    {
        label: __("Top Center", "zencommunity"),
        value: "top-center",
    },
    {
        label: __("Top Right", "zencommunity"),
        value: "top-right",
    },
    {
        label: __("Bottom Left", "zencommunity"),
        value: "bottom-left",
    },
    {
        label: __("Bottom Center", "zencommunity"),
        value: "bottom-center",
    },
    {
        label: __("Bottom Right", "zencommunity"),
        value: "bottom-right",
    },
];

const CommunitySettings = () => {
    const { setFieldValue, values, handleSubmit, dirty } = useFormikContext();
    const { data: settingsData } = useSelector(state => state.settings)
    const [fseTemplates, setFseTemplates] = useState([]);
    const [openingEditor, setOpeningEditor] = useState(false);
    const [roleOptions, setRoleOptions] = useState([]);
    const [siteLogo, setSiteLogo] = useState(null);
    const [siteLogoPreview, setSiteLogoPreview] = useState(null);
    const [siteLogoDark, setSiteLogoDark] = useState(null);
    const [siteLogoDarkPreview, setSiteLogoDarkPreview] = useState(null);
    const [loader, setLoader] = useState(true);
    const [restarting, setRestarting] = useState(false);
    const visibilityRoles = Object.entries(settingsData?.roles || {}).map(([key, value]) => ({
        label: String(value),
        value: key
    }));
    const dispatch = useDispatch();

    const openCommunityEditor = async () => {
        setOpeningEditor(true);
        try {
            const { data } = await API.post(`${namespace}/fse/community-page`);
            setFseTemplates(data?.templates || []);
            if (data?.edit_url) {
                window.open(data.edit_url, '_blank', 'noopener,noreferrer');
            }
        } catch {
            dispatch(showNotification({ message: __('Could not open the Site Editor.', 'zencommunity'), isShow: true, type: 'error' }));
        } finally {
            setOpeningEditor(false);
        }
    };

    useEffect(() => {
        setLoader(!settingsData?.settings);
    }, [settingsData]);

    useEffect(() => {
        if (settingsData.roles) {
            setRoleOptions(Object.entries(settingsData.roles).map(([value, label]) => ({ label, value })))
        }
    }, [settingsData.roles])

    const handleSiteLogoUpload = async (file) => {
        try {
            const res = await mediaFileUploader("site_logo", file);
            dispatch(updateCommunitySettings({
                media_ids: [res?.id]
            }))
        } catch (error) {
            // eslint-disable-next-line
            console.error("Upload failed:", error);
        }
    };

    const handleSiteLogoDarkUpload = async (file) => {
        try {
            const res = await mediaFileUploader("site_logo_dark", file);
            dispatch(updateCommunitySettings({
                media_ids: [res?.id]
            }))
        } catch (error) {
            // eslint-disable-next-line
            console.error("Upload failed:", error);
        }
    };

    const handleSiteLogoRemove = async () => {
        try {
            await dispatch(updateCommunitySettings({ remove_media: ['site_logo'] })).unwrap();
            setSiteLogo(null);
            setSiteLogoPreview(null);
        } catch (error) {
            // eslint-disable-next-line
            console.error("Remove failed:", error);
        }
    };

    const handleSiteLogoDarkRemove = async () => {
        try {
            await dispatch(updateCommunitySettings({ remove_media: ['site_logo_dark'] })).unwrap();
            setSiteLogoDark(null);
            setSiteLogoDarkPreview(null);
        } catch (error) {
            // eslint-disable-next-line
            console.error("Remove failed:", error);
        }
    };

    useEffect(() => {
        if (settingsData?.settings?.site_logo) {
            setSiteLogo(settingsData.settings.site_logo);
        }
    }, [settingsData?.settings?.site_logo]);

    useEffect(() => {
        if (settingsData?.settings?.site_logo_dark) {
            setSiteLogoDark(settingsData.settings.site_logo_dark);
        }
    }, [settingsData?.settings?.site_logo_dark]);

    const handleSocketRestart = async () => {
        setRestarting(true);
        try {
            await API.post(`${namespace}/socket/restart`);
            dispatch(showNotification({ message: __('Socket server restart triggered.', 'zencommunity'), isShow: true, type: 'success' }));
        } catch {
            dispatch(showNotification({ message: __('Failed to restart socket server.', 'zencommunity'), isShow: true, type: 'error' }));
        } finally {
            setRestarting(false);
        }
    };

    const generalHandleSubmit = (e) => {
        e.preventDefault();

        const pathValue = values?.path?.trim();

        if (!pathValue || pathValue === "/") {
            if (values?.load_on_entire_site !== true) {
                dispatch(
                    showNotification({
                        message: __("You must active 'Enable Load on entire site' when no Community path is provided.", "zencommunity"),
                        isShow: true,
                        type: "error",
                    })
                );

                return;
            }
        }

        handleSubmit();
    };

    useEffect(() => {
        const pathValue = values?.path?.trim();

        if (!pathValue || pathValue === "/") {
            setFieldValue("load_on_entire_site", true);
        }
    }, [values?.path, setFieldValue]);

    return (
        <div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
            <ZenComTopBar
                isStickyScroll={true}
                title={__("General", "zencommunity")}
                subtitle={__("Main settings overview.", "zencommunity")}
                rightContent={
                    <PrimaryButton onClick={generalHandleSubmit} disabled={!dirty}>{__("Save changes", "zencommunity")}</PrimaryButton>
                }
            />

            <ZenComTopBar
                title={__("Community setup", "zencommunity")} titleSize="16px"
                subtitle={__("Basic community settings.", "zencommunity")}
                marginBottom="16px"
                padding="0"
                borderBottomWidth="0"
            />

            <div className="tw-flex tw-flex-col tw-gap-4">
                <div className="tw-flex tw-flex-col tw-items-center tw-gap-6 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
                    <div className="tw-flex tw-w-full tw-justify-between">
                        <div className="tw-flex tw-flex-col tw-gap-2 tw-items-start">
                            <ZCLabel
                                label={__('Site logo', 'zencommunity')}
                                fontSize="14px" fontWeight="500"
                            />
                            <Subtext>
                                {__("Branding icon (180x180px).", 'zencommunity')}
                            </Subtext>

                            <div className="tw-mt-4 tw-flex tw-items-center tw-gap-2">
                                <FileUpload
                                    accept="image/*"
                                    onFiles={(files) => {
                                        const file = files?.[0];
                                        if (file) {
                                            handleSiteLogoUpload(file);
                                            const imageUrl = URL.createObjectURL(file);
                                            setSiteLogoPreview(imageUrl);
                                        } else {
                                            setSiteLogoPreview(null);
                                        }
                                    }}
                                    className="tw-inline-flex tw-w-auto tw-cursor-pointer tw-items-center tw-justify-center tw-rounded tw-border-0 tw-bg-zc-primary tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white hover:tw-opacity-90"
                                >
                                    {siteLogo ? __('Change', 'zencommunity') : __('Upload', 'zencommunity')}
                                </FileUpload>

                                {(siteLogo || siteLogoPreview) && (
                                    <GhostButton onClick={handleSiteLogoRemove}>
                                        {__('Remove', 'zencommunity')}
                                    </GhostButton>
                                )}
                            </div>
                        </div>

                        {siteLogo || siteLogoPreview ? (
                            <img
                                src={siteLogoPreview || `${site_url}${siteLogo}`}
                                alt="site_logo"
                                className="tw-h-[100px] tw-w-[100px] tw-rounded-md tw-object-cover"
                            />
                        ) : (
                            <div className="tw-flex tw-h-[90px] tw-w-[90px] tw-items-center tw-rounded-md tw-border-2 tw-border-dashed tw-border-zc-border tw-px-3 tw-py-2">
                                <MdOutlineFileUpload className="tw-mx-auto tw-w-full tw-text-center tw-text-[30px] tw-text-zc-muted" />
                            </div>
                        )}
                    </div>

                    <div className="tw-flex tw-w-full tw-justify-between">
                        <div className="tw-flex tw-flex-col tw-gap-2 tw-items-start">
                            <ZCLabel
                                label={__('Site logo (dark mode)', 'zencommunity')}
                                fontSize="14px" fontWeight="500"
                            />
                            <Subtext>
                                {__("Shown instead of the logo above when a member switches the app to dark mode. Optional — the light logo is reused if this is left empty.", 'zencommunity')}
                            </Subtext>

                            <div className="tw-mt-4 tw-flex tw-items-center tw-gap-2">
                                <FileUpload
                                    accept="image/*"
                                    onFiles={(files) => {
                                        const file = files?.[0];
                                        if (file) {
                                            handleSiteLogoDarkUpload(file);
                                            const imageUrl = URL.createObjectURL(file);
                                            setSiteLogoDarkPreview(imageUrl);
                                        } else {
                                            setSiteLogoDarkPreview(null);
                                        }
                                    }}
                                    className="tw-inline-flex tw-w-auto tw-cursor-pointer tw-items-center tw-justify-center tw-rounded tw-border-0 tw-bg-zc-primary tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white hover:tw-opacity-90"
                                >
                                    {siteLogoDark ? __('Change', 'zencommunity') : __('Upload', 'zencommunity')}
                                </FileUpload>

                                {(siteLogoDark || siteLogoDarkPreview) && (
                                    <GhostButton onClick={handleSiteLogoDarkRemove}>
                                        {__('Remove', 'zencommunity')}
                                    </GhostButton>
                                )}
                            </div>
                        </div>

                        {siteLogoDark || siteLogoDarkPreview ? (
                            <img
                                src={siteLogoDarkPreview || `${site_url}${siteLogoDark}`}
                                alt="site_logo_dark"
                                className="tw-h-[100px] tw-w-[100px] tw-rounded-md tw-bg-zc-fg/90 tw-object-cover"
                            />
                        ) : (
                            <div className="tw-flex tw-h-[90px] tw-w-[90px] tw-items-center tw-rounded-md tw-border-2 tw-border-dashed tw-border-zc-border tw-px-3 tw-py-2">
                                <MdOutlineFileUpload className="tw-mx-auto tw-w-full tw-text-center tw-text-[30px] tw-text-zc-muted" />
                            </div>
                        )}
                    </div>

                    <div className="tw-flex tw-w-full tw-items-center tw-justify-between">
                        <div className="tw-flex tw-flex-col tw-items-start tw-gap-1">
                            <span className="tw-text-sm tw-font-medium tw-leading-5 tw-text-zc-fg">
                                {__("Community title", "zencommunity")}
                            </span>
                            <Subtext>
                                {__("Your community's display name.", "zencommunity")}
                            </Subtext>
                        </div>
                        <input
                            type="text"
                            className="tw-w-[224px] tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-2.5 tw-py-2.5 tw-text-sm tw-text-zc-fg"
                            placeholder={__("Community title", "zencommunity")}
                            defaultValue={values?.name}
                            onChange={(e) => setFieldValue("name", e.target.value)}
                        />
                    </div>

                    <div className="tw-flex tw-w-full tw-items-center tw-justify-between">
                        <div className="tw-flex tw-flex-col tw-items-start tw-gap-1">
                            <span className="tw-text-sm tw-font-medium tw-leading-5 tw-text-zc-fg">
                                {__("Community path", "zencommunity")}
                            </span>
                            <Subtext>
                                {__("URL slug where the platform loads (e.g. /community).", "zencommunity")}
                            </Subtext>
                        </div>
                        <input
                            type="text"
                            className="tw-w-[224px] tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-2.5 tw-py-2.5 tw-text-sm tw-text-zc-fg"
                            placeholder={__("Community path", "zencommunity")}
                            defaultValue={values?.path}
                            onChange={(e) => {
                                const newPath = e.target.value;
                                setFieldValue("path", newPath);
                                window.ZencommunityGlobal.community_path = newPath;
                            }}
                        />
                    </div>

                    <div className="tw-flex tw-w-full tw-flex-col tw-gap-5 tw-items-start tw-justify-between sm:tw-flex-col md:tw-flex-row md:tw-items-center">
                        <div className="tw-flex tw-flex-col tw-items-start tw-gap-1">
                            <ZCLabel type='basic' label={__("Platform access settings:", "zencommunity")} />
                            <Subtext>
                                {__("Who can access the community.", "zencommunity")}
                            </Subtext>
                        </div>
                        <div className="tw-w-[28%]">
                            <RadioGroup
                                name="community_visibility"
                                direction="row"
                                className="md:tw-flex-col !tw-items-start"
                                value={values?.community_visibility}
                                onChange={(value) => setFieldValue("community_visibility", value)}
                                options={radioItems}
                            />
                        </div>
                    </div>

                    {values?.community_visibility === 'roles' && (
                        <div className="tw-flex tw-w-full tw-items-start tw-justify-between">
                            <div className="tw-flex tw-w-full tw-flex-col tw-items-start tw-gap-1">
                                <ZCLabel type='basic' label={__("Role access settings", "zencommunity")} />
                                <Subtext>
                                    {__("Who can access the site.", "zencommunity")}
                                </Subtext>
                            </div>

                            <Select
                                className="zen-com-select zen-com-select--width-full"
                                classNamePrefix="zen-com-select"
                                options={visibilityRoles}
                                isMulti={true}
                                value={roleOptions.length && roleOptions.filter(option => values?.community_visibility_roles?.includes(option.value))}
                                onChange={(option) => {
                                    const filteredOptions = option.map(opt => opt.value);
                                    setFieldValue('community_visibility_roles', filteredOptions)
                                }}
                            />
                        </div>
                    )}

                    <Checkbox
                        title={__("Enable load on the entire site:", "zencommunity")}
                        subtitle={__("Load community assets site-wide.","zencommunity")}
                        name='load_on_entire_site'
                    />

                    <div className="tw-flex tw-w-full tw-flex-col tw-items-start tw-justify-between sm:tw-flex-col md:tw-flex-row tw-gap-5 md:tw-items-center">
                        <div className="tw-flex tw-flex-col tw-items-start tw-gap-1">
                            <ZCLabel type='basic' label={__("Render mode:", "zencommunity")} />
                            <Subtext>
                                {__("How the frontend renders. FSE builds the layout from blocks in the Site Editor (menu settings are ignored).", "zencommunity")}
                            </Subtext>
                        </div>
                        <div className="tw-flex tw-w-[50%] tw-flex-col tw-gap-2">
                            <RadioGroup
                                name="render_mode"
                                direction="row"
                                className="tw-justify-start"
                                value={values?.render_mode || "spa"}
                                onChange={(value) => {
                                    // FSE needs a block theme; ignore the FSE choice
                                    // under a classic theme (the option is disabled,
                                    // this is defense in depth).
                                    if (value === 'fse' && !is_block_theme) return;
                                    setFieldValue("render_mode", value);
                                }}
                                options={renderModeItems.map((item) => (
                                    item.value === 'fse'
                                        ? { ...item, disabled: !is_block_theme }
                                        : item
                                ))}
                            />
                            {!is_block_theme && (
                                <Subtext color="var(--zencom-warning)">
                                    {__("Gutenberg blocks (FSE) mode is locked because your active theme is not a block theme. Switch to a block theme (one with a Site Editor) to build the community layout from blocks.", "zencommunity")}
                                </Subtext>
                            )}
                        </div>
                    </div>

                    {values?.render_mode === 'fse' && is_block_theme && (
                        <div className="tw-flex tw-w-full tw-flex-col tw-items-start tw-gap-3">
                            <div className="tw-flex tw-w-full tw-items-center tw-justify-between">
                                <div className="tw-flex tw-flex-col tw-items-start tw-gap-1">
                                    <ZCLabel type='basic' label={__("Community templates", "zencommunity")} />
                                    <Subtext>
                                        {__("Design each view's template in the Site Editor.", "zencommunity")}
                                    </Subtext>
                                </div>
                                <PrimaryButton
                                    disabled={settingsData?.settings?.render_mode !== 'fse' || openingEditor}
                                    onClick={openCommunityEditor}
                                >
                                    {openingEditor ? __("Opening…", "zencommunity") : __("Edit in Site Editor", "zencommunity")}
                                </PrimaryButton>
                            </div>
                            {fseTemplates.length > 0 && (
                                <div className="tw-flex tw-w-full tw-flex-col tw-gap-2">
                                    {fseTemplates.map((tpl) => (
                                        <div key={tpl.slug} className="tw-flex tw-w-full tw-items-center tw-justify-between tw-rounded tw-border tw-border-solid tw-border-zc-border tw-px-3 tw-py-2">
                                            <span className="tw-text-sm tw-text-zc-fg">{tpl.title}</span>
                                            <GhostButton className="tw-px-2 tw-py-1 tw-text-sm" onClick={() => window.open(tpl.edit_url, '_blank', 'noopener,noreferrer')}>
                                                {__("Edit", "zencommunity")}
                                            </GhostButton>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* We can set this checkbox and switch for as figma for load on entire website also */}
                    <Checkbox
                        title={__('Enable socket', 'zencommunity')}
                        name="websock_status"
                        subtitle={__(
                            'Activate real-time chat messaging to avoid needing manual page refreshes',
                            'zencommunity'
                        )}
                        isPro={true}
                        isChecked={values?.websock_status === 'running'}
                    />

                    {is_pro_active === '1' && (
                        <div className="tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-6">
                            <div className="tw-flex tw-flex-col tw-items-start tw-gap-1">
                                <ZCLabel type="basic" label={__('Restart socket server', 'zencommunity')} />
                                <Subtext>{__('Restarts the socket server to pick up the latest code (start it first: wp zc-socket start).', 'zencommunity')}</Subtext>
                            </div>
                            <PrimaryButton
                                disabled={zenc_SOCKET?.status !== 'running' || restarting}
                                onClick={handleSocketRestart}
                            >
                                {restarting ? __('Restarting…', 'zencommunity') : __('Restart', 'zencommunity')}
                            </PrimaryButton>
                        </div>
                    )}

                    <div className="tw-flex tw-w-full tw-items-start tw-justify-between">
                        <div className="tw-flex tw-w-full tw-flex-col tw-items-start tw-gap-1">
                            <ZCLabel type='basic' label={__("Notification position", "zencommunity")} />
                            <Subtext>
                                {__(`Choose the screen location where the "Settings updated successfully" confirmation alert appears.`, "zencommunity")}
                            </Subtext>
                        </div>

                        <Select
                            className="zen-com-select zen-com-select--300"
                            classNamePrefix="zen-com-select"
                            options={notificationPositions}
                            value={notificationPositions.find(option => values?.notification_position?.includes(option.value))}
                            onChange={(option) => {
                                setFieldValue('notification_position', option.value)
                            }}
                            menuPlacement="top"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunitySettings;
