import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { LuCircleHelp, LuMessageCircle } from 'react-icons/lu';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import { site_url } from '@Utils/helper';
import { fetchCourseQA } from './api';

const CourseQA = ({ courseId }) => {
	const [items, setItems] = useState([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!courseId) return;
		setLoading(true);
		fetchCourseQA(courseId, { page, per_page: 10 })
			.then((d) => { setItems(d.items || []); setTotalPages(d.total_pages || 1); })
			.catch(() => { setItems([]); setTotalPages(1); })
			.finally(() => setLoading(false));
	}, [courseId, page]);

	if (!loading && items.length === 0 && page === 1) {
		return null; // No Q&A activity yet — don't clutter the course page with an empty section.
	}

	return (
		<div className="tw-rounded-xl tw-border tw-border-zc-border tw-bg-zc-bg tw-p-5">
			<div className="tw-flex tw-items-center tw-gap-2">
				<LuCircleHelp size={18} className="tw-text-zc-primary" />
				<h2 className="tw-text-base tw-font-semibold tw-text-zc-fg">{__('Course Q&A', 'zencommunity')}</h2>
			</div>
			<p className="tw-mt-1 tw-text-sm tw-text-zc-muted">
				{__('Questions and answers from learners taking this course.', 'zencommunity')}
			</p>

			<div className="tw-mt-3 tw-flex tw-flex-col tw-gap-3">
				{loading ? (
					[1, 2, 3].map((i) => (
						<div key={i} className="tw-flex tw-items-start tw-gap-2.5">
							<div className="tw-h-9 tw-w-9 tw-flex-shrink-0 tw-animate-pulse tw-rounded-full tw-bg-zc-hover" />
							<div className="tw-flex-1 tw-space-y-1.5">
								<div className="tw-h-3 tw-w-2/5 tw-animate-pulse tw-rounded tw-bg-zc-hover" />
								<div className="tw-h-3.5 tw-w-11/12 tw-animate-pulse tw-rounded tw-bg-zc-hover" />
							</div>
						</div>
					))
				) : (
					items.map((item) => (
						<div key={item.id} className="tw-flex tw-items-start tw-gap-2.5 tw-rounded-lg tw-bg-zc-hover tw-p-3">
							<div className="tw-flex-shrink-0">
								{item.event === 'question_answer'
									? <LuMessageCircle size={18} className="tw-text-zc-primary" />
									: <LuCircleHelp size={18} className="tw-text-zc-primary" />}
							</div>
							<div className="tw-min-w-0 tw-flex-1">
								<ZenComAvatar
									size="xs"
									variant="default"
									userName={item.author?.name}
									userMail={item.event === 'question_answer' ? __('answered', 'zencommunity') : __('asked a question', 'zencommunity')}
									src={item.author?.avatar_url ? site_url + item.author.avatar_url : ''}
								/>
								<div className="zencom-course-detail__content tw-mt-2 tw-text-sm tw-text-zc-fg"
									dangerouslySetInnerHTML={{ __html: item.content.replace(/^<h3[^>]*>.*?<\/h3>/, '') }} />
							</div>
						</div>
					))
				)}
			</div>

			{totalPages > 1 && !loading && (
				<div className="tw-mt-4 tw-flex tw-items-center tw-justify-center tw-gap-3">
					<button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
						className="tw-rounded-md tw-border tw-border-zc-border tw-px-4 tw-py-2 tw-text-sm tw-text-zc-fg disabled:tw-opacity-40 hover:tw-bg-zc-hover">
						{__('Previous', 'zencommunity')}
					</button>
					<span className="tw-px-2 tw-text-sm tw-text-zc-muted">{page} / {totalPages}</span>
					<button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						className="tw-rounded-md tw-border tw-border-zc-border tw-px-4 tw-py-2 tw-text-sm tw-text-zc-fg disabled:tw-opacity-40 hover:tw-bg-zc-hover">
						{__('Next', 'zencommunity')}
					</button>
				</div>
			)}
		</div>
	);
};

export default CourseQA;
