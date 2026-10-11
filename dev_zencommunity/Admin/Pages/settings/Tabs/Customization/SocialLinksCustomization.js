import React, { useState, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import { useFormikContext } from 'formik';
import ZenComDrawer from '../../../../Components/DrawerPanel';
import CheckBoxAndSwitch from '../../../../Components/CheckBoxAndSwitch';
import { GripIcon } from '../../../../../../assets/staticIcons';
import { socialLinks } from '../helper';
import { useSelector } from 'react-redux';
import AutoSave from '../../../../Components/AutoSave';

const SocialLinksCustomization = () => {
  const { values, setFieldValue } = useFormikContext();
  const { data: settingsData} = useSelector(state => state.settings);

  useEffect(() => {
    if(values?.permitted_social_sites_for_link_sharing?.length !== settingsData?.settings?.permitted_social_sites_for_link_sharing?.length) {
      window.ZencommunityGlobal.permitted_social_sites_for_link_sharing = values?.permitted_social_sites_for_link_sharing
    }
  }, [values?.permitted_social_sites_for_link_sharing?.length])


  return (
    <div className="tw-flex tw-flex-col tw-gap-5">
      <ZenComDrawer
        title={__("Enable Your Favorite Sharing Networks", "zencommunity")}
        triggerContent={__("Customize", "zencommunity")}
        triggerClassname={{
          className: 'tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-1.5 tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-transparent tw-px-3 tw-py-1.5 tw-text-sm tw-font-medium tw-text-zc-fg hover:tw-bg-zc-hover',
        }}
        size="md"
        isFooter={false}
        bodyPadding="0"
      >
        <AutoSave />
        <div className="tw-bg-zc-bg tw-p-6 tw-text-zc-fg">
          <div className="tw-flex tw-flex-col tw-gap-3 tw-rounded tw-border tw-border-solid tw-border-zc-border">
            {socialLinks.map((item, index) => (
              <div
                key={item.value}
                className={
                  'tw-flex tw-items-center tw-gap-3 tw-p-4 ' +
                  (index === socialLinks.length - 1 ? '' : 'tw-border-0 tw-border-b tw-border-solid tw-border-zc-border')
                }
              >
                <GripIcon className="tw-cursor-pointer" />
                <span className="tw-flex tw-h-6 tw-w-6 tw-items-center tw-justify-center">
                  {item.icon}
                </span>
                <CheckBoxAndSwitch
                  label={item.label}
                  width="100%"
                  isChecked={values?.permitted_social_sites_for_link_sharing?.includes(item?.value)}
                  onChange={(checked) => {
                    const updatedLinks = checked
                      ? [...values?.permitted_social_sites_for_link_sharing, item?.value]
                      : values?.permitted_social_sites_for_link_sharing.filter((v) => v !== item?.value);
                    setFieldValue('permitted_social_sites_for_link_sharing', updatedLinks);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </ZenComDrawer>
    </div>
  );
};

export default SocialLinksCustomization;
