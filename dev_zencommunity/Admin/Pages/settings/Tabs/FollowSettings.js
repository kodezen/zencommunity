import React from 'react';
import ZenComTopBar from '../../../Components/ZenComTopBar';
import { __ } from '@wordpress/i18n';
import { PrimaryButton } from '../../../Components/ui';
import ZCLabel from '../../../Components/Label';
import Select from 'react-select';
import { useFormikContext } from 'formik';
import Subtext from '../../../Components/Subtext';

const groupDataSortBy = [
  { label: __("Everyone", 'zencommunity'), value: "everyone" },
  { label: __("Logged User", 'zencommunity'), value: "logged_user" },
  { label: __("Profile Owner", 'zencommunity'), value: "profile_owner" },
];

const FollowingFlower = () => {
  const { values, setFieldValue, dirty, submitForm } = useFormikContext();
  return (
    <div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
      <ZenComTopBar
        isStickyScroll
        title={__('Follower Settings', 'zencommunity')}
        subtitle={__('Control who can view your following and follower lists to manage your profile privacy.', 'zencommunity')}
        rightContent={
          <PrimaryButton onClick={submitForm} disabled={!dirty}>{__("Save changes", "zencommunity")}</PrimaryButton>
        }
      />

      <ZenComTopBar
        title={__('Access Permissions', 'zencommunity')}
        titleSize="16px"
        subtitle={__('Select which user groups are allowed to see your connection activity.', 'zencommunity')}
        subtitleSize="sm"
        subtitleWeight="normal"
        marginBottom="16px"
        padding="0"
        borderBottomWidth="0"
      />

      <div className="tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
        <div className="tw-mb-4 tw-flex tw-w-full tw-items-center tw-justify-between">
          <div className="tw-flex tw-flex-col tw-items-start tw-gap-1">
            <ZCLabel type='basic' label={__("Following List Visibility", "zencommunity")} />
            <Subtext>
              {__("Choose who can view the list of accounts you follow, ranging from everyone to only yourself.", "zencommunity")}
            </Subtext>
          </div>

          <Select
            options={groupDataSortBy}
            placeholder={__('Sort by', 'zencommunity')}
            className="zen-com-select zen-com-select--180"
            classNamePrefix="zen-com-select"
            value={groupDataSortBy.find(
              item => item.value === values.following_privacy
            )}
            onChange={option => {
              setFieldValue('following_privacy', option.value);
            }}
          />
        </div>

        <div className="tw-flex tw-w-full tw-items-center tw-justify-between">
          <div className="tw-flex tw-flex-col tw-items-start tw-gap-1">
            <ZCLabel type='basic' label={__("Follower List Privacy", "zencommunity")} />
            <Subtext>
              {__("Control who is allowed to see the users following your profile to manage your account privacy.", "zencommunity")}
            </Subtext>
          </div>

          <Select
            options={groupDataSortBy}
            placeholder={__('Sort by', 'zencommunity')}
            className="zen-com-select zen-com-select--180"
            classNamePrefix="zen-com-select"
            value={groupDataSortBy.find(
              item => item.value === values.follower_privacy
            )}
            onChange={option => {
              if (!option) return;
              setFieldValue('follower_privacy', option.value);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FollowingFlower;
