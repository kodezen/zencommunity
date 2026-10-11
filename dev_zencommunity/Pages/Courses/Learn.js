import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { __ } from '@wordpress/i18n';
import { baseURL } from '@Utils/helper';

/**
 * The learning experience is now rendered natively by the server at
 * {community}/learn/{id} (see the academy-lms addon's Hooks::native_learn_template)
 * — Academy's own curriculum player + assets inside a chrome-free ZenCommunity
 * document, no iframe. This SPA route only exists as a safety net: if it's ever
 * reached via client-side navigation, do a full navigation so the server
 * renders the native page.
 */
const Learn = () => {
	const { id } = useParams();

	useEffect(() => {
		window.location.replace(baseURL(`/learn/${id}`));
	}, [id]);

	return (
		<div className="tw-flex tw-h-screen tw-items-center tw-justify-center tw-text-sm tw-text-zc-muted">
			{__('Opening course…', 'zencommunity')}
		</div>
	);
};

export default Learn;
