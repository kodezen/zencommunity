import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API, handleSliceError, handleSliceSuccess, namespace } from "@Utils/helper";

const LICENSE_NAMESPACE = `${namespace}/license`;

export const fetchInsightsStatus = createAsyncThunk(
    "license/fetchInsightsStatus",
    async (_, thunkAPI) => {
        try {
            const res = await API.get(`${LICENSE_NAMESPACE}/insights`);
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

export const setInsightsOptIn = createAsyncThunk(
    "license/setInsightsOptIn",
    async (optIn, thunkAPI) => {
        try {
            const res = await API.post(`${LICENSE_NAMESPACE}/insights`, { opt_in: optIn });
            handleSliceSuccess(thunkAPI, optIn ? "Usage data sharing enabled" : "Usage data sharing disabled");
            return res.data;
        } catch (e) {
            return handleSliceError(thunkAPI, e);
        }
    }
);

const licenseSlice = createSlice({
    name: "license",
    initialState: {
        allowed: false,
        version: '',
        packageName: 'ZenCommunity',
        purchaseUrl: null,
        deviceId: '',
        status: 'idle',
    },
    reducers: {},
    extraReducers: (builder) => {
        const applyInsights = (state, action) => {
            state.status = 'idle';
            state.allowed = !!action.payload?.allowed;
            state.version = action.payload?.version ?? state.version;
            state.packageName = action.payload?.package_name ?? state.packageName;
            state.purchaseUrl = action.payload?.purchase_url ?? state.purchaseUrl;
            state.deviceId = action.payload?.device_id ?? state.deviceId;
        };

        builder
            .addCase(fetchInsightsStatus.pending, (state) => { state.status = 'loading'; })
            .addCase(fetchInsightsStatus.fulfilled, applyInsights)
            .addCase(fetchInsightsStatus.rejected, (state) => { state.status = 'idle'; })
            .addCase(setInsightsOptIn.pending, (state) => { state.status = 'saving'; })
            .addCase(setInsightsOptIn.fulfilled, applyInsights)
            .addCase(setInsightsOptIn.rejected, (state) => { state.status = 'idle'; });
    },
});

export default licenseSlice.reducer;
