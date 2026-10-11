import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API, handleSliceError, handleSliceSuccess, namespace } from "@Utils/helper";

const CONNECTIVITY_NAMESPACE = `${namespace}/connectivity`;

export const fetchKbToken = createAsyncThunk(
    "connectivity/fetchKbToken",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${CONNECTIVITY_NAMESPACE}/kb-token`);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const regenerateKbToken = createAsyncThunk(
    "connectivity/regenerateKbToken",
    async (_, thunkAPI) => {
        try {
            const res = await API.post(`${CONNECTIVITY_NAMESPACE}/kb-token`);
            handleSliceSuccess(thunkAPI, "KB token regenerated successfully");
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

const connectivitySlice = createSlice({
    name: "connectivity",
    initialState: {
        kbToken: '',
        kbTokenStatus: 'idle',
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchKbToken.pending,  (state) => { state.kbTokenStatus = 'loading'; })
            .addCase(fetchKbToken.fulfilled, (state, action) => {
                state.kbTokenStatus = 'idle';
                state.kbToken = action.payload?.kb_token ?? '';
            })
            .addCase(fetchKbToken.rejected,  (state) => { state.kbTokenStatus = 'idle'; })
            .addCase(regenerateKbToken.pending,  (state) => { state.kbTokenStatus = 'regenerating'; })
            .addCase(regenerateKbToken.fulfilled, (state, action) => {
                state.kbTokenStatus = 'idle';
                state.kbToken = action.payload?.kb_token ?? '';
            })
            .addCase(regenerateKbToken.rejected,  (state) => { state.kbTokenStatus = 'idle'; });
    },
});

export default connectivitySlice.reducer;
