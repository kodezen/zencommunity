import React, { useEffect, useState, useCallback } from 'react';
import { __ } from '@wordpress/i18n';
import { useNavigate } from 'react-router-dom';
import { Box, Flex, Button, Stack, Skeleton, SkeletonCircle } from '@chakra-ui/react';
import { LuCrown } from 'react-icons/lu';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import Subtext from '@Components/Labels/Subtext';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import { plugin_root_url } from '@Utils/helper';
import { useStyles } from '../../../utils/chakra';
import { fetchLeaderboard, gameengineConfig } from '@Pages/Gamification/api';

const medalColor = (pos) => (pos === 1 ? '#EAB308' : pos === 2 ? '#9CA3AF' : pos === 3 ? '#B45309' : 'var(--zencom-font-color)');

const Leaderboard = ({ userId }) => {
	const navigate = useNavigate();
	const { secondaryBtn } = useStyles();
	const [items, setItems] = useState([]);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const perPage = 20;

	const load = useCallback(() => {
		if (!gameengineConfig.enabled || !gameengineConfig.show_leaderboard) {
			setLoading(false);
			return;
		}
		setLoading(true);
		fetchLeaderboard({ page, per_page: perPage })
			.then((d) => { setItems(d.items || []); setTotal(d.total || 0); })
			.catch(() => setItems([]))
			.finally(() => setLoading(false));
	}, [page]);

	useEffect(load, [load]);

	const totalPages = Math.max(1, Math.ceil(total / perPage));

	if (!gameengineConfig.enabled || !gameengineConfig.show_leaderboard) {
		return null;
	}

	return (
		<Box mt={6} className="zencom-animate-fade">
			<Box bg="var(--zencom-background)" borderRadius="4px" overflow="hidden">
				{loading ? (
					<Stack gap="0">
						{[1, 2, 3, 4, 5].map((i) => (
							<Flex key={i} alignItems="center" gap="12px" p="14px 20px"
								borderBottom={i < 5 ? '1px solid var(--zencom-border-color)' : 'none'}>
								<Skeleton height="16px" width="20px" />
								<SkeletonCircle size="10" />
								<Stack gap="6px" flex="1">
									<Skeleton height="14px" width="40%" />
									<Skeleton height="10px" width="25%" />
								</Stack>
								<Skeleton height="14px" width="40px" />
							</Flex>
						))}
					</Stack>
				) : items.length === 0 ? (
					<Flex direction="column" align="center" justify="center" height="40vh" gap={4}>
						<Box as="img" src={plugin_root_url + '/assets/images/nothingFound.svg'} alt="" />
						<ZCLabel type="simple" fontSize="20px" fontWeight="600" label={__('No rankings yet', 'zencommunity')} />
						<ZCLabel type="simple" fontSize="14px" label={__('Earn points by participating in the community.', 'zencommunity')} />
					</Flex>
				) : (
					items.map((row, idx) => (
						<Flex
							key={row.user_id}
							as="button"
							type="button"
							onClick={() => navigate('/member/' + row.user_id)}
							width="100%"
							alignItems="center"
							gap="12px"
							p="14px 20px"
							textAlign="left"
							borderBottom={idx < items.length - 1 ? '1px solid var(--zencom-border-color)' : 'none'}
							bg={Number(row.user_id) === Number(userId) ? 'var(--zencom-secondary-color)' : 'transparent'}
							_hover={{ bg: 'var(--zencom-secondary-color)' }}
							cursor="pointer"
						>
							<Flex width="28px" flexShrink={0} alignItems="center" justifyContent="center"
								fontSize="14px" fontWeight="700" color={medalColor(row.position)}>
								{row.position <= 3 ? <LuCrown size={18} /> : row.position}
							</Flex>

							<ZenComAvatar
							    userID={row.user_id}
								size="md"
								variant="default"
								userName={row.name}
								userMail={row.rank?.title || ''}
								src={row.avatar}
							/>

							<Box flex="1" />

							<ZCLabel type="simple" fontSize="14px" fontWeight="600" color="var(--zencom-primary-color)" label={row.points} />
						</Flex>
					))
				)}
			</Box>

			{totalPages > 1 && !loading && (
				<Flex mt={6} alignItems="center" justifyContent="center" gap={3}>
					<Button {...secondaryBtn} border="1px solid var(--zencom-border-color)" disabled={page <= 1}
						onClick={() => setPage((p) => Math.max(1, p - 1))}>
						{__('Previous', 'zencommunity')}
					</Button>
					<Subtext margin="0 8px">{page} / {totalPages}</Subtext>
					<Button {...secondaryBtn} border="1px solid var(--zencom-border-color)" disabled={page >= totalPages}
						onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
						{__('Next', 'zencommunity')}
					</Button>
				</Flex>
			)}
		</Box>
	);
};

export default Leaderboard;
