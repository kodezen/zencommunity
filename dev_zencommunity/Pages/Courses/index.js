import React, { useCallback, useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Box, Button, Flex, Grid, GridItem, Image, Skeleton, Stack } from '@chakra-ui/react';
import { LuLayoutGrid, LuLayoutList } from 'react-icons/lu';
import Select from '@Components/ReactSelect';
import LeftContainer from '@Components/Layouts/LeftContainer';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';
import CenterContainer from '@Components/Layouts/CenterContainer';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import ZenComSearch from '@Components/Chakra/Search';
import Subtext from '@Components/Labels/Subtext';
import { plugin_root_url } from '@Utils/helper';
import { useStyles } from '../../utils/chakra';
import CourseCard from './CourseCard';
import { fetchCourses, fetchCourseCategories } from './api';
import './styles.scss';

const Courses = () => {
	const { responsiveContent3, secondaryBtn } = useStyles();
	const [items, setItems] = useState([]);
	const [categories, setCategories] = useState([]);
	const [search, setSearch] = useState('');
	const [category, setCategory] = useState(0);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [viewMode, setViewMode] = useState(localStorage.getItem('zencom_courses_view') || 'grid');

	const changeViewMode = (mode) => {
		setViewMode(mode);
		localStorage.setItem('zencom_courses_view', mode);
	};

	useEffect(() => {
		fetchCourseCategories().then(setCategories).catch(() => {});
	}, []);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const data = await fetchCourses({ search, category, page, per_page: 9 });
			setItems(data.items || []);
			setTotalPages(data.total_pages || 1);
		} catch (e) {
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [search, category, page]);

	// Debounce search; instant for filter/page changes.
	useEffect(() => {
		const t = setTimeout(load, search ? 350 : 0);
		return () => clearTimeout(t);
	}, [load]);

	const categoryOptions = [
		{ value: 0, label: __('All categories', 'zencommunity') },
		...categories.map((c) => ({ value: c.id, label: `${c.name} (${c.count})` })),
	];

	return (
		<>
			<LeftContainer>
				<LeftSidebar />
			</LeftContainer>

			<CenterContainer>
				<Box p={6} {...responsiveContent3}>
					{/* Title on the left; search, category and view toggle share one row on the right. */}
					<Flex alignItems="center" justifyContent="space-between" gap={4} flexWrap="wrap" width="100%" mb="2rem">
						<Box minWidth={0}>
							<ZCLabel type="heading" label={__('Courses', 'zencommunity')} />
							<Subtext mt="4px" mb="0">
								{__('Browse and enroll in courses without leaving the community.', 'zencommunity')}
							</Subtext>
						</Box>

						<Flex alignItems="center" gap="8px" flexWrap={{ base: 'wrap', md: 'nowrap' }} width={{ base: '100%', md: 'auto' }}>
							<ZenComSearch
								value={search}
								changeHandler={(e) => { setPage(1); setSearch(e.target.value); }}
								width={{ base: '100%', md: '260px' }}
							/>

							{categoryOptions.length > 1 && (
								<Select
									className="zen-com-select zen-com-select--200"
									classNamePrefix="zen-com-select"
									aria-label={__('Category', 'zencommunity')}
									options={categoryOptions}
									value={categoryOptions.find((o) => o.value === category) || categoryOptions[0]}
									onChange={(option) => { setPage(1); setCategory(option ? option.value : 0); }}
								/>
							)}

							<Flex gap="6px" flexShrink={0} marginInlineStart={{ base: 'auto', md: 0 }}>
								{[
									{ mode: 'grid', icon: LuLayoutGrid, label: __('Grid view', 'zencommunity') },
									{ mode: 'list', icon: LuLayoutList, label: __('List view', 'zencommunity') },
								].map(({ mode, icon: ViewIcon, label }) => (
									<Button
										key={mode}
										variant="plain"
										aria-label={label}
										title={label}
										aria-pressed={viewMode === mode}
										width="36px"
										minWidth="36px"
										height="36px"
										padding="0"
										border="1px solid var(--zencom-border-color)"
										borderRadius="6px"
										bg={viewMode === mode ? 'var(--zencom-primary-light)' : 'var(--zencom-background)'}
										color={viewMode === mode ? 'var(--zencom-primary-color)' : 'var(--zencom-font-color)'}
										onClick={() => changeViewMode(mode)}
									>
										<ViewIcon size={16} />
									</Button>
								))}
							</Flex>
						</Flex>
					</Flex>

					{loading ? (
						<Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={6}>
							{[1, 2, 3].map((i) => (
								<GridItem key={i} bg="var(--zencom-background)" borderRadius="4px" overflow="hidden">
									<Skeleton height="185px" />
									<Flex direction="column" gap={3} p={4}>
										<Skeleton height="16px" width="40%" />
										<Skeleton height="20px" width="80%" />
										<Skeleton height="16px" width="60%" />
										<Skeleton height="36px" />
									</Flex>
								</GridItem>
							))}
						</Grid>
					) : items.length === 0 ? (
						<Flex direction="column" align="center" justify="center" height="60vh" gap={4} mt={4}>
							<Image src={plugin_root_url + "/assets/images/nothingFound.svg"} />
							<ZCLabel type="simple" fontSize="20px" fontWeight="600" label={__('No courses found', 'zencommunity')} />
							<ZCLabel type="simple" fontSize="14px" label={__('Try a different search or category.', 'zencommunity')} />
						</Flex>
					) : viewMode === 'list' ? (
						<Stack gap={4} mt={4}>
							{items.map((course) => (
								<CourseCard key={course.id} course={course} variant="list" />
							))}
						</Stack>
					) : (
						<Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={6} mt={4}>
							{items.map((course) => (
								<CourseCard key={course.id} course={course} />
							))}
						</Grid>
					)}

					{totalPages > 1 && !loading && (
						<Flex mt={8} alignItems="center" justifyContent="center" gap={3}>
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

export default Courses;
