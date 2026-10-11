import { createAsyncThunk } from "@reduxjs/toolkit";
import { __ } from "@wordpress/i18n";
import { API, handleSliceError, namespace } from "@Utils/helper";


export const sendMessageToGroup = createAsyncThunk('community/sendMessageToGroup', async ({ groupId, message, mediaIds = [], replyToId }, thunkAPI) => {
    try {
        const params = { message: message.message }
        if (mediaIds.length > 0) {
            params.add_media_ids = mediaIds;
        }
        if (replyToId) {
            params.reply_to_id = replyToId;
        }
        const { data } = await API.post(namespace + `/group/messages/to/${Number(groupId)}`, { ...params });

        return {
            data: { ...message, id: data?.id },
            groupId
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const updateGroupMessage = createAsyncThunk('community/updateGroupMessage', async ({ groupId, messageID, message }, thunkAPI) => {
    try {
        await API.post(namespace + `/group/message/${parseInt(messageID)}`, { message });
        return {
            data: message,
            messageID,
            groupId
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const unreadGroupMessage = createAsyncThunk('community/unreadGroupMessage', async ({ groupId, messageID }, thunkAPI) => {
    try {
        await API.post(namespace + `/group/message/${parseInt(messageID)}/read`);
        return {
            messageID,
            groupId
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const reactGroupMessage = createAsyncThunk('community/reactGroupMessage', async ({ groupId, messageID, emoji }, thunkAPI) => {
    try {
        await API.post(namespace + `/group/message/${parseInt(messageID)}/react`, { emoji });
        return {
            messageID,
            groupId,
            emoji
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const joinGroupMessage = createAsyncThunk('community/joinGroupMessage', async (groupId, thunkAPI) => {
    try {
        await API.post(namespace + `/group/${groupId}/message/join`);
        return {
            groupId,
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error, false)
    }
});

export const getGroupMessage = createAsyncThunk('community/getGroupMessage', async (arg, thunkAPI) => {
    try {
        // Accept a bare groupId (legacy callers) or { groupId, page } for pagination.
        const groupId = (arg && typeof arg === 'object') ? arg.groupId : arg;
        const page = (arg && typeof arg === 'object' && arg.page) ? arg.page : 1;
        const response = await API.get(namespace + `/group/messages/to/${parseInt(groupId)}?page=${page}&per_page=15`);
        return {
            data: response.data.records,
            last_unseen_msg_id: response.data.last_unseen_msg_id,
            page: response.data.page ?? page,
            pages: response.data.pages ?? 1,
            per_page: response.data.per_page,
            groupId
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});