import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { takeBootstrapValue } from '@Utils/bootstrap';
import { __ } from "@wordpress/i18n";
import { API, handleSliceError, handleSliceSuccess, namespace } from "@Utils/helper";

export const fetchAllCollection = createAsyncThunk('community/fetchAllCollection', async (arg, thunkAPI) => {
    try {
        const { page, per_page, search } = arg || {};
        const query = [];
        if (page) query.push(`page=${page}`);
        if (per_page) query.push(`per_page=${per_page}`);
        if (search) query.push(`search=${encodeURIComponent(search)}`);
        const url = `${namespace}/categories${query.length ? `?${query.join('&')}` : ''}`;
        const response = await API.get(url);
        return response.data;
    } catch (error) {
        return handleSliceError(thunkAPI, error);
    }
});

export const fetchCollectionTree = createAsyncThunk('community/fetchCollectionTree', async (thunkAPI) => {
    try {
        const preloaded = await takeBootstrapValue('group_tree');

        if (undefined !== preloaded) return preloaded;

        const response = await API.get(namespace + '/category/group-tree')
        return response.data;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const fetchCollectionGroupsbyID = createAsyncThunk('community/fetchCollectionGroupsbyID', async (category_id, thunkAPI) => {
    try {
        const response = await API.get(namespace + `/category/${parseInt(category_id)}/groups`)
        return response.data;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const cerateCollection = createAsyncThunk('community/cerateCollection', async (formData, thunkAPI) => {
    try {
        const response = await API.post(namespace + '/categories', formData);
        handleSliceSuccess(thunkAPI, "Collection created successfully");
        return response.data;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const updateCollection = createAsyncThunk('community/updateCollection', async (formData, thunkAPI) => {
    try {
        const response = await API.post(namespace + '/category/'+ formData.id, formData);
        handleSliceSuccess(thunkAPI, "Collection created successfully");
        return formData;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const deleteCollection = createAsyncThunk('community/deleteCollection', async (id, thunkAPI) => {
    try {
        const response = await API.delete(namespace + `/category/${id}`);
        handleSliceSuccess(thunkAPI, "Collection deleted successfully");
        return id;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const sortCollections = createAsyncThunk('community/sortCollections', async (collections, thunkAPI) => {
    try {
        const sortedIds = collections.map(item => item.category.id);
        await API.post(namespace + `/categories/reorder`, {
            ids: sortedIds
        });
        return collections;
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

export const sortCollectionsGroups = createAsyncThunk('community/sortCollectionsGroups', async ({groups, id}, thunkAPI) => {
    try {
        const sortedIds = groups.map(item => item.id);
        await API.post(namespace + `/category/${id}/groups/reorder`, {
            ids: sortedIds
        });
        return {groups, id};
    } catch (error) {
        return handleSliceError(thunkAPI, error)
    }
});

const collectionSlice = createSlice({
    name: 'collection',
    initialState: {
        data: [],
        currentPage: null,
        totalPages: null,
        // Initialised so the create/update/delete reducers (which spread or
        // iterate menuOptions) stay safe even when a consumer only loads the
        // flat /categories list (the wp-admin Collections screen) and never
        // calls fetchCollectionTree, which is what otherwise populates this.
        menuOptions: [],
        // Separate "have we fetched yet?" flag — LeftSidebar used to gate its
        // fetchCollectionTree() call on `!menuOptions`, which broke the moment
        // menuOptions defaulted to [] instead of undefined (an empty array is
        // truthy, so that check silently stopped firing and the sidebar's
        // Collections section never loaded).
        menuOptionsLoaded: false,
    },
    reducers: {

    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllCollection.fulfilled, (state, { payload }) => {
                state.data = payload.records;
                state.page = payload.page;
                state.currentPage = payload.page;
                state.per_page = payload.per_page;
                state.totalPages = payload.pages;
                state.total = payload.total;
            })
            .addCase(cerateCollection.fulfilled, (state, action) => {
                state.data = [...state.data, action.payload];
                state.menuOptions = [...state?.menuOptions, { category: action.payload, groups: [] }];
            })
            .addCase(updateCollection.fulfilled, (state, action) => {
                // Replace the edited record in place — appending it duplicated
                // the id, which triggered a React "two children with the same
                // key" warning in any list rendering state.data.
                state.data = state.data.map(item =>
                    Number(item.id) === Number(action.payload.id) ? { ...item, ...action.payload } : item
                );
                state.menuOptions = (state.menuOptions || []).map(item => {
                    if(Number(item.category.id) === Number(action.payload.id)) {
                        return {...item, category: action.payload}
                    } return item;
                });
            })
            .addCase(fetchCollectionTree.fulfilled, (state, action) => {
                state.menuOptions = action.payload.result;
                state.member_group_ids_map = action.payload.member_group_ids_map;
                state.menuOptionsLoaded = true;
            })
            .addCase(fetchCollectionGroupsbyID.fulfilled, (state, { payload }) => {
                const { records, ...rest } = payload;
                state.collectionGroups = {
                    ...rest,
                    data: records,
                }
            })
            .addCase(deleteCollection.fulfilled, (state, { payload }) => {
                state.menuOptions = state.menuOptions.filter(
                    item => Number(item.category.id) !== Number(payload)
                );
            })
            .addCase(sortCollections.fulfilled, (state, { payload }) => {
                state.menuOptions = payload;
            })
            .addCase(sortCollectionsGroups.fulfilled, (state, { payload }) => {
                state.menuOptions = state.menuOptions.map(item => {
                    if(Number(item.category.id) === Number(payload.id)) {
                        return {
                            ...item,
                            groups: payload.groups
                        }
                    }
                    return item;
                });
            })
    },
})


export default collectionSlice.reducer;