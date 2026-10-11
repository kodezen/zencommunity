import React from 'react';
import { __ } from '@wordpress/i18n';
import { PrimaryButton } from '../../../Components/ui';
import ZenComTopBar from '../../../Components/ZenComTopBar';
import Select from 'react-select';
import { allMember } from './helper';
import ZCLabel from '../../../Components/Label';
import Checkbox from '../../../Components/FormikToggle';
import { useFormikContext } from 'formik';
import { useDispatch } from 'react-redux';
import { updateCommunitySettings } from '@Redux/slices/settingsSlice/settingsSlice';
import Subtext from '../../../Components/Subtext';

const Privacy = () => {
    const { dirty, values, setFieldValue } = useFormikContext();
    const dispatch = useDispatch();
    const updatePrivacy = () => {
        dispatch(updateCommunitySettings({
            can_see_all_members : values?.can_see_all_members,
            allow_member_registration : values?.allow_member_registration,
            enable_date_of_birth_field : values?.enable_date_of_birth_field,
            allow_messaging_minors : values?.allow_messaging_minors
        }))
    }

    return (
        <div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
            <ZenComTopBar
                isStickyScroll={true}
                title={__("Privacy", "zencommunity")}
                subtitle={__("Manage the visibility of your community and control who can access member information.", "zencommunity")}
                rightContent={
                    <PrimaryButton onClick={updatePrivacy} disabled={!dirty}>{__("Save changes", "zencommunity")}</PrimaryButton>
                }
            />

            <div className="zencom-animate-fade tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
                <div className="tw-mb-6 tw-flex tw-items-center tw-justify-between">
                    <div className="tw-flex tw-flex-col tw-gap-2">
                        <ZCLabel type='basic' label={__("Who can view all members page", "zencommunity")} />
                        <Subtext>
                            {__("Set visibility for members page.", "zencommunity")}
                        </Subtext>
                    </div>

                    <Select
                        options={allMember}
                        placeholder={__('Select...', 'zencommunity')}
                        className="zen-com-select zen-com-select--164"
                        classNamePrefix="zen-com-select"
                        value={allMember.find(item => item.value === values?.can_see_all_members)}
                        onChange={(option) => setFieldValue("can_see_all_members", option.value)}
                    />
                </div>
                <div className="tw-flex tw-flex-col tw-gap-6">
                    <Checkbox
                        title={__("Allow member registration:", "zencommunity")}
                        subtitle={__("Toggle this switch to enable or disable the ability for new users to sign up for your community.", "zencommunity")}
                        name='allow_member_registration'
                        checked={values?.allow_member_registration}
                    />
                    <Checkbox
                        title={__("Enable Date of Birth field:", "zencommunity")}
                        subtitle={__("Shows a Date of Birth field on member profiles and enables messaging safety rules that stop adults from starting conversations with members flagged as minors.", "zencommunity")}
                        name='enable_date_of_birth_field'
                        checked={values?.enable_date_of_birth_field}
                    />
                    {values?.enable_date_of_birth_field && (
                        <Checkbox
                            title={__("Allow minors to be messaged:", "zencommunity")}
                            subtitle={__("Off by default: adults cannot start a private message or group chat with a member flagged as a minor. Turn this on to disable that restriction.", "zencommunity")}
                            name='allow_messaging_minors'
                            checked={values?.allow_messaging_minors}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Privacy;
