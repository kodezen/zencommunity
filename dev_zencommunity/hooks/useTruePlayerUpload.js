import { useState } from 'react';
import { __ } from '@wordpress/i18n';
import { mediaFileUploader } from '@Utils/helper';

/**
 * Uploads a file through ZenCommunity's own guest-friendly media endpoint
 * (`media-upload`, same pipeline `feed_image` already uses) rather than
 * TruePlayer's own upload routes, which are gated on `manage_options`/
 * `edit_posts`+`upload_files` — capabilities a regular community member
 * doesn't have. The server wraps the resulting attachment into a real
 * TruePlayer item on save (see TruePlayerEmbed::create_from_upload(),
 * `meta.trueplayer_upload_id`).
 */
export const useTruePlayerUpload = (mediaType) => {
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState(null);
	const [uploaded, setUploaded] = useState(null); // { id, url, name }

	const upload = async (file) => {
		if (!file) return null;
		setUploading(true);
		setError(null);
		try {
			const res = await mediaFileUploader(mediaType === 'audio' ? 'feed_audio' : 'feed_video', file);
			if (res?.id) {
				const result = { id: res.id, url: res.url || res.source_url || res.guid?.rendered, name: file.name };
				setUploaded(result);
				return result;
			}
			setError(__('Upload failed.', 'zencommunity'));
			return null;
		} catch (err) {
			setError(err?.response?.data?.message || __('Upload failed. Please check the file type and size and try again.', 'zencommunity'));
			return null;
		} finally {
			setUploading(false);
		}
	};

	const clear = () => {
		setUploaded(null);
		setError(null);
	};

	return { uploading, error, uploaded, upload, clear };
};
