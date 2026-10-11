import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API, handleSliceError, handleSliceSuccess, namespace } from "@Utils/helper";

// ?all=1 - this is the admin Sidebar settings screen, which needs disabled
// widgets listed too so they can be managed. The frontend RightSidebar calls
// the same route directly without this param (active-only), including for an
// admin browsing their own live site.
export const fetchSidebarWidgets = createAsyncThunk('community/fetchSidebarWidgets', async (_, thunkAPI) => {
  try {
    const response = await API.get(namespace + '/sidebar-widgets', { params: { all: 1 } });
    return response.data;
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const addSidebarWidget = createAsyncThunk(
  'community/addSidebarWidget',
  async (widget, thunkAPI) => {
    try {
      const response = await API.post(`${namespace}/sidebar-widgets`, widget);
      return response.data.widget;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const updateSidebarWidget = createAsyncThunk(
  'community/updateSidebarWidget',
  async ({ id, ...data }, thunkAPI) => {
    try {
      const response = await API.post(`${namespace}/sidebar-widgets/item/${id}`, data);
      handleSliceSuccess(thunkAPI, "Widget updated successfully");
      return response.data.widget;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const deleteSidebarWidget = createAsyncThunk(
  'community/deleteSidebarWidget',
  async (id, thunkAPI) => {
    try {
      await API.delete(`${namespace}/sidebar-widgets/item/${id}`);
      handleSliceSuccess(thunkAPI, "Widget removed successfully");
      return id;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const reorderSidebarWidgets = createAsyncThunk(
  'community/reorderSidebarWidgets',
  async (reorderedItems, thunkAPI) => {
    const ordered_ids = reorderedItems.map((item) => item.id);
    try {
      await API.post(`${namespace}/sidebar-widgets/reorder`, { ordered_ids });
      return reorderedItems;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

const sidebarWidgetsSlice = createSlice({
  name: 'sidebarWidgets',
  initialState: {
    items: [],
    loaded: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSidebarWidgets.fulfilled, (state, { payload }) => {
        state.items = payload || [];
        state.loaded = true;
      })
      .addCase(addSidebarWidget.fulfilled, (state, { payload }) => {
        if (payload) state.items.push(payload);
      })
      .addCase(updateSidebarWidget.fulfilled, (state, { payload }) => {
        if (!payload) return;
        const index = state.items.findIndex((item) => item.id === payload.id);
        if (index !== -1) state.items[index] = payload;
      })
      .addCase(deleteSidebarWidget.fulfilled, (state, { payload: id }) => {
        state.items = state.items.filter((item) => item.id !== id);
      })
      .addCase(reorderSidebarWidgets.fulfilled, (state, { payload }) => {
        if (payload) state.items = payload;
      });
  },
});

export default sidebarWidgetsSlice.reducer;
