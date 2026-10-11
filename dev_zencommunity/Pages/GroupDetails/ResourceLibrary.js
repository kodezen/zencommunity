import React, { useMemo, useState } from 'react';
import { Box, Flex, Input } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { LuFile, LuDownload, LuSearch } from 'react-icons/lu';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import NoDataPost from '@Components/NoDataPost';
import { current_user_can } from '@Utils/helper';

/**
 * "Resource Library" space view — a searchable list of downloadable files
 * stored in meta.resources ([{ title, url, mime, size, description }]). Each
 * row links to / downloads the file.
 */
const fileExt = (url = '') => {
	const m = String(url).split('?')[0].match(/\.([a-z0-9]{1,5})$/i);
	return m ? m[1].toUpperCase() : '';
};

const ResourceLibrary = ({ groupData }) => {
	const resources = Array.isArray(groupData?.meta?.resources) ? groupData.meta.resources : [];
	const [q, setQ] = useState('');

	const filtered = useMemo(() => {
		const term = q.trim().toLowerCase();
		if (!term) return resources;
		return resources.filter(
			(r) => (r.title || '').toLowerCase().includes(term) || (r.description || '').toLowerCase().includes(term)
		);
	}, [resources, q]);

	return (
		<Box className="zencom-animate-fade" mb={{ base: '50px', lg: '4' }}>
			<Box borderRadius="6px" bg="var(--zencom-background)">
				<Flex align="center" justify="space-between" gap={3} p="12px 16px" flexWrap="wrap">
					<ZCLabel fontSize="18px" color="var(--zencom-font-color)" fontWeight="500" padding="0" label={__('Resources', 'zencommunity')} />
					{resources.length > 0 && (
						<Flex align="center" gap={2} bg="var(--zencom-body-background)" border="1px solid var(--zencom-border-color)" borderRadius="6px" px="10px" minW="220px">
							<LuSearch size={16} color="var(--zencom-font-muted)" />
							<Input
								variant="unstyled"
								size="sm"
								placeholder={__('Search resources…', 'zencommunity')}
								value={q}
								onChange={(e) => setQ(e.target.value)}
								color="var(--zencom-font-color)"
							/>
						</Flex>
					)}
				</Flex>

				{filtered.length === 0 ? (
					<NoDataPost
						title={resources.length ? __('No matching resources', 'zencommunity') : __('No resources yet', 'zencommunity')}
						subTitle={!resources.length && current_user_can?.manage_options ? __('Add files from the Space settings.', 'zencommunity') : ''}
						subTitleWrap="nowrap"
					/>
				) : (
					<Flex direction="column">
						{filtered.map((r, i) => (
							<Flex
								key={i}
								align="center"
								justify="space-between"
								gap={3}
								p="12px 16px"
								borderTop="1px solid var(--zencom-border-color)"
							>
								<Flex align="center" gap={3} minW={0}>
									<Box
										flexShrink={0}
										w="36px"
										h="36px"
										borderRadius="6px"
										bg="color-mix(in srgb, var(--zencom-primary-color) 12%, transparent)"
										color="var(--zencom-primary-color)"
										display="flex"
										alignItems="center"
										justifyContent="center"
									>
										<LuFile size={18} />
									</Box>
									<Box minW={0}>
										<Box color="var(--zencom-font-color)" fontSize="14px" fontWeight="500" overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
											{r.title || __('Untitled file', 'zencommunity')}
										</Box>
										<Box color="var(--zencom-font-muted)" fontSize="12px" overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis">
											{[fileExt(r.url), r.description].filter(Boolean).join(' · ')}
										</Box>
									</Box>
								</Flex>
								{r.url && (
									<a
										href={r.url}
										target="_blank"
										rel="noreferrer"
										download
										style={{
											display: 'inline-flex',
											alignItems: 'center',
											gap: '6px',
											flexShrink: 0,
											border: '1px solid var(--zencom-border-color)',
											borderRadius: '6px',
											padding: '6px 12px',
											fontSize: '13px',
											fontWeight: 500,
											color: 'var(--zencom-font-color)',
											textDecoration: 'none',
										}}
									>
										<LuDownload size={14} /> {__('Download', 'zencommunity')}
									</a>
								)}
							</Flex>
						))}
					</Flex>
				)}
			</Box>
		</Box>
	);
};

export default ResourceLibrary;
