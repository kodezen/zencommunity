// Plain-CSS style objects shared by the Agent Activity page and its tabs.
// The page renders real <table> markup styled against the --zencom-* theme
// vars rather than a component library, so every tab sharing that table look
// (Activity, Knowledge Gaps) reads from the same styles instead of drifting.

export const thStyle = {
    padding: '10px 12px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--zencom-font-color)',
    borderBottom: '1px solid var(--zencom-border-color)',
    textAlign: 'left',
    background: 'var(--zencom-secondary-color)',
};

export const tdStyle = {
    padding: '10px 12px',
    fontSize: '13px',
    color: 'var(--zencom-font-color)',
    borderBottom: '1px solid var(--zencom-border-color)',
    verticalAlign: 'top',
};

export const actionBtnStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'inline-flex',
    alignItems: 'center',
};
