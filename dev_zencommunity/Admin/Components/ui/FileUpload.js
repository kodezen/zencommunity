import React, { useRef, useState } from 'react';
import { __ } from '@wordpress/i18n';

// Tailwind's cascade order follows generated CSS order, not class-list
// position, so appending a caller className after these can't reliably
// override them (e.g. tw-px-6 can beat a later tw-px-2). A caller-provided
// className replaces the default dropzone look entirely instead of fighting it.
const FILE_UPLOAD_ZONE_CLASS = 'tw-flex tw-cursor-pointer tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-rounded tw-border tw-border-dashed tw-px-6 tw-py-8 tw-text-center tw-text-sm tw-text-zc-muted tw-transition-colors';

/**
 * FileUpload — drag/drop + click-to-browse zone. Calls onFiles(FileList)
 * with the selected/dropped files; caller owns preview + upload logic.
 * Pass `className` to render as something other than the default dropzone
 * (e.g. a compact button) — it replaces the default styling rather than
 * merging with it.
 */
const FileUpload = ({ onFiles, accept, multiple, children, className }) => {
	const [dragOver, setDragOver] = useState(false);
	const inputRef = useRef(null);

	return (
		<div
			onClick={() => inputRef.current?.click()}
			onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
			onDragLeave={() => setDragOver(false)}
			onDrop={(e) => {
				e.preventDefault();
				setDragOver(false);
				if (e.dataTransfer.files?.length) onFiles?.(e.dataTransfer.files);
			}}
			className={
				className ||
				`${FILE_UPLOAD_ZONE_CLASS} ${dragOver ? 'tw-border-zc-primary tw-bg-zc-primary/5' : 'tw-border-zc-border tw-bg-zc-bg'}`
			}
		>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				multiple={multiple}
				className="tw-hidden"
				onChange={(e) => { if (e.target.files?.length) onFiles?.(e.target.files); e.target.value = ''; }}
			/>
			{children ?? __('Click or drag a file here to upload', 'zencommunity')}
		</div>
	);
};

export default FileUpload;
