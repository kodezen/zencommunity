import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { takeBootstrapValue } from '@Utils/bootstrap';
import { __ } from "@wordpress/i18n";
import { API, handleSliceError, handleSliceSuccess, namespace } from "@Utils/helper";

/**
 * Put each item's icon back where the components expect it.
 *
 * The same handful of inline SVGs repeat across the primary, top and profile
 * menus — the endpoint sends each one once, under `icons`, and points items at
 * it with `icon.ref`. Resolving that here means nothing downstream has to know:
 * every menu item still arrives with `icon.src`, as it always did.
 */
const withResolvedIcons = (payload) => {
  const icons = payload?.icons;

  if (!icons) return payload;

  const resolved = {};

  Object.entries(payload).forEach(([key, menu]) => {
    if (key === 'icons') return;

    resolved[key] = Array.isArray(menu?.items)
      ? {
          ...menu,
          items: menu.items.map((item) =>
            item?.icon?.ref
              ? { ...item, icon: { ...item.icon, src: icons[item.icon.ref] ?? '' } }
              : item
          ),
        }
      : menu;
  });

  return resolved;
};

export const fetchAllMenus = createAsyncThunk('community/fetchAllMenus', async (_, thunkAPI) => {
  try {
    const preloaded = await takeBootstrapValue('menus');

    if (undefined !== preloaded) return withResolvedIcons(preloaded);

    const response = await API.get(namespace + '/menus');
    return withResolvedIcons(response.data);
  } catch (error) {
    return handleSliceError(thunkAPI, error);
  }
});

export const addMenuItem = createAsyncThunk(
  'community/addMenuItem',
  async ({ key, item }, thunkAPI) => {
    try {
      // response.data is the server-normalized item (with its generated id) —
      // the client-side `item` has no id yet, so it can't be used here.
      const response = await API.post(`${namespace}/menu/${key}/items`, item);
      handleSliceSuccess(thunkAPI, "Menu item added successfully");
      return { key, item: response.data };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

// Unlike updateMenuItem (which only ever works for link items — the
// backend's generic update endpoint rejects default items), this hits the
// type-agnostic active|deactive endpoint, so it works for default items
// (Feeds/Groups/Members/...) too.
export const updateMenuItemStatus = createAsyncThunk(
  'community/updateMenuItemStatus',
  async ({ key, id, status }, thunkAPI) => {
    try {
      await API.post(`${namespace}/menu/${key}/items/${id}/${status ? 'active' : 'deactive'}`);
      handleSliceSuccess(thunkAPI, "Menu item status updated successfully");
      return { key, id, status };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const updateMenuItem = createAsyncThunk(
  'community/updateMenuItem',
  async ({ key, id, item }, thunkAPI) => {
    try {
      const response = await API.post(`${namespace}/menu/${key}/items/${id}`, item);
      handleSliceSuccess(thunkAPI, "Menu item updated successfully");
      return { key, id, item: response.data };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

// Unlike updateMenuItem (POST .../items/{id}), this works for default items
// too — see MenuManager::update_item_roles() on the backend.
export const updateMenuItemRoles = createAsyncThunk(
  'community/updateMenuItemRoles',
  async ({ key, id, roles }, thunkAPI) => {
    try {
      await API.post(`${namespace}/menu/${key}/items/${id}/roles`, { roles });
      handleSliceSuccess(thunkAPI, "Menu item visibility updated successfully");
      return { key, id, roles };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const deleteMenuItem = createAsyncThunk(
  'community/deleteMenuItem',
  async ({ key, id }, thunkAPI) => {
    try {
      await API.delete(`${namespace}/menu/${key}/items/${id}`);
      handleSliceSuccess(thunkAPI, "Menu item deleted successfully");
      return { key, id };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const reorderMenuItems = createAsyncThunk(
  'community/reorderMenuItems',
  async ({ key, reorderedItems }, thunkAPI) => {
    const reorderedIDs = reorderedItems.map(item => item.id);
    try {
      await API.post(`${namespace}/menu/${key}/reorder`, { ordered_ids: reorderedIDs });
      handleSliceSuccess(thunkAPI, "Menu reordered successfully");
      return { key, reorderedItems };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

const MenuSlice = createSlice({
  name: 'menus',
  initialState: {
    primary_menu: false,
    profile_menu: false,
    top_menu: false,
    sidebar_bottom_links: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllMenus.fulfilled, (state, { payload }) => {
        state.primary_menu = payload.primary_menu;
        state.profile_menu = payload.profile_menu;
        state.top_menu = payload.top_menu;
        state.sidebar_bottom_links = payload.sidebar_bottom_links;
      })

      .addCase(addMenuItem.fulfilled, (state, { payload }) => {
        const { key, item } = payload;
        if (!state[key].items) state[key].items = [];
        state[key].items.push(item);
      })

      .addCase(updateMenuItem.fulfilled, (state, { payload }) => {
        const { key, id, item } = payload;
        if (state[key]?.items) {
          const index = state[key].items.findIndex(i => i.id === id);
          if (index !== -1) {
            state[key].items[index] = item;
          }
        }
      })

      .addCase(updateMenuItemStatus.fulfilled, (state, { payload }) => {
        const { key, id, status } = payload;
        const item = state[key]?.items?.find(i => i.id === id);
        if (item) {
          item.status = status;
        }
      })

      .addCase(updateMenuItemRoles.fulfilled, (state, { payload }) => {
        const { key, id, roles } = payload;
        const item = state[key]?.items?.find(i => i.id === id);
        if (item) {
          item.roles = roles?.length ? roles : null;
        }
      })

      .addCase(deleteMenuItem.fulfilled, (state, { payload }) => {
        const { key, id } = payload;
        if (state[key]?.items) {
          const index = state[key].items.findIndex(i => i.id === id);
          if (index !== -1) {
            state[key].items.splice(index, 1);
          }
        }
      })

      .addCase(reorderMenuItems.fulfilled, (state, { payload }) => {
        const { key, reorderedItems } = payload;
        if (state[key]) {
          state[key] = {
            ...state[key],
            items: reorderedItems,
          };
        }
      });

  },
});

export default MenuSlice.reducer;
