import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { __ } from "@wordpress/i18n";
import { API, handleSliceError, namespace } from "@Utils/helper";

export const handleTicker = createAsyncThunk('community/handleTicker', async (thunkAPI) => {
    try {
        const response = await API.get(`${namespace}/ticker/${moment().unix()}`);
        return {
            is_new_feeds_available: response.data.new_feeds > 0 ? true : false,
            is_new_notifications_available: response.data.new_notifications > 0 ? true : false,
            new_feeds_count: response.data.new_feeds,
            new_notifications_count: response.data.new_notifications
        };
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

const tickerSlice = createSlice({
    name: 'ticker',
    initialState: {
        is_new_feeds_available: false,
        is_new_notifications_available: false,
        new_feeds_count: 0,
        new_notifications_count: 0
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(handleTicker.fulfilled, (state, action) => {
                state.is_new_feeds_available = action.payload.is_new_feeds_available;
                state.is_new_notifications_available = action.payload.is_new_notifications_available;
                state.new_feeds_count = action.payload.new_feeds_count;
                state.new_notifications_count = action.payload.new_notifications_count;
            })
    },
})


export default tickerSlice.reducer;