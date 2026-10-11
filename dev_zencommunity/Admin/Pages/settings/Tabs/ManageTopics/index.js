import React from 'react';
import ZenComTopBar from '../../../../Components/ZenComTopBar';
import { __ } from '@wordpress/i18n';
import ZCLabel from '../../../../Components/Label';
import { search } from '../../../../../../assets/staticIcons';
import TopicsTable from './TopicsTable';

const Topics = () => {
  return (
    <div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
      <ZenComTopBar
        isStickyScroll={true}
        title={__("Manage Topics", "zencommunity")}
        subtitle={__("Customize and manage topics to categorize group posts.", "zencommunity")}
    />

      <ZCLabel
        type='boldLight'
        label={__("Categorize your content and allow members to filter posts with the topic navigation bar in spaces.", "zencommunity")}
      />
      <div className="tw-mt-2.5 tw-flex tw-w-full tw-items-center tw-rounded tw-border tw-border-solid tw-border-zc-border tw-px-3">
        {search()}
        <input
          type="text"
          placeholder={__('Search...', 'zencommunity')}
          className="tw-h-9 tw-w-full tw-border-0 tw-bg-transparent tw-text-zc-fg tw-outline-none"
        />
      </div>
      <TopicsTable />
    </div>
  );
};

export default Topics;