import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { __ } from '@wordpress/i18n';
import { LuLock, LuSearch, LuSearchX, LuSparkles, LuX } from 'react-icons/lu';
import { upgradeProModal } from '@Redux/slices/upgradeToProSlice/upgradeToProSlice';
import { EmptyState, GhostButton, Skeleton, Toggle } from '../../../Components/ui';
import ZenComTopBar from '../../../Components/ZenComTopBar';
import { FaPencilRuler } from 'react-icons/fa';
import ZCLabel from '../../../Components/Label';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllAddons, toggleAddonStatus } from '@Redux/slices/addons/addonsSlice';
import ProTag from '../../../Components/ProTag';
import Subtext from '../../../Components/Subtext';
import './addons.scss';

const ADDON_BORDER_COLORS = {
    ticketingsystem: ['#F15A24'],
    engineering: ['#1F1F1F'],
    messaging: ['#4A4DFF'],
    livechat: ['#D94C9A'],
    followerandblocker: ['#3B82F6'],
    aiagent: ['#111111'],
    email: ['#21A675'],
    wpcomments: ['#0D9488'],
    academylms: ['#8B7CF6'],
    gameengine: ['#1D6FFF'],
    learndash: ['#F5B400', '#2D7FF9'],
    tutorlms: ['#2563EB'],
    learnpress: ['#8B5CF6'],
    lifterlms: ['#4A8CFF'],
    masterstudy: ['#5B7CFA'],
    migration: ['#21A675'],
};

const normalizeAddonKey = (value = '') => value.toLowerCase().replace(/[^a-z]/g, '');

// The addons API has no category field, so group them here by key. Anything
// not listed (e.g. a new add-on) falls under "Other".
const ADDON_CATEGORIES = {
    ticketingsystem: 'support',
    engineering: 'support',
    livechat: 'support',
    aiagent: 'support',
    messaging: 'engagement',
    followerandblocker: 'engagement',
    gameengine: 'engagement',
    email: 'engagement',
    wpcomments: 'engagement',
    academylms: 'lms',
    learndash: 'lms',
    tutorlms: 'lms',
    learnpress: 'lms',
    lifterlms: 'lms',
    masterstudy: 'lms',
    migration: 'tools',
};

const CATEGORY_LABELS = {
    all: __('All categories', 'zencommunity'),
    support: __('Support', 'zencommunity'),
    engagement: __('Engagement', 'zencommunity'),
    lms: __('LMS', 'zencommunity'),
    tools: __('Tools', 'zencommunity'),
    other: __('Other', 'zencommunity'),
};

const STATUS_LABELS = {
    all: __('All', 'zencommunity'),
    active: __('Active', 'zencommunity'),
    inactive: __('Inactive', 'zencommunity'),
    pro: __('Pro', 'zencommunity'),
};

const addonCategory = (addon) => ADDON_CATEGORIES[normalizeAddonKey(addon?.key)] || 'other';

const matchesStatus = (addon, status) => {
    if (status === 'active') return !!addon?.is_activated;
    // Pro teasers (Pro not installed) can't be switched on, so they're only
    // under All and Pro, not Inactive.
    if (status === 'inactive') return !addon?.is_activated && !addon?.promotion;
    if (status === 'pro') return !!addon?.promotion;
    return true;
};

const getAddonBorderColors = (addon) => {
    return ADDON_BORDER_COLORS[normalizeAddonKey(addon?.key)]
        || ADDON_BORDER_COLORS[normalizeAddonKey(addon?.name)];
};

// border-image ignores border-radius, so a multi-color border is faked with a
// gradient-filled padding ring instead of an actual `border` property.
const AddonIcon = ({ addon }) => {
    const colors = getAddonBorderColors(addon);

    return (
        <span
            className="tw-inline-flex tw-h-12 tw-w-12 tw-shrink-0 tw-rounded-full"
            style={colors ? {
                padding: '2px',
                background: colors.length > 1
                    ? `linear-gradient(90deg, ${colors.join(', ')})`
                    : colors[0],
            } : undefined}
        >
            <img
                src={addon?.icon_src}
                alt={addon?.name}
                className="tw-h-full tw-w-full tw-rounded-full tw-bg-white tw-object-contain tw-p-2.5"
            />
        </span>
    );
};

// Segmented status filter; the highlight slides to the selected option.
const StatusFilter = ({ options, value, counts, onChange }) => {
    const wrapRef = useRef(null);
    const [pill, setPill] = useState(null);

    useLayoutEffect(() => {
        const measure = () => {
            const el = wrapRef.current?.querySelector('[aria-selected="true"]');
            if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [value, options.length, counts]);

    return (
        <div ref={wrapRef} role="tablist" aria-label={__('Filter by status', 'zencommunity')} className="zc-addons-status">
            {pill && <span className="zc-addons-status__pill" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} aria-hidden="true" />}
            {options.map(([key, label]) => (
                <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={value === key}
                    onClick={() => onChange(key)}
                    className={`zc-addons-status__item${value === key ? ' is-active' : ''}`}
                >
                    {label}
                    <span className="zc-addons-status__count">{counts[key] ?? 0}</span>
                </button>
            ))}
        </div>
    );
};

// showHeader=false on the Add-ons admin page, whose PageHeader already titles it.
const Addons = ({ showHeader = true }) => {
    const { data: addons } = useSelector((state) => state.addons);
    const [addonsLoading, setAddonsLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [category, setCategory] = useState('all');
    const dispatch = useDispatch();

    const list = Array.isArray(addons) ? addons : [];
    const q = query.trim().toLowerCase();
    const matchesQuery = (addon) => !q || `${addon?.name ?? ''} ${addon?.description ?? ''}`.toLowerCase().includes(q);

    // Only offer categories that actually have add-ons.
    const categories = useMemo(() => {
        const present = new Set(list.map(addonCategory));
        return ['all', ...Object.keys(CATEGORY_LABELS).filter((c) => c !== 'all' && present.has(c))];
    }, [list]);

    // Status counts follow the search + category, so they match what a click shows.
    const statusCounts = useMemo(() => {
        const base = list.filter((a) => matchesQuery(a) && (category === 'all' || addonCategory(a) === category));
        return Object.fromEntries(Object.keys(STATUS_LABELS).map((st) => [st, base.filter((a) => matchesStatus(a, st)).length]));
    }, [list, q, category]);

    const visible = list.filter((a) => matchesQuery(a) && matchesStatus(a, status) && (category === 'all' || addonCategory(a) === category));
    const filtered = !!q || status !== 'all' || category !== 'all';
    const clearFilters = () => {
        setQuery('');
        setStatus('all');
        setCategory('all');
    };

    useEffect(() => {
        (async () => {
            if (addons?.length > 0) return;
            try {
                setAddonsLoading(true);
                await dispatch(fetchAllAddons()).unwrap();
            } catch (error) {
                console.error(error);
            } finally {
                setAddonsLoading(false);
            }
        })();
    }, []);

    const handleAddonStatus = async (selectedAddon) => {
        try {
            dispatch(toggleAddonStatus(selectedAddon));
        } catch (error) {
            console.error(error)
        } finally {
            setAddonsLoading(false)
        }
    }

    return (
        <div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
            {showHeader && (
                <ZenComTopBar
                    isStickyScroll={true}
                    title="Add-ons"
                    subtitle="Activate Addons"
                />
            )}

            <div className="tw-mb-4 tw-flex tw-flex-col tw-gap-3">
                <div className="tw-flex tw-flex-col tw-gap-3 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
                    <label className="tw-relative tw-flex tw-w-full tw-items-center sm:tw-max-w-[320px]">
                        <LuSearch size={16} className="tw-pointer-events-none tw-absolute tw-left-3 tw-text-zc-muted" aria-hidden="true" />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={__('Search add-ons…', 'zencommunity')}
                            aria-label={__('Search add-ons', 'zencommunity')}
                            className="zc-addons-search tw-h-10 tw-w-full tw-rounded-md tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-pl-9 tw-pr-9 tw-text-sm tw-text-zc-fg tw-shadow-none tw-outline-none focus:tw-border-zc-primary focus:tw-shadow-none"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                aria-label={__('Clear search', 'zencommunity')}
                                className="tw-absolute tw-right-2 tw-flex tw-h-6 tw-w-6 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-full tw-border-0 tw-bg-transparent tw-p-0 tw-text-zc-muted hover:tw-bg-zc-border hover:tw-text-zc-fg"
                            >
                                <LuX size={14} />
                            </button>
                        )}
                    </label>

                    <StatusFilter
                        options={Object.entries(STATUS_LABELS).filter(([key]) => key !== 'pro' || list.some((a) => a?.promotion))}
                        value={status}
                        counts={statusCounts}
                        onChange={setStatus}
                    />
                </div>

                {categories.length > 2 && (
                    <div className="zc-addons-chips" aria-label={__('Filter by category', 'zencommunity')}>
                        {categories.map((key) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={category === key}
                                onClick={() => setCategory(key)}
                                className={`zc-addons-chip${category === key ? ' is-active' : ''}`}
                            >
                                {CATEGORY_LABELS[key]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {addonsLoading ? (
                <div className="tw-flex tw-flex-wrap tw-gap-4">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="tw-flex tw-w-full tw-min-h-[180px] tw-flex-col tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-4 sm:tw-w-full md:tw-w-[calc((100%_/_3)_-_11px)]"
                        >
                            {/* Top row: icon + toggle */}
                            <div className="tw-mb-4 tw-flex tw-items-start tw-justify-between">
                                <Skeleton className="tw-h-12 tw-w-12 tw-rounded-full" />
                                <Skeleton className="tw-h-5 tw-w-10 tw-rounded-full" />
                            </div>

                            {/* Name */}
                            <Skeleton className="tw-mb-1 tw-h-4 tw-w-3/5" />

                            {/* Description — two lines */}
                            <Skeleton className="tw-mb-1.5 tw-h-[13px] tw-w-full" />
                            <Skeleton className="tw-mb-4 tw-h-[13px] tw-w-3/4" />
                        </div>
                    ))}
                </div>
            ) : filtered && visible.length === 0 ? (
                <EmptyState icon={LuSearchX}>
                    <span>{__('No add-ons match your filters.', 'zencommunity')}</span>
                    <GhostButton onClick={clearFilters}>{__('Clear filters', 'zencommunity')}</GhostButton>
                </EmptyState>
            ) : (
                <div className="tw-flex tw-flex-wrap tw-gap-4">
                    {visible.map((addon) => {
                        const locked = !!addon?.promotion;
                        return (
                            <div
                                key={addon?.key}
                                className={
                                    'tw-relative tw-flex tw-w-full tw-flex-col tw-rounded tw-border tw-p-4 tw-text-zc-fg sm:tw-w-full md:tw-w-[calc((100%_/_3)_-_11px)] ' +
                                    (locked ? 'tw-border-dashed tw-border-zc-border tw-bg-zc-body' : 'tw-border-solid tw-border-zc-border tw-bg-zc-bg')
                                }
                            >
                                <div className="tw-mb-4 tw-flex tw-items-start tw-justify-between">
                                    <span className={locked ? 'tw-relative tw-opacity-60 tw-grayscale' : 'tw-relative'}>
                                        {addon?.icon_src ? <AddonIcon addon={addon} /> : <FaPencilRuler />}
                                    </span>
                                    {locked ? (
                                        <span className="tw-inline-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-rounded-full tw-bg-zc-border tw-text-zc-muted" title={__('Available in ZenCommunity Pro', 'zencommunity')}>
                                            <LuLock size={14} aria-hidden="true" />
                                        </span>
                                    ) : (
                                        <Toggle value={addon?.is_activated} onChange={() => handleAddonStatus(addon)} />
                                    )}
                                </div>
                                <div className="tw-mb-1 tw-flex tw-items-center tw-gap-2">
                                    <ZCLabel label={addon?.name} margin="0" />
                                    {locked && <ProTag />}
                                </div>
                                <Subtext fontSize="13px">
                                    {addon?.description}
                                </Subtext>
                                {locked && (
                                    <button
                                        type="button"
                                        onClick={() => dispatch(upgradeProModal(true))}
                                        className="tw-mt-auto tw-inline-flex tw-w-fit tw-cursor-pointer tw-items-center tw-gap-1.5 tw-border-0 tw-bg-transparent tw-p-0 tw-pt-3 tw-text-sm tw-font-medium tw-text-zc-primary hover:tw-underline"
                                    >
                                        <LuSparkles size={14} aria-hidden="true" />
                                        {__('Upgrade to unlock', 'zencommunity')}
                                    </button>
                                )}
                                {!locked && addon?.settings_url && (
                                    <a
                                        href={addon.settings_url}
                                        className="tw-mt-3 tw-text-sm tw-font-medium tw-text-zc-primary tw-no-underline hover:tw-underline"
                                    >
                                        {__('Settings', 'zencommunity')} &rarr;
                                    </a>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default Addons;
