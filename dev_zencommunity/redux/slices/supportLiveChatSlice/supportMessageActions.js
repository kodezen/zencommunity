import { createAsyncThunk } from "@reduxjs/toolkit";
import { __ } from "@wordpress/i18n";
import { API, handleSliceError, namespace } from "@Utils/helper";

export const getSingleUserSupportChat = createAsyncThunk('community/getSingleUserSupportChat', async (chatID, thunkAPI) => {
    try {
        const response = await API.get(namespace + `/live-chat/chat/${parseInt(chatID)}/messages`);
        return {
            data: response.data.records,
            last_unseen_msg_id: response.data.last_unseen_msg_id,
            page: response.data.page,
            per_page: response.data.per_page,
            total: response.data.total,
            pages: response.data.pages,
            chatID,
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const fetchSingleUserNextPageChat = createAsyncThunk('community/fetchSingleUserNextPageChat', async ({ chatID, page = 1 }, thunkAPI) => {
    try {
        const response = await API.get(namespace + `/live-chat/chat/${parseInt(chatID)}/messages?page=${page}`);
        return {
            data: response.data,
            chatID
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const sendMessageToSupportUser = createAsyncThunk('community/sendMessageToSupportUser', async ({ chatID, message, mediaIds = [], replyToId }, thunkAPI) => {
    try {
        const params = { message: message }
        if (mediaIds.length > 0) {
            params.add_media_ids = mediaIds;
        }
        if (replyToId) {
            params.reply_to_id = replyToId;
        }
        const { data } = await API.post(namespace + `/live-chat/chat/${parseInt(chatID)}/messages`, { ...params });

        return {
            data: data,
            chatID
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const updateSupportChatMessage = createAsyncThunk('community/updateSupportChatMessage', async ({ chatID, messageID, message }, thunkAPI) => {
    try {
        const { data } = await API.post(namespace + `/live-chat/agent/message/${parseInt(messageID)}`, { message });
        return {
            data,
            messageID,
            chatID
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const unreadSupportChatMessage = createAsyncThunk('community/unreadSupportChatMessage', async ({ chatID, messageID }, thunkAPI) => {
    try {
        await API.post(namespace + `/live-chat/agent/message/${parseInt(messageID)}/read`);
        return {
            messageID,
            chatID
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const deleteMessageFromSupportChat = createAsyncThunk('community/deleteMessageFromSupportChat', async ({ chatID, messageID }, thunkAPI) => {
    try {
        const { data } = await API.delete(namespace + `/live-chat/agent/message/${parseInt(messageID)}`);
        return {
            messageID,
            chatID
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const reactToMessage = createAsyncThunk('community/reactToMessage', async ({ chatID, messageID, emoji }, thunkAPI) => {
    try {
        await API.post(namespace + `/private/message/${parseInt(messageID)}/react`, { emoji });
        return {
            messageID,
            chatID,
            emoji
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});