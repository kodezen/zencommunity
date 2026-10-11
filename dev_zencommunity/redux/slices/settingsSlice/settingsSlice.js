import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { takeBootstrapValue } from "@Utils/bootstrap";
import { __ } from "@wordpress/i18n";
import { API, namespace } from "@Utils/helper";
import { showNotification } from "../notificationSlice/notificationSlice";

const handleError = (thunkAPI, error) => {
  thunkAPI.dispatch(
    showNotification({
      message: error?.message || error,
      isShow: true,
      type: "error",
    })
  );
  return thunkAPI.rejectWithValue(error.message);
};

export const fetchCommunitySettings = createAsyncThunk(
  "settings/fetchCommunitySettings",
  async (_, thunkAPI) => {
    try {
      const preloaded = await takeBootstrapValue('settings');

      if (undefined !== preloaded) return preloaded;

      const response = await API.get(`${namespace}/settings`);
      return response.data;
    } catch (error) {
      return handleError(thunkAPI, error);
    }
  }
);

export const updateCommunitySettings = createAsyncThunk(
  "settings/updateCommunitySettings",
  async (formData, thunkAPI) => {
    try {
      const response = await API.post(`${namespace}/settings`, {...formData});
      if(window.ZencommunityGlobal.zenc_SOCKET) {
        window.ZencommunityGlobal.zenc_SOCKET.status = formData?.websock_status;
      }
      thunkAPI.dispatch(
        showNotification({
          message: __("Settings updated successfully", "zencommunity"),
          isShow: true,
          type: "success",
        })
      );
      return response.data;
    } catch (error) {
      return handleError(thunkAPI, error);
    }
  }
);

export const fetchWelcomeBannerSettings = createAsyncThunk(
  "settings/fetchWelcomeBannerSettings",
  async (_, thunkAPI) => {
    try {
      const preloaded = await takeBootstrapValue('welcome_banner');

      if (undefined !== preloaded) return preloaded;

      const response = await API.get(namespace + '/welcome-banner');
      return response.data;
    } catch (error) {
      return handleError(thunkAPI, error);
    }
  }
);

export const updateWelcomeBannerSettings = createAsyncThunk(
  "settings/updateWelcomeBannerSettings",
  async (payload, thunkAPI) => {
    try {
      const response = await API.post(namespace + '/welcome-banner', {
        ...payload
      });
      thunkAPI.dispatch(
        showNotification({
          message: __("Banner settings updated successfully", "zencommunity"),
          isShow: true,
          type: "success",
        })
      );
      return payload;
    } catch (error) {
      return handleError(thunkAPI, error);
    }
  }
);

export const fetchCommunityEamilGeneralSettings = createAsyncThunk(
  "settings/fetchCommunityEamilGeneralSettings",
  async (_, thunkAPI) => {
    try {
      const response = await API.get(`${namespace}/email/settings`);
      return response.data;
    } catch (error) {
      return handleError(thunkAPI, error);
    }
  }
);

export const updateCommunityEamilGeneralSettings = createAsyncThunk(
  "settings/updateCommunityEamilGeneralSettings",
  async (formData, thunkAPI) => {
    try {
      await API.post(`${namespace}/email/settings`, {...formData});
      window.ZencommunityGlobal.notification_position = formData.notification_position;
      thunkAPI.dispatch(
        showNotification({
          message: __("Email settings updated successfully", "zencommunity"),
          isShow: true,
          type: "success",
        })
      );
      return formData;
    } catch (error) {
      return handleError(thunkAPI, error);
    }
  }
);

export const fetchCommunityEamilTemplate = createAsyncThunk(
  "settings/fetchCommunityEamilTemplate",
  async (_, thunkAPI) => {
    try {
      const response = await API.get(`${namespace}/email/templates`);
      return response.data;
    } catch (error) {
      return handleError(thunkAPI, error);
    }
  }
);

export const updateCommunityEamilTemplate = createAsyncThunk(
  "settings/updateCommunityEamilTemplate",
  async ({parentIdx, formData}, thunkAPI) => {
    try {
      const response = await API.post(`${namespace}/email/template/${formData.event}`, {
        status: formData.status,
        heading: formData.heading,
        subject: formData.subject,
        template: formData.template
      });
      thunkAPI.dispatch(
        showNotification({
          message: __("Email template settings updated successfully", "zencommunity"),
          isShow: true,
          type: "success",
        })
      );
      return {parentIdx, data: response.data};
    } catch (error) {
      return handleError(thunkAPI, error);
    }
  }
);

const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    data: {},
    email: {},
    welcome_banner: {},
    welcome_banner_loading: false,
    email_template: [],
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommunitySettings.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCommunitySettings.fulfilled, (state, { payload }) => {
        state.data = payload;
        state.status = "succeeded";
      })
      .addCase(fetchCommunitySettings.rejected, (state, { payload }) => {
        state.status = "failed";
        state.error = payload;
      })
      .addCase(updateCommunitySettings.fulfilled, (state, { payload }) => {
        state.data = payload;
      })
      .addCase(fetchCommunityEamilGeneralSettings.fulfilled, (state, { payload }) => {
        state.email = payload;
      })
      .addCase(updateCommunityEamilGeneralSettings.fulfilled, (state, { payload }) => {
        state.email = payload;
      })
      .addCase(fetchCommunityEamilTemplate.fulfilled, (state, { payload }) => {
        state.email_template = payload;
      })
      .addCase(updateCommunityEamilTemplate.fulfilled, (state, { payload }) => {
        const { parentIdx, data } = payload
        state.email_template[parentIdx].events = state.email_template[parentIdx].events.map(item => {
          if(Number(item.id) === Number(data.id)) {
            return {...item, ...data}
          }
          return item;
        });
      })
      .addCase(fetchWelcomeBannerSettings.pending, (state, { payload }) => {
        state.welcome_banner_loading = true
      })
      .addCase(fetchWelcomeBannerSettings.fulfilled, (state, { payload }) => {
        state.welcome_banner = payload
        state.welcome_banner_loading = false
      })
      .addCase(fetchWelcomeBannerSettings.rejected, (state) => {
        state.welcome_banner_loading = false
      })
      .addCase(updateWelcomeBannerSettings.fulfilled, (state, { payload }) => {
        state.welcome_banner = payload
      });
  },
});

export default settingsSlice.reducer;