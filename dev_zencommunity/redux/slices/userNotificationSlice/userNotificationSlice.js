import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { API, handleSliceError, namespace } from "@Utils/helper";

// `filter`: 'all' | 'unread' | 'read' — sent as the endpoint's `status`
// param (0 = unread, 1 = read, omitted = all).
const FILTER_STATUS = { unread: 0, read: 1 };

export const fetchAllNotifications = createAsyncThunk(
	"community/fetchAllNotifications",
	async ({ filter = 'all' } = {}, thunkAPI) => {
		try {
			const status = FILTER_STATUS[filter];
			const res = await API.get(`${namespace}/member/notifications`, {
				params: status === undefined ? {} : { status },
			});
			return res?.data;
		} catch (e) {
			return handleSliceError(thunkAPI, e);
		}
	}
);

export const markNotificationAsRead = createAsyncThunk(
	"community/markNotificationAsRead",
	async ({notification_id, is_read }, thunkAPI) => {
		try {
			const params = {
				notification_id, is_read
			}
			await API.post(`${namespace}/member/notifications`, {
				...params
			});
			return {notification_id, is_read};
		} catch (e) {
			return handleSliceError(thunkAPI, e);
		}
	}
);

const userNotificationSlice = createSlice( {
	name: 'userNotification',
	initialState: {
		page: 0,
		per_page: 0,
		total: 0,
		records: [],
		unread: 0,
		filter: 'all'
	},
	reducers: {
		socketNotification: (state, { payload }) => {
			// A live-pushed item is always unread. Prepending it unconditionally
			// used to corrupt a 'read'-filtered view the moment one arrived
			// while it was open — the list would silently gain an unread item,
			// which is exactly what the 'all' view looks like, even though the
			// Read tab stayed visually selected. 'unread' and 'all' both
			// legitimately include it; only 'read' has to skip it.
			if (state.filter !== 'read') {
				state.records = [{...payload, is_read: "0"}, ...state.records];
			}
			state.unread = state.unread > 0 ? parseInt(state.unread) + 1 : state.unread;
		}
	},
	extraReducers: (builder) => {
		// Only the latest request may write: a slow poll for the previous
		// filter must not overwrite the list after the filter changes.
		builder.addCase(fetchAllNotifications.pending, (state, { meta }) => {
			state.latestRequestId = meta.requestId;
			state.filter = meta.arg?.filter || 'all';
		});
		builder.addCase(fetchAllNotifications.fulfilled, (state, { payload, meta }) => {
			if (state.latestRequestId && meta.requestId !== state.latestRequestId) return;
			state.page = payload.page;
			state.per_page = payload.per_page;
			state.total = payload.total;
			state.records = payload.records;
			state.unread = payload.unread;
		});
		builder.addCase(markNotificationAsRead.fulfilled, (state, { payload }) => {
			const nextRead = `${payload.is_read}`;
			let wasUnread = false;
			state.records = state.records.map(item => {
				if(parseInt(item.id) === parseInt(payload.notification_id)) {
					wasUnread = item.is_read !== "1";
					return {
						...item,
						is_read: nextRead
					}
				}
				return item;
			});
			const willBeUnread = nextRead !== "1";
			if (wasUnread && !willBeUnread) {
				state.unread = Math.max(0, parseInt(state.unread) - 1);
			} else if (!wasUnread && willBeUnread) {
				state.unread = parseInt(state.unread) + 1;
			}
		});
	}
} );

export const { socketNotification } = userNotificationSlice.actions;
export default userNotificationSlice.reducer;
