import React, { useEffect, useState } from 'react';
import { Box, Flex, Grid, GridItem, Skeleton } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import NoDataPost from '@Components/NoDataPost';
import CourseCard from '../../Courses/CourseCard';
import { fetchMemberCourses } from '../../Courses/api';

const Courses = ({ userId }) => {
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!userId) return;

		setLoading(true);
		fetchMemberCourses(userId)
			.then((data) => setItems(data?.items || []))
			.catch(() => setItems([]))
			.finally(() => setLoading(false));
	}, [userId]);

	return (
		<Box mt="24px" className="zencom-animate-fade" minH="475px">
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
				<Box color="var(--zencom-font-color)">
					<NoDataPost
						title={__('No courses found!', 'zencommunity')}
						subTitle={__('Enrolled courses will show up here.', 'zencommunity')}
					/>
				</Box>
			) : (
				<Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={6}>
					{items.map((course) => (
						<CourseCard key={course.id} course={course} />
					))}
				</Grid>
			)}
		</Box>
	);
};

export default Courses;
