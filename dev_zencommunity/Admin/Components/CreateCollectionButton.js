import React, { useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useDispatch } from 'react-redux';
import { IoAdd } from 'react-icons/io5';
import { LuPencil } from 'react-icons/lu';
import { generateSlug } from '@Utils/helper';
import { cerateCollection, updateCollection } from '@Redux/slices/collectionSlice/collectionSlice';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { PrimaryButton, GhostButton, TextField, TextArea, Modal } from './ui';

const EMPTY = { name: '', slug: '', description: '' };

/**
 * Tailwind admin-local replacement for @Pages/Collection/CreateCollection
 * (Chakra) — that component renders a Chakra <Button> with no <ChakraProvider>
 * in this bundle, which crashes the whole admin settings screen. Self-contained
 * like the original: owns its own open state and does the create/update
 * dispatch + notification itself.
 */
const CreateCollectionButton = ({ btnLabel = '', formData = null }) => {
	const dispatch = useDispatch();
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [values, setValues] = useState({ ...EMPTY, ...formData });

	const set = (patch) => setValues((p) => ({ ...p, ...patch }));
	const invalid = !values.name?.trim();

	const openModal = () => {
		setValues({ ...EMPTY, ...formData });
		setOpen(true);
	};

	const save = () => {
		if (invalid) return;
		setSaving(true);
		const thunk = values.id ? updateCollection(values) : cerateCollection(values);
		dispatch(thunk).finally(() => {
			setSaving(false);
			dispatch(showNotification({
				message: values.id
					? __('Collection has been updated Successfully', 'zencommunity')
					: __('Collection has been created Successfully', 'zencommunity'),
				isShow: true,
				type: 'success',
			}));
			setOpen(false);
		});
	};

	return (
		<>
			{formData ? (
				<button
					type="button"
					onClick={openModal}
					aria-label={__('Edit collection', 'zencommunity')}
					className="tw-flex tw-h-auto tw-min-w-0 tw-cursor-pointer tw-items-center tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-transparent tw-p-2 tw-text-zc-fg"
				>
					<LuPencil size={14} />
				</button>
			) : (
				<PrimaryButton onClick={openModal} className="tw-m-3">
					<IoAdd size={16} /> {btnLabel}
				</PrimaryButton>
			)}

			{open && (
				<Modal
					title={values.id ? __('Update Collection', 'zencommunity') : __('Create Collection', 'zencommunity')}
					onClose={() => setOpen(false)}
					footer={
						<>
							<GhostButton onClick={() => setOpen(false)}>{__('Cancel', 'zencommunity')}</GhostButton>
							<PrimaryButton onClick={save} disabled={saving || invalid}>
								{saving ? __('Saving…', 'zencommunity') : values.id ? __('Update', 'zencommunity') : __('Create', 'zencommunity')}
							</PrimaryButton>
						</>
					}
				>
					<TextField
						label={__('Collection name', 'zencommunity')}
						value={values.name}
						autoFocus
						onChange={(name) => set({ name, slug: generateSlug(name) })}
					/>
					<TextField
						label={__('Collection slug', 'zencommunity')}
						value={values.slug}
						onChange={(slug) => set({ slug: generateSlug(slug) })}
					/>
					<TextArea
						label={__('Collection description', 'zencommunity')}
						value={values.description}
						onChange={(description) => set({ description })}
					/>
				</Modal>
			)}
		</>
	);
};

export default CreateCollectionButton;
