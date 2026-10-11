import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { __ } from "@wordpress/i18n";
import { active_addons, API, handleSliceError, namespace } from "@Utils/helper";

export const fetchAllAddons = createAsyncThunk("community/fetchAddons", async (thunkAPI) => {
    try {
            const res = await API.get(`${namespace}/addons`);
            return res.data;
        } catch (error) {
            return handleSliceError(thunkAPI, error);
        }
    }
);

export const toggleAddonStatus = createAsyncThunk("community/toggleAddonStatus",
    async (addon, thunkAPI) => {
        try {
            const url = addon?.is_activated ? "/addons/deactivate" : "/addons/activate";
            const res = await API.post(`${namespace}${url}`, {
                addon_key: addon?.key,
            });
            if (res?.data?.success) {
                window.ZencommunityGlobal.active_addons = addon?.is_activated ? [...active_addons.filter(item => item !== addon.key)] : [...active_addons, addon.key]
                return {
                    key: addon.key,
                    is_activated: !addon.is_activated
                };
            } else {
                return thunkAPI.rejectWithValue("Failed to update addon status");
            }
        } catch (error) {
            return handleSliceError(thunkAPI, error);
        }
    }
);

const addonSlice = createSlice({
    name: 'addons',
    initialState: {
        data: [],
        activeAddons : window.ZencommunityGlobal.active_addons 
    },
    reducers: {
        fetchActiveAddon: (state) => {
            state.activeAddons = window.ZencommunityGlobal.active_addons;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllAddons.fulfilled, (state, action) => {
                state.data = action.payload;
                state.activeAddons = window.ZencommunityGlobal.active_addons
            })
            .addCase(toggleAddonStatus.fulfilled, (state, action) => {
                const { key, is_activated } = action.payload;
                state.data = state.data.map((addon) =>
                    addon.key === key ? { ...addon, is_activated } : addon
                );
                state.activeAddons = window.ZencommunityGlobal.active_addons
            })
    },
})
export const {fetchActiveAddon} = addonSlice.actions;
export default addonSlice.reducer;
