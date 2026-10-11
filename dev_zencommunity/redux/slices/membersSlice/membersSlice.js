import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { __ } from "@wordpress/i18n";
import { API, namespace, plugin_root_url, site_url, getDisplayName } from "@Utils/helper";
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

export const fetchAllMembers = createAsyncThunk("members/fetchAllMembers", async ({ searchKey = "", per_page = 100, page = 1 }, thunkAPI) => {
  try {
    const response = await API.get(`${namespace}/members?page=${page}&per_page=${per_page}&search=${searchKey}`);
    return {
      data: response.data.records,
      page: response.data.page,
      pages: response.data.pages,
      per_page: response.data.per_page,
      total: response.data.total,
    };
  } catch (error) {
    return handleError(thunkAPI, error);
  }
});

export const fetchSearchedMembers = createAsyncThunk("members/fetchSearchedMembers", async ({ searchKey = "" }, thunkAPI) => {
  try {
    const response = await API.get(`${namespace}/members?search=${searchKey}&per_page=50`);
    return response.data.records;
  } catch (error) {
    return handleError(thunkAPI, error);
  }
});

export const fetchCurrentUser = createAsyncThunk("members/fetchCurrentUser", async (_, thunkAPI) => {
  try {
    const response = await API.get(`${namespace}/member/profile`);
    return response.data;
  } catch (error) {
    return handleError(thunkAPI, error);
  }
});

export const updateCurrentUser = createAsyncThunk("members/updateCurrentUser", async (formData, thunkAPI) => {
  try {
    const response = await API.post(`${namespace}/member/profile`, formData);
    thunkAPI.dispatch(
      showNotification({
        message: __("Profile updated successfully", "zencommunity"),
        isShow: true,
        type: "success",
      })
    );
    return response.data;
  } catch (error) {
    return handleError(thunkAPI, error);
  }
});

export const deleteCurrentUser = createAsyncThunk("members/deleteCurrentUser", async (_, thunkAPI) => {
  try {
    await API.delete(`${namespace}/member/profile`);
    thunkAPI.dispatch(
      showNotification({
        message: __("Profile deleted successfully", "zencommunity"),
        isShow: true,
        type: "success",
      })
    );
    return true;
  } catch (error) {
    return handleError(thunkAPI, error);
  }
});

export const fetchMemberById = createAsyncThunk("members/fetchMemberById", async (id, thunkAPI) => {
  try {
    const response = await API.get(`${namespace}/member/${id}`);
    return response.data;
  } catch (error) {
    return handleError(thunkAPI, error);
  }
});

export const updateMemberById = createAsyncThunk("members/updateMemberById", async ({ id, formData }, thunkAPI) => {
  try {
    const response = await API.post(`${namespace}/member/${id}`, formData);
    thunkAPI.dispatch(
      showNotification({
        message: __("Member updated successfully", "zencommunity"),
        isShow: true,
        type: "success",
      })
    );
    return response.data;
  } catch (error) {
    return handleError(thunkAPI, error);
  }
});

export const deleteMemberById = createAsyncThunk("members/deleteMemberById", async (id, thunkAPI) => {
  try {
    await API.delete(`${namespace}/member/${id}`);
    thunkAPI.dispatch(
      showNotification({
        message: __("Member deleted successfully", "zencommunity"),
        isShow: true,
        type: "success",
      })
    );
    return id;
  } catch (error) {
    return handleError(thunkAPI, error);
  }
});

const membersSlice = createSlice({
  name: "members",
  initialState: {
    all: [],
    totalMembers: 0,
    currentUser: null,
    mentionFormatData: []
  },
  reducers: {
    followMember: (state, action) => {
      state.all = state.all.map(item => {
        if(Number(item.id) === Number(action.payload.id)) {
          return {
            ...item,
            is_following: action.payload.isFollowing
          }
        }
        return item;
      })
    },
    removeMemberBadge: (state, action) => {
      state.all = state.all.map(item => {
        if (Number(item.id) === Number(action.payload.id)) {
          return {
            ...item,
            badges: (item.badges || []).filter((b) => Number(b.id) !== Number(action.payload.badgeId))
          }
        }
        return item;
      })
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllMembers.fulfilled, (state, { payload }) => {
        state.totalMembers = payload.total;
        if (payload.page === 1) {
          state.all = payload.data;
          state.mentionFormatData = state.all.map(item => {
            return {
              key: getDisplayName(item),
              value: item.username,
              id: parseInt(item.id),
              pronoun: item.meta?.pronouns,
              avatar: item.avatar_url ? site_url + item.avatar_url : plugin_root_url + "/assets/images/avatar_placeholder.png"
            }
          })
          return;
        };
        state.all = [...state.all, ...payload.data];
        state.mentionFormatData = state.all.map(item => {
          return {
            key: getDisplayName(item),
            value: item.username,
            id: parseInt(item.id),
            pronoun: item.meta?.pronouns,
            avatar: item.avatar_url ? site_url + item.avatar_url : plugin_root_url + "/assets/images/avatar_placeholder.png"
          }
        })
      })
      .addCase(fetchSearchedMembers.fulfilled, (state, { payload }) => {
        if(payload.length === 0) return;
        state.all = [...state.all, payload];
        const mergeData = [...state.mentionFormatData, ...payload.map(item => {
          return {
            key: getDisplayName(item),
            value: item.username,
            id: parseInt(item.id),
            pronoun: item.meta?.pronouns,
            avatar: item.avatar_url ? site_url + item.avatar_url : plugin_root_url + "/assets/images/avatar_placeholder.png"
          }
        })]
        const uniqueArray = [...new Set(mergeData)];
        state.mentionFormatData = uniqueArray;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, { payload }) => {
        state.currentUser = payload;
      })
      .addCase(updateCurrentUser.fulfilled, (state, { payload }) => {
        state.currentUser = payload;
      })
      .addCase(deleteCurrentUser.fulfilled, (state) => {
        state.currentUser = null;
      })
      .addCase(fetchMemberById.fulfilled, (state, { payload }) => {
        state.all = state.all.map(item => {
          if (Number(item.id) === Number(payload.id)) {
            return { ...item, ...payload };
          }
          return item;
        })
      })
      .addCase(updateMemberById.fulfilled, (state, { payload }) => {
        state.all = state.all.map((member) =>
          Number(member.id) === Number(payload.id) ? { ...member, ...payload } : member
        );
      })
      .addCase(deleteMemberById.fulfilled, (state, { payload: id }) => {
        state.all = state.all.filter((member) => Number(member.id) !== Number(id));
      });
  },
});

export default membersSlice.reducer;
export const { followMember, removeMemberBadge } = membersSlice.actions;