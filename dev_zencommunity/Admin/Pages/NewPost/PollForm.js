import React, { useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useDispatch } from 'react-redux';
import { LuPlus, LuX, LuEye } from 'react-icons/lu';
import { createFeedPost } from '@Redux/slices/feedSlice/feedSlice';
import { Toggle, PrimaryButton, GhostButton } from '../../Components/ui';
import { NotchedTextField, NotchedSearchSelect } from '../../Components/NotchedFields';
import PreviewModal from './PreviewModal';
import FeedCardHeader from './FeedCardHeader';

let nextOptionId = 3;

/**
 * Poll option shape (meta.poll.{options,expires_at,allow_multiple}) matches
 * the SPA's Components/Posts/Steps/Poll.js, minus drag-to-reorder.
 */
const PollForm = ({ spaceOptions, onDone }) => {
	const dispatch = useDispatch();
	const [space, setSpace] = useState('');
	const [question, setQuestion] = useState('');
	const [options, setOptions] = useState([
		{ id: '1', text: '' },
		{ id: '2', text: '' },
	]);
	const [expiresAt, setExpiresAt] = useState('');
	const [allowMultiple, setAllowMultiple] = useState(false);
	const [saving, setSaving] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const spaceLabel = spaceOptions.find((o) => o.value === space)?.label;

	const setOptionText = (id, text) => setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
	const addOption = () => setOptions((prev) => [...prev, { id: String(nextOptionId++), text: '' }]);
	const removeOption = (id) => setOptions((prev) => (prev.length > 2 ? prev.filter((o) => o.id !== id) : prev));

	const filledOptions = options.filter((o) => o.text.trim());
	const invalid = !space || !question.trim() || filledOptions.length < 2;

	const publish = () => {
		if (invalid) return;
		setSaving(true);
		dispatch(
			createFeedPost({
				group_id: space,
				formData: {
					title: question,
					content: question,
					type: 'poll',
					meta: {
						poll: {
							options: filledOptions,
							expires_at: expiresAt || null,
							allow_multiple: allowMultiple,
						},
					},
				},
			})
		).finally(() => {
			setSaving(false);
			onDone();
		});
	};

	return (
		<div className="tw-grid tw-grid-cols-1 tw-items-start tw-gap-6 lg:tw-grid-cols-[1fr_320px]">
			<div className="tw-flex tw-flex-col tw-gap-6 tw-rounded-xl tw-bg-white tw-p-6 tw-border tw-border-solid tw-border-zc-border">
				<NotchedTextField label={__('Question', 'zencommunity')} value={question} onChange={setQuestion} placeholder={__('Ask a question…', 'zencommunity')} />

				<div>
					<span className="tw-mb-1.5 tw-block tw-text-[14px] tw-font-medium tw-text-zc-fg">{__('Options', 'zencommunity')}</span>
					<div className="tw-flex tw-flex-col tw-gap-4">
						{options.map((option, index) => (
							<div key={option.id} className="tw-flex tw-items-center tw-gap-2">
								<div className="tw-flex-1">
									<NotchedTextField
										value={option.text}
										placeholder={`${__('Option', 'zencommunity')} ${index + 1}`}
										onChange={(text) => setOptionText(option.id, text)}
									/>
								</div>
								{options.length > 2 && (
									<button
										type="button"
										onClick={() => removeOption(option.id)}
										className="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-transparent tw-text-zc-muted hover:tw-bg-zc-secondary"
									>
										<LuX size={14} />
									</button>
								)}
							</div>
						))}
					</div>
					<button
						type="button"
						onClick={addOption}
						className="tw-mt-2 tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-1 tw-rounded tw-border-0 tw-bg-transparent tw-p-0 tw-text-sm tw-font-medium tw-text-zc-primary"
					>
						<LuPlus size={14} /> {__('Add Option', 'zencommunity')}
					</button>
				</div>
			</div>

			<div className="tw-flex tw-flex-col tw-gap-6 tw-rounded-xl tw-bg-white tw-p-5 tw-border tw-border-solid tw-border-zc-border">
				<NotchedSearchSelect
					label={__('Space', 'zencommunity')}
					value={space}
					options={spaceOptions}
					placeholder={__('Select a Space…', 'zencommunity')}
					onChange={setSpace}
					required
				/>

				<NotchedTextField
					type="datetime-local"
					label={__('Expires at (optional)', 'zencommunity')}
					value={expiresAt}
					onChange={setExpiresAt}
				/>

				<Toggle label={__('Allow multiple answers', 'zencommunity')} checked={allowMultiple} onChange={setAllowMultiple} />

				<hr className="tw-m-0 tw-border-0 tw-border-t tw-border-solid tw-border-zc-border" />

				<div className="tw-flex tw-gap-2">
					<GhostButton onClick={() => setPreviewOpen(true)} disabled={!question.trim()} className="tw-justify-center">
						<LuEye size={14} /> {__('Preview', 'zencommunity')}
					</GhostButton>
					<PrimaryButton onClick={publish} disabled={saving || invalid} className="tw-flex-1 tw-justify-center">
						{saving ? __('Publishing…', 'zencommunity') : __('Publish Poll', 'zencommunity')}
					</PrimaryButton>
				</div>
			</div>

			{previewOpen && (
				<PreviewModal onClose={() => setPreviewOpen(false)}>
					<div className="tw-mx-auto tw-w-full tw-max-w-[560px] tw-rounded tw-bg-white tw-p-4 tw-border tw-border-solid tw-border-zc-border">
						<FeedCardHeader spaceLabel={spaceLabel} />

						<p className="tw-m-0 tw-mt-3 tw-font-semibold tw-text-zc-fg">{question}</p>
						<div className="tw-mt-3 tw-flex tw-flex-col tw-gap-2">
							{filledOptions.map((option) => (
								<div
									key={option.id}
									className="tw-rounded tw-border tw-border-solid tw-border-zc-border tw-px-3 tw-py-2 tw-text-sm tw-text-zc-fg"
								>
									{option.text}
								</div>
							))}
						</div>
						<p className="tw-m-0 tw-mt-2 tw-text-sm tw-text-zc-muted">
							{allowMultiple ? __('Multiple answers allowed', 'zencommunity') : __('Single answer only', 'zencommunity')}
							{expiresAt ? ` · ${__('Expires', 'zencommunity')} ${expiresAt}` : ''}
						</p>

						<div className="tw-mt-4 tw-flex tw-items-center tw-justify-around tw-border-0 tw-border-t tw-border-solid tw-border-zc-border tw-pt-2 tw-text-sm tw-text-zc-muted">
							<span>{__('Like', 'zencommunity')}</span>
							<span>{__('Comment', 'zencommunity')}</span>
							<span>{__('Share', 'zencommunity')}</span>
						</div>
					</div>
				</PreviewModal>
			)}
		</div>
	);
};

export default PollForm;
