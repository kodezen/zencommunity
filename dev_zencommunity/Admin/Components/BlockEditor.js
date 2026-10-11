import React, { useState, useRef, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import Quill from 'quill';
import ImageResize from 'quill-image-resize-module-react';
import ImageUploader from 'quill-image-uploader';
import BlotFormatter from 'quill-blot-formatter';
import Table from 'quill-table';
import htmlEditButton from 'quill-html-edit-button';
import 'quill/dist/quill.snow.css';
import './BlockEditor.scss';
import { PrimaryButton, Modal } from './ui';

/**
 * Admin-local port of the shared Components/Editor/BlockEditor. The Quill
 * setup/registration logic is unchanged; only the two Chakra-based pieces
 * (the "Add to editor" button and the custom-HTML dialog) were swapped for
 * ui.js's Tailwind PrimaryButton/Modal.
 */

// custom HTML
const BlockEmbed = Quill.import('blots/block/embed');
// video
class CustomVideoBlot extends BlockEmbed {
	static create(value) {
		const node = super.create();
		node.setAttribute('src', value);
		node.setAttribute('controls', true);
		node.setAttribute('class', 'zencommunity-custom-video');
		node.setAttribute('data-blot-formatter-unclickable-bound', true); // Remove this attribute
		return node;
	}

	static value(node) {
		return node.getAttribute('src');
	}
}

CustomVideoBlot.blotName = 'customVideo';
CustomVideoBlot.tagName = 'video';
Quill.register(CustomVideoBlot);

// audio
class CustomAudioBlot extends BlockEmbed {
	static create(value) {
		const node = super.create();
		node.setAttribute('src', value);
		node.setAttribute('controls', true);
		node.setAttribute('class', 'zencommunity-custom-audio');
		node.setAttribute('data-blot-formatter-unclickable-bound', true); // Remove this attribute
		return node;
	}

	static value(node) {
		return node.getAttribute('src');
	}
}

CustomAudioBlot.blotName = 'customAudio';
CustomAudioBlot.tagName = 'audio';
Quill.register(CustomAudioBlot);

class CustomHTMLBlot extends BlockEmbed {
	static create(value) {
		const node = super.create();
		node.innerHTML = value;
		return node;
	}

	static value(node) {
		return node.innerHTML;
	}
}

CustomHTMLBlot.blotName = 'customHTML';
CustomHTMLBlot.tagName = 'div'; // You can change the tag as needed

Quill.register(CustomHTMLBlot);

// image upload
const Image = Quill.import('formats/image');
class CustomImage extends Image {
	static create(value) {
		const node = super.create(value);
		if (typeof value === 'object') {
			node.setAttribute('src', value.url);
			if (value.width) {
				node.setAttribute('width', value.width);
			}
			if (value.height) {
				node.setAttribute('height', value.height);
			}
			if (value.style) {
				node.setAttribute('style', value.style);
			}
		}
		return node;
	}

	static value(domNode) {
		return {
			url: domNode.getAttribute('src'),
			width: domNode.getAttribute('width'),
			height: domNode.getAttribute('height'),
			style: domNode.getAttribute('style'),
		};
	}

	format(name, value) {
		if (name === 'width' || name === 'height') {
			if (value) {
				this.domNode.setAttribute(name, value);
			} else {
				this.domNode.removeAttribute(name);
			}
		} else {
			super.format(name, value);
		}
	}
}

// Register modules
Quill.register('modules/imageUploader', ImageUploader);
Quill.register('modules/imageResize', ImageResize);
Quill.register('modules/blotFormatter', BlotFormatter);
Quill.register('modules/htmlEditButton', htmlEditButton);
// Quill 2 ships its own modules/table; quill-table replaces it on purpose.
Quill.register('modules/table', Table, true);
Quill.register(CustomImage, true);

export default function BlockEditor({
	name,
	defaultValue,
	saveValueHandler,
	suffix,
	isCustomHTML = false,
	maxHeight,
}) {
	const quillRef = useRef(null);
	const [customHTML, setCustomHTML] = useState('');
	const [showCustomInserter, isShowCustomInserter] = useState(false);
	const isInitialized = useRef(false);

	useEffect(() => {
		if (isInitialized.current) return;

		const quill = new Quill(`#editor-container--${suffix}`, {
			modules: {
				toolbar: {
					container: [
						[{ font: [] }],
						[{ header: ['1', '2', '3', '4', '5', '6'] }],
						[{ size: [] }],
						[
							'bold',
							'italic',
							'underline',
							'strike',
							'blockquote',
							'code-block',
						],
						[{ color: [] }, { background: [] }],
						[
							{ list: 'ordered' },
							{ list: 'bullet' },
							{ indent: '-1' },
							{ indent: '+1' },
							{ align: [] },
						],
						[{ script: 'sub' }, { script: 'super' }],
						[{ direction: 'rtl' }],
						['table'],
						['clean'],
					],
					handlers: {
						customHTML: () => isShowCustomInserter(true),
					},
				},
				clipboard: {
					matchVisual: false,
				},
				blotFormatter: {},
			},
			theme: 'snow',
		});

		quillRef.current = quill;
		isInitialized.current = true;

		if (defaultValue) {
			quill.clipboard.dangerouslyPasteHTML(defaultValue);
		}

		const handleChange = (delta, oldDelta, source) => {
			if (source !== 'user') return;
			const content = quill.root.innerHTML;
			if (content !== defaultValue) {
				saveValueHandler(name, content);
			}
		};

		quill.on('text-change', handleChange);

		return () => {
			quill.off('text-change', handleChange);
		};
	}, [suffix]);

	useEffect(() => {
		if (!isInitialized.current || !quillRef.current) return;

		const quill = quillRef.current;
		if (quill.root.innerHTML !== defaultValue) {
			const selection = quill.getSelection();
			quill.clipboard.dangerouslyPasteHTML(defaultValue);

			if (selection) {
				setTimeout(() =>
					quill.setSelection(selection.index, selection.length)
				);
			}
		}
	}, []);

	const handleInsertHTML = () => {
		if (customHTML) {
			const quill = quillRef.current;
			const range = quill.getSelection(true);
			quill.insertEmbed(range.index, 'customHTML', customHTML, 'user');
			isShowCustomInserter(false);
			setCustomHTML('');
		}
	};

	return (
		<React.Fragment>
			<div
				className={`zencommunity-block-editor${maxHeight ? ' zencommunity-block-editor--capped' : ''}`}
				style={maxHeight ? { maxHeight, display: 'flex', flexDirection: 'column' } : undefined}
			>
				<div id={`editor-container--${suffix}`}></div>
			</div>
			{showCustomInserter && (
				<Modal title={__('Custom HTML', 'zencommunity')} onClose={() => isShowCustomInserter(false)}>
					<textarea
						rows={5}
						value={customHTML}
						onChange={(e) => setCustomHTML(e.target.value)}
						placeholder={__('Enter HTML content', 'zencommunity')}
						className="tw-m-0 tw-block tw-w-full tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-2 tw-text-sm tw-text-zc-fg focus:tw-border-zc-primary focus:tw-outline-none"
					/>
					<PrimaryButton onClick={handleInsertHTML}>{__('Add to editor', 'zencommunity')}</PrimaryButton>
				</Modal>
			)}
		</React.Fragment>
	);
}
