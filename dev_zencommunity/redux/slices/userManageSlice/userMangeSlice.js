import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API, handleSliceError, handleSliceSuccess, namespace } from "@Utils/helper";
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';

export const fetchAllUsers = createAsyncThunk(
  'users/fetchAllUsers',
  async ({ page = 1, per_page = 10, search = '', status = '', global_role = '', role = '' } = {}, thunkAPI) => {
    try {
    let params = {
			page,
			per_page,
		};
    if (search) {
			params = { ...params, search };
		}
    if (status) {
			params = { ...params, status };
		}
    if (global_role) {
			params = { ...params, global_role };
		}
    if (role) {
			params = { ...params, role };
		}
      const res = await API.get(`${namespace}/settings/users`, { params });
      return res.data;
    } catch (e) {
      return handleSliceError(thunkAPI, e);
    }
  }
);

export const fetchUserGroups = createAsyncThunk(
  'users/fetchUserGroups',
  async ({ user_id }, thunkAPI) => {
    try {
      const response = await API.get(`${namespace}/settings/user/${user_id}/groups`);
      return { user_id, groups: response.data };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const updateUserStatus = createAsyncThunk(
  'users/updateUserStatus',
  async ({ user_id, status }, thunkAPI) => {
    try {
      if (!['active', 'inactive', 'pending'].includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }
      const response = await API.post(`${namespace}/settings/user/${user_id}/${status}`);
      handleSliceSuccess(thunkAPI, "User status updated successfully");
      return { user_id, status, data: response.data };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

// Backfills a community profile for every WordPress user that doesn't have
// one yet (e.g. created directly in wp-admin, never visited the community
// frontend to get one lazily created) — see Profile::sync_missing_profiles().
// Deliberately a single call, not a loop-until-done: a user whose profile
// create() permanently fails (e.g. member registration disabled in Settings)
// would be re-selected by the backend on every retry, since nothing marks a
// failed attempt — looping here would hammer the server forever. `remaining`
// > 0 means more missing users exist than one batch covers; the UI asks the
// admin to click Sync again rather than retrying automatically.
export const syncWpUsers = createAsyncThunk(
  'users/syncWpUsers',
  async (_, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/settings/users/sync`);
      const { synced = 0, failed = 0, remaining = 0 } = res?.data || {};

      if (0 === synced && 0 === failed) {
        handleSliceSuccess(thunkAPI, 'All WordPress users are already synced.');
      } else if (failed > 0) {
        thunkAPI.dispatch(showNotification({
          message: `${synced} user(s) synced. ${failed} user(s) could not be synced — check the site's error log for the reason.`,
          isShow: true,
          type: 'error',
        }));
      } else {
        handleSliceSuccess(
          thunkAPI,
          remaining > 0
            ? `${synced} user(s) synced. ${remaining} more remain — click Sync again to continue.`
            : `${synced} user(s) synced to the community.`
        );
      }

      return { synced, failed, remaining };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData, thunkAPI) => {
    try {
      const response = await API.post(`${namespace}/settings/user/create`, userData);
      handleSliceSuccess(thunkAPI, "User created successfully");
      return response?.data?.data;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const changeMemberRole = createAsyncThunk(
  'users/changeMemberRole',
  async ({ group_id, id, role }, thunkAPI) => {
    try {
      const response = await API.post(`${namespace}/group/${group_id}/change-member-role`, { id, role });
      handleSliceSuccess(thunkAPI, "Member role updated successfully");
      return { group_id, user_id: id, role, data: response.data };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const addMemberToGroup = createAsyncThunk(
  'users/addMemberToGroup',
  async ({ group_id, id, role, status }, thunkAPI) => {
    try {
      const response = await API.post(`${namespace}/group/${group_id}/add-member`, { id, role, status });
      handleSliceSuccess(thunkAPI, "Member added to group successfully");
      return { user_id: id, role, data: response.data };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);
export const removeMemberFromGroup = createAsyncThunk(
  'users/removeMemberFromGroup',
  async ({ group_id, id }, thunkAPI) => {
    try {
      const response = await API.post(`${namespace}/group/${group_id}/remove-member`, { id });
      handleSliceSuccess(thunkAPI, "Member removed from group successfully");
      return { group_id, user_id: id };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async ({ user_id }, thunkAPI) => {
    try {
      const response = await API.delete(`${namespace}/member/${user_id}`);
      handleSliceSuccess(thunkAPI, "User deleted successfully");
      return { user_id };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

const GLOBAL_ROLE_LABELS = {
  support_agent: 'Support Agent',
  developer: 'Developer',
};

// Generic add/remove for any global role (support_agent, developer, ...) via
// the shared /ticket/support-stuff/{user_id}/roles endpoint, which validates
// the role against RoleManager::roles() rather than special-casing one role.
export const updateAndRemoveGlobalRole = createAsyncThunk(
  'users/updateAndRemoveGlobalRole',
  async ({ user_id, checked, payload }, thunkAPI) => {
    try {
      const roleLabel = GLOBAL_ROLE_LABELS[payload.role] || payload.role;
      const message = payload.action === "add"
          ? `User added as a ${roleLabel} successfully`
          : `User removed as a ${roleLabel} successfully`
      const response = await API.post(
        `${namespace}/ticket/support-stuff/${user_id}/roles`,{ ...payload }
      );
      handleSliceSuccess(
        thunkAPI,
        message
      );

      return { user_id, role: payload.role, action: payload.action, checked };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

// Back-compat alias for existing call sites; prefer updateAndRemoveGlobalRole
// for new code that may target a role other than support_agent.
export const updateAndRemoveSupportAgent = updateAndRemoveGlobalRole;


const userManageSlice = createSlice({
  name: 'userManage',
  initialState: {
    totalUsers: null,
    totalPages: null,
    currentPage: null,
    perPageUsers: null,
    users: [],
    userGroups: [],
    statusCounts: null,
  },
  reducers: {
    updateUserGroup : (state ,action) =>{
      if(state.users.length > 0){
        const fakeArr = state.users.map(( item )=>({
          id: item.user_id,
          subArray: []
        }))
        state.userGroups = fakeArr;
      }
    } 
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.fulfilled, (state, { payload }) => {
        state.users = payload.records;
        state.totalPages = payload.pages;
        state.totalUsers = payload.total;
        state.currentPage = payload.page;
        state.perPageUsers = payload.per_page;
        if (payload.counts) {
          state.statusCounts = payload.counts;
        }
      })
      .addCase(fetchUserGroups.fulfilled, (state, { payload }) => {
        const foundUserGroup = state.userGroups.find(item => item.id === payload.user_id);
        if (foundUserGroup) {
          foundUserGroup.subArray = payload.groups;
        }
      })
      .addCase(updateUserStatus.fulfilled, (state, { payload }) => {
        const { user_id, status, data } = payload;
        const foundUser = state.users.find(user => user.user_id === user_id);
        if (!foundUser?.roles) {
          foundUser.roles = [];
        }
        foundUser.status = status;
      })
      .addCase(createUser.fulfilled, (state, { payload }) => {
        state.users = [payload, ...state.users];
      })
      .addCase(changeMemberRole.fulfilled, (state, { payload }) => {
        const { group_id, user_id, role } = payload;
        const groupIndex = state.userGroups.findIndex(item => item.id === user_id);
        const currentGroup = state.userGroups[groupIndex].subArray.find(item => item.id === group_id)
        currentGroup.group_role = role;
        let roleArr = state.userGroups[groupIndex].subArray.map(item => item.group_role);
        roleArr = [...new Set(roleArr)];

        const foundUser = state.users.find(user => user.user_id === user_id);
        if (!foundUser?.roles) {
          foundUser.roles = [];
        }
        foundUser.roles = roleArr;
      })
      .addCase(addMemberToGroup.fulfilled, (state, { payload }) => {
        const { user_id, role } = payload;
        
        const foundUser = state.users.find(user => user.user_id === user_id);
        if (!foundUser?.roles) {
          foundUser.roles = [];
        }
        foundUser.roles = [...foundUser.roles, role];
      })
      .addCase(removeMemberFromGroup.fulfilled, (state, { payload }) => {
        const { user_id, group_id } = payload;
        
        const groupIndex = state.userGroups.findIndex(item => item.id === user_id);
        state.userGroups[groupIndex].subArray = state.userGroups[groupIndex].subArray.filter((group) => Number(group.id) !== Number(group_id));
      })
      .addCase(deleteUser.fulfilled, (state, { payload }) => {
        const { user_id } = payload;
        const foundUser = state.users.find(user => user.user_id === user_id);
        if (!foundUser?.roles) {
          foundUser.roles = [];
        }
        if (foundUser) {
          state.users = state.users.filter((user) => Number(user.id) !== Number(user_id));
        }
      })
      .addCase(updateAndRemoveGlobalRole.fulfilled, (state, action) => {
        const { user_id, role, checked } = action.payload;
        state.users = state.users.map((user) =>{
          if (Number(user_id) === Number(user.user_id)) {
            return {
              ...user,
              global_roles : {
                ...user.global_roles,
                [role]: checked
               }
            }
          }
          return user;
        })
    })
  },
});
export const {updateUserGroup} = userManageSlice.actions;

export default userManageSlice.reducer;