import { createSlice } from '@reduxjs/toolkit';

// Backs the floating "chat head" bubbles/mini-windows + the header's quick
// Messages panel. Lives in Redux (rather than React Context, as it did in
// Layout.js pre-FSE) because FSE mode hydrates the header and the chat-head
// island as two separate React roots — plain Context can't cross that
// boundary, but the Redux store is the same singleton import in both.
const chatHeadSlice = createSlice({
    name: 'chatHead',
    initialState: {
        isPanelOpen: false,
        chatHeads: [],
        activeWindows: [],
    },
    reducers: {
        togglePanel: (state) => {
            state.isPanelOpen = !state.isPanelOpen;
        },
        closePanel: (state) => {
            state.isPanelOpen = false;
        },
        hydrateChatHeads: (state, action) => {
            state.chatHeads = action.payload?.chatHeads ?? [];
            state.activeWindows = action.payload?.activeWindows ?? [];
        },
        addChatHead: (state, action) => {
            const conv = action.payload;
            const existing = state.chatHeads.find(h => h.id === conv.id && h.isGroup === conv.isGroup);
            if (existing) {
                state.chatHeads = state.chatHeads.map(h =>
                    h.id === conv.id && h.isGroup === conv.isGroup
                        ? { ...h, unread: (h.unread || 0) + (conv.unread || 1) }
                        : h
                );
            } else {
                state.chatHeads.push({ ...conv, unread: conv.unread || 0 });
            }
        },
        removeChatHead: (state, action) => {
            const { id, isGroup } = action.payload;
            state.chatHeads = state.chatHeads.filter(h => !(h.id === id && h.isGroup === isGroup));
            state.activeWindows = state.activeWindows.filter(w => !(w.id === id && w.isGroup === isGroup));
        },
        openWindow: (state, action) => {
            const conv = action.payload;
            // Facebook keeps several chats open side by side (not just one) —
            // the newest/clicked one docks nearest the bubble column, bumping
            // older ones left; past MAX_OPEN_WINDOWS the oldest just drops
            // back to being a bubble instead of piling windows off-screen.
            const MAX_OPEN_WINDOWS = 3;
            if (!state.activeWindows.find(w => w.id === conv.id && w.isGroup === conv.isGroup)) {
                state.activeWindows = [conv, ...state.activeWindows].slice(0, MAX_OPEN_WINDOWS);
            }
            const updated = state.chatHeads.map(h =>
                h.id === conv.id && h.isGroup === conv.isGroup ? { ...h, unread: 0 } : h
            );
            const idx = updated.findIndex(h => h.id === conv.id && h.isGroup === conv.isGroup);
            state.chatHeads = idx <= 0 ? updated : [updated[idx], ...updated.filter((_, i) => i !== idx)];
        },
        closeWindow: (state, action) => {
            const { id, isGroup } = action.payload;
            state.activeWindows = state.activeWindows.filter(w => !(w.id === id && w.isGroup === isGroup));
        },
    },
});

export const {
    togglePanel,
    closePanel,
    hydrateChatHeads,
    addChatHead,
    removeChatHead,
    openWindow,
    closeWindow,
} = chatHeadSlice.actions;

export default chatHeadSlice.reducer;
