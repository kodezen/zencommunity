import React, { useEffect, useRef, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useDispatch } from 'react-redux';
import { LuTriangleAlert, LuUpload, LuX } from 'react-icons/lu';
import { createFeedPost } from '@Redux/slices/feedSlice/feedSlice';
import { API, is_trueplayer_active } from '@Utils/helper';
import { trueplayerMediaType } from '@Utils/truePlayerMedia';
import { useTruePlayerUpload } from '@Hooks/useTruePlayerUpload';
import { PrimarySelect, TextField, Toggle, PrimaryButton } from '../../Components/ui';
import BlockEditor from '../../Components/BlockEditor';

/**
 * Existing-library picker — wp-admin always runs as `manage_options`, so
 * `GET /trueplayer/v1/videos` (admin-gated) is safe to call here.
 */
const ExistingLibraryPicker = ({ type, value, onChange }) => {
	const [items, setItems] = useState(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		if (!is_trueplayer_active) return;
		let cancelled = false;
		API.get('trueplayer/v1/videos')
			.then((res) => { if (!cancelled) setItems(Array.isArray(res?.data) ? res.data : []); })
			.catch(() => { if (!cancelled) setError(true); });
		return () => { cancelled = true; };
	}, []);

	if (!is_trueplayer_active) {
		return (
			<p className="tw-m-0 tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-2 tw-text-sm tw-text-zc-muted">
				{__('This post type needs TruePlayer — install and activate it from Extend your Community.', 'zencommunity')}
			</p>
		);
	}
	if (error) {
		return (
			<p className="tw-m-0 tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-2 tw-text-sm tw-text-zc-muted">
				{__("Couldn't load TruePlayer's library. Try reopening this form.", 'zencommunity')}
			</p>
		);
	}
	if (items === null) {
		return <p className="tw-m-0 tw-text-sm tw-text-zc-muted">{__('Loading your TruePlayer library…', 'zencommunity')}</p>;
	}

	const options = items.map((item) => ({
		label: `${item.title || __('Untitled', 'zencommunity')} (${trueplayerMediaType(item) === 'audio' ? __('Audio', 'zencommunity') : __('Video', 'zencommunity')})`,
		value: item.id,
	}));
	const selectedItem = items.find((item) => item.id === value);
	const mismatched = !!selectedItem && trueplayerMediaType(selectedItem) !== type;

	return (
		<div>
			<PrimarySelect
				label={type === 'audio' ? __('Audio track', 'zencommunity') : __('Video', 'zencommunity')}
				value={value}
				options={options}
				placeholder={__('Select from your TruePlayer library…', 'zencommunity')}
				onChange={onChange}
			/>
			{!options.length && (
				<p className="tw-m-0 tw-mt-1.5 tw-text-sm tw-text-zc-muted">
					{__('Nothing in your TruePlayer library yet — add one there first.', 'zencommunity')}
				</p>
			)}
			{mismatched && (
				<p className="tw-m-0 tw-mt-1.5 tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-text-amber-600">
					<LuTriangleAlert size={14} />
					{type === 'audio'
						? __("This is a video in TruePlayer — it'll still play, but won't look like a typical audio item.", 'zencommunity')
						: __("This is an audio track in TruePlayer — it'll still play, but won't look like a typical video.", 'zencommunity')}
				</p>
			)}
		</div>
	);
};

const UploadPicker = ({ type, uploaded, uploading, error, onUpload, onClear }) => {
	const inputRef = useRef(null);

	if (uploaded) {
		return (
			<div>
				{type === 'audio' ? (
					// eslint-disable-next-line jsx-a11y/media-has-caption
					<audio controls src={uploaded.url} className="tw-w-full" />
				) : (
					// eslint-disable-next-line jsx-a11y/media-has-caption
					<video controls src={uploaded.url} className="tw-max-h-64 tw-w-full tw-rounded" />
				)}
				<button
					type="button"
					onClick={onClear}
					className="tw-mt-2 tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-1 tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-white tw-px-2 tw-py-1 tw-text-sm tw-text-zc-fg"
				>
					<LuX size={12} /> {__('Choose a different file', 'zencommunity')}
				</button>
			</div>
		);
	}

	return (
		<div>
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				className="tw-flex tw-w-full tw-cursor-pointer tw-flex-col tw-items-center tw-justify-center tw-gap-1 tw-rounded tw-border tw-border-dashed tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-6 tw-text-center tw-text-sm tw-text-zc-muted"
			>
				<LuUpload size={18} />
				{uploading
					? __('Uploading…', 'zencommunity')
					: type === 'audio' ? __('Click to upload an audio file', 'zencommunity') : __('Click to upload a video file', 'zencommunity')}
			</button>
			<input
				ref={inputRef}
				type="file"
				accept={type === 'audio' ? 'audio/*' : 'video/*'}
				hidden
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) onUpload(file);
					e.target.value = '';
				}}
			/>
			{error && <p className="tw-m-0 tw-mt-1.5 tw-text-sm tw-text-zc-warning">{error}</p>}
		</div>
	);
};

/**
 * Admin "New Post" screen's Video/Audio tab. Mirrors PostForm.js's structure
 * (Title/Content/Schedule) rather than PollForm.js's — an Audio/Video post
 * is a normal post with a referenced TruePlayer item attached, not a
 * type-specific micro-form like a poll.
 */
const MediaForm = ({ type, spaceOptions, onDone }) => {
	const dispatch = useDispatch();
	const [space, setSpace] = useState('');
	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [videoId, setVideoId] = useState(null);
	const [mode, setMode] = useState('upload');
	const [scheduled, setScheduled] = useState(false);
	const [scheduledAt, setScheduledAt] = useState('');
	const [saving, setSaving] = useState(false);
	const { uploading, error: uploadError, uploaded, upload, clear: clearUpload } = useTruePlayerUpload(type);

	const invalid = !space || (!videoId && !uploaded) || (scheduled && !scheduledAt);

	const handleUpload = async (file) => {
		const result = await upload(file);
		if (result) setVideoId(null);
	};

	const publish = () => {
		if (invalid) return;
		setSaving(true);
		const formData = {
			title,
			content,
			type,
			meta: uploaded ? { trueplayer_upload_id: uploaded.id } : { trueplayer_video_id: videoId },
		};
		if (scheduled && scheduledAt) formData.scheduled_at = scheduledAt;
		dispatch(createFeedPost({ group_id: space, formData })).finally(() => {
			setSaving(false);
			onDone();
		});
	};

	return (
		<div className="tw-grid tw-grid-cols-1 tw-items-start tw-gap-6 lg:tw-grid-cols-[1fr_320px]">
			<div className="tw-flex tw-flex-col tw-gap-4 tw-rounded tw-bg-white tw-p-6 tw-border tw-border-solid tw-border-zc-border">
				<TextField
					label={__('Title (optional)', 'zencommunity')}
					value={title}
					onChange={setTitle}
					placeholder={type === 'audio' ? __('Give this audio a title…', 'zencommunity') : __('Give this video a title…', 'zencommunity')}
				/>

				<div>
					<span className="tw-mb-1.5 tw-block tw-text-[14px] tw-font-medium tw-text-zc-fg">{__('Description (optional)', 'zencommunity')}</span>
					<BlockEditor
						name="content"
						defaultValue=""
						saveValueHandler={(_name, value) => setContent(value)}
						suffix={`new-post-${type}-content`}
						maxHeight="360px"
					/>
				</div>
			</div>

			<div className="tw-flex tw-flex-col tw-gap-4 tw-rounded tw-bg-white tw-p-5 tw-border tw-border-solid tw-border-zc-border">
				<PrimarySelect
					label={__('Space', 'zencommunity')}
					value={space}
					options={spaceOptions}
					placeholder={__('Select a Space…', 'zencommunity')}
					onChange={setSpace}
					isRequired={true}
				/>

				<div>
					<span className="tw-mb-1.5 tw-block tw-text-[14px] tw-font-medium tw-text-zc-fg">
						{type === 'audio' ? __('Audio', 'zencommunity') : __('Video', 'zencommunity')}
					</span>
					<div className="tw-mb-1.5 tw-flex tw-gap-1">
						<button
							type="button"
							onClick={() => setMode('upload')}
							className={`tw-flex-1 tw-cursor-pointer tw-rounded tw-border tw-border-solid tw-border-zc-border tw-px-2 tw-py-1 tw-text-xs ${mode === 'upload' ? 'tw-bg-zc-primary tw-text-white' : 'tw-bg-white tw-text-zc-fg'}`}
						>
							{__('Upload new', 'zencommunity')}
						</button>
						<button
							type="button"
							onClick={() => setMode('existing')}
							className={`tw-flex-1 tw-cursor-pointer tw-rounded tw-border tw-border-solid tw-border-zc-border tw-px-2 tw-py-1 tw-text-xs ${mode === 'existing' ? 'tw-bg-zc-primary tw-text-white' : 'tw-bg-white tw-text-zc-fg'}`}
						>
							{__('Choose existing', 'zencommunity')}
						</button>
					</div>

					{mode === 'existing' ? (
						<ExistingLibraryPicker
							type={type}
							value={videoId}
							onChange={(id) => { setVideoId(id); clearUpload(); }}
						/>
					) : (
						<UploadPicker
							type={type}
							uploaded={uploaded}
							uploading={uploading}
							error={uploadError}
							onUpload={handleUpload}
							onClear={clearUpload}
						/>
					)}
				</div>

				<Toggle label={__('Schedule for later', 'zencommunity')} checked={scheduled} onChange={setScheduled} />
				{scheduled && (
					<input
						type="datetime-local"
						value={scheduledAt}
						onChange={(e) => setScheduledAt(e.target.value)}
						className="tw-m-0 tw-block tw-w-full tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-2 tw-text-sm tw-text-zc-fg focus:tw-border-zc-primary focus:tw-outline-none"
					/>
				)}

				<hr className="tw-m-0 tw-border-0 tw-border-t tw-border-solid tw-border-zc-border" />

				<PrimaryButton onClick={publish} disabled={saving || invalid} className="tw-justify-center">
					{saving
						? __('Publishing…', 'zencommunity')
						: type === 'audio' ? __('Publish Audio', 'zencommunity') : __('Publish Video', 'zencommunity')}
				</PrimaryButton>
			</div>
		</div>
	);
};

export default MediaForm;
