import { createSlice } from "@reduxjs/toolkit";
import { __ } from "@wordpress/i18n";
import { deleteMessageFromChat, getSingleUserChat, reactToMessage, sendMessageToUser, unreadMessage, updateUserMessage } from "./privateMessageActions";
import { getGroupMessage, joinGroupMessage, sendMessageToGroup, reactGroupMessage, unreadGroupMessage, updateGroupMessage } from "./groupActions";

const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        // Keyed by user/group id — must be plain objects, not arrays. Assigning
        // numeric ids onto an array produces a sparse array (huge length, holes).
        privateMessages: {},
        groupMessages: {},
        // Per-conversation pagination, keyed by user/group id: { page, pages }.
        // `page` tracks the oldest page loaded so the scroll loader fetches page+1.
        privatePagination: {},
        groupPagination: {},
        current_chat_last_unseen_msg_id: null,
    },
    reducers: {
        addNewMessageInChat: (state, action) => {
            const { userID, message } = action.payload;
            if (state.privateMessages[userID]) {
                state.privateMessages[userID] = [...state.privateMessages[userID], message]
            }
        },
        updateMessageInChat: (state, action) => {
            const { userID, messageID, newMessage } = action.payload;

            if (state.privateMessages[Number(userID)]) {
                state.privateMessages[userID] = state.privateMessages[userID].map(msg =>
                    Number(msg.id) === Number(messageID)
                        ? { ...msg, ...newMessage, is_edited: true }
                        : msg
                );
            }
        },
        deleteMessageInChat: (state, action) => {
            const { userID, messageID } = action.payload;
            if (state.privateMessages[Number(userID)]) {
                state.privateMessages[Number(userID)] = state.privateMessages[Number(userID)].filter(
                    msg => Number(msg.id) !== Number(messageID)
                );
            }
        },
        addReactionToMessage: (state, action) => {
            const { userID, messageID, emoji } = action.payload;
            if (state.privateMessages[Number(userID)]) {
                state.privateMessages[Number(userID)] = state.privateMessages[Number(userID)].map(msg =>
                    Number(msg.id) === Number(messageID)
                        ? {
                            ...msg,
                            reactions: (msg.reactions || []).includes(emoji)
                                ? msg.reactions
                                : [...(msg.reactions || []), emoji]
                        }
                        : msg
                );
            }
        },
        removeReactionFromMessage: (state, action) => {
            const { userID, messageID, emoji } = action.payload;
            if (state.privateMessages[Number(userID)]) {
                state.privateMessages[Number(userID)] = state.privateMessages[Number(userID)].map(msg =>
                    Number(msg.id) === Number(messageID)
                        ? {
                            ...msg,
                            reactions: msg.reactions.filter(item => item !== emoji)
                        }
                        : msg
                );
            }
        },
        // Mark all of the current user's messages in a 1:1 thread as seen
        // (the other party read them — pushed via the `msg_read` WS event).
        markPrivateConversationSeen: (state, action) => {
            const { userID } = action.payload;
            if (state.privateMessages[userID]) {
                state.privateMessages[userID] = state.privateMessages[userID].map(msg =>
                    msg.is_seen ? msg : { ...msg, is_seen: 1 }
                );
            }
        },
        // groups
        addNewMessageInGroupChat: (state, action) => {
            const { groupId, message } = action.payload;
            if (state.groupMessages[groupId]) {
                state.groupMessages[groupId] = [...state.groupMessages[groupId], message]
            }
        },
        updateMessageInGroupChat: (state, action) => {
            const { groupId, messageID, newMessage } = action.payload;

            if (state.groupMessages[Number(groupId)]) {
                state.groupMessages[groupId] = state.groupMessages[groupId].map(msg =>
                    Number(msg.id) === Number(messageID)
                        ? { ...msg, ...newMessage, is_edited: true }
                        : msg
                );
            }
        },
        deleteMessageInGroupChat: (state, action) => {
            const { groupId, messageID } = action.payload;
            if (state.groupMessages[Number(groupId)]) {
                state.groupMessages[Number(groupId)] = state.groupMessages[Number(groupId)].filter(
                    msg => Number(msg.id) !== Number(messageID)
                );
            }
        },
        markGroupConversationSeen: (state, action) => {
            const { groupId } = action.payload;
            if (state.groupMessages[groupId]) {
                state.groupMessages[groupId] = state.groupMessages[groupId].map(msg =>
                    msg.is_seen ? msg : { ...msg, is_seen: 1 }
                );
            }
        },
        addReactionToGroupMessage: (state, action) => {
            const { groupId, messageID, emoji } = action.payload;
            if (state.groupMessages[Number(groupId)]) {
                state.groupMessages[Number(groupId)] = state.groupMessages[Number(groupId)].map(msg =>
                    Number(msg.id) === Number(messageID)
                        ? {
                            ...msg,
                            reactions: (msg.reactions || []).includes(emoji)
                                ? msg.reactions
                                : [...(msg.reactions || []), emoji]
                        }
                        : msg
                );
            }
        },
        removeReactionFromGroupMessage: (state, action) => {
            const { groupId, messageID, emoji } = action.payload;
            if (state.groupMessages[Number(groupId)]) {
                state.groupMessages[Number(groupId)] = state.groupMessages[Number(groupId)].map(msg =>
                    Number(msg.id) === Number(messageID)
                        ? {
                            ...msg,
                            reactions: msg.reactions.filter(item => item !== emoji)
                        }
                        : msg
                );
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getSingleUserChat.fulfilled, (state, action) => {
                const { userID, data = [], last_unseen_msg_id, page = 1, pages = 1 } = action.payload;

                const existing = state.privateMessages[userID] || [];
                const incoming = data.filter(
                    msg => !existing.some(e => Number(e.id) === Number(msg.id))
                );

                if (page > 1) {
                    // Older page → prepend above existing messages.
                    state.privateMessages[userID] = [...incoming, ...existing];
                } else {
                    // First/newest page → keep existing (realtime) and append new.
                    state.privateMessages[userID] = existing.length ? [...existing, ...incoming] : data;
                }

                // Track the oldest page loaded (don't let a page-1 poll reset it).
                const prevPage = state.privatePagination[userID]?.page || 1;
                state.privatePagination[userID] = { page: Math.max(prevPage, page), pages };

                state.current_chat_last_unseen_msg_id = last_unseen_msg_id;
            })
            .addCase(sendMessageToUser.fulfilled, (state, action) => {
                state.privateMessages[action.payload.userID] = [...state.privateMessages[action.payload.userID], action.payload.data];
            })
            .addCase(deleteMessageFromChat.fulfilled, (state, action) => {
                const { messageID, userID } = action.payload;
                if (state.privateMessages[userID]) {
                    const newChat = state.privateMessages[userID].filter(item => parseInt(item.id) !== parseInt(messageID));
                    if (newChat.length === 0) {
                        delete state.privateMessages[userID];
                    } else {
                        state.privateMessages[userID] = newChat;
                    }
                }
            })
            .addCase(reactToMessage.fulfilled, (state, action) => {
                const { messageID, userID, emoji } = action.payload;

                if (!state.privateMessages[Number(userID)]) return;

                state.privateMessages[Number(userID)] = state.privateMessages[Number(userID)].map(item => {
                    if (Number(item.id) === Number(messageID)) {
                        const reactions = item.reactions || [];
                        if (reactions.includes(emoji)) {
                            return {
                                ...item,
                                reactions: reactions.filter(e => e !== emoji)
                            };
                        } else {
                            return {
                                ...item,
                                reactions: [...reactions, emoji]
                            };
                        }
                    }
                    return item;
                });
            })
            .addCase(updateUserMessage.fulfilled, (state, action) => {
                const { userID, messageID, data: newMessage } = action.payload;

                if (state.privateMessages[parseInt(userID)]) {
                    state.privateMessages[parseInt(userID)] = state.privateMessages[parseInt(userID)].map(item =>
                        parseInt(item.id) === parseInt(messageID)
                            ? { ...item, message: newMessage, message_rendered: newMessage, is_edited: true }
                            : item
                    );
                }
            })
            .addCase(unreadMessage.fulfilled, (state, action) => {
                const { userID, messageID } = action.payload;
                state.current_chat_last_unseen_msg_id = null;

                if (state.privateMessages[parseInt(userID)]) {
                    state.privateMessages[parseInt(userID)] = state.privateMessages[parseInt(userID)].map(item =>
                        parseInt(item.id) === parseInt(messageID)
                            ? { ...item, is_seen: true }
                            : item
                    );
                }
                
            })
            .addCase(sendMessageToGroup.fulfilled, (state, action) => {
                state.groupMessages[action.payload.groupId] = [...state.groupMessages[action.payload.groupId], action.payload.data];
            })
            .addCase(joinGroupMessage.fulfilled, (state, action) => {
                // state.groupMessages[action.payload.groupId] = [];
            })
            .addCase(getGroupMessage.fulfilled, (state, action) => {
                const { groupId, data = [], last_unseen_msg_id, page = 1, pages = 1 } = action.payload;
                const existing = state.groupMessages[groupId] || [];
                const incoming = data.filter(msg => !existing.some(e => Number(e.id) === Number(msg.id)));

                if (page > 1) {
                    state.groupMessages[groupId] = [...incoming, ...existing];
                } else {
                    state.groupMessages[groupId] = existing.length ? [...existing, ...incoming] : data;
                }

                const prevPage = state.groupPagination[groupId]?.page || 1;
                state.groupPagination[groupId] = { page: Math.max(prevPage, page), pages };

                state.current_chat_last_unseen_msg_id = last_unseen_msg_id;
            })
            .addCase(reactGroupMessage.fulfilled, (state, action) => {
                const { messageID, groupId, emoji } = action.payload;

                if (!state.groupMessages[groupId]) return;

                state.groupMessages[groupId] = state.groupMessages[groupId].map(item => {
                    if (Number(item.id) === Number(messageID)) {
                        const reactions = item.reactions || [];
                        if (reactions.includes(emoji)) {
                            return {
                                ...item,
                                reactions: reactions.filter(e => e !== emoji)
                            };
                        } else {
                            return {
                                ...item,
                                reactions: [...reactions, emoji]
                            };
                        }
                    }
                    return item;
                });
            })
            .addCase(unreadGroupMessage.fulfilled, (state, action) => {
                const { groupId, messageID } = action.payload;
                state.current_chat_last_unseen_msg_id = null;

                if (state.groupMessages[groupId]) {
                    state.groupMessages[groupId] = state.groupMessages[groupId].map(item =>
                        parseInt(item.id) === parseInt(messageID)
                            ? { ...item, is_seen: true }
                            : item
                    );
                }
            })
            .addCase(updateGroupMessage.fulfilled, (state, action) => {
                const { groupId, messageID, data: newMessage } = action.payload;

                if (state.groupMessages[groupId]) {
                    state.groupMessages[groupId] = state.groupMessages[groupId].map(item =>
                        parseInt(item.id) === parseInt(messageID)
                            ? { ...item, message: newMessage, message_rendered: newMessage, is_edited: true }
                            : item
                    );
                }
            })
    },
})


export const { addNewMessageInChat, updateMessageInChat, deleteMessageInChat, addReactionToMessage, removeReactionFromMessage, markPrivateConversationSeen, addNewMessageInGroupChat, updateMessageInGroupChat, deleteMessageInGroupChat, addReactionToGroupMessage, removeReactionFromGroupMessage, markGroupConversationSeen } = chatSlice.actions;
export default chatSlice.reducer;