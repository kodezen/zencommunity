import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { LuX, LuEye } from 'react-icons/lu';
import { createTicket, fetchTicketLabels, fetchTicketProducts } from '@Redux/slices/ticketSlice/ticketSlice';
import { createSelectOptionsFromArray, mediaFileUploader } from '@Utils/helper';
import { PrimaryButton, GhostButton, FileUpload } from '../../Components/ui';
import { NotchedTextField, NotchedSearchSelect } from '../../Components/NotchedFields';
import BlockEditor from '../../Components/BlockEditor';
import PreviewModal from './PreviewModal';

const isEmptyHtml = (html) => !html || !String(html).replace(/<[^>]*>/g, '').trim();

// Tickets are a distinct resource (wp_zenc_tickets, not a feed) — see
// Components/Posts/Steps/Tickets.js for the SPA equivalent this mirrors.
// The SPA's Tickets tab only has a plain description textarea and no image
// support at all; this upgrades both — a Quill-based BlockEditor for the
// description (same as PostForm) and an image dropzone whose media IDs are
// sent as `add_media_ids`, matching the naming the feed/comment endpoints
// already use. The TicketingSystem addon isn't installed in this repo, so
// that field name is inferred from that convention rather than verified
// against its REST schema — worth confirming against the addon once available.
const TicketForm = ({ onDone }) => {
	const dispatch = useDispatch();
	const { products, typeLabels, priorityLabels } = useSelector((state) => state.tickets);
	const [title, setTitle] = useState('');
	const [content, setContent] = useState('');
	const [images, setImages] = useState([]);
	const [uploading, setUploading] = useState(false);
	const [productId, setProductId] = useState('');
	const [priorityId, setPriorityId] = useState('');
	const [typeId, setTypeId] = useState('');
	const [saving, setSaving] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);

	useEffect(() => {
		dispatch(fetchTicketProducts());
		dispatch(fetchTicketLabels({ labelType: 'types' }));
		dispatch(fetchTicketLabels({ labelType: 'priorities' }));
	}, []);

	const productOptions = createSelectOptionsFromArray(products);
	const typeOptions = createSelectOptionsFromArray(typeLabels);
	const priorityOptions = createSelectOptionsFromArray(priorityLabels);

	const productLabel = productOptions.find((o) => o.value === productId)?.label;
	const priorityLabel = priorityOptions.find((o) => o.value === priorityId)?.label;
	const typeLabel = typeOptions.find((o) => o.value === typeId)?.label;

	const invalid = !title.trim() || isEmptyHtml(content) || !productId || !priorityId || !typeId;

	const onFiles = async (files) => {
		setUploading(true);
		try {
			const uploaded = [];
			for (const file of Array.from(files)) {
				const res = await mediaFileUploader('ticket_image', file);
				if (res?.id) {
					uploaded.push({ id: res.id, name: file.name, url: res.source_url || res.url || res.guid?.rendered });
				}
			}
			setImages((prev) => [...prev, ...uploaded]);
		} finally {
			setUploading(false);
		}
	};

	const removeImage = (id) => setImages((prev) => prev.filter((img) => img.id !== id));

	const publish = () => {
		if (invalid) return;
		setSaving(true);
		dispatch(
			createTicket({
				title,
				content,
				product_id: productId,
				priority_id: priorityId,
				type_id: typeId,
				add_media_ids: images.map((img) => img.id),
			})
		).finally(() => {
			setSaving(false);
			onDone();
		});
	};

	return (
		<div className="tw-grid tw-grid-cols-1 tw-items-start tw-gap-6 lg:tw-grid-cols-[1fr_320px]">
			<div className="tw-flex tw-flex-col tw-gap-6 tw-rounded-xl tw-bg-white tw-p-6 tw-border tw-border-solid tw-border-zc-border">
				<NotchedTextField label={__('Title', 'zencommunity')} value={title} onChange={setTitle} placeholder={__('Ticket title…', 'zencommunity')} />
				<div>
					<span className="tw-mb-1.5 tw-block tw-text-[14px] tw-font-medium tw-text-zc-fg">{__('Description', 'zencommunity')}</span>
					<BlockEditor
						name="content"
						defaultValue=""
						saveValueHandler={(_name, value) => setContent(value)}
						suffix="new-post-ticket-content"
						maxHeight="360px"
					/>
				</div>

				<div>
					<span className="tw-mb-1.5 tw-block tw-text-[14px] tw-font-medium tw-text-zc-fg">{__('Attachments', 'zencommunity')}</span>
					<FileUpload
						accept="image/*"
						multiple
						onFiles={onFiles}
						className="tw-flex tw-cursor-pointer tw-flex-col tw-items-center tw-justify-center tw-gap-1 tw-rounded tw-border tw-border-dashed tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-4 tw-text-center tw-text-sm tw-text-zc-muted"
					>
						{uploading ? __('Uploading…', 'zencommunity') : __('Click or drag images here', 'zencommunity')}
					</FileUpload>
					{images.length > 0 && (
						<div className="tw-mt-2 tw-flex tw-flex-wrap tw-gap-2">
							{images.map((img) => (
								<div key={img.id} className="tw-relative">
									<img src={img.url} alt={img.name} className="tw-h-12 tw-w-12 tw-rounded tw-object-cover" />
									<button
										type="button"
										onClick={() => removeImage(img.id)}
										className="tw-absolute -tw-right-1.5 -tw-top-1.5 tw-flex tw-h-4 tw-w-4 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-full tw-border-0 tw-bg-zc-fg tw-text-white"
									>
										<LuX size={10} />
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			<div className="tw-flex tw-flex-col tw-gap-6 tw-rounded-xl tw-bg-white tw-p-5 tw-border tw-border-solid tw-border-zc-border">
				<NotchedSearchSelect
					label={__('Product', 'zencommunity')}
					value={productId}
					options={productOptions}
					placeholder={__('Select a product…', 'zencommunity')}
					onChange={setProductId}
					required
				/>
				<NotchedSearchSelect
					label={__('Priority', 'zencommunity')}
					value={priorityId}
					options={priorityOptions}
					placeholder={__('Select a priority…', 'zencommunity')}
					onChange={setPriorityId}
					required
				/>
				<NotchedSearchSelect
					label={__('Type', 'zencommunity')}
					value={typeId}
					options={typeOptions}
					placeholder={__('Select a type…', 'zencommunity')}
					onChange={setTypeId}
					required
				/>

				<hr className="tw-m-0 tw-border-0 tw-border-t tw-border-solid tw-border-zc-border" />

				<div className="tw-flex tw-gap-2">
					<GhostButton onClick={() => setPreviewOpen(true)} disabled={!title.trim() && isEmptyHtml(content)} className="tw-justify-center">
						<LuEye size={14} /> {__('Preview', 'zencommunity')}
					</GhostButton>
					<PrimaryButton onClick={publish} disabled={saving || invalid} className="tw-flex-1 tw-justify-center">
						{saving ? __('Creating…', 'zencommunity') : __('Create Ticket', 'zencommunity')}
					</PrimaryButton>
				</div>
			</div>

			{previewOpen && (
				<PreviewModal onClose={() => setPreviewOpen(false)}>
					<p className="tw-m-0 tw-font-semibold tw-text-zc-fg">{title || __('(untitled ticket)', 'zencommunity')}</p>
					<div
						className="tw-mt-2 tw-rounded tw-p-4 tw-text-sm tw-leading-6 tw-text-zc-fg"
						dangerouslySetInnerHTML={{ __html: content }}
					/>
					{images.length > 0 && (
						<div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-2">
							{images.map((img) => (
								<img key={img.id} src={img.url} alt={img.name} className="tw-h-20 tw-w-20 tw-rounded tw-object-cover" />
							))}
						</div>
					)}
					<div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-x-4 tw-gap-y-1 tw-text-sm tw-text-zc-muted">
						{productLabel && <span>{__('Product:', 'zencommunity')} {productLabel}</span>}
						{priorityLabel && <span>{__('Priority:', 'zencommunity')} {priorityLabel}</span>}
						{typeLabel && <span>{__('Type:', 'zencommunity')} {typeLabel}</span>}
					</div>
				</PreviewModal>
			)}
		</div>
	);
};

export default TicketForm;
