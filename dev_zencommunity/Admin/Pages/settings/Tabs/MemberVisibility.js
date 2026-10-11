import React from 'react';
import { __ } from '@wordpress/i18n';
import { useFormikContext } from 'formik';
import { PrimaryButton, RadioGroup, Separator } from '../../../Components/ui';
import ZenComTopBar from '../../../Components/ZenComTopBar';

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
    label: __("Only admin/moderator", "zencommunity"),
    value: "admin-mod",
  },
]

const MemberVisibility = () => {
  const { setFieldValue, values } = useFormikContext();

  return (
    <div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
      <ZenComTopBar
        isStickyScroll={true}
        title={__("Member visibility", "zencommunity")}
        subtitle={__("Control who can see your community members and membership groups", "zencommunity")}
        rightContent={
          <PrimaryButton>{__("Save changes", "zencommunity")}</PrimaryButton>
        }
      />

      <ZenComTopBar
        title={__("Member visibility", "zencommunity")} titleSize="16px"
        subtitle={__("Control who can see your community members and membership groups", "zencommunity")} subtitleSize="sm" subtitleWeight="normal"
        marginBottom="16px"
        padding="0"
        borderBottomWidth="0"
      />

      <div className="tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
        <div className="tw-flex tw-w-full tw-items-start tw-justify-between tw-gap-12">
          <div className="tw-flex tw-w-full tw-flex-col tw-items-start tw-gap-1">
            <span className="tw-text-sm tw-font-semibold tw-text-zc-fg">{__("Who can view all members page", "zencommunity")}</span>
            <span className="tw-text-sm tw-font-normal tw-text-zc-muted">{__("Choose whether the all-members page should be public, private, or admin/moderator only.", "zencommunity")}</span>
          </div>
          <RadioGroup
            direction="column"
            value={values?.can_see_all_members}
            onChange={(value) => setFieldValue("can_see_all_members", value)}
            options={radioItems}
          />
        </div>

        <Separator className="tw-my-6" />

        <div className="tw-flex tw-w-full tw-items-start tw-justify-between tw-gap-12">
          <div className="tw-flex tw-w-full tw-flex-col tw-items-start tw-gap-1">
            <span className="tw-text-sm tw-font-semibold tw-text-zc-fg">{__("Who can view membership group on the user profile page.", "zencommunity")}</span>
            <span className="tw-text-sm tw-font-normal tw-text-zc-muted">{__("Choose the privacy settings for spaces page of a member profile.", "zencommunity")}</span>
          </div>
          <RadioGroup
            direction="column"
            value={values?.can_see_others_groups_membership}
            onChange={(value) => setFieldValue("can_see_others_groups_membership", value)}
            options={radioItems}
          />
        </div>
      </div>
    </div>
  );
};

export default MemberVisibility;
