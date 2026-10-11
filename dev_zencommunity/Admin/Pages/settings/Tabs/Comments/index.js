import React, { useState } from 'react';
import { __ } from '@wordpress/i18n';
import ZenComTopBar from '../../../../Components/ZenComTopBar';
import General from './General';
import Rules from './Rules';
import Appearance from './Appearance';

const tabs = [
	{ key: 'general', label: __('General', 'zencommunity') },
	{ key: 'rules', label: __('Assignment Rules', 'zencommunity') },
	{ key: 'appearance', label: __('Appearance', 'zencommunity') },
];

/**
 * ZenCommunity Comments (zencommunity-pro's WpComments addon) settings —
 * wired in the same way every other addon integration tab is (Tutor,
 * LearnDash, Ticket Settings, etc.): a hardcoded entry here plus a gated
 * nav item in LeftBar.js, both keyed off the addon's activation flag.
 * Sub-tabs follow AiAgent's own internal-tab pattern rather than adding
 * three separate top-level nav entries.
 */
const Comments = () => {
	const [activeTab, setActiveTab] = useState('general');

	return (
		<div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
			<ZenComTopBar
				isStickyScroll={true}
				title={__('Comments', 'zencommunity')}
				subtitle={__('Replace WordPress comments with ZenCommunity discussions.', 'zencommunity')}
			/>

			<div className="tw-mb-5 tw-flex tw-flex-wrap tw-gap-0 tw-border-0 tw-border-b tw-border-solid tw-border-zc-border">
				{tabs.map((tab) => (
					<button
						key={tab.key}
						type="button"
						onClick={() => setActiveTab(tab.key)}
						aria-selected={activeTab === tab.key}
						className={`zc-subtab${activeTab === tab.key ? ' is-active' : ''}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{activeTab === 'general' && <General />}
			{activeTab === 'rules' && <Rules />}
			{activeTab === 'appearance' && <Appearance />}
		</div>
	);
};

export default Comments;
