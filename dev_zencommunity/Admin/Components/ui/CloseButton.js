import React from 'react';
import { __ } from '@wordpress/i18n';
import { IoClose } from 'react-icons/io5';
import IconButton from './IconButton';

const CloseButton = ({ className = '', ...props }) => (
	<IconButton aria-label={__('Close', 'zencommunity')} className={className} {...props}>
		<IoClose size={18} />
	</IconButton>
);

export default CloseButton;
