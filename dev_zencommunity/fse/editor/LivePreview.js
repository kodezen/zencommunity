import React, { useRef, useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ChakraProvider, EnvironmentProvider } from '@chakra-ui/react';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import store from '@Redux/store';
import { theme } from '../../utils/theme';
import { AuthProvider } from '../../Context/AuthContext';
import { getBlockComponent } from '../blockRegistry';
import { fetchAllMenus } from '../../redux/slices/MenuSlice/MenuSlice';
import { fetchActiveAddon } from '../../redux/slices/addons/addonsSlice';

/**
 * Renders the REAL frontend community component inside the Site Editor so the
 * editor preview matches the live site exactly (for designers).
 *
 * The editor canvas is an IFRAME, which needs three things the outer editor
 * doesn't give us for free:
 *  1. Chakra (v3, emotion-based) must inject its styles + portals into the
 *     iframe, not the outer document — done via <EnvironmentProvider> pointing
 *     at the iframe's own node (Chakra derives the document from its root node).
 *  2. The compiled community stylesheet (app.css, all the .zencom-* classes +
 *     the FSE `position:fixed`→static overrides) must be present in the iframe.
 *  3. The theme CSS variables (--zencom-*) must be set on the iframe root.
 *
 * Plus the Redux store needs the shared data the frontend bootstraps in
 * <FseRuntime>/<Layout> (menus, active addons); components fetch the rest
 * themselves once ZencommunityGlobal (REST url + nonce) is localized on the
 * editor script.
 *
 * Wrapped in an error boundary: if anything fails, we fall back to the
 * lightweight static preview so the block is never broken in the editor.
 */

let dataBootstrapped = false;
const bootstrapData = () => {
    if (dataBootstrapped) return;
    dataBootstrapped = true;
    try {
        store.dispatch(fetchAllMenus());
        store.dispatch(fetchActiveAddon());
    } catch (e) {
        // ignore — components degrade / the boundary catches render errors
    }
};

/** Apply the community theme CSS variables to the iframe's root element. */
const applyThemeVars = (doc) => {
    const settings = window.ZencommunityGlobal?.theme_settings;
    const t = settings?.light || settings?.[settings?.theme_mode] || null;
    if (!t) return;
    const root = doc.documentElement;
    const set = (k, v) => v && root.style.setProperty(k, v);
    set('--zencom-primary-color', t.primary_color);
    set('--zencom-secondary-color', t.secondary_color);
    set('--zencom-body-background', t.content_body_color);
    set('--zencom-background', t.content_background_color);
    set('--zencom-font-color', t.text_color);
    set('--zencom-border-color', t.border_color);
    root.style.setProperty('--zencom-shadow', '0px 0px 1px 0px rgba(20,26,36,0.30), 0px 2px 4px 0px rgba(20,26,36,0.10)');
};

/**
 * A per-iframe emotion cache whose <style> tags insert into the IFRAME head.
 * Chakra v3 styles via emotion; without this its CSS lands in the outer editor
 * document and the components render unstyled inside the canvas.
 */
const cacheFor = (doc) => {
    if (!doc.__zcEmotionCache) {
        doc.__zcEmotionCache = createCache({ key: 'zc-fse', container: doc.head });
    }
    return doc.__zcEmotionCache;
};

/** Load app.css + theme vars into the iframe document once. */
const injectFrontendStyles = (doc) => {
    if (doc.__zcFrontendStyles) {
        applyThemeVars(doc);
        return;
    }
    doc.__zcFrontendStyles = true;
    const base = window.ZencommunityGlobal?.plugin_root_url || '';
    if (base && !doc.querySelector('link[data-zc-app-css]')) {
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${base}/assets/build/app.css`;
        link.setAttribute('data-zc-app-css', '1');
        doc.head.appendChild(link);
    }
    applyThemeVars(doc);
};

class Boundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidCatch(error) {
        // eslint-disable-next-line no-console
        console.warn('[ZenCommunity] live editor preview failed; using static preview', error);
    }
    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

const LivePreview = ({ type, props = {}, fallback = null }) => {
    const hostRef = useRef(null);
    const [doc, setDoc] = useState(null);

    useEffect(() => {
        bootstrapData();
        const ownerDoc = hostRef.current?.ownerDocument;
        if (ownerDoc) {
            injectFrontendStyles(ownerDoc);
            setDoc(ownerDoc);
        }
    }, []);

    const Component = getBlockComponent(type);

    // Match the frontend island wrapper classes so app.css's FSE layout
    // overrides (which turn the fixed-position sidebars static) apply here too.
    const className = `zencom-fse-block zencom-fse-block--${type} zencom-fse-editor-live`;

    if (!Component) {
        return React.createElement('div', { ref: hostRef, className }, fallback);
    }

    return React.createElement(
        'div',
        { ref: hostRef, className },
        doc
            ? React.createElement(
                  Boundary,
                  { fallback },
                  React.createElement(
                      CacheProvider,
                      { value: cacheFor(doc) },
                      React.createElement(
                          EnvironmentProvider,
                          { value: () => doc.body || doc.documentElement },
                          React.createElement(
                              Provider,
                              { store },
                              React.createElement(
                                  MemoryRouter,
                                  null,
                                  React.createElement(
                                      AuthProvider,
                                      null,
                                      React.createElement(
                                          ChakraProvider,
                                          { value: theme },
                                          React.createElement(Component, props)
                                      )
                                  )
                              )
                          )
                      )
                  )
              )
            : fallback
    );
};

export default LivePreview;
