import React from 'react';
import { Box } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import NoDataPost from '@Components/NoDataPost';
import { current_user_can } from '@Utils/helper';

/**
 * "Single Page" space view — renders the admin-authored page content stored in
 * meta.page_content (sanitized server-side with wp_kses_post). Container width
 * follows the space's meta.container_width setting.
 */
const WIDTHS = { narrow: '640px', normal: '860px', full: '100%' };

const SinglePage = ({ groupData }) => {
	const html = groupData?.meta?.page_content || '';
	const width = WIDTHS[groupData?.meta?.container_width] || WIDTHS.normal;

	return (
		<Box className="zencom-animate-fade" mb={{ base: '50px', lg: '4' }} maxW={width} mx="auto" w="100%">
			<Box
				borderRadius="6px"
				bg="var(--zencom-background)"
			>
				<ZCLabel
					fontSize="18px"
					color="var(--zencom-font-color)"
					fontWeight="500"
					padding="12px 16px"
					label={groupData?.name || __('Page', 'zencommunity')}
				/>
				{html ? (
					<Box
						className="zencom-single-page-content"
						p="16px"
						color="var(--zencom-font-color)"
						fontSize="15px"
						lineHeight="26px"
						css={{ '& img': { maxWidth: '100%', height: 'auto' }, '& a': { color: 'var(--zencom-primary-color)' } }}
						dangerouslySetInnerHTML={{ __html: html }}
					/>
				) : (
					<NoDataPost
						title={__('No content yet', 'zencommunity')}
						subTitle={current_user_can?.manage_options ? __('Add page content from the Space settings.', 'zencommunity') : ''}
						subTitleWrap="nowrap"
					/>
				)}
			</Box>
		</Box>
	);
};

export default SinglePage;
