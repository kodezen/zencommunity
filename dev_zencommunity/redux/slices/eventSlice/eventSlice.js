import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { API, handleSliceError, namespace } from '@Utils/helper';

export const fetchGroupEvents = createAsyncThunk(
  'events/fetchGroupEvents',
  async ({ groupId, filter = 'upcoming', page = 1, per_page = 10 }, thunkAPI) => {
    try {
      const res = await API.get(
        `${namespace}/group/${groupId}/events?filter=${filter}&page=${page}&per_page=${per_page}`
      );
      return { data: res.data, filter, page };
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async ({ groupId, data }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/group/${groupId}/events`, data);
      return res.data;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async ({ eventId, data }, thunkAPI) => {
    try {
      const res = await API.patch(`${namespace}/event/${eventId}`, data);
      return res.data;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (eventId, thunkAPI) => {
    try {
      await API.delete(`${namespace}/event/${eventId}`);
      return eventId;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const rsvpEvent = createAsyncThunk(
  'events/rsvpEvent',
  async ({ eventId, status }, thunkAPI) => {
    try {
      const res = await API.post(`${namespace}/event/${eventId}/rsvp`, { status });
      return res.data;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

export const removeRsvp = createAsyncThunk(
  'events/removeRsvp',
  async (eventId, thunkAPI) => {
    try {
      const res = await API.delete(`${namespace}/event/${eventId}/rsvp`);
      return res.data;
    } catch (error) {
      return handleSliceError(thunkAPI, error);
    }
  }
);

const eventSlice = createSlice({
  name: 'events',
  initialState: {
    events: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroupEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupEvents.fulfilled, (state, action) => {
        state.loading = false;
        const { data, page } = action.payload;
        const records = data?.records ?? [];
        state.events = page > 1 ? [...state.events, ...records] : records;
      })
      .addCase(fetchGroupEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.events = [action.payload, ...state.events];
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        state.events = state.events.map((e) =>
          parseInt(e.id) === parseInt(action.payload.id) ? action.payload : e
        );
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(
          (e) => parseInt(e.id) !== parseInt(action.payload)
        );
      })
      .addCase(rsvpEvent.fulfilled, (state, action) => {
        state.events = state.events.map((e) =>
          parseInt(e.id) === parseInt(action.payload.id) ? action.payload : e
        );
      })
      .addCase(removeRsvp.fulfilled, (state, action) => {
        state.events = state.events.map((e) =>
          parseInt(e.id) === parseInt(action.payload.id) ? action.payload : e
        );
      });
  },
});

export default eventSlice.reducer;
