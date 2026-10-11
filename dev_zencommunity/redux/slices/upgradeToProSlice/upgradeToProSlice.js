import { createSlice } from '@reduxjs/toolkit';

const upgradeToProSlice = createSlice({
	name: 'upgradetopro',
	initialState: {
		show_upgrade_modal: false,
	},
	reducers: {
		upgradeProModal: (state, actions) => {
			state.show_upgrade_modal = actions.payload;
		},
	},
});

export default upgradeToProSlice.reducer;
export const { upgradeProModal } = upgradeToProSlice.actions;
