import { site_url, zenc_SOCKET } from '@Utils/helper';
import { useRef, useCallback, useEffect, useState } from 'react';

let webSocket = null;

const useClientWebSocket = (id, config = {}) => {
    const {
        maxReconnectAttempts = 5,
        reconnectDelay = 5000,
        autoConnect = true
    } = config;

    const token = localStorage.getItem(`live-chat-${id}`)

    // Socket state
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const messageHandlersRef = useRef(new Set());

    // Connection status
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState(null);

    // Connect socket function
    const connectSocket = useCallback(() => {
        if(!id){
            return;
        }

        if (!token) {
            return;
        }

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
            // The JWT-provider token identifies the user but not the live-chat
            // context. `id` here is the product id; the socket resolves the
            // visitor's chat for this product and authorizes by ownership.
            const lc = `&for=live_chat&product_id=${id}`;
            let url = '';
            if (Boolean(zenc_SOCKET.is_local)) {
                url = `ws://${zenc_SOCKET.ws_host}:${zenc_SOCKET.ws_port}/?token=${token}${lc}`;
            } else {
                url = `${site_url.replace('http', 'ws')}/ws/?token=${token}${lc}`;
            }

            webSocket = new WebSocket(url);

            webSocket.onopen = () => {
                console.warn("✅ Socket connected.");
                reconnectAttemptsRef.current = 0;
                setIsConnected(true);
                setConnectionError(null);
            };

            webSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Notify all registered handlers
                    if (data.type === "ping") {
                        webSocket.send(JSON.stringify({ type: "pong" }));
                    }   
                    messageHandlersRef.current.forEach(handler => {
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
                setIsConnected(false);
            };

            webSocket.onclose = (event) => {
                console.warn("❌ WebSocket closed", event);
                webSocket = null;
                setIsConnected(false);

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
    }, [maxReconnectAttempts, token]);

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
    }, [connectSocket, maxReconnectAttempts, reconnectDelay, token]);

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

    // Subscribe to messages
    const onMessage = useCallback((handler) => {
        messageHandlersRef.current.add(handler);
        
        // Return unsubscribe function
        return () => {
            messageHandlersRef.current.delete(handler);
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
    }, [forceReconnect, isConnected, token]);

    // Initial connection and cleanup
    useEffect(() => {
        if (autoConnect) {
            connectSocket();
        }

        return () => {
            // Clear reconnection timeout
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            // Close socket
            if (webSocket) {
                webSocket.close(1000, 'Hook unmounting');
                webSocket = null;
            }
        };
    }, [connectSocket, autoConnect, token]);

    return {
        isConnected,
        connectionError,
        connectSocket,
        forceReconnect,
        sendMessage,
        onMessage
    };
};

export default useClientWebSocket;
