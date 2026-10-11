import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { __ } from '@wordpress/i18n';
import { Form, Formik } from 'formik';
import { CloseButton, PrimaryButton, GhostButton } from './ui';

/**
 * Admin-local Tailwind port of the shared Components/ZenComModal/
 * ZenComModalFormik (Chakra). Portals into #zc-admin-modal-root (a sibling of
 * AdminNav, see Admin/settings.js) rather than document.body — the admin
 * Tailwind config scopes every utility under #ZenCommunitySettingsElement, so
 * a portal further outside would strip all styling. Portaling there (instead
 * of rendering inline where a call site's tab content lives) keeps the modal
 * out of any CSS stacking context a tab wrapper creates (e.g.
 * .zencom-animate-fade's `animation-name`), which would otherwise trap the
 * modal's z-index below AdminNav's sticky bar. The device-preview resize
 * feature was dropped since no admin call site used it.
 *
 * No inner max-height/overflow (same pattern as ui.js's Modal): the overlay
 * itself scrolls so a tall modal scrolls as one piece — header, content and
 * footer together — rather than clipping a scrollbar inside the card. Pass
 * `footer` to replace the default Cancel/Submit pair; it renders in the same
 * bottom bar.
 */
const ModalFormik = ({
	children,
	title = '',
	isOpen = false,
	isEnabledFooter = true,
	onRequestClose,
	cancelButtonLabel = __('Cancel', 'zencommunity'),
	submitButtonLabel = __('Update', 'zencommunity'),
	header = null,
	footer = null,
	formik = {},
	bodyPadding = "tw-p-5"
}) => {
	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e) => { if (e.key === 'Escape') onRequestClose?.(); };
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [isOpen, onRequestClose]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="tw-no-scrollbar tw-fixed tw-inset-0 tw-z-[100000] tw-overflow-y-auto tw-bg-black/40 tw-p-4 tw-mt-[80px]"
			onMouseDown={(e) => { if (e.target === e.currentTarget) onRequestClose?.(); }}
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			<div className="tw-mx-auto tw-my-8 tw-flex tw-w-full tw-max-w-[800px] tw-flex-col tw-rounded tw-bg-white tw-shadow-xl">
				<Formik {...formik}>
					{({ isSubmitting }) => (
						<Form className="tw-flex tw-flex-col">
							{header ? (
								<div className="tw-flex tw-shrink-0 tw-items-center tw-justify-between tw-border-0 tw-border-b tw-border-solid tw-border-zc-border tw-px-5 tw-py-4">
									{title && <h2 className="tw-m-0 tw-text-base tw-font-semibold tw-text-zc-fg">{title}</h2>}
									<div className="tw-shrink-0">
										{header}
									</div>
									<CloseButton onClick={onRequestClose} />
								</div>
							) : (
								<div className="tw-flex tw-shrink-0 tw-items-center tw-justify-between tw-border-0 tw-border-b tw-border-solid tw-border-zc-border tw-px-5 tw-py-4">
									{title && <h2 className="tw-m-0 tw-text-base tw-font-semibold tw-text-zc-fg">{title}</h2>}
									<CloseButton onClick={onRequestClose} />
								</div>
							)}

							<div className={bodyPadding}>{children}</div>

							{(footer || isEnabledFooter) && (
								<div className="tw-flex tw-shrink-0 tw-justify-end tw-gap-2 tw-border-0 tw-border-t tw-border-solid tw-border-zc-border tw-px-5 tw-py-4">
									{footer || (
										<>
											<GhostButton type="button" onClick={onRequestClose}>{cancelButtonLabel}</GhostButton>
											<PrimaryButton type="submit" disabled={isSubmitting}>{submitButtonLabel}</PrimaryButton>
										</>
									)}
								</div>
							)}
						</Form>
					)}
				</Formik>
			</div>
		</div>
	);

	const portalTarget = document.getElementById('zc-admin-modal-root');
	return portalTarget ? createPortal(modalContent, portalTarget) : modalContent;
};

export default ModalFormik;
