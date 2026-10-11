/**
 * Block-editor registration for ZenCommunity FSE blocks.
 *
 * These are dynamic (server-rendered) blocks: the real output is an island the
 * SPA hydrates on the frontend (see includes/fse/manager.php::render_block).
 * The SPA runtime never runs inside the editor, so we can't mount the live
 * React app in the Site Editor's iframe. Instead each block renders a
 * representative preview that fetches the SAME data the frontend uses (menus,
 * members, feeds, groups via the REST API) and lays it out with inline styles —
 * inline styles render correctly inside the editor iframe with no extra
 * stylesheet, so authors see a real, data-driven preview of what they're
 * placing. While data loads (or when a collection is empty) the preview shows a
 * neutral skeleton of the same shape.
 *
 * The block list + metadata is injected by PHP as `window.ZencommunityFseBlocks`.
 */
import { registerBlockType, unregisterBlockType, getBlockType } from '@wordpress/blocks';
import { useBlockProps, useInnerBlocksProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import { Placeholder, PanelBody, SelectControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { createElement as el, Fragment, useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import LivePreview from './LivePreview';

const config = window.ZencommunityFseBlocks || { blocks: [], category: 'zencommunity' };

/**
 * Blocks that render the routed community (their own react-router) — mounting
 * those live in the editor is heavy/fragile, so they keep the lightweight
 * "content renders here" canvas. Every other block renders the REAL frontend
 * component (see LivePreview), falling back to its static preview on failure.
 */
const SKIP_LIVE = new Set(['community-app', 'content-outlet', 'content-body']);

/* ------------------------------------------------------------------ *
 * Real data — fetched once from the REST API and shared by every block
 * preview on the page (module-level promise cache, so N blocks = 1 fetch each).
 * ------------------------------------------------------------------ */
const NS = '/zencommunity/v1';
const cache = {};
const fetchOnce = (key, path) => {
    if (!cache[key]) {
        cache[key] = apiFetch({ path }).catch(() => null);
    }
    return cache[key];
};

const useZenData = () => {
    const [data, setData] = useState({});
    useEffect(() => {
        let alive = true;
        Promise.all([
            fetchOnce('menus', `${NS}/menus`),
            fetchOnce('members', `${NS}/members?per_page=6`),
            fetchOnce('feeds', `${NS}/feeds?per_page=3`),
            fetchOnce('groups', `${NS}/groups?per_page=6`),
        ]).then(([menus, members, feeds, groups]) => {
            if (alive) setData({ menus, members, feeds, groups });
        });
        return () => {
            alive = false;
        };
    }, []);
    return data;
};

/** The community nav labels from the real menus (top menu preferred). */
const navLabelsFrom = (menus) => {
    if (!menus || typeof menus !== 'object') return null;
    const menu = menus.top_menu || menus.primary_menu || Object.values(menus)[0];
    const items = (menu?.items || [])
        .filter((i) => i && i.status !== false && String(i.label || '').toLowerCase() !== 'settings')
        .map((i) => String(i.label || '').trim())
        .filter(Boolean);
    return items.length ? items : null;
};

const recordsOf = (payload) => (Array.isArray(payload?.records) ? payload.records : Array.isArray(payload) ? payload : []);
const memberName = (m) => [m.first_name, m.last_name].filter(Boolean).join(' ').trim() || m.username || m.display_name || __('Member', 'zencommunity');
const initialOf = (name) => (String(name || '?').trim().charAt(0) || '?').toUpperCase();
const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ *
 * Inline-styled preview toolkit (works inside the editor iframe).
 * ------------------------------------------------------------------ */
const T = {
    accent: '#2563eb',
    accentSoft: '#dbeafe',
    border: '#e5e7eb',
    surface: '#ffffff',
    page: '#f8fafc',
    subtle: '#eef2f7',
    line: '#e9edf3',
    text: '#0f172a',
    muted: '#94a3b8',
    radius: 8,
};

const box = (style, ...children) => el('div', { style }, ...children);
const row = (style, ...children) => box({ display: 'flex', alignItems: 'center', gap: 8, ...style }, ...children);
const col = (style, ...children) => box({ display: 'flex', flexDirection: 'column', gap: 8, ...style }, ...children);
const bar = (width, height = 8, background = T.subtle, extra = {}) =>
    box({ width, height, background, borderRadius: 999, flex: 'none', ...extra });
const dot = (size, background = T.subtle) =>
    box({ width: size, height: size, borderRadius: '50%', background, flex: 'none' });
const avatar = (size, label, online) =>
    box(
        {
            position: 'relative',
            width: size,
            height: size,
            borderRadius: '50%',
            background: T.accent,
            color: '#fff',
            fontSize: Math.round(size * 0.42),
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
        },
        label,
        online ? box({ position: 'absolute', right: 0, bottom: 0, width: size * 0.28, height: size * 0.28, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff' }) : null
    );
const card = (extra, ...children) =>
    box({ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, ...extra }, ...children);
const pill = (label, active = false) =>
    box(
        { padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', color: active ? '#fff' : T.text, background: active ? T.accent : T.subtle },
        label
    );
const btn = (label, solid = true) =>
    box(
        { padding: '7px 14px', borderRadius: T.radius, fontSize: 12, fontWeight: 600, color: solid ? '#fff' : T.accent, background: solid ? T.accent : 'transparent', border: solid ? 'none' : `1px solid ${T.accent}` },
        label
    );

const FALLBACK_NAV = [
    __('Feed', 'zencommunity'),
    __('Groups', 'zencommunity'),
    __('Members', 'zencommunity'),
    __('Courses', 'zencommunity'),
    __('Tickets', 'zencommunity'),
];

const navBar = (menus) => {
    const labels = navLabelsFrom(menus) || FALLBACK_NAV;
    return row({ gap: 6, flexWrap: 'wrap' }, ...labels.slice(0, 6).map((label, i) => pill(label, i === 0)));
};

const searchBox = () =>
    row(
        { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, padding: '7px 12px', minWidth: 160, flex: 1 },
        dot(14, T.muted),
        bar('60%', 7, T.line)
    );

const iconChip = (badge = false) =>
    box(
        { position: 'relative', width: 30, height: 30, borderRadius: T.radius, background: T.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center' },
        dot(14, T.muted),
        badge ? box({ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }) : null
    );

const identityChip = (members) => {
    const me = recordsOf(members)[0];
    if (!me) return row({ padding: '4px 10px 4px 4px', borderRadius: 999, background: T.subtle }, dot(26, T.accentSoft), bar(56, 7, T.line), box({ color: T.muted, fontSize: 10 }, '▾'));
    return row(
        { padding: '4px 10px 4px 4px', borderRadius: 999, background: T.subtle },
        avatar(26, initialOf(memberName(me)), me.is_online),
        box({ fontSize: 12, fontWeight: 600, color: T.text }, memberName(me)),
        box({ color: T.muted, fontSize: 10 }, '▾')
    );
};

const themeToggle = () =>
    row(
        { width: 52, height: 28, borderRadius: 999, background: T.subtle, padding: 3, justifyContent: 'flex-start' },
        box({ width: 22, height: 22, borderRadius: '50%', background: T.surface, boxShadow: '0 1px 2px rgba(0,0,0,.15)' })
    );

const memberRow = (m) =>
    row({}, avatar(28, initialOf(memberName(m)), m.is_online), col({ gap: 3 }, box({ fontSize: 12, fontWeight: 600, color: T.text }, memberName(m)), box({ fontSize: 10, color: T.muted }, `@${m.username || 'member'}`)));

const skeletonRow = (w = 90) => row({}, dot(28, T.accentSoft), col({ gap: 5 }, bar(w, 7, T.line), bar(w - 34, 6, T.subtle)));

const feedCard = (f) => {
    const author = f.author_name || f.user?.name || f.user_name || f.username || memberName(f.author || {});
    const text = stripTags(f.content || f.title || f.excerpt || '');
    return card(
        {},
        row({}, avatar(28, initialOf(author)), col({ gap: 3 }, box({ fontSize: 12, fontWeight: 600, color: T.text }, author || __('Member', 'zencommunity')), box({ fontSize: 10, color: T.muted }, f.created_at ? String(f.created_at).slice(0, 10) : __('just now', 'zencommunity')))),
        text ? box({ fontSize: 12, color: T.text, lineHeight: 1.5 }, text.slice(0, 140)) : col({ gap: 6 }, bar('92%', 7, T.line), bar('70%', 7, T.line)),
        row({ gap: 16, marginTop: 2 }, bar(40, 6, T.subtle), bar(48, 6, T.subtle), bar(36, 6, T.subtle))
    );
};

const skeletonFeedCard = () =>
    card(
        {},
        skeletonRow(100),
        col({ gap: 6, marginTop: 2 }, bar('92%', 7, T.line), bar('78%', 7, T.line), bar('40%', 7, T.line)),
        row({ gap: 16, marginTop: 4 }, bar(40, 6, T.subtle), bar(48, 6, T.subtle), bar(36, 6, T.subtle))
    );

const menuList = (menus, n = 5) => {
    const labels = navLabelsFrom(menus);
    if (!labels) {
        return col(
            { gap: 4 },
            ...Array.from({ length: n }).map((_, i) =>
                row({ padding: '7px 8px', borderRadius: 6, background: i === 0 ? T.accentSoft : 'transparent' }, dot(16, i === 0 ? T.accent : T.subtle), bar(i === 0 ? 84 : 60 + ((i * 13) % 40), 7, i === 0 ? T.accent : T.line))
            )
        );
    }
    return col(
        { gap: 2 },
        ...labels.slice(0, 6).map((label, i) =>
            row(
                { padding: '7px 8px', borderRadius: 6, background: i === 0 ? T.accentSoft : 'transparent' },
                dot(16, i === 0 ? T.accent : T.subtle),
                box({ fontSize: 12, fontWeight: 600, color: i === 0 ? T.accent : T.text }, label)
            )
        )
    );
};

const gridTiles = (n, tile) => box({ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }, ...Array.from({ length: n }).map((_, i) => tile(i)));

const canvas = (label, sub) =>
    box(
        { border: `1px dashed ${T.accent}`, borderRadius: 10, background: T.accentSoft, padding: '28px 20px', textAlign: 'center', color: T.text },
        box({ fontSize: 13, fontWeight: 700, marginBottom: 4 }, label),
        sub ? box({ fontSize: 11, color: '#4b5b70' }, sub) : null
    );

/* ------------------------------------------------------------------ *
 * Per-block previews, keyed by the short block name. Each receives the
 * fetched `data` object ({ menus, members, feeds, groups }); values are
 * undefined until the fetch resolves, so every renderer degrades to a
 * skeleton of the right shape.
 * ------------------------------------------------------------------ */
const PV = {
    navigation: (d) => navBar(d.menus),
    search: () => searchBox(),
    notifications: () => iconChip(true),
    'theme-toggle': () => themeToggle(),
    identity: (d) => identityChip(d.members),

    header: (d) =>
        row(
            { background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '10px 12px', gap: 12, flexWrap: 'wrap' },
            navBar(d.menus),
            searchBox(),
            row({ gap: 8 }, iconChip(true), themeToggle(), identityChip(d.members))
        ),

    'left-sidebar': (d) => {
        const me = recordsOf(d.members)[0];
        return col(
            {},
            card(
                { alignItems: 'center', textAlign: 'center' },
                me ? avatar(48, initialOf(memberName(me)), me.is_online) : dot(48, T.accentSoft),
                me ? box({ fontSize: 13, fontWeight: 700, color: T.text }, memberName(me)) : bar(90, 8, T.line),
                me ? box({ fontSize: 11, color: T.muted }, `@${me.username || 'member'}`) : bar(60, 6, T.subtle)
            ),
            card({}, box({ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', color: T.muted, textTransform: 'uppercase', marginBottom: 2 }, __('Menu', 'zencommunity')), menuList(d.menus, 5))
        );
    },

    'right-sidebar': (d) => {
        const members = recordsOf(d.members);
        return col(
            {},
            card(
                {},
                box({ fontSize: 12, fontWeight: 700, color: T.text }, __('Members', 'zencommunity')),
                ...(members.length ? members.slice(0, 3).map(memberRow) : [skeletonRow(80), skeletonRow(80), skeletonRow(80)])
            ),
            card({}, box({ fontSize: 12, fontWeight: 700, color: T.text }, __('Welcome', 'zencommunity')), row({}, box({ width: 40, height: 40, borderRadius: 8, background: T.accentSoft }), col({ gap: 5 }, bar(96, 7, T.line), bar(64, 6, T.subtle))))
        );
    },

    'feed-stream': (d) => {
        const feeds = recordsOf(d.feeds);
        return col({}, ...(feeds.length ? feeds.slice(0, 3).map(feedCard) : [skeletonFeedCard(), skeletonFeedCard()]));
    },

    'post-composer': (d) => {
        const me = recordsOf(d.members)[0];
        return row(
            { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, padding: 8, gap: 10 },
            me ? avatar(34, initialOf(memberName(me))) : dot(34, T.accentSoft),
            box({ flex: 1, padding: '9px 14px', borderRadius: 999, background: T.subtle, color: T.muted, fontSize: 12 }, __('Start a post…', 'zencommunity')),
            btn(__('Post', 'zencommunity'))
        );
    },

    'welcome-banner': () =>
        box(
            { borderRadius: 10, padding: '22px 20px', background: `linear-gradient(120deg, ${T.accent}, #7c3aed)`, color: '#fff', display: 'flex', flexDirection: 'column', gap: 8 },
            box({ fontSize: 18, fontWeight: 800 }, __('Welcome to the community', 'zencommunity')),
            bar(220, 7, 'rgba(255,255,255,.6)'),
            row({ marginTop: 6 }, box({ padding: '7px 14px', borderRadius: T.radius, background: '#fff', color: T.accent, fontSize: 12, fontWeight: 600 }, __('Join now', 'zencommunity')))
        ),

    'guest-cta': () =>
        card(
            { alignItems: 'center', textAlign: 'center', gap: 12, padding: 20 },
            dot(40, T.accentSoft),
            box({ fontSize: 15, fontWeight: 700, color: T.text }, __('Join the community', 'zencommunity')),
            bar(200, 6, T.subtle),
            row({ gap: 10, marginTop: 4 }, btn(__('Sign in', 'zencommunity')), btn(__('Sign up', 'zencommunity'), false))
        ),

    'content-outlet': () => canvas(__('Routed community content', 'zencommunity'), __('The selected view (feed, members, groups, profiles…) renders here and swaps as visitors navigate.', 'zencommunity')),
    'content-body': () => canvas(__('Routed content — no sidebars', 'zencommunity'), __('The center column only; place it between your own Sidebar blocks.', 'zencommunity')),

    'groups-view': (d) => {
        const groups = recordsOf(d.groups);
        if (!groups.length) {
            return gridTiles(6, () => card({ padding: 0, gap: 0, overflow: 'hidden' }, box({ height: 40, background: T.accentSoft }), col({ padding: 10, gap: 6 }, bar('80%', 7, T.line), bar('50%', 6, T.subtle))));
        }
        return box(
            { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
            ...groups.slice(0, 6).map((g) =>
                card({ padding: 0, gap: 0, overflow: 'hidden' }, box({ height: 40, background: T.accentSoft }), col({ padding: 10, gap: 4 }, box({ fontSize: 12, fontWeight: 700, color: T.text }, g.name || g.title || __('Group', 'zencommunity')), box({ fontSize: 10, color: T.muted }, `${g.total_members ?? g.members_count ?? 0} ${__('members', 'zencommunity')}`)))
            )
        );
    },

    'members-view': (d) => {
        const members = recordsOf(d.members);
        if (!members.length) {
            return gridTiles(6, () => card({ alignItems: 'center', textAlign: 'center', gap: 6 }, dot(40, T.accentSoft), bar(64, 7, T.line), bar(40, 6, T.subtle)));
        }
        return box(
            { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
            ...members.slice(0, 6).map((m) =>
                card({ alignItems: 'center', textAlign: 'center', gap: 6 }, avatar(40, initialOf(memberName(m)), m.is_online), box({ fontSize: 12, fontWeight: 700, color: T.text }, memberName(m)), box({ fontSize: 10, color: T.muted }, `@${m.username || 'member'}`))
            )
        );
    },

    'leaderboard-view': () =>
        card(
            {},
            box({ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }, __('Leaderboard', 'zencommunity')),
            ...Array.from({ length: 4 }).map((_, i) =>
                row(
                    { padding: '6px 0', borderBottom: i < 3 ? `1px solid ${T.line}` : 'none' },
                    box({ width: 20, fontWeight: 700, color: i === 0 ? '#f59e0b' : T.muted, fontSize: 12 }, `#${i + 1}`),
                    dot(26, T.accentSoft),
                    bar(90, 7, T.line),
                    box({ marginLeft: 'auto' }, bar(40, 7, T.accentSoft))
                )
            )
        ),

    // The whole app in miniature: a topbar over a three-column community shell.
    'community-app': (d) =>
        col(
            { gap: 10 },
            row(
                { background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 10px', gap: 10 },
                navBar(d.menus),
                box({ marginLeft: 'auto' }, row({ gap: 8 }, iconChip(true), identityChip(d.members)))
            ),
            box(
                { display: 'grid', gridTemplateColumns: '160px 1fr 170px', gap: 10 },
                col({}, card({}, menuList(d.menus, 4))),
                col({}, PV['post-composer'](d), PV['feed-stream'](d)),
                col({}, PV['right-sidebar'](d))
            )
        ),
};

const genericPreview = (block) =>
    el(Placeholder, { icon: block.icon, label: block.title, instructions: block.description });

/* A titled frame around each preview so authors know which block it is. */
const previewFrame = (block, body) =>
    box(
        { border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden', background: T.surface, fontFamily: 'inherit' },
        row(
            { padding: '6px 10px', borderBottom: `1px solid ${T.border}`, background: '#fbfcfe' },
            el('span', { className: 'dashicons dashicons-' + (block.icon || 'screenoptions'), style: { fontSize: 15, width: 15, height: 15, color: T.accent } }),
            box({ fontSize: 11, fontWeight: 700, color: T.text, letterSpacing: '.01em' }, block.title),
            box({ marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: '#c2c9d4', textTransform: 'uppercase' }, 'ZenCommunity')
        ),
        box({ padding: 14, background: T.page }, body)
    );

/** The lightweight static preview body for a block (also the live fallback). */
const staticBody = (block, key, data) => (PV[key] || (() => genericPreview(block)))(data || {});

// Default inner layout the Community Portal starts with: a top bar (nav +
// search + notifications/theme/identity) over the routed content. Authors can
// rearrange, remove or add inner blocks freely from here.
const PORTAL_TEMPLATE = [
    ['core/group', { align: 'full', className: 'zencom-fse-topbar', layout: { type: 'flex', justifyContent: 'space-between', flexWrap: 'nowrap' } }, [
        ['zencommunity/navigation'],
        ['zencommunity/search'],
        ['core/group', { layout: { type: 'flex', flexWrap: 'nowrap' } }, [
            ['zencommunity/notifications'],
            ['zencommunity/theme-toggle'],
            ['zencommunity/identity'],
        ]],
    ]],
    ['zencommunity/content-outlet'],
];

/**
 * Native block supports shared by every ZenCommunity block. These give authors
 * spacing (margin/padding), min-height and background controls in the block
 * Settings sidebar — applied server-side via get_block_wrapper_attributes() (see
 * includes/fse/manager.php::customize_supports, which MUST stay in sync).
 */
const BLOCK_SUPPORTS = {
    html: false,
    align: ['wide', 'full'],
    spacing: { margin: true, padding: true },
    dimensions: { minHeight: true },
    color: { background: true, gradients: true, text: false },
};

/**
 * Per-block bespoke settings (on top of the shared supports above), keyed by the
 * short block name. Each entry is a control bound to a block attribute the
 * frontend island actually reads, so changing it in the editor changes the block.
 */
const BLOCK_SETTINGS = {
    navigation: [
        {
            attr: 'menuKey',
            type: 'select',
            label: __('Menu source', 'zencommunity'),
            options: [
                { label: __('Top menu', 'zencommunity'), value: 'top_menu' },
                { label: __('Primary menu', 'zencommunity'), value: 'primary_menu' },
            ],
        },
        {
            attr: 'orientation',
            type: 'select',
            label: __('Orientation', 'zencommunity'),
            options: [
                { label: __('Horizontal', 'zencommunity'), value: 'horizontal' },
                { label: __('Vertical', 'zencommunity'), value: 'vertical' },
            ],
        },
    ],
    search: [
        {
            attr: 'placeholder',
            type: 'text',
            label: __('Placeholder text', 'zencommunity'),
        },
    ],
};

/** Render one bespoke control bound to a block attribute. */
const renderControl = (control, attributes, setAttributes) => {
    const value = attributes?.[control.attr] ?? '';
    const onChange = (next) => setAttributes({ [control.attr]: next });
    if (control.type === 'select') {
        return el(SelectControl, {
            key: control.attr,
            label: control.label,
            value,
            options: control.options,
            onChange,
            __nextHasNoMarginBottom: true,
        });
    }
    return el(TextControl, {
        key: control.attr,
        label: control.label,
        value,
        onChange,
        __nextHasNoMarginBottom: true,
    });
};

/**
 * The Community Portal container block: a parent with InnerBlocks so the whole
 * layout is composed of nested blocks (SureDash-style). save() outputs only the
 * inner markup — the PHP render_callback wraps it in .zencom-fse-portal.
 */
const registerPortalBlock = () => {
    const name = 'zencommunity/portal';
    const PortalEdit = () => {
        const innerProps = useInnerBlocksProps(
            useBlockProps({ className: 'zencom-fse-portal zencom-fse-portal--editor' }),
            { template: PORTAL_TEMPLATE, templateLock: false }
        );
        return el('div', innerProps);
    };

    if (getBlockType(name)) {
        try { unregisterBlockType(name); } catch (e) { return; }
    }

    registerBlockType(name, {
        apiVersion: 3,
        title: __('Community Portal', 'zencommunity'),
        description: __('A container for the whole community layout — add the Header, Sidebar and Content blocks inside and arrange them.', 'zencommunity'),
        category: config.category,
        icon: 'layout',
        keywords: ['community', 'portal', 'layout', 'container'],
        supports: BLOCK_SUPPORTS,
        edit: PortalEdit,
        // Dynamic block: PHP wraps the inner markup. Save only the inner content.
        save: () => el(InnerBlocks.Content),
    });
};

registerPortalBlock();

config.blocks.forEach((block) => {
    const key = block.name.replace('zencommunity/', '');
    const settings = BLOCK_SETTINGS[key];

    const edit = (props) => {
        const { attributes = {}, setAttributes } = props || {};
        const data = useZenData();
        const blockProps = useBlockProps({ className: 'zencom-fse-block-editor' });

        const fallback = staticBody(block, key, data);
        // Render the REAL frontend component (matches the live site) unless it's a
        // routed-container block; the static preview is the graceful fallback.
        const body = SKIP_LIVE.has(key)
            ? fallback
            : el(LivePreview, { type: key, props: attributes, fallback });

        return el(
            Fragment,
            null,
            settings &&
                el(
                    InspectorControls,
                    null,
                    el(
                        PanelBody,
                        { title: __('Settings', 'zencommunity'), initialOpen: true },
                        settings.map((c) => renderControl(c, attributes, setAttributes))
                    )
                ),
            el('div', blockProps, previewFrame(block, body))
        );
    };

    // Server-registered dynamic blocks may already be exposed to the editor.
    // Re-register so our edit component takes effect. unregisterBlockType throws
    // if the block is currently in use (or on an editor re-run); in that case
    // keep the existing definition rather than leaving a half-registered block.
    if (getBlockType(block.name)) {
        try {
            unregisterBlockType(block.name);
        } catch (e) {
            return;
        }
    }

    registerBlockType(block.name, {
        apiVersion: 3,
        title: block.title,
        description: block.description,
        category: config.category,
        icon: block.icon,
        keywords: block.keywords || [],
        attributes: block.attributes || {},
        supports: BLOCK_SUPPORTS,
        edit,
        // Dynamic block: output comes from the PHP render callback.
        save: () => null,
    });
});
