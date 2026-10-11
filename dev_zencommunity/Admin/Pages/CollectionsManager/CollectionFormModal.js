import React from 'react';
import { __ } from '@wordpress/i18n';
import { generateSlug } from '@Utils/helper';
import { PrimaryButton, GhostButton, Modal } from '../../Components/ui';
import { NotchedTextField, NotchedTextArea } from '../../Components/NotchedFields';

/**
 * "Add Collection" / "Edit Collection" modal, extracted from
 * CollectionsManager. Purely presentational — all state (the `editing`
 * draft, save-in-flight, etc.) lives in the caller.
 */
const CollectionFormModal = ({ editing, set, saving, invalid, onSave, onClose }) => (
	<Modal
		title={editing.id ? __('Edit Collection', 'zencommunity') : __('Add Collection', 'zencommunity')}
		onClose={onClose}
		footer={
			<>
				<GhostButton onClick={onClose}>{__('Cancel', 'zencommunity')}</GhostButton>
				<PrimaryButton onClick={onSave} disabled={saving || invalid}>
					{saving ? __('Saving…', 'zencommunity') : editing.id ? __('Update', 'zencommunity') : __('Create', 'zencommunity')}
				</PrimaryButton>
			</>
		}
	>
		{/* No autoFocus: it would focus this field before the first paint,
		skipping past the notched rest state with nothing to animate from. */}
		<NotchedTextField
			label={__('Name', 'zencommunity')}
			value={editing.name}
			onChange={(name) => set({ name, slug: editing.id ? editing.slug : generateSlug(name) })}
		/>
		<NotchedTextArea
			label={__('Description', 'zencommunity')}
			value={editing.description}
			onChange={(description) => set({ description })}
		/>
	</Modal>
);

export default CollectionFormModal;
