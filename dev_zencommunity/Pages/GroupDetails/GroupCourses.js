import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import CourseCard from '@Pages/Courses/CourseCard';
import { fetchGroupCourses } from '@Pages/Courses/api';

const PER_PAGE = 12;

const GroupCourses = ({ groupId }) => {
	const [items, setItems] = useState([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);

	// Reset to the first page when switching between spaces.
	useEffect(() => { setPage(1); }, [groupId]);

	useEffect(() => {
		if (!groupId) return;
		setLoading(true);
		fetchGroupCourses(groupId, { page, per_page: PER_PAGE })
			.then((data) => {
				setItems(data.items || []);
				setTotalPages(data.total_pages || 1);
			})
			.catch(() => setItems([]))
			.finally(() => setLoading(false));
	}, [groupId, page]);

	if (loading) {
		return (
			<div className="tw-grid tw-grid-cols-1 tw-gap-5 tw-pt-5 md:tw-grid-cols-2">
				{Array.from({ length: 2 }).map((_, i) => (
					<div key={i} className="tw-h-[290px] tw-animate-pulse tw-rounded-xl tw-bg-zc-skeleton" />
				))}
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className="tw-flex tw-flex-col tw-items-center tw-gap-1.5 tw-py-14 tw-text-center">
				<p className="tw-text-base tw-font-semibold tw-text-zc-fg">{__('No courses linked to this space yet', 'zencommunity')}</p>
				<p className="tw-text-sm tw-text-zc-muted">{__('Linked courses will appear here.', 'zencommunity')}</p>
			</div>
		);
	}

	return (
		<>
			<div className="tw-grid tw-grid-cols-1 tw-gap-5 tw-pt-5 md:tw-grid-cols-2">
				{items.map((course) => <CourseCard key={course.id} course={course} />)}
			</div>

			{totalPages > 1 && (
				<div className="tw-mt-8 tw-flex tw-items-center tw-justify-center tw-gap-3">
					<button
						type="button"
						disabled={page <= 1}
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						className="tw-flex tw-items-center tw-gap-1 tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-1.5 tw-text-sm tw-text-zc-fg disabled:tw-cursor-not-allowed disabled:tw-opacity-50 hover:enabled:tw-bg-zc-secondary"
					>
						<LuChevronLeft size={16} /> {__('Previous', 'zencommunity')}
					</button>
					<span className="tw-text-sm tw-text-zc-muted">{page} / {totalPages}</span>
					<button
						type="button"
						disabled={page >= totalPages}
						onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						className="tw-flex tw-items-center tw-gap-1 tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-1.5 tw-text-sm tw-text-zc-fg disabled:tw-cursor-not-allowed disabled:tw-opacity-50 hover:enabled:tw-bg-zc-secondary"
					>
						{__('Next', 'zencommunity')} <LuChevronRight size={16} />
					</button>
				</div>
			)}
		</>
	);
};

export default GroupCourses;
