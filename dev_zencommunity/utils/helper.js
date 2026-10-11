import {showNotification} from '@Redux/slices/notificationSlice/notificationSlice';
import {__} from '@wordpress/i18n';
import axios from 'axios';
import { installGetDedupe } from './api-dedupe';
import {Navigate, useLocation} from 'react-router-dom';

export const {
	current_logged_user,
	is_logged_in,
	root,
	community_visibility,
	community_path,
	render_mode,
	is_fse_mode,
	allow_member_registration,
	enable_date_of_birth_field,
	override_wp_registration,
	wp_users_can_register,
	wp_general_settings_url,
	login_page,
	register_page,
	login_page_url,
	register_page_url,
	nonce,
	community_nonce,
	rest_url,
	ajaxurl,
	admin_dashboard_url,
	namespace,
	plugin_root_url,
	plugin_root_path,
	site_url,
	logo_url,
	route_path,
	is_plain_permalink,
	current_user_can,
	current_permalink,
	zenc_SOCKET,
	active_addons,
	global_roles,
	site_logo,
	site_logo_dark,
	show_cover_placeholder,
	is_pro_active,
	feed_types,
	is_block_theme,
	Ftion_position,
	license_page_url,
	is_academy_active,
	is_learndash_active,
	academy_nonce,
	learndash_nonce,
	google_auth_uri,
	google_login_status,
	notification_position,
	theme_settings,
	tutor_nonce,
	is_tutorlms_active,
	learnpress_nonce,
	is_learnpress_active,
	lifter_nonce,
	is_lifterlms_active,
	is_masterstudy_active,
	pass_reset_url,
	permitted_social_sites_for_link_sharing,
	feed_default_sort_by,
	// "Extend your Community" dashboard cards - installed/active state +
	// resolved "folder/file.php" identifier per Kodezen sister product,
	// computed server-side (see Assets::extend_product_status()) so the
	// dashboard doesn't depend on a client-side /wp/v2/plugins REST call.
	is_academy_installed,
	academy_plugin_file,
	is_ablocks_installed,
	is_ablocks_active,
	ablocks_plugin_file,
	is_storeengine_installed,
	is_storeengine_active,
	storeengine_plugin_file,
	is_gemcrm_installed,
	is_gemcrm_active,
	gemcrm_plugin_file,
	is_gemboards_installed,
	is_gemboards_active,
	gemboards_plugin_file,
	is_gameengine_installed,
	is_gameengine_active,
	gameengine_plugin_file,
	is_gembooking_installed,
	is_gembooking_active,
	gembooking_plugin_file,
	is_zaplane_installed,
	is_zaplane_active,
	zaplane_plugin_file,
	is_gemsecurity_installed,
	is_gemsecurity_active,
	gemsecurity_plugin_file,
	is_trueplayer_installed,
	is_trueplayer_active,
	trueplayer_plugin_file,
	max_upload_size,
	max_image_upload_size,
} = window?.ZencommunityGlobal;

// Single source of truth for "is the visitor authenticated?". Trusts WordPress's
// own session flag first, falling back to the community profile's user_id. This
// prevents a truthy-but-incomplete current_logged_user from rendering the guest UI.
export const isLoggedIn = !!(is_logged_in || current_logged_user?.user_id);

/**
 * A media path turned into a URL, or the fallback when there is no path.
 *
 * `site_url + avatar_url` reads as harmless until the value is null, at which
 * point JavaScript makes the string "https://kodezen.netnull" and the browser
 * spends a DNS lookup failing to resolve it. That is the ERR_NAME_NOT_RESOLVED
 * in the console on any page showing a member without an avatar.
 *
 * @param {string|null|undefined} path     Absolute URL, or a path on this site.
 * @param {string}                fallback Used when there is no path at all.
 * @return {string}
 */
export const media_url = ( path, fallback = '' ) => {
	if ( ! path || 'null' === path || 'undefined' === path ) {
		return fallback;
	}

	return String( path ).startsWith( 'http' ) ? String( path ) : site_url + path;
};

export const sortingListArray = [ 'created_at', 'updated_at', 'title', 'like_count', 'comment_count', 'id', 'trending', 'vote_score' ];

export const mediaFileUploader = async (object_type = "", file = null) => {
	if (!file) return;

	const formData = new FormData();
	formData.append('file', file);
	formData.append('media_type', object_type);

	try {
		const res = await axios.post(
			`${rest_url}${namespace}/media-upload`,
			formData,
			{
				headers: {
					'X-WP-Nonce': nonce,
				},
			}
		);
		return res.data;
	} catch (error) {
		console.error("Upload failed:", error);
		throw error;
	}
};

export const API = axios.create({
	baseURL: rest_url,
	withCredentials: true,
	headers: {
		'content-type': 'application/json',
		'X-WP-Nonce': nonce,
		'Cache-Control': 'no-cache', // Prevent caching
	},
});

// Optional JWT auth for headless / external clients: when a JWT is stored,
// send it as a Bearer token so any JWT plugin (e.g. Simple JWT Login) can
// authenticate the request. The in-site app keeps using cookies + nonce.
API.interceptors.request.use( ( config ) => {
	try {
		const jwt = localStorage.getItem( 'zc_jwt' );
		if ( jwt ) {
			config.headers = config.headers || {};
			config.headers['Authorization'] = `Bearer ${jwt}`;
		}
	} catch ( e ) {}
	return config;
} );

// Identical concurrent GETs share one request — see utils/api-dedupe.js.
installGetDedupe( API );

let refreshingNonce = null;

async function refreshNonce() {
	if ( !refreshingNonce ) {
		refreshingNonce = axios.get( ajaxurl + '?action=rest-nonce', {withCredentials: true} ).then( ( {data} ) => {
			API.defaults.headers['X-WP-Nonce'] = data;

			return data;
		} ).finally( () => {
			refreshingNonce = null;
		} );
	}

	return refreshingNonce;
}

API.interceptors.response.use( ( response ) => response, async ( error ) => {
	const {response, config} = error;
	if ( response && response.status === 403 && response.data?.code === 'rest_cookie_invalid_nonce' && !config._retry ) {
		config._retry = true;
		config.headers['X-WP-Nonce'] = await refreshNonce();
		return API( config );
	}
	return Promise.reject( error );
} );

export const generateSlug = (value) => {
	return value
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
};

export const generateRandomSlug = (length = 3) => {
	return (
		Math.random().toString(20).substr(2, length) +
		new Date().getMilliseconds()
	);
};

/**
 *
	const handleCopyLink = () => {
		const sharableLink = baseURL(`/feed/${singleFeedData?.id}`);
		copyToClipboard(sharableLink);
		dispatch(
			showNotification({
				message: __("Link copied", "zencommunity"),
				isShow: true,
				type: "success",
			})
		);
	};
 * **/

export const copyToClipboard = async (text) => {
	const textArea = document.createElement("textarea");
	textArea.value = text;
	document.body.appendChild(textArea);
	textArea.select();
	document.execCommand('copy');
	document.body.removeChild(textArea);
};

/**
 * Make AxiosError object.
 *
 * @param  message
 * @param  response
 * @param  code
 * @return {AxiosError}
 */
const makeAxiosError = (message, response, code = 'UNKNOWN') => {
	return new AxiosError(
		message,
		'ERR_' + (code ? code : 'UNKNOWN'),
		response.config,
		response.request,
		response
	);
};

/**
 * Process ajax error data and throw error.
 *
 * @param  data
 * @param  response
 *
 * @throws {Error|AxiosError}
 */
const processAjaxError = (data, response) => {
	if ('string' === typeof data) {
		throw new Error(data);
	}

	if (data && 'object' === typeof data && data?.message) {
		const error = new Error(data.message);
		if (data?.code) error.code = data.code;

		throw error;
	}

	if (
		data &&
		Array.isArray(data) &&
		data.length &&
		data[0].code &&
		data[0].message
	) {
		if (1 === data.length) {
			const error = new Error(data[0].message);
			error.code = data[0].code;

			throw error;
		}

		throw makeAxiosError(
			__(
				'Something went wrong. Please try again after sometime.',
				'zencommunity'
			),
			response
		);
	}

	throw new Error(
		__(
			'Something went wrong. Please try again after sometime.',
			'zencommunity'
		)
	);
};

/**
 * Send post request to WP ajax endpoint action.
 *
 * Send post request and throw if success false, enhancing error handling.
 *
 * @param {string}  action  Ajax Action name.
 * @param {Object}  payload Payload data
 * @param {boolean} [isRaw] Optional. If true will not stringify nested object. Default false (stringify nested object).
 * @return {Promise<any>}
 * @throws {Error|AxiosError}
 */
export const makeRequest = async (action, payload = {}, isRaw = false) => {
	const form_data = new FormData();

	form_data.append('action', `zencommunity/${action}`);
	if (!payload.security) {
		form_data.append('security', community_nonce);
	}

	Object.entries(payload).forEach(([key, value]) => {
		if (!isRaw && typeof value === 'object' && value !== null) {
			form_data.append(key, JSON.stringify(value));
		} else {
			form_data.append(key, value);
		}
	});

	const response = await axios.post(ajaxurl, form_data);
	const {
		data: { success, data },
	} = response;

	if (!success) {
		processAjaxError(data, response);
	}

	return data;
};

/**
 * Handles errors in Redux Toolkit slices by dispatching an error notification
 * and rejecting the promise with the error message.
 * 
 * @param {Object} thunkAPI - The Redux Toolkit ThunkAPI object containing dispatch and rejectWithValue
 * @param {Error|string} error - The error object or error message to handle
 * @returns {Object} The rejected promise with the error message as value
 * 
 * @example
 * try {
 *   // some async operation
 * } catch (error) {
 *   return handleSliceError(thunkAPI, error);
 * }
 */

export const handleSliceError = (thunkAPI, error, fireError = true) => {
	if (!fireError) return;
	if (error.status === 401 || error.status === 403) {
		thunkAPI.dispatch(
			showNotification({
				message: 'Please login to access to See content',
				isShow: true,
				type: "info",
			})
		);
	} else {
		thunkAPI.dispatch(
			showNotification({
				message: error?.response?.data?.message || error?.message,
				isShow: true,
				type: "error",
			})
		);
	}
	return thunkAPI.rejectWithValue(error.message);
};

/**
 * Handles successful operations in Redux Toolkit slices by dispatching a success notification.
 * 
 * @param {Object} thunkAPI - The Redux Toolkit ThunkAPI object containing dispatch
 * @param {string} message - The success message to display
 * @returns {void}
 * 
 * @example
 * try {
 *   // some async operation
 *   handleSliceSuccess(thunkAPI, "Operation completed successfully");
 * } catch (error) {
 *   // handle error
 * }
 */
export const handleSliceSuccess = (thunkAPI, message) => {
	thunkAPI.dispatch(
		showNotification({
			message: __(message, 'zencommunity'),
			isShow: true,
			type: "success",
		})
	);
};

export const runUploader = (config = {}) => {
	return new Promise((resolve) => {
		let frame; // eslint-disable-line
		// If the media frame already exists, reopen it.
		if (frame) {
			frame.open();
			return;
		}

		// Create a new media frame
		frame = wp.media({
			title: __('Select or Upload Media', 'zencommunity'),
			button: {
				text: __('Use this media', 'zencommunity'),
			},
			multiple: false, // Set to true to allow multiple files to be selected
			...config,
		});

		// When an image is selected in the media frame...
		frame.on('select', function () {
			return resolve(frame.state().get('selection').first().toJSON());
		});
		// Finally, open the modal on click
		frame.open();
	});
};

export const useQuery = () => {
	return new URLSearchParams(useLocation().search);
};

export const sliceString = (text, length = 20, more = '...') => {
	if (!text || text.length < length) {
		return text;
	}

	return text.slice(0, length).replace(/(^[\s]+|[\s]+$)/g, '') + more;
};

export const hideHtmlTags = (html) => {
	const div = document.createElement('div');
	div.innerHTML = html;
	return div.textContent || div.innerText || '';
};

// True when HTML/editor output has visible text (ignores empty <p>, &nbsp;).
export const hasVisibleText = (html) =>
	typeof html === 'string' && hideHtmlTags(html).replace(/\u00a0/g, ' ').trim() !== '';

// Ask before throwing away something the user wrote.
export const confirmDiscard = (message) =>
	window.confirm(message || __('You have unsaved changes. Discard them?', 'zencommunity'));

export const capitalizeFirstLetter = (string = '') => {
	const cleanedString = string.replace(/_/g, ' ');

	return cleanedString.charAt(0).toUpperCase() + cleanedString.slice(1);
};

export const getTranslatedStatus = (status) => {
	const statusLabel = {
		publish: __('Published', 'zencommunity'),
		future: __('Scheduled', 'zencommunity'),
		submitted: __('Submitted', 'zencommunity'),
		pending: __('Pending', 'zencommunity'),
		draft: __('Draft', 'zencommunity'),
		trash: __('Trash', 'zencommunity'),
		completed: __('Approved', 'zencommunity'),
		approved: __('Approve', 'zencommunity'),
		processing: __('Processing', 'zencommunity'),
		cancel: __('Cancel', 'zencommunity'),
		private: __('Private', 'zencommunity'),
		pass: __('Pass', 'zencommunity'),
		passed: __('Passed', 'zencommunity'),
		success: __('Success', 'zencommunity'),
		answered: __('Answered', 'zencommunity'),
		active: __('Active', 'zencommunity'),
		expired: __('Expired', 'zencommunity'),
		running: __('Running', 'zencommunity'),
		rejected: __('Rejected', 'zencommunity'),
		failed: __('Failed', 'zencommunity'),
	};

	return statusLabel[status];
};

const { isArray } = Array;

/**
 * Shows Notification toast.
 *
 * @param {string|[{code:string,message:string}]} message Message to show.
 * @param {'error'|'info'|'warning'|'success'}    [type]  [Optional] Notification type. Default type is `info`
 *
 * @param                                         suffix
 * @return void
 */
export const notification = (type, message, suffix = 'dashboard') => {
	let timer = null;
	let closeIn = 5000;

	if (!message) return;

	let icon = '';
	if (type === 'success') {
		icon = 'check';
	} else if (type === 'error') {
		icon = 'information';
	}

	type = ['success', 'warning', 'error', 'info'].includes(type)
		? type
		: 'info';

	const closeHandler = (e) => {
		e && e.preventDefault();
		notificationDiv.remove();
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	};

	const checkInterval = () => {
		closeIn -= 1000;
		if (closeIn <= 0) {
			closeHandler();
		}
	};

	const notificationDiv = document.createElement('div');
	notificationDiv.className = `zen-com-notification zen-com-notification--${suffix} ${type ? `zen-com-notification--${type}` : `zen-com-notification--success`
		}`;
	notificationDiv.setAttribute('aria-live', 'polite');
	notificationDiv.onmouseenter = () => clearInterval(timer);
	notificationDiv.onmouseleave = () =>
		(timer = setInterval(checkInterval, 1000));

	const messageParagraph = document.createElement('p');
	messageParagraph.className = 'zen-com-notification__message';
	messageParagraph.style.gap = '10px';

	if (Array.isArray(message) && message[0].code && message[0].message) {
		if (message.length === 1) {
			message = message[0].message;
		} else {
			const errors = [...message];
			message = '<ul class="zen-com-m-0" style="padding-left:1rem;">';
			for (const err of errors) {
				message += `<li><label class="error-msg" for="${err.code}">${err.message}</label></li>`;
			}

			message += '</ul>';
		}
	}

	messageParagraph.innerHTML = message;
	notificationDiv.appendChild(messageParagraph);

	const closeButton = document.createElement('button');
	closeButton.className = 'zen-com-btn zen-com-btn--bg-red';
	closeButton.style.padding = 0;
	closeButton.setAttribute('data-suffix', 'close-notification');
	closeButton.setAttribute('aria-label', __('Close', 'zencommunity'));
	closeButton.innerHTML = `<span class="zen-com-icon zen-com-icon--close" style="display:flex;" aria-hidden="true"></span>`;
	closeButton.onclick = closeHandler;

	notificationDiv.appendChild(closeButton);

	timer = setInterval(checkInterval, 1000);

	document.body.appendChild(notificationDiv);

	try {
		const links = document.querySelectorAll(
			'.zen-com-notification__message a'
		);
		for (const idx in links) {
			if (links[idx].href && '#' !== links[idx].href) {
				links[idx].target = '_blank';
			}
		}
	} catch (er) { }
};

//private routes redirect login page conditionally
export const PrivateRoutes = ({ children }) => {
	const location = useLocation();
	const isTicketsPage = location.pathname.startsWith("/tickets/");
	const isTicketDetailsPage = location.pathname.startsWith("/ticket/");

	// Where to send them once they are in. The router state was already being
	// passed along, but signin only reads `?redirect_to=`, so everyone arriving
	// at a page they had to log in for was dropped on the community home
	// afterwards - worst for someone who followed a link to one specific
	// ticket, which is the whole reason they signed in.
	const signInUrl = () => {
		try {
			return `/signin?redirect_to=${encodeURIComponent(baseURL(location.pathname + (location.search || '')))}`;
		} catch (e) {
			return '/signin';
		}
	};

	// Tickets always require an account, even when the community is public.
	if (!current_logged_user?.user_id && (isTicketsPage || isTicketDetailsPage)) {
		return <Navigate to={signInUrl()} state={{ from: location }} replace />;
	}
	if (current_logged_user?.user_id) {
		return children;
	}
	if (community_visibility === 'guest') {
		return children;
	}
	return <Navigate to={signInUrl()} state={{ from: location }} replace />;
};

export const emojis = [
	// Check / Success / OK
	"✅", "✔️", "☑️", "🟢", "👍", "👌", "🆗",

	//  Joyful
	"😂", "🤣", "😁", "😆", "😄", "😊", "😃", "🙂", "😺", "😎", "🥳", "🤩", "❤️", "😍", "🥰", "😘",

	// Neutral
	"😐", "😶", "😑", "🤔", "🤨", "🙃", "😒", "😬", "😕", "🫤",

	// Sad
	"😔", "😞", "😟", "🥺", "😢", "😭", "😩", "😫", "😓", "😿",

	// Angry
	"😤", "😠", "😡", "🤬", "💢", "👿", "☹️",

	// Cross / Error / Cancel
	"❌", "✖️", "🚫", "⛔", "👎", "🔴",

	// Stars / Highlights
	"⭐", "🌟", "✨", "💫", "🔥", "💯",

	// Warnings / Info
	"⚠️", "❗", "❓", "ℹ️", "💡", "📌", "📍"
];


export const generateTitleFromDescription = (description) => {
	if (!description) return "";

	// Remove HTML
	let plainText = description.replace(/<[^>]*>/g, "");

	// Remove emojis (prevents unpaired surrogates)
	plainText = plainText.replace(/[\uD800-\uDFFF]/g, "");

	const [firstLine] = plainText.split("\n");

	let baseText =
		plainText.includes("\n") && firstLine.trim().length <= 200
			? firstLine.trim()
			: firstLine.trim().slice(0, 60);

	// Prevent cutting in the middle of a word
	if (baseText.length >= 60 || baseText.length >= 200) {
		baseText = baseText.replace(/\s+\S*$/, "");
	}

	// SEO friendly version: lowercase, strip punctuation
	let seoTitle = baseText
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, "")
		.replace(/-+$/, "");

	// Final title — use cleaned baseText (no emoji)
	return seoTitle.charAt(0).toUpperCase() + seoTitle.slice(1);
};


export const createSelectOptionsFromArray = (items) =>
	(items || []).map((item) => ({
		label: item.name,
		value: item.id,
	}));

// Reuse one Audio element per sound instead of allocating a new one on every
// call — message bursts used to spawn (and leak) dozens of Audio objects.
const _audioCache = {};
export const playAudio = (audioName = 'notification') => {
	try {
		let audio = _audioCache[audioName];
		if (!audio) {
			audio = new Audio(plugin_root_url + `/assets/audio/${audioName}.mp3`);
			audio.volume = 0.5;
			_audioCache[audioName] = audio;
		}
		audio.currentTime = 0;
		audio.play();
	} catch (e) { }
};

/**
 * Whether a comment / chat message / ticket reply has been edited after it was
 * first posted. Prefers an explicit `is_edited` flag (set on edit), and falls
 * back to comparing the create timestamp against updated_at. A small tolerance
 * absorbs the sub-second skew between the insert's created/updated values.
 */
export const wasEdited = (item) => {
	if (!item) return false;
	if (item.is_edited === true || item.is_edited === 1 || item.is_edited === '1') return true;
	const created = item.created_at || item.sent_at;
	const updated = item.updated_at;
	if (!created || !updated) return false;
	const parse = (s) => new Date(String(s).replace(' ', 'T')).getTime();
	const c = parse(created);
	const u = parse(updated);
	if (!Number.isFinite(c) || !Number.isFinite(u)) return false;
	return u - c > 2000; // > 2s later ⇒ edited
};

/**
 * Ultra-compact relative timestamp: now, 5m, 3h, 2d, 32w, 1y.
 * Pair with fullDate() in a title tooltip for the exact time on hover.
 */
export const shortDate = (utc) => {
	if (!utc) return '';
	const m = moment.utc(utc, 'YYYY-MM-DD HH:mm:ss').local();
	if (!m.isValid()) return '';
	const now = moment();
	const diffMs = now.diff(m);
	// Bucket thresholds (45min/22hr/26day) mirror moment's own relativeTimeThreshold
	// defaults, which power the "X ago" text shown elsewhere (e.g. the ticket
	// thread's .fromNow()) — using different thresholds here made the same
	// created_at print "47m" in one place and "1 hr ago" in the other.
	if (diffMs < 45 * 1000) return __('now', 'zencommunity');
	const min = Math.round(diffMs / 60000);
	if (min < 45) return `${min}m`;
	const hr = Math.round(diffMs / 3600000);
	if (hr < 22) return `${hr}h`;
	const day = Math.round(diffMs / 86400000);
	if (day < 26) return `${day}d`;
	const wk = Math.round(diffMs / (86400000 * 7));
	if (wk < 52) return `${wk}w`;
	return `${Math.max(1, Math.round(diffMs / (86400000 * 365)))}y`;
};

/** Full human-readable timestamp for tooltips. */
export const fullDate = (utc) => {
	if (!utc) return '';
	const m = moment.utc(utc, 'YYYY-MM-DD HH:mm:ss').local();
	return m.isValid() ? m.format('MMM D, YYYY h:mm A') : '';
};

export const getAddonActiveStatus = (activeAddons, addonName) => {
	const isActivatedAddon = activeAddons?.length > 0 && activeAddons?.find(item => item === addonName);
	if (isActivatedAddon) {
		return true;
	}
	return false;
};

export const reactDebounce = (callback, wait) => {
	let timeout;
	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(function () {
			callback.apply(this, args);
		}, wait);
	};
};

export const baseURL = (path) => {
	const siteUrl = window.ZencommunityGlobal.site_url || '';
	const communityPath = window.ZencommunityGlobal.community_path || '';

	const cleanSiteUrl = siteUrl.replace(/\/$/, '');

	let cleanCommunityPath = communityPath.trim();

	if (cleanCommunityPath === '/') {
		cleanCommunityPath = '';
	} else if (cleanCommunityPath) {
		cleanCommunityPath = '/' + cleanCommunityPath.replace(/^\/+|\/+$/g, '');
	}

	return `${cleanSiteUrl}${cleanCommunityPath}${path}`;
};


export const linkifyText = (text) => {
	if (!text) return '';
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	return text.replace(urlRegex, (url) => {
		const display = url.replace(/^https?:\/\//, '');
		return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#2A3BEE; text-decoration:underline;">${display}</a>`;
	});
};


export const feelingsOptions = [
	// Positive
	{ emoji: "😀", label: __("Feeling Happy", "zencommunity"), value: "happy" },
	{ emoji: "😍", label: __("Feeling Loved", "zencommunity"), value: "loved" },
	{ emoji: "😎", label: __("Feeling Cool", "zencommunity"), value: "cool" },
	{ emoji: "🤩", label: __("Feeling Excited", "zencommunity"), value: "excited" },
	{ emoji: "😊", label: __("Feeling Blessed", "zencommunity"), value: "blessed" },
	{ emoji: "😇", label: __("Feeling Grateful", "zencommunity"), value: "grateful" },

	// Fun / Cute / Playful
	{ emoji: "🤪", label: __("Feeling Silly", "zencommunity") , value: "silly" },
	{ emoji: "😜", label: __("Feeling Playful", "zencommunity") , value: "playful" },
	{ emoji: "🤤", label: __("Feeling Hungry", "zencommunity") , value: "hungry" },
	{ emoji: "🤯", label: __("Feeling Mind-Blown", "zencommunity"), value: "mind-blown" },
	{ emoji: "😅", label: __("Feeling Nervous", "zencommunity") , value: "nervous" },
	{ emoji: "🥳", label: __("Feeling Celebratory", "zencommunity") , value: "celebratory" },
	{ emoji: "🤗", label: __("Feeling Huggy", "zencommunity") , value: "huggy" },

	// Neutral / Mixed
	{ emoji: "😐", label: __("Feeling Okay", "zencommunity"), value: "okay" },
	{ emoji: "😕", label: __("Feeling Confused", "zencommunity"), value: "confused" },
	{ emoji: "😶", label: __("Feeling Speechless", "zencommunity"), value: "speechless" },
	{ emoji: "😬", label: __("Feeling Awkward", "zencommunity"), value: "awkward" },
	{ emoji: "😌", label: __("Feeling Relaxed", "zencommunity"), value: "relaxed" },

		// Tired / Low Energy
	{ emoji: "😴", label: __("Feeling Sleepy", "zencommunity"), value: "sleepy" },
	{ emoji: "🥱", label: __("Feeling Tired", "zencommunity"), value: "tired" },
	{ emoji: "😪", label: __("Feeling Exhausted", "zencommunity"), value: "exhausted" },
	{ emoji: "😔", label: __("Feeling Down", "zencommunity"), value: "down" },

	// Negative
	{ emoji: "😢", label: __("Feeling Sad", "zencommunity"), value: "sad" },
	{ emoji: "😭", label: __("Feeling Heartbroken", "zencommunity"), value: "heartbroken" },
	{ emoji: "😡", label: __("Feeling Angry", "zencommunity"), value: "angry" },
	{ emoji: "😠", label: __("Feeling Frustrated", "zencommunity"), value: "frustrated" },
	{ emoji: "😱", label: __("Feeling Shocked", "zencommunity"), value: "shocked" },
	{ emoji: "😣", label: __("Feeling Upset", "zencommunity"), value: "upset" },
];

export const reactionOptions = [
	{
		label: "Like",
		value: "like",
		svg: `
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="url(#paint0_linear)"/>
				<path opacity="0.5" d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="url(#paint1_radial)"/>

				<path d="M10.95 5.8C10.95 5.2 11.45 4.7 12.05 4.7C13.1 4.7 13.95 5.55 13.95 6.6V9.3C13.95 9.38 14.02 9.45 14.1 9.45H16.9C18.45 9.45 19.6 10.9 19.25 12.4L18.55 15.3C18.15 16.9 16.7 18.05 15.05 18.05H10.35C9.85 18.05 9.45 17.65 9.45 17.15V11.8C9.45 11.15 9.6 10.5 9.9 9.9L10.35 9C10.75 8.2 10.95 7.3 10.95 6.4V5.8Z" fill="white"/>

				<path d="M6.55 10.65C5.9 10.65 5.35 11.2 5.35 11.85V16.85C5.35 17.5 5.9 18.05 6.55 18.05H7.75C8.1 18.05 8.35 17.8 8.35 17.45V11.25C8.35 10.9 8.1 10.65 7.75 10.65H6.55Z" fill="white"/>

				<defs>
					<linearGradient id="paint0_linear" x1="3.5" y1="3.5" x2="20.5" y2="20.5" gradientUnits="userSpaceOnUse">
					<stop stop-color="#02ADFC"/>
					<stop offset="0.5" stop-color="#0866FF"/>
					<stop offset="1" stop-color="#2B7EFF"/>
					</linearGradient>

					<radialGradient id="paint1_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
					gradientTransform="translate(10 10) scale(15)">
					<stop offset="0.3143" stop-color="#02ADFC"/>
					<stop offset="1" stop-color="#02ADFC"/>
					</radialGradient>
				</defs>
			</svg>
		`
	},
	{
			label: "Love",
			value: "love",
			svg: `
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
	<path d="M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z" fill="url(#paint0_linear_love)"/>

	<path d="M18.9 10.6C18.9 13.9 15.3 16.4 12.8 18.1C12.3 18.4 11.7 18.4 11.2 18.1C8.7 16.4 5.1 13.9 5.1 10.6C5.1 8.6 6.6 6.7 8.7 6.7C10.2 6.7 11.4 7.6 12 8.9C12.6 7.6 13.8 6.7 15.3 6.7C17.4 6.7 18.9 8.6 18.9 10.6Z" fill="white"/>

	<defs>
		<linearGradient id="paint0_linear_love" x1="3.5" y1="3.5" x2="20.5" y2="20.5" gradientUnits="userSpaceOnUse">
		<stop stop-color="#FF74AE"/>
		<stop offset="0.5" stop-color="#FA2E3E"/>
		<stop offset="1" stop-color="#FF5758"/>
		</linearGradient>
	</defs>
	</svg>
		`
	},
	{
		label: "Haha",
		value: "haha",
		svg: `
			<svg width="24" height="24" viewBox="0 0 427 427" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M213.5 427C331.413 427 427 331.413 427 213.5C427 95.5872 331.413 0 213.5 0C95.5872 0 0 95.5872 0 213.5C0 331.413 95.5872 427 213.5 427Z" fill="url(#paint0_linear_12128_14828)"/>
			<path d="M213.5 426.9C331.357 426.9 426.9 331.358 426.9 213.5C426.9 95.6426 331.357 0.100098 213.5 0.100098C95.6421 0.100098 0.0996094 95.6426 0.0996094 213.5C0.0996094 331.358 95.6421 426.9 213.5 426.9Z" fill="url(#paint1_linear_12128_14828)"/>
			<path d="M334.499 218.7C345.299 221.6 352.6 231.7 351.1 242.8C342.1 312.2 283.9 373.6 213.6 373.6C143.2 373.6 85.0995 312.2 76.0995 242.8C74.6995 231.7 81.8996 221.7 92.6996 218.7C115.9 212.4 160 202.8 213.6 202.8C267.2 202.8 311.199 212.4 334.499 218.7Z" fill="#4B280E"/>
			<path d="M309.2 330.3C284.3 356.6 250.6 373.6 213.6 373.6C176.5 373.6 142.9 356.6 118 330.3C117.9 330.1 117.7 330 117.6 329.8C129.5 302.8 176.3 293.5 213.7 293.5C251.1 293.5 297.8 302.8 309.8 329.8L309.2 330.3Z" fill="url(#paint2_linear_12128_14828)"/>
			<path fill-rule="evenodd" clip-rule="evenodd" d="M355.199 156.9C359.499 126.3 338.199 97.9001 307.499 93.6001L304.899 93.2001C274.299 88.9001 245.899 110.2 241.599 140.9L241.199 144C240.299 151.3 245.399 158 252.699 158.9C259.899 159.8 266.499 154.8 267.599 147.7L267.999 144.6C270.299 128.5 285.099 117.4 301.199 119.6L303.799 120C319.899 122.3 330.999 137.1 328.799 153.1L328.399 156.2C327.399 163.5 332.499 170.2 339.799 171.3C347.099 172.3 353.799 167.2 354.899 159.9C354.799 160 355.199 156.9 355.199 156.9ZM71.8994 156.9C67.5994 126.3 88.8993 97.9001 119.599 93.6001L122.199 93.2001C152.799 88.9001 181.199 110.2 185.499 140.9L185.899 144C186.899 151.3 181.799 158 174.499 159.1C167.199 160.1 160.499 155 159.399 147.7L158.999 144.6C156.699 128.5 141.899 117.4 125.799 119.6L123.199 120C107.099 122.3 95.9994 137.1 98.1994 153.1L98.5993 156.2C99.4993 163.5 94.3993 170.2 87.0993 171.1C79.8993 172 73.2994 167 72.1994 159.9C72.3994 160 71.8994 156.9 71.8994 156.9Z" fill="#1C1C1D"/>
			<defs>
				<linearGradient id="paint0_linear_12128_14828" x1="65.0492" y1="65.0419" x2="366.949" y2="366.941" gradientUnits="userSpaceOnUse">
				<stop stop-color="#FFF287"/>
				<stop offset="1" stop-color="#F68628"/>
				</linearGradient>
				<linearGradient id="paint1_linear_12128_14828" x1="66.7329" y1="66.7331" x2="368.596" y2="368.597" gradientUnits="userSpaceOnUse">
				<stop stop-color="#FFF287"/>
				<stop offset="1" stop-color="#F68628"/>
				</linearGradient>
				<linearGradient id="paint2_linear_12128_14828" x1="212.963" y1="287.193" x2="214.22" y2="379.137" gradientUnits="userSpaceOnUse">
				<stop stop-color="#FF60A4"/>
				<stop offset="0.2417" stop-color="#FA2E3E"/>
				<stop offset="1" stop-color="#BC0A26"/>
				</linearGradient>
			</defs>
			</svg>
		`
	},
	{
		label: "Wow",
		value: "wow",
		svg: `
			<svg width="24" height="24" viewBox="0 0 427 427" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M213.5 427C331.413 427 427 331.413 427 213.5C427 95.5872 331.413 0 213.5 0C95.5872 0 0 95.5872 0 213.5C0 331.413 95.5872 427 213.5 427Z" fill="url(#paint0_linear_12128_14837)"/>
			
			<path d="M213.5 426.9C331.357 426.9 426.9 331.358 426.9 213.5C426.9 95.6426 331.357 0.100098 213.5 0.100098C95.6421 0.100098 0.0996094 95.6426 0.0996094 213.5C0.0996094 331.358 95.6421 426.9 213.5 426.9Z" fill="url(#paint1_linear_12128_14837)"/>
			
			<path fill-rule="evenodd" clip-rule="evenodd" d="M149.9 290.5C154.1 241.2 180 213.5 213.5 213.5C247 213.5 272.8 241.3 277.1 290.5C281.3 339.8 257.5 373.6 213.5 373.6C169.5 373.6 145.7 339.8 149.9 290.5Z" fill="#4B280E"/>
			
			<path d="M298.9 197.5C319.555 197.5 336.3 177.174 336.3 152.1C336.3 127.026 319.555 106.7 298.9 106.7C278.244 106.7 261.5 127.026 261.5 152.1C261.5 177.174 278.244 197.5 298.9 197.5Z" fill="#1C1C1D"/>
			
			<path d="M128.099 197.5C148.755 197.5 165.499 177.174 165.499 152.1C165.499 127.026 148.755 106.7 128.099 106.7C107.444 106.7 90.6992 127.026 90.6992 152.1C90.6992 177.174 107.444 197.5 128.099 197.5Z" fill="#1C1C1D"/>
			
			<path fill-rule="evenodd" clip-rule="evenodd" d="M329.7 84.4998C317.4 69.9998 296.6 66.2998 280.1 75.6998C275 78.6998 268.5 76.9998 265.5 71.9998C262.5 66.8998 264.2 60.3998 269.2 57.3998C269.3 57.2998 269.4 57.2998 269.5 57.1998C294.9 42.5998 327.1 48.2998 346 70.6998C349.8 75.1998 349.2 81.8998 344.7 85.6998C340.3 89.5998 333.5 88.9998 329.7 84.4998ZM146.9 75.7998C130.4 66.3998 109.5 69.9998 97.2998 84.4998C93.3998 88.9998 86.6997 89.3997 82.1997 85.5997C77.7997 81.7997 77.2996 75.1998 80.8996 70.6998C99.7996 48.2998 132 42.5998 157.4 57.1998C162.5 60.1998 164.1 66.7998 161.1 71.7998C158.3 76.7998 151.9 78.5998 146.9 75.7998Z" fill="#E0761A"/>
			
			<defs>
				<linearGradient id="paint0_linear_12128_14837" x1="65.0564" y1="65.0419" x2="366.956" y2="366.941" gradientUnits="userSpaceOnUse">
				<stop stop-color="#FFF287"/>
				<stop offset="1" stop-color="#F68628"/>
				</linearGradient>
				
				<linearGradient id="paint1_linear_12128_14837" x1="66.7329" y1="66.7331" x2="368.596" y2="368.597" gradientUnits="userSpaceOnUse">
				<stop stop-color="#FFF287"/>
				<stop offset="1" stop-color="#F68628"/>
				</linearGradient>
			</defs>
			</svg>
		`
	},
	{
		label: "Sad",
		value: "sad",
		svg: `
			<svg width="24" height="24" viewBox="0 0 427 427" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M213.5 427C331.413 427 427 331.413 427 213.5C427 95.5872 331.413 0 213.5 0C95.5872 0 0 95.5872 0 213.5C0 331.413 95.5872 427 213.5 427Z" fill="url(#paint0_radial_12128_14799)"/>
			
			<path d="M213.5 427C331.413 427 427 331.413 427 213.5C427 95.5872 331.413 0 213.5 0C95.5872 0 0 95.5872 0 213.5C0 331.413 95.5872 427 213.5 427Z" fill="url(#paint1_radial_12128_14799)"/>
			
			<path d="M213.5 426.9C331.357 426.9 426.9 331.358 426.9 213.5C426.9 95.6426 331.357 0.100098 213.5 0.100098C95.6421 0.100098 0.0996094 95.6426 0.0996094 213.5C0.0996094 331.358 95.6421 426.9 213.5 426.9Z" fill="url(#paint2_linear_12128_14799)"/>
			
			<path d="M330.999 242.5C330.999 272.2 320.299 272.2 298.999 272.2C277.699 272.2 266.999 272.2 266.999 242.5C266.999 220.6 281.299 202.9 298.999 202.9C316.699 202.9 330.999 220.6 330.999 242.5ZM160.199 242.5C160.199 272.2 149.499 272.2 128.199 272.2C106.899 272.2 96.1992 272.2 96.1992 242.5C96.1992 220.6 110.499 202.9 128.199 202.9C145.899 202.9 160.199 220.6 160.199 242.5Z" fill="#1C1C1D"/>
			
			<path fill-rule="evenodd" clip-rule="evenodd" d="M213.5 298.9C257.4 298.9 277.5 328.1 277.5 336.6C277.5 339.5 275.3 341.6 271.5 341.6C263.1 341.6 251.4 330.9 213.5 330.9C175.6 330.9 163.9 341.6 155.5 341.6C151.7 341.6 149.5 339.5 149.5 336.6C149.5 328.1 169.6 298.9 213.5 298.9Z" fill="#4B280E"/>
			
			<path fill-rule="evenodd" clip-rule="evenodd" d="M288 168.3C307.3 171.9 324.9 181.6 338.1 196.1C342.1 200.4 348.9 200.6 353.2 196.6C357.4 192.6 357.7 186 353.8 181.7C337.4 163.9 315.7 151.8 291.9 147.4C286.1 146.3 280.5 150 279.4 155.8C278.3 161.6 282 167.2 287.8 168.3ZM139.1 168.3C119.8 171.9 102.2 181.6 88.9999 196.1C85.0999 200.5 78.2999 200.9 73.8999 197C69.4999 193.1 69.0999 186.3 72.9999 181.9C89.5999 163.8 111.3 151.7 135.1 147.3C140.9 146.3 146.4 150.1 147.5 156C148.6 161.7 144.8 167.2 139.1 168.3Z" fill="#E0761A"/>
			
			<path d="M80.1 298.9C73 298.8 68.5 303.2 49.3 333.8C40.6 347.8 32 361.9 32 378.9C32 405.4 53.3 426.9 80 426.9C106.7 426.9 128.1 405.6 128.1 378.9C128.1 361.8 119.6 347.7 110.8 333.8C91.7 303.2 87.2 298.8 80.1 298.9Z" fill="#02ADFC" fill-opacity="0.9"/>

			<defs>
				<radialGradient id="paint0_radial_12128_14799" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(160.624 180.987) scale(271.709)">
				<stop stop-color="#FFF287"/>
				<stop offset="1" stop-color="#FFF287"/>
				</radialGradient>

				<radialGradient id="paint1_radial_12128_14799" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(160.624 180.987) scale(271.709)">
				<stop stop-color="#FFF287"/>
				<stop offset="1" stop-color="#FFF287"/>
				</radialGradient>

				<linearGradient id="paint2_linear_12128_14799" x1="66.7329" y1="66.7331" x2="368.596" y2="368.597" gradientUnits="userSpaceOnUse">
				<stop stop-color="#FFF287"/>
				<stop offset="1" stop-color="#F68628"/>
				</linearGradient>
			</defs>
			</svg>
		`
	},
  // {
	// 	label: "Care",
	// 	value: "care",
	// 	svg: `
	// 		<svg width="427" height="427" viewBox="0 0 427 427" fill="none" xmlns="http://www.w3.org/2000/svg">
	// 			<path d="M213.5 426.9C331.357 426.9 426.9 331.358 426.9 213.5C426.9 95.6426 331.357 0.100098 213.5 0.100098C95.6421 0.100098 0.0996094 95.6426 0.0996094 213.5C0.0996094 331.358 95.6421 426.9 213.5 426.9Z" fill="url(#paint0_linear_12128_14845)"/>
	// 			<path d="M363.2 365.7C324.7 403.6 271.8 427 213.5 427C199.4 427 185.4 425.6 171.6 422.9C190 415.2 215.2 403.2 239.5 387.8C273.6 401.9 332.4 394.2 363 365.6L363.2 365.7Z" fill="url(#paint1_linear_12128_14845)"/>
	// 			<path fill-rule="evenodd" clip-rule="evenodd" d="M255.901 207.8C256.101 207.8 256.4 207.9 256.6 207.9C276.4 211.7 293.8 223.3 305.1 240C316.4 256.7 320.501 277.2 316.701 296.9C310.101 330.7 281.201 358.6 251.801 379.3C221.801 400.4 188.001 416.2 166.401 424.9C155.901 429.1 143.901 426.8 135.701 418.9C118.901 402.8 93.5005 375.5 73.5005 344.7C54.0005 314.5 37.7006 277.8 44.2006 244C48.0006 224.2 59.6006 206.8 76.3006 195.6C93.0006 184.3 113.501 180.2 133.301 184C133.501 184 133.801 184.1 134.001 184.2C149.001 188 162.501 196 172.901 207.4C177.301 212.2 183.101 220.4 188.201 230.4C196.601 223 205.001 217.5 211.001 214.7C225.001 208.1 240.501 205.7 255.901 207.8Z" fill="url(#paint2_radial_12128_14845)"/>
	// 			<path d="M213.5 181.5C232.4 181.5 244.8 178.4 253.4 175.3C261.6 172.3 264.1 164.2 255.5 162.6C247.6 161.1 234.6 160.2 213.5 160.2C192.8 160.2 179.3 161.1 171.1 162.8C162.9 164.5 165.1 172.4 173 175.2C181.7 178.3 194.4 181.4 213.5 181.5Z" fill="#4B280E"/>
	// 			<path fill-rule="evenodd" clip-rule="evenodd" d="M271.001 55.8001C290.601 56.0001 309.601 62.5001 325.201 74.5001C329.901 78.0001 336.6 77.1002 340.1 72.4002C343.6 67.7002 342.7 61.1001 338.1 57.5001C318.9 42.8001 295.401 34.7001 271.201 34.5001C265.301 34.4001 260.401 39.0002 260.301 44.9002C260.201 50.8002 264.801 55.7001 270.701 55.8001C270.801 55.8001 270.901 55.8001 271.001 55.8001ZM156.001 55.8001C136.401 56.0001 117.401 62.5001 101.801 74.5001C97.2006 78.1001 90.5006 77.4001 86.8006 72.7001C83.2006 68.1001 83.9005 61.4001 88.6005 57.7001C88.7005 57.6001 88.8006 57.6001 88.8006 57.5001C108.001 42.8001 131.501 34.7001 155.701 34.5001C161.601 34.4001 166.501 39.0002 166.601 44.9002C166.701 50.8002 162.101 55.7001 156.201 55.8001C156.201 55.8001 156.101 55.8001 156.001 55.8001Z" fill="#E0761A"/>
	// 			<path fill-rule="evenodd" clip-rule="evenodd" d="M266.9 116.3C266.9 135.6 279.8 141.3 298.9 143.6C317.8 146.3 330.6 138.3 330.9 116.3C331.2 97.8002 320.7 75.2002 298.9 74.7002C277 75.1002 266.9 97.8002 266.9 116.3ZM160.1 116.3C160.1 135.6 147.2 141.3 128.1 143.6C109.2 146.3 96.4 138.3 96.1 116.3C95.8 97.8002 106.3 75.2002 128.1 74.7002C150 75.1002 160.1 97.8002 160.1 116.3Z" fill="#1C1C1D"/>
	// 			<path fill-rule="evenodd" clip-rule="evenodd" d="M178.3 289C176.8 326 104.5 363.5 30.9995 303C1.79952 279 -2.2004 230 3.1996 212.4C8.4996 194.8 22.3996 189.6 36.2996 203.3C50.4996 217.2 53.2996 225.6 76.6996 234.5C97.3996 242.3 129.9 232.5 132 231.9C145.4 227.9 150.3 242 140.7 250.1C136.3 253.9 132.1 256.8 129.5 258.4C128.8 258.9 129.1 260 130 260C142.1 259.3 179.6 255.7 178.3 289Z" fill="#FFF287"/>
	// 			<path fill-rule="evenodd" clip-rule="evenodd" d="M178.3 289C176.8 326 104.5 363.5 30.9995 303C1.79952 279 -2.2004 230 3.1996 212.4C8.4996 194.8 22.3996 189.6 36.2996 203.3C50.4996 217.2 53.2996 225.6 76.6996 234.5C97.3996 242.3 129.9 232.5 132 231.9C145.4 227.9 150.3 242 140.7 250.1C136.3 253.9 132.1 256.8 129.5 258.4C128.8 258.9 129.1 260 130 260C142.1 259.3 179.6 255.7 178.3 289Z" fill="url(#paint3_linear_12128_14845)"/>
	// 			<path fill-rule="evenodd" clip-rule="evenodd" d="M426.9 213.4C426.9 266.8 405.5 325.4 362.9 365.4C320.2 405.4 222.5 404.5 213.7 360.5C206.4 324 244.9 320.3 257.3 318.6C258.1 318.5 258.3 317.2 257.5 316.8C253.1 314.7 248.9 312.4 244.9 309.8C233.9 302.7 236.4 286.1 250.5 287.9C266.5 290.3 286.2 295 303.3 293.2C352.6 288.2 372.8 227.2 381.2 207C389.6 186.8 389.6 176.1 400.3 170.7C410.9 165.4 426.9 181.4 426.9 213.4Z" fill="#FFF287"/>
	// 			<path fill-rule="evenodd" clip-rule="evenodd" d="M426.9 213.4C426.9 266.8 405.5 325.4 362.9 365.4C320.2 405.4 222.5 404.5 213.7 360.5C206.4 324 244.9 320.3 257.3 318.6C258.1 318.5 258.3 317.2 257.5 316.8C253.1 314.7 248.9 312.4 244.9 309.8C233.9 302.7 236.4 286.1 250.5 287.9C266.5 290.3 286.2 295 303.3 293.2C352.6 288.2 372.8 227.2 381.2 207C389.6 186.8 389.6 176.1 400.3 170.7C410.9 165.4 426.9 181.4 426.9 213.4Z" fill="url(#paint4_linear_12128_14845)"/>
	// 			<defs>
	// 			<linearGradient id="paint0_linear_12128_14845" x1="66.7329" y1="66.7331" x2="368.596" y2="368.597" gradientUnits="userSpaceOnUse">
	// 			<stop stop-color="#FFF287"/>
	// 			<stop offset="1" stop-color="#F68628"/>
	// 			</linearGradient>
	// 			<linearGradient id="paint1_linear_12128_14845" x1="267.377" y1="365.459" x2="267.377" y2="426.943" gradientUnits="userSpaceOnUse">
	// 			<stop stop-color="#FFF287"/>
	// 			<stop offset="1" stop-color="#FFF287"/>
	// 			</linearGradient>
	// 			<radialGradient id="paint2_radial_12128_14845" cx="0" cy="0" r="1" gradientTransform="matrix(117.42 138.766 163.997 -138.766 112.099 250.841)" gradientUnits="userSpaceOnUse">
	// 			<stop offset="0.3729" stop-color="#FA2E3E"/>
	// 			<stop offset="0.9266" stop-color="#E11731"/>
	// 			</radialGradient>
	// 			<linearGradient id="paint3_linear_12128_14845" x1="-49.1363" y1="114.355" x2="67.972" y2="247.284" gradientUnits="userSpaceOnUse">
	// 			<stop stop-color="#F68628"/>
	// 			<stop offset="0.0418936" stop-color="#F78D2E"/>
	// 			<stop offset="0.3945" stop-color="#FBC35E"/>
	// 			<stop offset="0.658" stop-color="#FEE57C"/>
	// 			<stop offset="0.8009" stop-color="#FFF287"/>
	// 			</linearGradient>
	// 			<linearGradient id="paint4_linear_12128_14845" x1="223.948" y1="266.828" x2="511.443" y2="305.552" gradientUnits="userSpaceOnUse">
	// 			<stop offset="0.0835" stop-color="#FFF287"/>
	// 			<stop offset="1" stop-color="#F68628"/>
	// 			</linearGradient>
	// 			</defs>
	// 		</svg>
	// 	`
	// },
  {
		label: "Angry",
		value: "angry",
		svg: `
			<svg width="24" height="24" viewBox="0 0 427 427" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path opacity="0.9" d="M213.5 427C331.413 427 427 331.413 427 213.5C427 95.5872 331.413 0 213.5 0C95.5872 0 0 95.5872 0 213.5C0 331.413 95.5872 427 213.5 427Z" fill="url(#paint0_radial_12128_14809)"/>
			
			<path d="M213.5 427C331.413 427 427 331.413 427 213.5C427 95.5872 331.413 0 213.5 0C95.5872 0 0 95.5872 0 213.5C0 331.413 95.5872 427 213.5 427Z" fill="url(#paint1_linear_12128_14809)"/>
			
			<path d="M330.9 242.5C330.9 272.2 320.2 272.2 298.9 272.2C277.6 272.2 266.9 272.2 266.9 242.5C266.9 220.6 281.2 202.9 298.9 202.9C316.6 202.9 330.9 220.6 330.9 242.5ZM160.1 242.5C160.1 272.2 149.4 272.2 128.1 272.2C106.8 272.2 96.0996 272.2 96.0996 242.5C96.0996 220.6 110.4 202.9 128.1 202.9C145.8 202.8 160.1 220.6 160.1 242.5Z" fill="#1C1C1D"/>
			
			<path fill-rule="evenodd" clip-rule="evenodd" d="M213.4 309.6C248.8 309.6 277.4 317.4 277.4 331C277.4 342.3 248.7 341.6 213.4 341.6C178 341.6 149.4 342.3 149.4 331C149.4 317.4 178 309.6 213.4 309.6Z" fill="#4B280E"/>
			
			<path fill-rule="evenodd" clip-rule="evenodd" d="M355.8 187.7C352.9 182.6 346.4 180.7 341.3 183.6C329.5 190.2 312.3 194.9 294.8 197.9C277.5 200.9 260.9 202.2 251.1 202.4C245.2 202.5 240.5 207.3 240.5 213.2C240.6 219.1 245.4 223.8 251.3 223.8C251.4 223.8 251.5 223.8 251.6 223.8C262.4 223.5 280 222.2 298.4 219C316.6 215.8 336.7 210.6 351.7 202.3C356.8 199.4 358.7 192.9 355.8 187.7ZM66.5997 187.7C69.4997 182.6 75.9997 180.7 81.0997 183.6C92.8997 190.2 110.1 194.9 127.6 197.9C144.9 200.9 161.5 202.2 171.3 202.4C177.2 202.5 181.9 207.3 181.9 213.2C181.9 219.1 177 223.8 171.1 223.8C171 223.8 170.9 223.8 170.8 223.8C160 223.5 142.4 222.2 124 219C105.8 215.8 85.6996 210.6 70.6996 202.3C65.4996 199.4 63.6997 192.9 66.5997 187.7Z" fill="#BC0A26"/>
			
			<defs>
				<radialGradient id="paint0_radial_12128_14809" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(175.607 166.621) scale(271.691)">
				<stop stop-color="#FFB169"/>
				<stop offset="1" stop-color="#FFB169"/>
				</radialGradient>
				
				<linearGradient id="paint1_linear_12128_14809" x1="64.4467" y1="64.4251" x2="363.312" y2="363.29" gradientUnits="userSpaceOnUse">
				<stop stop-color="#FFB169"/>
				<stop offset="1" stop-color="#FF5758"/>
				</linearGradient>
			</defs>
			</svg>
		`
	}
];

export const renderedReactions = (reactions = null) => {
    if (!reactions) return [];

    const sorted = Object.entries(reactions)
        .filter(([_, count]) => parseInt(count) > 0)
        .sort((a, b) => parseInt(b[1]) - parseInt(a[1]));

    const svgs = sorted
        .map(([key]) => reactionOptions.find(item => item.value === key))
        .filter(Boolean);

    return svgs;
};

export const handlePasteLink = (e, value = '') => {
	const pastedText = e.clipboardData?.getData('text')?.trim() || '';
	if (!/^https?:\/\//.test(pastedText)) return value; // not a URL → normal paste

	e.preventDefault();

	const textarea = e.target;
	const { selectionStart, selectionEnd } = textarea || {};

	const cleanUrl = pastedText.replace(/["'<>\u0000-\u001F]+/g, '');

	// If no text selected → insert link text directly
	if (selectionStart === selectionEnd) {
		const displayUrl = cleanUrl.replace(/^https?:\/\//, '');
		const linked = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">${displayUrl}</a>`;
		return (
			value.substring(0, selectionStart) +
			linked +
			value.substring(selectionEnd)
		);
	}

	// --- DOM-based safe HTML replacement for selected text ---
	const parser = new DOMParser();
	const doc = parser.parseFromString(`<div>${value}</div>`, 'text/html');
	const root = doc.body.firstChild;

	// Track visible text position
	let visibleOffset = 0;
	const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const ranges = [];

	while (walker.nextNode()) {
		const node = walker.currentNode;
		const start = visibleOffset;
		const end = visibleOffset + node.nodeValue.length;

		// selection overlaps this text node
		if (selectionStart < end && selectionEnd > start) {
			const localStart = Math.max(0, selectionStart - start);
			const localEnd = Math.min(node.nodeValue.length, selectionEnd - start);
			ranges.push({ node, localStart, localEnd });
		}

		visibleOffset = end;
	}

	// Replace selected ranges with links
	ranges.reverse().forEach(({ node, localStart, localEnd }) => {
		const before = node.nodeValue.slice(0, localStart);
		const selected = node.nodeValue.slice(localStart, localEnd);
		const after = node.nodeValue.slice(localEnd);

		const a = doc.createElement('a');
		a.href = cleanUrl;
		a.target = '_blank';
		a.rel = 'noopener noreferrer';
		a.setAttribute('style', 'text-decoration:underline;');
		a.textContent = selected;

		const frag = doc.createDocumentFragment();
		if (before) frag.appendChild(doc.createTextNode(before));
		frag.appendChild(a);
		if (after) frag.appendChild(doc.createTextNode(after));

		node.replaceWith(frag);
	});

	// Return HTML string (preserving inline styles)
	return Array.from(root.childNodes)
		.map((n) => n.outerHTML || n.textContent)
		.join('');
};

export const inlineStyles = (isDark = "light", themeValues,) => {
	return `:root {
		--zencom-primary-color: ${isDark ? themeValues?.theme?.dark?.primary_color : themeValues?.theme?.light?.primary_color};
		--zencom-secondary-color: ${isDark ? themeValues?.theme?.dark?.secondary_color : themeValues?.theme?.light?.secondary_color};
		--zencom-body-background: ${isDark ? themeValues?.theme?.dark?.content_body_color : themeValues?.theme?.light?.content_body_color};
		--zencom-background: ${isDark ? themeValues?.theme?.dark?.content_background_color : themeValues?.theme?.light?.content_background_color};
		--zencom-font-color: ${isDark ? themeValues?.theme?.dark?.text_color : themeValues?.theme?.light?.text_color};
		--zencom-border-color: ${isDark ? themeValues?.theme?.dark?.border_color : themeValues?.theme?.light?.border_color};
	}
`
}
export const handlePasteLinkinEditor = (e) => {
    const pastedText = e.clipboardData?.getData("text")?.trim() || "";

    // Not a URL → return false to continue normal paste
    if (!/^https?:\/\//.test(pastedText)) return false;

    e.preventDefault();

    const sanitizedUrl = pastedText.replace(/["'<>\u0000-\u001F]+/g, "");
    
    // Check if there's selected text
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText) {
        // User has selected text - wrap it with the link
        const range = selection.getRangeAt(0);
        
        // Create anchor element
        const anchor = document.createElement('a');
        anchor.href = sanitizedUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.style.textDecoration = 'underline';
        anchor.textContent = selectedText;
        
        // Replace selected text with the anchor
        range.deleteContents();
        range.insertNode(anchor);
        
        // Move cursor after the link
        range.setStartAfter(anchor);
        range.setEndAfter(anchor);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        // No selection - insert the link with URL as display text
        const displayUrl = sanitizedUrl.replace(/^https?:\/\//, "");
        document.execCommand(
            "insertHTML",
            false,
            `<a href="${sanitizedUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">${displayUrl}</a>`
        );
    }

    return true; // tell parent "I handled the paste"
};

export const fixUnicode = (str) => {
    // 1. Fix surrogate pairs first
    str = str.replace(/\\u[dD][0-9A-Fa-f]{3}\\u[dD][0-9A-Fa-f]{3}/g, (match) => {
        try {
            const parts = match.split("\\u").filter(Boolean);
            const high = parseInt(parts[0], 16);
            const low = parseInt(parts[1], 16);
            return String.fromCodePoint(((high - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000);
        } catch {
            return "";
        }
    });

    // 2. Remove lone (broken) surrogates to avoid JSON errors
    return str
        .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "") // orphan high
        .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, ""); // orphan low
};

// remove empty space from the start
export const cleanPasteContent = (str = "") => {
    if (!str) return "";

    // Remove leading whitespace and empty lines
    str = str.replace(/^[\s\n\r\t]+/g, "");          
    str = str.replace(/^(\s*<br\s*\/?>\s*)+/gi, ""); 

    // Fix broken UTF-16 surrogate pairs (emoji issues)
    str = fixUnicode(str);

    return str;
};

export const base64ToFile = (base64, filename) => {
    const arr = base64.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

export const avatarColors = [
  'blue.500',
  'green.500',
  'purple.500',
  'orange.500',
  'teal.500',
  'red.500',
];

export const getAvatarBg = (userName) => {
  if (!userName || typeof userName !== 'string') return 'gray.400';

  const firstChar = userName.trim().charAt(0).toUpperCase();

  if (!firstChar.match(/[A-Z]/)) return 'gray.400';

  const charCode = firstChar.charCodeAt(0) - 65; // A = 0
  return avatarColors[charCode % avatarColors.length];
};


export const getInitials = (userName) => {
	if (!userName || typeof userName !== 'string') return '?';

	const parts = userName.trim().split(/\s+/);

	if (parts.length === 1) {
		return parts[0][0]?.toUpperCase();
	}

	return (
		parts[0][0] + parts[parts.length - 1][0]
	).toUpperCase();
};

/**
 * Resolves the name to show for a member: their chosen display name if set,
 * otherwise their first + last name.
 *
 * @param {Object} profile A member/profile record (or a mention-list item).
 * @return {string} The name to display.
 */
// Person names always start each word with a capital ("john doe" → "John Doe");
// the rest of each word is left as typed, and caseless scripts pass through.
export const capitalizeName = (name) =>
	typeof name === 'string'
		? name.replace(/(^|[\s\-'])(\p{Ll})/gu, (match, sep, letter) => sep + letter.toLocaleUpperCase())
		: name;

export const getDisplayName = (profile) => {
	if (!profile) return '';

	const displayName = profile?.meta?.display_name || profile?.display_name;
	if (displayName && displayName.trim()) return capitalizeName(displayName.trim());

	return capitalizeName(`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim());
};
