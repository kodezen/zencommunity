import { createAsyncThunk } from "@reduxjs/toolkit";
import { __ } from "@wordpress/i18n";
import { API, handleSliceError, namespace } from "@Utils/helper";

export const getSingleUserChat = createAsyncThunk('community/getSingleUserChat', async (arg, thunkAPI) => {
    try {
        // Accept a bare userID (legacy callers) or { userID, page } for pagination.
        const userID = (arg && typeof arg === 'object') ? arg.userID : arg;
        const page = (arg && typeof arg === 'object' && arg.page) ? arg.page : 1;
        const response = await API.get(namespace + `/private/messages/to/${parseInt(userID)}?page=${page}&per_page=15`);
        return {
            data: response.data.records,
            last_unseen_msg_id: response.data.last_unseen_msg_id,
            page: response.data.page ?? page,
            pages: response.data.pages ?? 1,
            per_page: response.data.per_page,
            userID
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const sendMessageToUser = createAsyncThunk('community/sendMessageToUser', async ({ userID, message, mediaIds = [], replyToId }, thunkAPI) => {
    try {
        const params = { message: message.message }
        if (mediaIds.length > 0) {
            params.add_media_ids = mediaIds;
        }
        if (replyToId) {
            params.reply_to_id = replyToId;
        }
        const { data } = await API.post(namespace + `/private/messages/to/${parseInt(userID)}`, { ...params });

        return {
            data: { ...message, id: data?.id },
            userID
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const updateUserMessage = createAsyncThunk('community/updateUserMessage', async ({ userID, messageID, message }, thunkAPI) => {
    try {
        await API.post(namespace + `/private/message/${parseInt(messageID)}`, { message });
        return {
            data: message,
            messageID,
            userID
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const unreadMessage = createAsyncThunk('community/unreadMessage', async ({ userID, messageID }, thunkAPI) => {
    try {
        await API.post(namespace + `/private/message/${parseInt(messageID)}/read`);
        return {
            messageID,
            userID
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const deleteMessageFromChat = createAsyncThunk('community/deleteMessageFromChat', async ({ userID, messageID }, thunkAPI) => {
    try {
        await API.delete(namespace + `/private/message/${parseInt(messageID)}`);
        return {
            messageID,
            userID
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const reactToMessage = createAsyncThunk('community/reactToMessage', async ({ userID, messageID, emoji }, thunkAPI) => {
    try {
        await API.post(namespace + `/private/message/${parseInt(messageID)}/react`, { emoji });
        return {
            messageID,
            userID,
            emoji
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});