import React from 'react';
import { createRoot } from 'react-dom/client';
import IslandProviders from './IslandProviders';
import FseRuntime from './FseRuntime';
import { getBlockComponent, selfContainedBlocks } from './blockRegistry';
import { installSharedNavigation } from './sharedNav';

const MOUNTED_FLAG = '__zcMounted';

/**
 * Parse the block props emitted by the PHP render callback (data-props holds a
 * JSON-encoded object of the block attributes).
 */
const readProps = (node) => {
    const raw = node.getAttribute('data-props');
    if (!raw) return {};
    try {
        return JSON.parse(raw) || {};
    } catch {
        return {};
    }
};

/**
 * Ensure the single hidden runtime root exists and is mounted exactly once.
 * It runs the global side-effects (theme, core fetches) that <Layout> owns in
 * SPA mode, regardless of which blocks are present on the page.
 */
const bootRuntime = () => {
    let node = document.getElementById('zc-runtime');
    if (!node) {
        node = document.createElement('div');
        node.id = 'zc-runtime';
        node.style.display = 'none';
        document.body.appendChild(node);
    }
    if (node[MOUNTED_FLAG]) return;
    node[MOUNTED_FLAG] = true;
    createRoot(node).render(<FseRuntime />);
};

/**
 * Mount every ZenCommunity block node on the page into its own React root.
 * Idempotent: nodes are flagged so re-runs (editor previews, dynamic DOM)
 * never double-mount.
 */
export const hydrateFseIslands = () => {
    const nodes = document.querySelectorAll('[data-zc-block]');
    if (!nodes.length) return;

    // Self-contained blocks (e.g. community-app) bring their own theme + socket
    // via <Layout>. Only boot the shared runtime when a decomposed block needs
    // it — otherwise we'd open a second socket / apply the theme twice.
    const needsRuntime = Array.from(nodes).some(
        (node) => !selfContainedBlocks.has(node.getAttribute('data-zc-block'))
    );
    if (needsRuntime) {
        bootRuntime();
        // Keep every island's router in sync so nav clicks drive the outlet.
        installSharedNavigation();
    }

    nodes.forEach((node) => {
        if (node[MOUNTED_FLAG]) return;

        const type = node.getAttribute('data-zc-block');
        const Component = getBlockComponent(type);

        node[MOUNTED_FLAG] = true;
        const root = createRoot(node);

        if (!Component) {
            // Unknown/gated block with no client component — render nothing
            // rather than crash the whole page.
            root.render(null);
            return;
        }

        const props = readProps(node);

        // Self-contained blocks bring their own providers/router; wrapping them
        // in IslandProviders would nest two routers, so render them bare.
        if (selfContainedBlocks.has(type)) {
            root.render(
                <BlockBoundary type={type}>
                    <Component {...props} />
                </BlockBoundary>
            );
            return;
        }

        root.render(
            <IslandProviders>
                <BlockBoundary type={type}>
                    <Component {...props} />
                </BlockBoundary>
            </IslandProviders>
        );
    });
};

/**
 * Isolates a failing block so one broken island can't blank the whole page.
 */
class BlockBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error) {
        // eslint-disable-next-line no-console
        console.error(`[ZenCommunity FSE] block "${this.props.type}" failed`, error);
    }
    render() {
        if (this.state.hasError) {
            // Plain fallback — must not use react-router data-router hooks
            // (e.g. ErrorPage's useRouteError), which aren't available here.
            return (
                <div style={{ padding: '16px', color: 'var(--zencom-font-color, #666)', fontSize: '14px' }}>
                    {`This ZenCommunity block ("${this.props.type}") could not be displayed.`}
                </div>
            );
        }
        return this.props.children;
    }
}
