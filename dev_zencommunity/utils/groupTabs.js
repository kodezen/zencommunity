import { __ } from '@wordpress/i18n';

// The optional tabs a group admin can enable/disable and reorder from the
// group settings panel. Discussion and Featured are permanent and excluded
// entirely (see Group.js); Recent activities has no desktop slot today and
// stays out of scope too. Order here is the plugin's default display order —
// used whenever a group has no saved tab configuration, and as the fallback
// position for any tab missing from an existing saved order (e.g. a tab type
// added to the plugin after a group already customized its order).
//
// Mirrors includes/classes/tab-settings.php's Tab_Settings::KEYS — keep both
// in sync when adding a new optional tab.
export const OPTIONAL_TAB_KEYS = ['about', 'members', 'events', 'media', 'courses', 'pending-posts'];

export const optionalTabLabels = {
    about: __('About', 'zencommunity'),
    members: __('Members', 'zencommunity'),
    events: __('Events', 'zencommunity'),
    media: __('Media', 'zencommunity'),
    courses: __('Courses', 'zencommunity'),
    'pending-posts': __('Pending Posts', 'zencommunity'),
};

// Content-only Space types show only their primary view + About + Members.
export const allowedTabsByType = {
    'single-page': ['page', 'about', 'members'],
    'resource-library': ['resources', 'about', 'members'],
    // Audio and Video share one primary view/tab ('player') — the type only
    // changes the icon/label/empty-state copy shown within it, not the tab
    // structure. See Pages/GroupDetails/PlayerSpace.js. Unlike the two
    // content-only types above, members can post regular Feed items (incl.
    // audio/video posts) into these groups, so Discussion has to stay
    // reachable too or a post made here has no tab to ever appear in.
    'audio': ['player', 'discussion', 'about', 'members'],
    'video': ['player', 'discussion', 'about', 'members'],
};

// Which OPTIONAL_TAB_KEYS the settings panel should offer for a given Space
// type. Typed tabs (`page`/`resources`) and the permanent Discussion/Featured
// tabs are never configurable, so they're excluded regardless of type.
export const configurableTabKeysForType = (type) => {
    const allowed = allowedTabsByType[type];
    return allowed ? OPTIONAL_TAB_KEYS.filter((key) => allowed.includes(key)) : OPTIONAL_TAB_KEYS;
};

// A full permutation of OPTIONAL_TAB_KEYS: valid saved entries keep their
// relative order, anything unrecognized is dropped, and any key the saved
// value doesn't cover is appended at the end. Used to seed the settings form
// so every save round-trips the complete key set — the backend's meta merge
// is index-based, not a real array diff, so a partial tab_order would leave
// stale entries behind (see design.md).
export const normalizeTabOrder = (order) => {
    const valid = Array.isArray(order) ? order.filter((key) => OPTIONAL_TAB_KEYS.includes(key)) : [];
    const missing = OPTIONAL_TAB_KEYS.filter((key) => !valid.includes(key));
    return [...valid, ...missing];
};

export const defaultEnabledTabs = () =>
    OPTIONAL_TAB_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {});

// Reorders/filters a group's optional tab definitions per its saved
// meta.enabled_tabs / meta.tab_order. Tabs already excluded upstream by their
// own eligibility checks (LMS-active, admin+approval-required, ...) simply
// aren't in `tabDefs`, so this can only hide/reorder tabs that are otherwise
// eligible — it never forces an ineligible tab to appear.
export const orderOptionalTabs = (tabDefs, meta) => {
    const enabled = meta?.enabled_tabs;
    const order = Array.isArray(meta?.tab_order) ? meta.tab_order : null;

    if (!enabled && !order) return tabDefs;

    const byValue = new Map(tabDefs.map((tab) => [tab.value, tab]));
    const isEnabled = (key) =>
        (enabled && Object.prototype.hasOwnProperty.call(enabled, key)) ? !!enabled[key] : true;

    const ordered = [];
    const seen = new Set();

    (order || []).forEach((key) => {
        const tab = byValue.get(key);
        if (tab && isEnabled(key) && !seen.has(key)) {
            ordered.push(tab);
            seen.add(key);
        }
    });

    // Anything eligible-and-enabled but missing from the saved order (a newer
    // tab type, or a group saved before this field existed) is appended in
    // the plugin's default relative order rather than hidden.
    tabDefs.forEach((tab) => {
        if (!seen.has(tab.value) && isEnabled(tab.value)) {
            ordered.push(tab);
            seen.add(tab.value);
        }
    });

    return ordered;
};
