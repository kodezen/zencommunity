import { API, namespace } from '@Utils/helper';

// Gamification config injected by the gameengine addon's `script_data` filter.
export const gameengineConfig = {
	enabled: false,
	show_profile_panel: false,
	show_inline_chips: false,
	show_leaderboard: false,
	...(window?.ZencommunityGlobal?.gameengine || {}),
};

export const isGamificationEnabled = () => !!gameengineConfig.enabled;

export const fetchLeaderboard = async ({ page = 1, per_page = 20, period = 'all' } = {}) => {
	const { data } = await API.get(`${namespace}/gamification/leaderboard`, { params: { page, per_page, period } });
	return data; // { items, total, me }
};

export const fetchUserGamification = async (userId) => {
	const { data } = await API.get(`${namespace}/gamification/profile/${userId}`);
	return data;
};

export const fetchUserRanks = async (userId) => {
	const { data } = await API.get(`${namespace}/gamification/ranks/${userId}`);
	return data; // [{ id, title, icon, min_points, achieved, points_needed }]
};

export const fetchUserBadges = async (userId) => {
	const { data } = await API.get(`${namespace}/gamification/badges/${userId}`);
	return data; // [{ id, title, image, secret, earned, earned_at, required_points }]
};

export const fetchUserHistory = async (userId, { page = 1, per_page = 20 } = {}) => {
	const { data } = await API.get(`${namespace}/gamification/history/${userId}`, { params: { page, per_page } });
	return data; // { items, total }
};

export const fetchUserJourney = async (userId) => {
	const { data } = await API.get(`${namespace}/gamification/journey/${userId}`);
	return data; // [{ id, title, icon, type, status, restriction_message }]
};

export const fetchMyGamification = async () => {
	const { data } = await API.get(`${namespace}/gamification/me`);
	return data;
};

export const fetchGamificationSettings = async () => {
	const { data } = await API.get(`${namespace}/gamification/settings`);
	return data;
};

export const saveGamificationSettings = async (settings) => {
	const { data } = await API.post(`${namespace}/gamification/settings`, settings);
	return data;
};
