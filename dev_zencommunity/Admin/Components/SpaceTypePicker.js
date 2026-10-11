import React from 'react';
import { useDispatch } from 'react-redux';
import { LuMessageSquare, LuFileText, LuLink, LuCalendar, LuBookOpen, LuFolder, LuMusic, LuVideo, LuCheck } from 'react-icons/lu';
import { is_pro_active } from '@Utils/helper';
import { upgradeProModal } from '@Redux/slices/upgradeToProSlice/upgradeToProSlice';
import ProTag from './ProTag';

const ICONS = {
	chat: LuMessageSquare,
	file: LuFileText,
	link: LuLink,
	calendar: LuCalendar,
	book: LuBookOpen,
	folder: LuFolder,
	music: LuMusic,
	video: LuVideo,
};

/** The space content types, from the localized catalogue (SpaceType::types()). */
export const spaceTypes = () => {
	const t = window?.ZencommunityGlobal?.space_types || {};
	return Object.entries(t).map(([key, v]) => ({ key, ...v }));
};

export const spaceTypeLabel = (key) => spaceTypes().find((t) => t.key === key)?.label || key;

/** Icon component for a space type key — same lookup the picker itself uses. */
export const spaceTypeIcon = (key) => ICONS[spaceTypes().find((t) => t.key === key)?.icon] || LuFileText;

/**
 * SureDash-style grid of selectable space content types. Tailwind-only.
 *
 * A type flagged `pro: true` (see SpaceType::types()) stays visible even
 * without ZenCommunity Pro — never hidden — but is rendered locked with a
 * "Pro" badge, and clicking it opens the existing upgrade-to-Pro modal
 * instead of selecting it. This is a UI convenience only: the real
 * enforcement is server-side (SpaceType::normalize_type()), so a locked card
 * here is never the only thing standing between a non-Pro site and a Pro
 * type.
 */
const SpaceTypePicker = ({ value, onChange, disabled }) => {
	const dispatch = useDispatch();

	return (
		<div className="tw-grid tw-grid-cols-1 tw-gap-3 sm:tw-grid-cols-2">
			{spaceTypes().map((t) => {
				const Icon = ICONS[t.icon] || LuFileText;
				const active = value === t.key;
				const locked = !!t.pro && !is_pro_active;

				return (
					<button
						type="button"
						key={t.key}
						disabled={disabled}
						aria-pressed={active}
						onClick={() => (locked ? dispatch(upgradeProModal(true)) : onChange(t.key))}
						className={
							'tw-group tw-relative tw-flex tw-items-start tw-gap-3 tw-overflow-hidden tw-rounded-xl tw-border tw-border-solid tw-bg-white tw-p-4 tw-text-left !tw-duration-[600ms] tw-transition-colors disabled:tw-cursor-not-allowed disabled:tw-opacity-50 tw-cursor-pointer ' +
							(active
								? 'tw-border-zc-primary tw-ring-1 tw-ring-zc-primary'
								: 'tw-border-zc-border hover:tw-border-zc-primary/50')
						}
					>
						{/* Fill sweep: scales in from the left edge rather than the
						background just appearing, so selecting (or, for a locked
						Pro type, opening the upgrade prompt) reads as a deliberate
						motion instead of an instant color swap. */}
						<span
							aria-hidden="true"
							className={
								'tw-absolute tw-inset-0 tw-origin-left tw-bg-zc-primary-soft tw-transition-transform !tw-duration-600 tw-ease-out ' +
								(active ? 'tw-scale-x-100' : 'tw-scale-x-0 group-hover:tw-scale-x-100')
							}
						/>

						<span
							className={
								'tw-relative tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-transition-colors ' +
								(active ? 'tw-bg-zc-primary tw-text-white' : 'tw-bg-zc-primary-soft tw-text-zc-primary')
							}
						>
							<Icon size={18} />
						</span>
						<span className="tw-relative tw-min-w-0 tw-pr-5">
							<span className="tw-flex tw-items-center tw-gap-1.5">
								<span className="tw-block tw-text-sm tw-font-semibold tw-text-zc-fg">{t.label}</span>
								{locked && <ProTag />}
							</span>
							<span className="tw-mt-0.5 tw-block tw-text-[13px] tw-leading-snug tw-text-zc-muted">{t.description}</span>
						</span>

						{active && (
							<span className="tw-absolute tw-right-3 tw-top-3 tw-flex tw-h-4 tw-w-4 tw-items-center tw-justify-center tw-rounded-full tw-bg-zc-primary tw-text-white">
								<LuCheck size={10} strokeWidth={3} />
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
};

export default SpaceTypePicker;
