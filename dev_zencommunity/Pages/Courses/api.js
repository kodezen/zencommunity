import { API, namespace } from '@Utils/helper';

// Native-courses config injected by the academy-lms addon's `script_data` filter.
export const academyConfig = {
	enabled: false,
	storeengine: false,
	courses_archive: '',
	checkout_url: '',
	rest_base: 'academy/v1',
	checkout_mode: 'drawer',
	learn_mode: 'embed',
	allow_free_enroll: true,
	require_login: false,
	show_catalog: true,
	...(window?.ZencommunityGlobal?.academy || {}),
};

export const isCoursesEnabled = () => !!academyConfig.enabled;

// Global behavior settings (admin Settings → Academy LMS).
export const fetchAcademySettings = async () => {
	const { data } = await API.get(`${namespace}/academy/settings`);
	return data;
};

export const saveAcademySettings = async (settings) => {
	const { data } = await API.post(`${namespace}/academy/settings`, settings);
	return data;
};

export const fetchCourses = async ({ search = '', category = 0, page = 1, per_page = 12 } = {}) => {
	const { data } = await API.get(`${namespace}/academy/courses`, {
		params: { search, category, page, per_page },
	});
	return data; // { items, total, total_pages }
};

export const fetchCourseCategories = async () => {
	const { data } = await API.get(`${namespace}/academy/course-categories`);
	return data || [];
};

export const fetchCourse = async (id) => {
	const { data } = await API.get(`${namespace}/academy/course/${id}`);
	return data;
};

export const enrollFreeCourse = async (id) => {
	const { data } = await API.post(`${namespace}/academy/course/${id}/enroll`, {});
	return data; // { success, enroll_id, course }
};

export const fetchGroupCourses = async (groupId, { per_page = 50, page = 1 } = {}) => {
	const { data } = await API.get(`${namespace}/academy/group/${groupId}/courses`, {
		params: { per_page, page },
	});
	return data; // { items, total, total_pages }
};

export const fetchMemberCourses = async (userId, { per_page = 50, page = 1 } = {}) => {
	const { data } = await API.get(`${namespace}/academy/member/${userId}/courses`, {
		params: { per_page, page },
	});
	return data; // { items, total, total_pages }
};

export const fetchCourseQA = async (id, { per_page = 15, page = 1 } = {}) => {
	const { data } = await API.get(`${namespace}/academy/course/${id}/qa`, {
		params: { per_page, page },
	});
	return data; // { items, total, total_pages }
};

export const fetchCourseReviews = async (id, { per_page = 10, page = 1 } = {}) => {
	const { data } = await API.get(`${namespace}/academy/course/${id}/reviews`, {
		params: { per_page, page },
	});
	return data; // { items, total, total_pages, can_review, user_review }
};

export const submitCourseReview = async (id, { rating, review }) => {
	const { data } = await API.post(`${namespace}/academy/course/${id}/reviews`, { rating, review });
	return data; // { success, reviews }
};
