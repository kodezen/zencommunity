import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { takeBootstrapValue } from "@Utils/bootstrap";
import { __ } from "@wordpress/i18n";
import { API, handleSliceError, handleSliceSuccess, namespace } from "@Utils/helper";

export const signIn = createAsyncThunk('community/signIn', async (formData, thunkAPI) => {
    try {
        const response = await API.post(`${namespace}auth/signin`, formData)
        if (response.status === 201) {
            handleSliceSuccess(thunkAPI, "Login successful");
            return response.data;
        }
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const signUp = createAsyncThunk('community/signUp', async (formData, thunkAPI) => {
    try {
        const response = await API.post(`${namespace}auth/signup`, formData)
        if (response.status === 201) {
            handleSliceSuccess(thunkAPI, "Registration successful");
            return response.data;
        }
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const groupPermissions = createAsyncThunk('community/groupPermissions', async (formData, thunkAPI) => {
    try {
        const preloaded = await takeBootstrapValue('groups_permissions');

        if (undefined !== preloaded) return preloaded;

        const response = await API.get(`${namespace}/members/groups-permissions`, formData);
        return response.data;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        data: [],
    },
    reducers: {

    },
    extraReducers: (builder) => {
        builder
            .addCase(signIn.fulfilled, (state, action) => {
                state.data = [...state.data, action.payload];
            })
            .addCase(signUp.fulfilled, (state, action) => {
                state.data = [...state.data, action.payload];
            })
            .addCase(groupPermissions.fulfilled, (state, action) => {
                state.group_permissions = action.payload;
            })
    },
})


export default authSlice.reducer;