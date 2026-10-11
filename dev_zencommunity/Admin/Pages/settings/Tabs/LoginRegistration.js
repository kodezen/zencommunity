import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useFormikContext } from 'formik';
import { useDispatch } from 'react-redux';
import { RiInformationLine } from 'react-icons/ri';
import { updateCommunitySettings } from '@Redux/slices/settingsSlice/settingsSlice';
import { API, wp_users_can_register, wp_general_settings_url } from '@Utils/helper';
import { PrimaryButton, PrimarySelect } from '../../../Components/ui';
import ZenComTopBar from '../../../Components/ZenComTopBar';
import ZCLabel from '../../../Components/Label';
import Subtext from '../../../Components/Subtext';
import Checkbox from '../../../Components/FormikToggle';

// The two built-in destinations - anything else in the dropdown is a WP Page
// ID, resolved server-side (Assets::resolve_auth_page_url()) to that page's
// permalink so the frontend Login/Signup entry points can redirect there.
const staticPageOptions = [
    { value: 'zencommunity', label: __('ZenCommunity (built-in)', 'zencommunity') },
    { value: 'wordpress', label: __('WordPress Default', 'zencommunity') },
];

const LoginRegistration = () => {
    const { dirty, values, setFieldValue } = useFormikContext();
    const dispatch = useDispatch();
    const [pages, setPages] = useState([]);

    useEffect(() => {
        API.get('wp/v2/pages', { params: { per_page: 100, status: 'publish', _fields: 'id,title' } })
            .then((res) => setPages(res?.data || []))
            .catch(() => {});
    }, []);

    const pageOptions = [
        ...staticPageOptions,
        ...pages.map((page) => ({ value: String(page.id), label: page.title?.rendered || `#${page.id}` })),
    ];

    const updateSettings = () => {
        dispatch(updateCommunitySettings({
            override_wp_registration: values?.override_wp_registration,
            login_page: values?.login_page,
            register_page: values?.register_page,
        }));
    };

    return (
        <div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
            <ZenComTopBar
                isStickyScroll={true}
                title={__("Login & Registration", "zencommunity")}
                subtitle={__("Control how new members can sign up for your community.", "zencommunity")}
                rightContent={
                    <PrimaryButton onClick={updateSettings} disabled={!dirty}>{__("Save changes", "zencommunity")}</PrimaryButton>
                }
            />

            <div className="zencom-animate-fade tw-mb-4 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6 tw-flex tw-flex-col tw-gap-6">
                {!wp_users_can_register && (
                    <div className="tw-flex tw-items-start tw-gap-2.5 tw-rounded tw-border tw-border-solid tw-border-zc-primary-soft tw-bg-zc-primary-faint tw-p-4 tw-text-sm tw-text-zc-fg">
                        <RiInformationLine size={18} className="tw-mt-0.5 tw-shrink-0 tw-text-zc-primary" />
                        <p className="tw-m-0">
                            {__('User registration is currently disabled. To allow new users to sign up, please enable the "Anyone can register" option in your', 'zencommunity')}{' '}
                            <a href={wp_general_settings_url} className="tw-font-semibold tw-text-zc-primary tw-underline">
                                {__('WordPress General Settings.', 'zencommunity')}
                            </a>
                        </p>
                    </div>
                )}

                <Checkbox
                    title={__("Override WordPress Registration Setting", "zencommunity")}
                    subtitle={__("Allow users to register through ZenCommunity even if WordPress registration is disabled.", "zencommunity")}
                    name='override_wp_registration'
                    checked={values?.override_wp_registration}
                />
            </div>

            <div className="zencom-animate-fade tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
                <div className="tw-flex tw-flex-col tw-gap-1 tw-mb-5">
                    <ZCLabel type='basic' label={__("Login & Registration Pages", "zencommunity")} />
                    <Subtext>
                        {__("Choose which page handles login and registration - the built-in ZenCommunity page, WordPress's default page, or a custom page of your own.", "zencommunity")}
                    </Subtext>
                </div>

                <div className="tw-grid tw-grid-cols-1 tw-gap-x-5 tw-gap-y-6 md:tw-grid-cols-2">
                    <PrimarySelect
                        label={__('Login page', 'zencommunity')}
                        options={pageOptions}
                        placeholder={__('Select…', 'zencommunity')}
                        value={String(values?.login_page ?? 'zencommunity')}
                        onChange={(value) => setFieldValue('login_page', value)}
                        menuPlacement="auto"
                    />
                    <PrimarySelect
                        label={__('Registration page', 'zencommunity')}
                        options={pageOptions}
                        placeholder={__('Select…', 'zencommunity')}
                        value={String(values?.register_page ?? 'zencommunity')}
                        onChange={(value) => setFieldValue('register_page', value)}
                        menuPlacement="auto"
                    />
                </div>
            </div>
        </div>
    );
};

export default LoginRegistration;
