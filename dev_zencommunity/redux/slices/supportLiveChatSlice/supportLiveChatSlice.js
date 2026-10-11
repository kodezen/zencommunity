import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { API, handleSliceError, namespace } from "@Utils/helper";
import { deleteMessageFromSupportChat, fetchSingleUserNextPageChat, getSingleUserSupportChat, reactToMessage, sendMessageToSupportUser, sendMessageToUser, unreadMessage, unreadSupportChatMessage, updateSupportChatMessage, updateUserMessage } from "./supportMessageActions";

export const getSupportProducts = createAsyncThunk('community/getSupportProducts', async (_, thunkAPI) => {
    try {
        const response = await API.get(`${namespace}/live-chat/products`);
        return response.data;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

// Sites that have asked to be connected and are waiting on somebody. They live
// in the same list as the products they will become, because "which sites may
// connect" is one question and deserves one answer.
export const getConnectionRequests = createAsyncThunk('community/getConnectionRequests', async (_, thunkAPI) => {
    try {
        const response = await API.get(`${namespace}/live-chat/connection-request`);
        return response.data;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const approveConnectionRequest = createAsyncThunk('community/approveConnectionRequest', async (id, thunkAPI) => {
    try {
        const response = await API.post(`${namespace}/live-chat/connection-request/${id}`);
        // Approving turns the request into a product, so the list it just left
        // has to be refetched — otherwise the row simply vanishes and the site
        // it became does not appear until a reload.
        await thunkAPI.dispatch(getSupportProducts());
        return { id, ...response.data };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const rejectConnectionRequest = createAsyncThunk('community/rejectConnectionRequest', async (id, thunkAPI) => {
    try {
        await API.delete(`${namespace}/live-chat/connection-request/${id}`);
        return id;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const createSupportProduct = createAsyncThunk('community/createSupportProduct', async (formData, thunkAPI) => {
    try {
        const response = await API.post(`${namespace}/live-chat/products`, {
            ...formData
        });
        return response.data;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const updateSupportProduct = createAsyncThunk('community/updateSupportProduct', async (formData, thunkAPI) => {
    try {
        const response = await API.post(`${namespace}/live-chat/product/${formData.id}`, {
            ...formData
        });
        return response.data ?? formData;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const deleteSupportProduct = createAsyncThunk('community/deleteSupportProduct', async (id, thunkAPI) => {
    try {
        await API.delete(`${namespace}/live-chat/product/${id}`);
        return id;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});


const supportLiveChat = createSlice({
    name: 'supportLiveChat',
    initialState: {
        connectionRequests: [],
        // Whether the list above has actually been fetched. An empty `records`
        // is the initial state and also a real answer, and anything deciding
        // what to show when there are no sites needs to tell those apart.
        productsLoaded: false,
        products: {
            records: [],
            page: 1,
            per_page: 15,
            pages: 1,
            total: 0,
        },
        // Messages are keyed by chat id at the slice root (this is where every
        // reducer actually writes them). Declared here so it always exists.
        supportMessages: {},
        current_chat_last_unseen_msg_id: null,
        page: 1,
        per_page: 15,
        pages: 1,
        total: 0,
    },
    reducers: {
        addNewMessageInSupportChat: (state, action) => {
            const { chatID, message } = action.payload;
            if (!state.supportMessages) state.supportMessages = {};
            if (state.supportMessages[chatID]) {
                state.supportMessages[chatID].push(message);
            } else {
                state.supportMessages[chatID] = [message];
            }
        },
        updateMessageInSupportChat: (state, action) => {
            const { chatID, messageID, newMessage } = action.payload;

            if (state.supportMessages[Number(chatID)]) {
                state.supportMessages[chatID] = state.supportMessages[chatID].map(msg =>
                    Number(msg.id) === Number(messageID)
                        ? { ...msg, ...newMessage, is_edited: true }
                        : msg
                );
            }
        },
        deleteMessageInSupportChat: (state, action) => {
            const { chatID, messageID } = action.payload;
            if (state.supportMessages[Number(chatID)]) {
                state.supportMessages[Number(chatID)] = state.supportMessages[Number(chatID)].filter(
                    msg => Number(msg.id) !== Number(messageID)
                );
            }
        },
        addReactionToMessage: (state, action) => {
            const { chatID, messageID, emoji } = action.payload;
            if (state.supportMessages[Number(chatID)]) {
                state.supportMessages[Number(chatID)] = state.supportMessages[Number(chatID)].map(msg =>
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
            const { chatID, messageID, emoji } = action.payload;
            if (state.supportMessages[Number(chatID)]) {
                state.supportMessages[Number(chatID)] = state.supportMessages[Number(chatID)].map(msg =>
                    Number(msg.id) === Number(messageID)
                        ? {
                            ...msg,
                            reactions: (msg.reactions || []).filter(item => item !== emoji)
                        }
                        : msg
                );
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getSupportProducts.fulfilled, (state, action) => {
                state.products = action.payload;
                state.productsLoaded = true;
            })
            .addCase(getConnectionRequests.fulfilled, (state, action) => {
                state.connectionRequests = action.payload?.records ?? [];
            })
            .addCase(approveConnectionRequest.fulfilled, (state, action) => {
                state.connectionRequests = state.connectionRequests.filter((r) => r.id !== action.payload?.id);
            })
            .addCase(rejectConnectionRequest.fulfilled, (state, action) => {
                state.connectionRequests = state.connectionRequests.filter((r) => r.id !== action.payload);
            })
            .addCase(createSupportProduct.fulfilled, (state, action) => {
                state.products.records = [action.payload, ...state.products.records];
            })
            .addCase(updateSupportProduct.fulfilled, (state, action) => {
                state.products.records = state.products.records.map(item => parseInt(item.id) === parseInt(action.payload.id) ? action.payload : item);
            })
            .addCase(deleteSupportProduct.fulfilled, (state, action) => {
                state.products.records = state.products.records.filter(item => parseInt(item.id) !== parseInt(action.payload));
            })
            .addCase(getSingleUserSupportChat.fulfilled, (state, action) => {
                const { chatID, data = [], last_unseen_msg_id, page, per_page, total, pages } = action.payload || {};

                if (!chatID) return; // Avoid undefined access

                // Ensure supportMessages exists
                if (!state.supportMessages) {
                    state.supportMessages = {};
                }

                if (state.supportMessages[chatID]) {
                    const existing = state.supportMessages[chatID] || [];
                    const incoming = Array.isArray(data) ? data : [];

                    const merged = [
                        ...existing,
                        ...incoming.filter(
                            msg => !existing.some(e => Number(e.id) === Number(msg.id))
                        ),
                    ];

                    state.supportMessages[chatID] = merged;
                } else {
                    state.supportMessages[chatID] = Array.isArray(data) ? data : [];
                }

                state.current_chat_last_unseen_msg_id = last_unseen_msg_id || null;
                state.page = page || 1;
                state.per_page = per_page || 1;
                state.pages = pages || 1;
                state.total = total || 10;
            })
            .addCase(fetchSingleUserNextPageChat.fulfilled, (state, action) => {
                const { chatID, data } = action.payload || {};

                if (!chatID) return; // Avoid undefined access

                // Ensure supportMessages exists
                if (!state.supportMessages) {
                    state.supportMessages = {};
                }

                if (state.supportMessages[chatID]) {
                    const existing = state.supportMessages[chatID] || [];
                    const incoming = Array.isArray(data.records) ? data.records : [];

                    const merged = [
                        ...incoming.filter(
                            msg => !existing.some(e => Number(e.id) === Number(msg.id))
                        ),
                        ...existing,
                    ];

                    state.supportMessages[chatID] = merged;
                } else {
                    state.supportMessages[chatID] = Array.isArray(data.records) ? data.records : [];
                }

                state.current_chat_last_unseen_msg_id = data.last_unseen_msg_id || null;
                state.page = data.page || 1;
                state.per_page = data.per_page || 1;
                state.pages = data.pages || 1;
                state.total = data.total || 10;
            })
            .addCase(sendMessageToSupportUser.fulfilled, (state, action) => {
                const chatId = action.payload.chatID;
                const newMessage = action.payload.data;

                // merge existing + new
                const existingMessages = state.supportMessages[chatId] || [];
                const merged = [...existingMessages, newMessage];

                // remove duplicates by message.id
                const unique = merged.filter(
                    (msg, index, self) =>
                        index === self.findIndex((m) => Number(m.id) === Number(msg.id))
                );

                // update store
                state.supportMessages[chatId] = unique;

            })
            .addCase(deleteMessageFromSupportChat.fulfilled, (state, action) => {
                const { messageID, chatID } = action.payload;
                if (state.supportMessages[chatID]) {
                    state.supportMessages[chatID] = state.supportMessages[chatID].filter(item => parseInt(item.id) !== parseInt(messageID));
                }
            })
            // .addCase(reactToMessage.fulfilled, (state, action) => {
            //     const { messageID, chatID, emoji } = action.payload;

            //     if (!state.supportMessages[Number(chatID)]) return;

            //     state.supportMessages[Number(chatID)] = state.supportMessages[Number(chatID)].map(item => {
            //         if (Number(item.id) === Number(messageID)) {
            //             const reactions = item.reactions || [];
            //             if (reactions.includes(emoji)) {
            //                 return {
            //                     ...item,
            //                     reactions: reactions.filter(e => e !== emoji)
            //                 };
            //             } else {
            //                 return {
            //                     ...item,
            //                     reactions: [...reactions, emoji]
            //                 };
            //             }
            //         }
            //         return item;
            //     });
            // })
            .addCase(updateSupportChatMessage.fulfilled, (state, action) => {
                const { chatID, messageID, data } = action.payload;

                if (state.supportMessages[parseInt(chatID)]) {
                    state.supportMessages[parseInt(chatID)] = state.supportMessages[parseInt(chatID)].map(item =>
                        parseInt(item.id) === parseInt(messageID)
                            ? { ...item, ...data, is_edited: true }
                            : item
                    );
                }
            })
            .addCase(unreadSupportChatMessage.fulfilled, (state, action) => {
                const { chatID, messageID } = action.payload;
                state.current_chat_last_unseen_msg_id = null;

                if (state.supportMessages[parseInt(chatID)]) {
                    state.supportMessages[parseInt(chatID)] = state.supportMessages[parseInt(chatID)].map(item =>
                        parseInt(item.id) === parseInt(messageID)
                            ? { ...item, is_seen: true }
                            : item
                    );
                }

            })
    },
})

export const { addNewMessageInSupportChat, updateMessageInSupportChat, deleteMessageInSupportChat, addReactionToMessage, removeReactionFromMessage } = supportLiveChat.actions;
export default supportLiveChat.reducer;