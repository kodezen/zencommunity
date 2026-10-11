import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { __ } from "@wordpress/i18n";
import { API, handleSliceError, handleSliceSuccess, namespace } from "@Utils/helper";
import { groupPermissions } from "../authSlice/authSlice";

export const fetchAllGroups = createAsyncThunk("community/fetchAllGroups", async (arg, thunkAPI) => {
  try {
    const { page, per_page, search, type, privacy, category_id } = arg || {};
    const query = [];
    if (page) query.push(`page=${page}`);
    if (per_page) query.push(`per_page=${per_page}`);
    if (search) query.push(`search=${encodeURIComponent(search)}`);
    if (type) query.push(`type=${encodeURIComponent(type)}`);
    if (privacy) query.push(`privacy=${encodeURIComponent(privacy)}`);
    // 0 is a real value here (uncategorised), so only skip empty/undefined.
    if (category_id !== undefined && category_id !== null && category_id !== '') query.push(`category_id=${category_id}`);
    const url = `${namespace}/groups${query.length ? `?${query.join('&')}` : ''}`;
    const response = await API.get(url);
    return response.data;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const fetchGroupById = createAsyncThunk("community/fetchGroupById", async (id, thunkAPI) => {
  try {
    const response = await API.get(`${namespace}/group/${id}`);
    return response.data;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const createGroup = createAsyncThunk("community/createGroup", async ({ category_id, formData }, thunkAPI) => {
  try {
    const url = category_id ? `${namespace}/category/${category_id}/groups` : `${namespace}/category/0/groups`
    const response = await API.post(url, formData);
    handleSliceSuccess(thunkAPI, "Group created successfully");
    return response.data;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const updateGroup = createAsyncThunk("community/updateGroup", async ({ id, formData }, thunkAPI) => {
  try {
    const response = await API.post(`${namespace}/group/${id}`, formData);
    handleSliceSuccess(thunkAPI, "Group updated successfully");
    return response.data;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const deleteGroup = createAsyncThunk("community/deleteGroup", async (id, thunkAPI) => {
  try {
    await API.delete(`${namespace}/group/${id}`);
    handleSliceSuccess(thunkAPI, "Group deleted successfully");
    return id;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const reorderGroups = createAsyncThunk("community/reorderGroups", async ({ category_id, ids }, thunkAPI) => {
  try {
    const response = await API.post(`${namespace}/category/${category_id}/groups/reorder`, { ids });
    return response.data;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const fetchGroupMembers = createAsyncThunk("community/fetchGroupMembers", async (group_id, thunkAPI) => {
  try {
    const response = await API.get(`${namespace}/group/${group_id}/members`);
    return { group_id, members: response.data.records };
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const addGroupMember = createAsyncThunk("community/addGroupMember", async ({ group_id, user }, thunkAPI) => {
  try {
    const response = await API.post(`${namespace}/group/${group_id}/add-member`, user);
    return response.data;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const removeGroupMember = createAsyncThunk("community/removeGroupMember", async ({ group_id, id }, thunkAPI) => {
  try {
    await API.post(`${namespace}/group/${group_id}/remove-member`, { id });
    return id;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const changeGroupMemberRole = createAsyncThunk("community/changeGroupMemberRole", async ({ group_id, id, role }, thunkAPI) => {
  try {
    const response = await API.post(`${namespace}/group/${group_id}/change-member-role`, { id, role });
    return response.data;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const changeGroupMemberStatus = createAsyncThunk("community/changeGroupMemberStatus", async ({ group_id, id, status }, thunkAPI) => {
  try {
    const response = await API.post(`${namespace}/group/${group_id}/change-member-status`, { id, status });
    return response.data;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const joinGroup = createAsyncThunk("community/joinGroup", async (group_id, thunkAPI) => {
  try {
    const response = await API.post(`${namespace}/group/${group_id}/join`);
    // Old joinGroup code
    thunkAPI.dispatch(groupPermissions());
    // if (response.data?.status === 'active') {
    //   thunkAPI.dispatch(groupPermissions());
    // }
    return response.data;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const leaveGroup = createAsyncThunk("community/leaveGroup", async (group_id, thunkAPI) => {
  try {
    const response = await API.post(`${namespace}/group/${group_id}/leave`);

    thunkAPI.dispatch(groupPermissions());
    return response.data;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

const groupSlice = createSlice({
  name: "group",
  initialState: {
    data: [],
    currentPage: null,
    totalPages: null,
    groupsPerPage: null,
    totalGroups: null,
    groupMembers: {},
    groupFeeds: {
      data: [],
      currentPage: 1,
      totalPages: 1,
      feedsPerPage: 10,
      totalFeeds: 10
    }
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllGroups.fulfilled, (state, { payload }) => {
        state.data = payload.records;
        state.currentPage = payload.page;
        state.totalPages = payload.pages;
        state.groupsPerPage = payload.per_page;
        state.totalGroups = payload.total;
      })
      .addCase(fetchGroupById.fulfilled, (state, { payload }) => {
        state.data = [payload]
      })
      .addCase(createGroup.fulfilled, (state, { payload }) => {
        state.data = [payload, ...state.data];
      })
      .addCase(updateGroup.fulfilled, (state, { payload }) => {
        state.data = state.data.map(item => {
          if (Number(item.id) === Number(payload.id)) {
            return { ...item, ...payload };
          }
          return item;
        })
      })
      .addCase(deleteGroup.fulfilled, (state, { payload: id }) => {
        state.data = state.data.filter(group => Number(group.id) !== Number(id));
      })

      .addCase(fetchGroupMembers.fulfilled, (state, { payload }) => {
        state.groupMembers[payload.group_id] = payload.members;
      })

      .addCase(addGroupMember.fulfilled, (state, { payload }) => {
        state.groupMembers[payload.group_id] = { [payload.group_id]: payload.members, ...state.groupMembers[payload.group_id] };
      })

      .addCase(removeGroupMember.fulfilled, (state, { payload }) => {
        state.groupMembers[payload.group_id] = state.groupMembers[payload.group_id].filter(item => Number(item.id) !== Number(payload.id));
      })
  },
});

export default groupSlice.reducer;
