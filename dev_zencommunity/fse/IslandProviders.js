import React from 'react';
import { Provider } from 'react-redux';
import { unstable_HistoryRouter as HistoryRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import store from '../redux/store';
import { AuthProvider } from '../Context/AuthContext';
import { theme } from '../utils/theme';
import { fseBasename } from './basename';
import { sharedHistory } from './sharedHistory';

/**
 * Every FSE island mounts in its own React root, so the shared app context
 * cannot cross between them. The shared state instead lives in module
 * singletons (the Redux `store`, the Chakra `theme`) and each island re-wraps
 * the same providers that expose them — so all islands read one store/theme.
 *
 * Router: each island carries a HistoryRouter bound to the SAME shared history
 * instance (`sharedHistory`). Because every island subscribes to one history,
 * a <Link>/navigate() from any island (e.g. the header nav) updates them all in
 * lock-step, client-side — no per-root private histories, no pushState
 * monkeypatch, no full-page reload. See sharedHistory.js.
 */
const IslandProviders = ({ children }) => (
    <Provider store={store}>
        <HistoryRouter history={sharedHistory} basename={fseBasename()}>
            <AuthProvider>
                <ChakraProvider value={theme}>
                    {children}
                </ChakraProvider>
            </AuthProvider>
        </HistoryRouter>
    </Provider>
);

export default IslandProviders;
