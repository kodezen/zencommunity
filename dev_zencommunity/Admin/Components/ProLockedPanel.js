import React from 'react';
import { __ } from '@wordpress/i18n';
import { useDispatch } from 'react-redux';
import { LuArrowRight, LuCheck, LuLock } from 'react-icons/lu';
import { upgradeProModal } from '@Redux/slices/upgradeToProSlice/upgradeToProSlice';
import ProTag from './ProTag';
import { PRICING_URL } from './UpgradeMessage';

import './upgrade.scss';

/**
 * Full-width "this page is a Pro feature" panel: a blurred, decorative preview
 * of what the page looks like, with a card on top that explains what's locked
 * and links to upgrading.
 */
const ProLockedPanel = ({ title, description, features = [] }) => {
	const dispatch = useDispatch();

	return (
		<div className="zc-pro-locked">
			{/* Decorative stand-in for the real dashboard (stat cards + a chart). */}
			<div className="zc-pro-locked__preview" aria-hidden="true">
				<div className="zc-pro-locked__stats">
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="zc-pro-locked__stat">
							<span className="zc-pro-locked__line is-short" />
							<span className="zc-pro-locked__line is-num" />
						</div>
					))}
				</div>
				<div className="zc-pro-locked__chart">
					<svg viewBox="0 0 600 160" preserveAspectRatio="none">
						<defs>
							<linearGradient id="zc-pro-locked-fill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
								<stop offset="100%" stopColor="currentColor" stopOpacity="0" />
							</linearGradient>
						</defs>
						<path d="M0 130 C60 120 90 90 150 96 S250 60 310 70 S420 30 480 44 S560 20 600 24 L600 160 L0 160 Z" fill="url(#zc-pro-locked-fill)" />
						<path d="M0 130 C60 120 90 90 150 96 S250 60 310 70 S420 30 480 44 S560 20 600 24" fill="none" stroke="currentColor" strokeWidth="3" />
					</svg>
				</div>
			</div>

			<div className="zc-pro-locked__card">
				<span className="zc-pro-locked__icon"><LuLock size={22} /></span>
				<ProTag size="md" />
				<h2 className="zc-pro-locked__title">{title}</h2>
				{description && <p className="zc-pro-locked__text">{description}</p>}
				{features.length > 0 && (
					<ul className="zc-pro-locked__list">
						{features.map((item) => (
							<li key={item}>
								<span className="zc-upgrade__check"><LuCheck size={12} /></span>
								{item}
							</li>
						))}
					</ul>
				)}
				<div className="zc-pro-locked__actions">
					<a href={PRICING_URL} target="_blank" rel="noreferrer" className="zc-upgrade__cta">
						{__('Upgrade to Pro', 'zencommunity')}
						<LuArrowRight size={16} aria-hidden="true" />
					</a>
					<button type="button" className="zc-upgrade__later" onClick={() => dispatch(upgradeProModal(true))}>
						{__("What's in Pro?", 'zencommunity')}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ProLockedPanel;
