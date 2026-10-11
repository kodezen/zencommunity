import { site_url, zenc_SOCKET, API, namespace } from '@Utils/helper';
import { useRef, useCallback, useEffect, useState } from 'react';

let webSocket = null;
// Socket token is minted on demand by the active JWT provider (works for cookie
// sessions too). Cached across reconnects; cleared on close so it refreshes.
let socketToken = null;
// Module-level connection state so new hook instances start with the correct
// value and get notified when the shared socket opens or closes.
let isSocketOpen = false;
const connectionListeners = new Set();
// Message handlers are shared across ALL hook instances: the socket's onmessage
// is bound once (by whichever instance opens it), so per-instance handler sets
// would silently never fire for other consumers (e.g. the FSE runtime plus a
// community-app island). One shared set fixes that.
const messageHandlers = new Set();
// Reference count of mounted consumers, so the shared socket is only closed when
// the LAST consumer unmounts — not whenever any single one does.
let activeConsumers = 0;

const broadcastConnectionState = (state) => {
    isSocketOpen = state;
    connectionListeners.forEach(fn => fn(state));
};

const useWebSocket = (config = {}) => {
    const {
        maxReconnectAttempts = 5,
        reconnectDelay = 5000,
        autoConnect = true
    } = config;

    // Socket state
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);

    // Initialise from the module-level flag so remounts reflect the live state.
    const [isConnected, setIsConnected] = useState(isSocketOpen);
    const [connectionError, setConnectionError] = useState(null);

    useEffect(() => {
        connectionListeners.add(setIsConnected);
        // Sync in case the socket opened between render and this effect.
        setIsConnected(isSocketOpen);
        return () => connectionListeners.delete(setIsConnected);
    }, []);

    // Connect socket function
    const connectSocket = useCallback(async () => {
        if (webSocket) {
            return;
        }
        if(zenc_SOCKET?.status === 'stopped'){
            return;
        }
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (!zenc_SOCKET) {
            console.warn('zenc_SOCKET not available');
            setConnectionError('zenc_SOCKET not available');
            return;
        }

        try {
            // Fetch a socket token from the active JWT provider (cookie or JWT auth).
            if (!socketToken) {
                try {
                    const { data } = await API.get(namespace + '/livechat/socket-credentials');
                    socketToken = data?.data?.token || '';
                } catch (e) {
                    socketToken = '';
                }
            }
            if (!socketToken) {
                setConnectionError('Unable to obtain socket token');
                return;
            }

            let url = '';
            if (Boolean(zenc_SOCKET.is_local)) {
                url = `ws://${zenc_SOCKET.ws_host}:${zenc_SOCKET.ws_port}/?token=${socketToken}`;
            } else {
                url = `${site_url.replace('http', 'ws')}/ws/?token=${socketToken}`;
            }

            webSocket = new WebSocket(url);

            webSocket.onopen = () => {
                console.warn("✅ Socket connected.");
                reconnectAttemptsRef.current = 0;
                broadcastConnectionState(true);
                setConnectionError(null);
            };

            webSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Notify all registered handlers
                    if (data.type === "ping") {
                        webSocket.send(JSON.stringify({ type: "pong" }));
                    }
                    messageHandlers.forEach(handler => {
                        try {
                            handler(data);
                        } catch (error) {
                            console.error('Error in message handler:', error);
                        }
                    });
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            webSocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                setConnectionError('WebSocket connection error');
                broadcastConnectionState(false);
            };

            webSocket.onclose = (event) => {
                console.warn("❌ WebSocket closed", event);
                webSocket = null;
                socketToken = null; // refetch a fresh token on reconnect
                broadcastConnectionState(false);

                // Don't reconnect if it was a clean close (code 1000) or if we're over the limit
                if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    scheduleReconnect();
                } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
                    console.error('Max reconnection attempts reached. Giving up.');
                    setConnectionError('Max reconnection attempts reached');
                }
            };

        } catch (error) {
            console.error('Error creating WebSocket:', error);
            setConnectionError('Error creating WebSocket');
            scheduleReconnect();
        }
    }, [maxReconnectAttempts]);

    // Schedule reconnection with exponential backoff
    const scheduleReconnect = useCallback(() => {
        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        reconnectAttemptsRef.current += 1;
        const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1);

        console.warn(`Scheduling reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);

        reconnectTimeoutRef.current = setTimeout(() => {
            console.warn(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            connectSocket();
        }, delay);
    }, [connectSocket, maxReconnectAttempts, reconnectDelay]);

    // Force reconnect function
    const forceReconnect = useCallback(() => {
        console.warn('Force reconnecting...');
        reconnectAttemptsRef.current = 0;
        connectSocket();
    }, [connectSocket]);

    // Send message function
    const sendMessage = useCallback((message) => {
        if (webSocket?.readyState === WebSocket.OPEN) {
            webSocket.send(JSON.stringify(message));
            return true;
        } else {
            console.warn('WebSocket not connected. Cannot send message.');
            return false;
        }
    }, []);

    // Subscribe to messages (shared across all hook instances)
    const onMessage = useCallback((handler) => {
        messageHandlers.add(handler);

        // Return unsubscribe function
        return () => {
            messageHandlers.delete(handler);
        };
    }, []);

    // Handle online/offline events
    useEffect(() => {
        const handleOnline = () => {
            console.warn('Network connection restored');
            if (!isConnected) {
                forceReconnect();
            }
        };

        const handleOffline = () => {
            console.warn('Network connection lost');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [forceReconnect, isConnected]);

    // Initial connection and cleanup
    useEffect(() => {
        activeConsumers += 1;

        if (autoConnect) {
            connectSocket();
        }

        return () => {
            activeConsumers = Math.max(0, activeConsumers - 1);

            // Clear this instance's reconnection timeout
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            // Only close the shared socket when the last consumer unmounts, so
            // one island unmounting doesn't tear down the connection others
            // (e.g. the persistent FSE runtime) still depend on.
            if (activeConsumers === 0 && webSocket) {
                webSocket.close(1000, 'Last consumer unmounting');
                webSocket = null;
            }
        };
    }, [connectSocket, autoConnect]);

    return {
        isConnected,
        connectionError,
        connectSocket,
        forceReconnect,
        sendMessage,
        onMessage
    };
};

export default useWebSocket;
