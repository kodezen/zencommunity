import React, { useEffect, useState, useCallback } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { useNavigate } from 'react-router-dom';
import { Box, Flex, Text, Button, Stack, Skeleton, SkeletonCircle } from '@chakra-ui/react';
import { LuCrown, LuTrophy, LuArrowUp, LuArrowDown, LuMinus } from 'react-icons/lu';
import LeftContainer from '@Components/Layouts/LeftContainer';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';
import CenterContainer from '@Components/Layouts/CenterContainer';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import Subtext from '@Components/Labels/Subtext';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import { plugin_root_url } from '@Utils/helper';
import { useStyles } from '../../utils/chakra';
import { fetchLeaderboard } from '@Pages/Gamification/api';
import useThemeStyles from '@Hooks/useThemeStyles';

const medalColor = (pos) => (pos === 1 ? '#EAB308' : pos === 2 ? '#9CA3AF' : pos === 3 ? '#B45309' : 'var(--zencom-font-color)');

const PERIODS = [
	{ key: 'week', label: __('This week', 'zencommunity') },
	{ key: 'month', label: __('This month', 'zencommunity') },
	{ key: 'all', label: __('All time', 'zencommunity') },
];

const PeriodTabs = ({ period, onChange }) => {
	const { isDark } = useThemeStyles();

	return (
		<Flex
			border="1px solid var(--zencom-border-color)"
			borderRadius="6px"
			overflow="hidden"
			flexShrink={0}
		>
			{PERIODS.map((p) => (
				<Button
					key={p.key}
					size="xs"
					variant="plain"
					borderRadius="0"
					px="14px"
					bg={period === p.key ? (isDark ? 'var(--zencom-secondary-color)' : 'var(--zencom-primary-color)') : 'transparent'}
					color={period === p.key ? (isDark ? 'var(--zencom-font-color)' : 'white') : 'var(--zencom-font-color)'}
					onClick={() => onChange(p.key)}
				>
					{p.label}
				</Button>
			))}
		</Flex>
	);
};

// Position movement vs the previous period: ↑ green, ↓ red, — neutral.
const TrendChip = ({ delta }) => {
	const up = Number(delta) > 0;
	const down = Number(delta) < 0;
	const Icon = up ? LuArrowUp : down ? LuArrowDown : LuMinus;
	const color = up ? '#0CAF60' : down ? 'var(--zencom-warning)' : 'var(--zencom-font-muted)';
	const bg = up ? 'rgba(12, 175, 96, 0.12)' : down ? 'rgba(226, 72, 61, 0.12)' : 'var(--zencom-secondary-color)';
	const label = up ? `+${delta}` : down ? `${delta}` : '0';

	return (
		<Flex
			display="inline-flex"
			alignItems="center"
			justifyContent="center"
			gap="4px"
			px="10px"
			py="3px"
			borderRadius="999px"
			bg={bg}
			color={color}
		>
			<Icon size={12} />
			<Text fontSize="13px" fontWeight="600">{label}</Text>
		</Flex>
	);
};

const MeBanner = ({ me }) => {
	if (!me) return null;
	return (
		<Flex
			mt={4}
			alignItems="center"
			gap="12px"
			p="12px 16px"
			bg="var(--zencom-background)"
			border="1px solid var(--zencom-primary-color)"
			borderRadius="8px"
		>
			<ZenComAvatar size="md" variant="default" userName={me.name} src={me.avatar} showUserName={false} />

			<Box flex="1" minWidth="0">
				<Flex alignItems="center" gap="8px">
					<Text fontSize="14px" fontWeight="700" color="var(--zencom-font-color)">{me.name}</Text>
					{me.position && (
						<Text fontSize="12px" fontWeight="600" color="var(--zencom-font-muted)"
							bg="var(--zencom-secondary-color)" px="6px" borderRadius="4px">
							#{me.position}
						</Text>
					)}
				</Flex>
				<Text fontSize="13px" color="var(--zencom-font-muted)">
					{me.rank?.title || __('Unranked', 'zencommunity')}
					{me.next_rank?.title ? (
						<>
							{' . '}
							<Text as="span" color="var(--zencom-primary-color)" fontWeight="600">
								{sprintf(__('%s pts', 'zencommunity'), me.next_rank.points_needed)}
							</Text>{' '}
							{sprintf(__('to reach %s', 'zencommunity'), me.next_rank.title)}
						</>
					) : null}
				</Text>
			</Box>

			<Flex alignItems="center" gap="6px" color="var(--zencom-primary-color)" flexShrink={0}>
				<LuTrophy size={16} />
				<Text fontSize="15px" fontWeight="700">
					{sprintf(__('%s pts', 'zencommunity'), me.points)}
				</Text>
			</Flex>
		</Flex>
	);
};

const Leaderboard = () => {
	const navigate = useNavigate();
	const { secondaryBtn } = useStyles();
	const [items, setItems] = useState([]);
	const [me, setMe] = useState(null);
	const [period, setPeriod] = useState('week');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const perPage = 20;

	const load = useCallback(() => {
		setLoading(true);
		fetchLeaderboard({ page, per_page: perPage, period })
			.then((d) => { setItems(d.items || []); setTotal(d.total || 0); setMe(d.me || null); })
			.catch(() => { setItems([]); setMe(null); })
			.finally(() => setLoading(false));
	}, [page, period]);

	useEffect(load, [load]);

	const changePeriod = (key) => { setPeriod(key); setPage(1); };
	const totalPages = Math.max(1, Math.ceil(total / perPage));
	const showTrend = period !== 'all';

	return (
		<>
			<LeftContainer><LeftSidebar /></LeftContainer>
			<CenterContainer>
				<Box p={6} width="100%" className="zencom-animate-fade">
					<Flex alignItems="center" justifyContent="space-between" gap={3} flexWrap="wrap">
						<Box>
							<ZCLabel type="heading" label={__('Leaderboard', 'zencommunity')} />
							<Subtext mt="4px" mb="4px">
								{__('Top members by community points.', 'zencommunity')}
							</Subtext>
						</Box>
						<PeriodTabs period={period} onChange={changePeriod} />
					</Flex>

					{!loading && <MeBanner me={me} />}

					<Box mt={4} bg="var(--zencom-background)" borderRadius="8px" overflow="hidden">
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
							<>
								<Flex
									alignItems="center"
									gap="12px"
									p="10px 20px"
									bg="var(--zencom-secondary-color)"
									fontSize="13px"
									fontWeight="600"
									color="var(--zencom-font-muted)"
								>
									<Box width="52px" flexShrink={0}>{__('Rank', 'zencommunity')}</Box>
									<Box flex="1">{__('Member', 'zencommunity')}</Box>
									{showTrend && <Box width="72px" flexShrink={0} textAlign="center">{__('Trend', 'zencommunity')}</Box>}
									<Box width="60px" flexShrink={0} textAlign="right">{__('Points', 'zencommunity')}</Box>
								</Flex>

								{items.map((row, idx) => (
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
										_hover={{ bg: 'var(--zencom-secondary-color)' }}
										cursor="pointer"
									>
										<Flex width="52px" flexShrink={0} alignItems="center" gap="6px">
											<Text fontSize="14px" fontWeight="700" color="var(--zencom-font-color)">
												{String(row.position).padStart(2, '0')}
											</Text>
											{row.position <= 3 && <LuCrown size={16} color={medalColor(row.position)} />}
										</Flex>

										<Box flex="1" minWidth="0">
											<ZenComAvatar
											    userID={row.user_id}
												size="md"
												variant="default"
												userName={row.name}
												userMail={row.rank?.title || ''}
												src={row.avatar}
											/>
										</Box>

										{showTrend && (
											<Flex width="72px" flexShrink={0} justifyContent="center">
												<TrendChip delta={row.delta} />
											</Flex>
										)}

										<Box width="60px" flexShrink={0} textAlign="right">
											<Text fontSize="14px" fontWeight="700" color="var(--zencom-font-color)">{row.points}</Text>
										</Box>
									</Flex>
								))}
							</>
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
			</CenterContainer>
		</>
	);
};

export default Leaderboard;
