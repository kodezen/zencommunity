import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useDispatch } from 'react-redux';
import { LuStar } from 'react-icons/lu';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';

// `moment` is provided as a WordPress global script dependency (see other
// components, e.g. PostCard) rather than an npm import — there's no local
// `moment` package to import from.
/* global moment */
import { fetchCourseReviews, submitCourseReview } from './api';

const StarPicker = ({ value, onChange, size = 22, readOnly = false }) => (
	<div className="tw-flex tw-gap-0.5">
		{[1, 2, 3, 4, 5].map((star) => (
			<button
				key={star}
				type={readOnly ? undefined : 'button'}
				className={`tw-flex tw-border-0 tw-bg-transparent tw-p-0 ${readOnly ? 'tw-cursor-default' : 'tw-cursor-pointer'}`}
				onClick={readOnly ? undefined : () => onChange?.(star)}
			>
				<LuStar size={size} color="#F5A623" fill={star <= value ? '#F5A623' : 'none'} />
			</button>
		))}
	</div>
);

const CourseReviews = ({ courseId, rating, enrolled = false, isComplete = false, onReviewed = () => {} }) => {
	const dispatch = useDispatch();

	const [items, setItems] = useState([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(true);
	const [canReview, setCanReview] = useState(false);
	const [userReview, setUserReview] = useState(null);
	const [formOpen, setFormOpen] = useState(false);
	const [formRating, setFormRating] = useState(5);
	const [formText, setFormText] = useState('');

	const notify = (message, type = 'success') => dispatch(showNotification({ message, type, isShow: true }));

	const load = () => {
		if (!courseId) return;
		setLoading(true);
		fetchCourseReviews(courseId, { page, per_page: 10 })
			.then((d) => {
				setItems(d.items || []);
				setTotalPages(d.total_pages || 1);
				setCanReview(!!d.can_review);
				setUserReview(d.user_review || null);
			})
			.catch(() => { setItems([]); setTotalPages(1); setCanReview(false); setUserReview(null); })
			.finally(() => setLoading(false));
	};

	useEffect(load, [courseId, page]);

	const openForm = () => {
		setFormRating(userReview?.rating || 5);
		setFormText(userReview?.review || '');
		setFormOpen(true);
	};

	const handleSubmit = async () => {
		try {
			const res = await submitCourseReview(courseId, { rating: formRating, review: formText });
			notify(__('Thanks for your review!', 'zencommunity'));
			setFormOpen(false);
			setPage(1);
			setItems(res.reviews?.items || []);
			setTotalPages(res.reviews?.total_pages || 1);
			setCanReview(!!res.reviews?.can_review);
			setUserReview(res.reviews?.user_review || null);
			onReviewed();
		} catch (e) {
			notify(e?.response?.data?.message || __('Could not submit your review.', 'zencommunity'), 'error');
		}
	};

	if (!loading && items.length === 0 && page === 1 && !canReview && !(enrolled && !isComplete)) {
		return null; // Nothing to show and nothing the viewer can do here.
	}

	return (
		<div className="tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg tw-p-5">
			<div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2.5">
				<div className="tw-flex tw-items-center tw-gap-2">
					<LuStar size={18} className="tw-text-zc-primary" />
					<h2 className="tw-text-base tw-font-semibold tw-text-zc-fg">{__('Reviews', 'zencommunity')}</h2>
				</div>

				{!formOpen && canReview && (
					<button type="button" onClick={openForm}
						className="tw-rounded tw-border tw-border-zc-border tw-px-3 tw-py-1.5 tw-text-sm tw-font-medium tw-text-zc-fg hover:tw-bg-zc-hover">
						{userReview ? __('Edit your review', 'zencommunity') : __('Write a review', 'zencommunity')}
					</button>
				)}
			</div>

			{rating?.count > 0 && (
				<div className="tw-mt-4 tw-flex tw-items-center tw-gap-3">
					<span className="tw-text-3xl tw-font-bold tw-text-zc-fg">{Number(rating.average).toFixed(1)}</span>
					<div className="tw-flex tw-flex-col tw-gap-1">
						<StarPicker value={Math.round(rating.average)} readOnly size={16} />
						<span className="tw-text-xs tw-text-zc-muted">
							{rating.count} {rating.count === 1 ? __('review', 'zencommunity') : __('reviews', 'zencommunity')}
						</span>
					</div>
				</div>
			)}

			{!canReview && enrolled && !isComplete && (
				<p className="tw-mt-2 tw-text-sm tw-text-zc-muted">
					{__('Complete this course to leave a review.', 'zencommunity')}
				</p>
			)}

			{formOpen && (
				<div className="tw-mt-3.5 tw-rounded tw-border tw-border-zc-border tw-bg-zc-hover tw-p-3.5">
					<p className="tw-mb-1.5 tw-text-sm tw-font-medium tw-text-zc-fg">{__('Your rating', 'zencommunity')}</p>
					<StarPicker value={formRating} onChange={setFormRating} />

					<p className="tw-mb-1.5 tw-mt-3.5 tw-text-sm tw-font-medium tw-text-zc-fg">{__('Your review (optional)', 'zencommunity')}</p>
					<textarea
						value={formText}
						onChange={(e) => setFormText(e.target.value)}
						placeholder={__('Share your experience with this course...', 'zencommunity')}
						rows={4}
						className="tw-w-full tw-resize-y tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg tw-p-2.5 tw-text-sm tw-text-zc-fg"
					/>

					<div className="tw-mt-3 tw-flex tw-gap-2.5">
						<button type="button" onClick={handleSubmit}
							className="tw-rounded tw-bg-zc-primary tw-px-4 tw-py-2 tw-text-sm tw-font-semibold tw-text-white hover:tw-opacity-90">
							{__('Submit review', 'zencommunity')}
						</button>
						<button type="button" onClick={() => setFormOpen(false)}
							className="tw-rounded tw-border tw-border-zc-border tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-zc-fg hover:tw-bg-zc-hover">
							{__('Cancel', 'zencommunity')}
						</button>
					</div>
				</div>
			)}

			<div className="tw-mt-3.5 tw-flex tw-flex-col tw-gap-3">
				{loading ? (
					[1, 2].map((i) => (
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
						<div key={item.id} className="tw-rounded tw-bg-zc-hover tw-p-3">
							<div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2.5">
								<ZenComAvatar
									size="xs"
									variant="default"
									userName={item.name}
									userMail={moment.utc(item.created_at, 'YYYY-MM-DD HH:mm:ss').local().fromNow()}
									src={item.avatar_url || ''}
								/>
								<StarPicker value={item.rating} readOnly size={14} />
							</div>
							{item.review && (
								<div className="zencom-course-detail__content tw-mt-2 tw-text-sm tw-text-zc-fg"
									dangerouslySetInnerHTML={{ __html: item.review }} />
							)}
						</div>
					))
				)}
			</div>

			{totalPages > 1 && !loading && (
				<div className="tw-mt-4 tw-flex tw-items-center tw-justify-center tw-gap-3">
					<button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
						className="tw-rounded tw-border tw-border-zc-border tw-px-4 tw-py-2 tw-text-sm tw-text-zc-fg disabled:tw-opacity-40 hover:tw-bg-zc-hover">
						{__('Previous', 'zencommunity')}
					</button>
					<span className="tw-px-2 tw-text-sm tw-text-zc-muted">{page} / {totalPages}</span>
					<button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						className="tw-rounded tw-border tw-border-zc-border tw-px-4 tw-py-2 tw-text-sm tw-text-zc-fg disabled:tw-opacity-40 hover:tw-bg-zc-hover">
						{__('Next', 'zencommunity')}
					</button>
				</div>
			)}
		</div>
	);
};

export default CourseReviews;
