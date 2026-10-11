import { configureStore } from '@reduxjs/toolkit';

import authReducer from './slices/authSlice/authSlice';
import notificationReducer from './slices/notificationSlice/notificationSlice';
import collectionReducer from './slices/collectionSlice/collectionSlice';
import groupReducer from './slices/groupSlice/groupSlice';
import membersReducer from './slices/membersSlice/membersSlice';
import settingsReducer from './slices/settingsSlice/settingsSlice';
import menuReducer from './slices/MenuSlice/MenuSlice';
import sidebarWidgetsReducer from './slices/sidebarWidgetsSlice/sidebarWidgetsSlice';
import userManageReducer from './slices/userManageSlice/userMangeSlice';
import ticketSlice from './slices/ticketSlice/ticketSlice';
import chatReducer from './slices/chatSlice/chatSlice';
import tickerReducer from './slices/tickerSlice/tickerSlice';
import feedReducer from './slices/feedSlice/feedSlice';
import addonReducer from './slices/addons/addonsSlice';
import supportLiveChatReducer from './slices/supportLiveChatSlice/supportLiveChatSlice';
import userNotificationReducer from './slices/userNotificationSlice/userNotificationSlice';
import upgradeToProReducer from './slices/upgradeToProSlice/upgradeToProSlice';
import aiAgentReducer from './slices/aiAgentSlice/aiAgentSlice';
import connectivityReducer from './slices/connectivitySlice/connectivitySlice';
import eventReducer from './slices/eventSlice/eventSlice';
import licenseReducer from './slices/licenseSlice/licenseSlice';
import chatHeadReducer from './slices/chatHeadSlice/chatHeadSlice';

import { createLogger } from 'redux-logger';

let middleware = [];
if (process.env.NODE_ENV !== 'production') {
	// Collapse entries, skip diffing, and ignore the high-frequency chat/poll
	// actions so the logger doesn't deep-clone the whole state tree on every tick.
	const noisyActions = [
		'addNewMessageInChat',
		'addNewMessageInGroupChat',
		'addNewMessageInSupportChat',
		'community/getSingleUserChat/fulfilled',
		'community/getSingleUserSupportChat/fulfilled',
		'community/getGroupMessage/fulfilled',
		'tickets/handleTicker/fulfilled',
	];
	const logger = createLogger({
		collapsed: true,
		diff: false,
		predicate: (getState, action) => !noisyActions.includes(action.type),
	});
	middleware = [logger];
}

const store = configureStore({
	reducer: {
		auth: authReducer,
        notification: notificationReducer,
        collections: collectionReducer,
        groups: groupReducer,
		members: membersReducer,
		settings: settingsReducer,
		menus: menuReducer,
		sidebarWidgets: sidebarWidgetsReducer,
		userManage: userManageReducer,
		tickets: ticketSlice,
		chats: chatReducer,
		ticker: tickerReducer,
		feeds: feedReducer,
		addons: addonReducer,
		supportLiveChat: supportLiveChatReducer,
		userNotifications: userNotificationReducer,
		upgradeToPro: upgradeToProReducer,
		aiAgent: aiAgentReducer,
		connectivity: connectivityReducer,
		events: eventReducer,
		license: licenseReducer,
		chatHead: chatHeadReducer,
    },
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware().concat(...middleware),
});

export default store;
