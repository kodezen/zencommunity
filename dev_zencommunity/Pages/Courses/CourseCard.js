import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Flex, GridItem, Image, Text } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { LuBookOpen, LuClock, LuStar, LuPackage } from 'react-icons/lu';
import { useStyles } from '../../utils/chakra';
import Subtext from '@Components/Labels/Subtext';

const CategoryPill = ({ label }) => (
	<Text
		fontSize="12px"
		fontWeight="500"
		lineHeight="16px"
		px="8px"
		py="2px"
		borderRadius="4px"
		bg="var(--zencom-primary-light)"
		color="var(--zencom-primary-color)"
		textTransform="capitalize"
		flexShrink={0}
	>
		{label}
	</Text>
);

const EnrolledPill = () => (
	<Text
		fontSize="12px"
		fontWeight="500"
		lineHeight="16px"
		px="8px"
		py="2px"
		borderRadius="4px"
		bg="var(--zencom-secondary-color)"
		color="var(--zencom-font-color)"
		flexShrink={0}
	>
		{__('Enrolled', 'zencommunity')}
	</Text>
);

const Thumbnail = ({ course, ...rest }) => (
	<Link to={`/course/${course.id}`}>
		{course.thumbnail ? (
			<Image src={course.thumbnail} alt={course.title} objectFit="cover" width="full" {...rest} />
		) : (
			<Flex
				width="full"
				alignItems="center"
				justifyContent="center"
				bg="var(--zencom-primary-light)"
				color="var(--zencom-primary-color)"
				{...rest}
			>
				<LuBookOpen size={32} />
			</Flex>
		)}
	</Link>
);

const metaIconColor = "color-mix(in srgb, var(--zencom-font-color) 60%, transparent)";

const MetaRow = ({ course }) => (
	<Flex flexWrap="wrap" gap="16px" mt="2px">
		{course.rating?.count > 0 && (
			<Flex alignItems="center" gap="4px">
				<LuStar size={14} color={metaIconColor} />
				<Subtext fontSize="13px" margin="0">{Number(course.rating.average).toFixed(1)}</Subtext>
			</Flex>
		)}
		{course.is_scorm ? (
			<Flex alignItems="center" gap="4px">
				<LuPackage size={14} color={metaIconColor} />
				<Subtext fontSize="13px" margin="0">{__('SCORM course', 'zencommunity')}</Subtext>
			</Flex>
		) : course.lesson_count > 0 && (
			<Flex alignItems="center" gap="4px">
				<LuBookOpen size={14} color={metaIconColor} />
				<Subtext fontSize="13px" margin="0">{course.lesson_count} {__('lessons', 'zencommunity')}</Subtext>
			</Flex>
		)}
		{course.duration && (
			<Flex alignItems="center" gap="4px">
				<LuClock size={14} color={metaIconColor} />
				<Subtext fontSize="13px" margin="0">{course.duration}</Subtext>
			</Flex>
		)}
	</Flex>
);

const PriceOrStatus = ({ course }) => {
	const { isDark } = useStyles();

	return course.is_enrolled ? (
		<EnrolledPill />
	) : (
		<Text
			className="zencom-price"
			fontSize="13px"
			fontWeight="600"
			color={isDark ? "var(--zencom-font-color)" : "var(--zencom-primary-color)"}
			dangerouslySetInnerHTML={{ __html: course.price_html }}
		/>
	);
};

const CourseCard = ({ course, variant = 'grid' }) => {
	const { primaryBtnInsideContentTrans } = useStyles();

	if (variant === 'list') {
		return (
			<Flex
				bg="var(--zencom-background)"
				borderRadius="8px"
				overflow="hidden"
				flexDirection={{ base: 'column', md: 'row' }}
			>
				<Box flexShrink={0} width={{ base: '100%', md: '220px' }}>
					<Thumbnail course={course} height={{ base: '160px', md: '100%' }} minHeight={{ md: '160px' }} />
				</Box>

				<Flex flex="1" flexDirection="column" p="16px" gap="8px" minWidth="0">
					<Flex justifyContent="space-between" alignItems="center" gap="8px">
						{course.categories?.[0] ? <CategoryPill label={course.categories[0].name} /> : <span />}
						<PriceOrStatus course={course} />
					</Flex>

					<Link to={`/course/${course.id}`}>
						<Text fontSize="16px" fontWeight="600" color="var(--zencom-font-color)" lineClamp="2">
							{course.title}
						</Text>
					</Link>

					{course.author && (
						<Subtext fontSize="13px">{__('By', 'zencommunity')} {course.author}</Subtext>
					)}

					<MetaRow course={course} />

					<Box mt="auto" pt="8px">
						<Link to={`/course/${course.id}`}>
							<Button {...primaryBtnInsideContentTrans} width={{ base: '100%', md: 'fit-content' }}>
								{__('View course', 'zencommunity')}
							</Button>
						</Link>
					</Box>
				</Flex>
			</Flex>
		);
	}

	return (
		<GridItem bg="var(--zencom-background)" borderRadius="8px" overflow="hidden" height="fit-content">
			<Thumbnail course={course} height="185px" borderRadius="8px 8px 0 0" />

			<Flex flexDirection="column" p="16px" gap="8px">
				<Flex justifyContent="space-between" alignItems="center" gap="8px">
					{course.categories?.[0] ? <CategoryPill label={course.categories[0].name} /> : <span />}
					<PriceOrStatus course={course} />
				</Flex>

				<Link to={`/course/${course.id}`}>
					<Text fontSize="16px" fontWeight="600" color="var(--zencom-font-color)" lineClamp="2">
						{course.title}
					</Text>
				</Link>

				{course.author && (
					<Subtext fontSize="13px">{__('By', 'zencommunity')} {course.author}</Subtext>
				)}

				<MetaRow course={course} />

				<Box mt="8px">
					<Link to={`/course/${course.id}`}>
						<Button {...primaryBtnInsideContentTrans} width="100%">
							{__('View course', 'zencommunity')}
						</Button>
					</Link>
				</Box>
			</Flex>
		</GridItem>
	);
};

export default CourseCard;
