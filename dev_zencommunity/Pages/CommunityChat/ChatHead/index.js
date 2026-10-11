import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    togglePanel as togglePanelAction,
    addChatHead as addChatHeadAction,
    removeChatHead as removeChatHeadAction,
    openWindow as openWindowAction,
    closeWindow as closeWindowAction,
    hydrateChatHeads,
} from '@Redux/slices/chatHeadSlice/chatHeadSlice';
import ChatHeadBubble from './ChatHeadBubble';
import ChatHeadPanel from './ChatHeadPanel';
import ChatHeadWindow from './ChatHeadWindow';

const ChatHead = () => {
    // The draggable bubbles + mini chat windows are redundant on the full
    // /chat page itself (you're already in the real messaging UI), so those
    // stay suppressed there — but the header's message icon calls
    // togglePanel() on every route, /chat included, so the quick "Messages"
    // panel it opens needs to keep working there too, or that button just
    // silently does nothing while on /chat.
    const location = useLocation();
    const onChatPage = location.pathname.includes('/chat');

    const dispatch = useDispatch();
    const { isPanelOpen, chatHeads, activeWindows } = useSelector(state => state.chatHead);
    const togglePanel = () => dispatch(togglePanelAction());
    const addChatHead = (conv) => dispatch(addChatHeadAction(conv));
    const removeChatHead = (id, isGroup) => dispatch(removeChatHeadAction({ id, isGroup }));
    const openWindow = (conv) => dispatch(openWindowAction(conv));
    const closeWindow = (id, isGroup) => dispatch(closeWindowAction({ id, isGroup }));

    // One-time hydration from localStorage on mount. Lives here (rather than
    // the SPA's Layout.js, where this used to live) so it runs identically
    // whether ChatHead mounts via <Layout> (SPA) or as its own FSE island
    // (fse/blockRegistry.js's `chat-head` block) — both mount this same
    // component exactly once per page.
    useEffect(() => {
        if (onChatPage) return;
        try {
            const saved = localStorage.getItem('zc_chat_heads');
            if (!saved) return;
            const parsed = JSON.parse(saved);
            dispatch(hydrateChatHeads({
                chatHeads: parsed.chatHeads ?? [],
                activeWindows: (parsed.activeWindows ?? []).slice(0, 3),
            }));
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('zc_chat_heads', JSON.stringify({
                chatHeads: chatHeads.slice(0, 10),
                activeWindows,
            }));
        } catch {}
    }, [chatHeads, activeWindows]);

    const handleSelectConversation = (conv) => {
        addChatHead({ ...conv, unread: 0 });
        openWindow(conv);
        // On /chat the mini window this would normally open is suppressed
        // (it'd float redundantly over the full chat UI), so there's nothing
        // for openWindow() to show — close the panel instead of leaving it
        // open with no visible result. Off /chat, the mini window covers this.
        if (onChatPage) togglePanel();
    };

    return (
        <>
            {/* Per-conversation draggable chat head bubbles. A conversation with
            an open mini window is left out here — the window IS that chat
            head's expanded state, so showing both at once just duplicated the
            same avatar/name right next to each other and fought over the same
            bottom-right corner. Filtering first (rather than hiding in place)
            also keeps the remaining bubbles stacked with no gap where a
            now-open one used to be. */}
            {!onChatPage && chatHeads
                .filter(conv => !activeWindows.some(w => w.id === conv.id && w.isGroup === conv.isGroup))
                .map((conv, i) => (
                    <ChatHeadBubble
                        key={`${conv.isGroup ? 'g' : 'p'}-${conv.id}`}
                        conv={conv}
                        index={i}
                        onToggleWindow={() => openWindow(conv)}
                        onDismiss={() => removeChatHead(conv.id, conv.isGroup)}
                    />
                ))}

            {/* Floating conversation panel (triggered from header) */}
            {isPanelOpen && (
                <ChatHeadPanel
                    onSelectConversation={handleSelectConversation}
                    onClose={togglePanel}
                />
            )}

            {/* Mini chat windows */}
            {!onChatPage && activeWindows.map((w, i) => (
                <ChatHeadWindow
                    key={`${w.isGroup ? 'g' : 'p'}-${w.id}`}
                    user={w}
                    position={i}
                    onMinimize={() => closeWindow(w.id, w.isGroup)}
                    onDismiss={() => removeChatHead(w.id, w.isGroup)}
                />
            ))}
        </>
    );
};

export default ChatHead;
