const { createContext } = require("react");

// Safe defaults so consumers (e.g. LeftSidebar, RightSidebar) don't crash when
// rendered outside the SPA's <Layout> provider — e.g. as standalone FSE island
// blocks. The SPA still overrides this with the live socket via its Provider.
const SocketContext = createContext({
    isConnected: false,
    connectionError: null,
    connectSocket: () => {},
    forceReconnect: () => {},
    sendMessage: () => false,
    onMessage: () => () => {},
});
export default SocketContext;