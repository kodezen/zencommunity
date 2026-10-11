import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { __ } from '@wordpress/i18n';
import { LuBookOpen, LuClock, LuStar, LuUsers, LuArrowLeft, LuPlay, LuCheck, LuLock, LuCircleHelp, LuClipboardList, LuVideo, LuCalendar, LuChevronDown, LuChevronUp, LuAward, LuPackage } from 'react-icons/lu';
import LeftContainer from '@Components/Layouts/LeftContainer';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';
import CenterContainer from '@Components/Layouts/CenterContainer';
import { useDispatch } from 'react-redux';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { current_logged_user, baseURL } from '@Utils/helper';
import CheckoutDrawer from './CheckoutDrawer';
import CourseQA from './CourseQA';
import CourseReviews from './CourseReviews';
import { fetchCourse, enrollFreeCourse, academyConfig } from './api';
import './styles.scss';

const TOPIC_ICONS = {
	lesson: LuPlay,
	quiz: LuCircleHelp,
	assignment: LuClipboardList,
	meeting: LuVideo,
	booking: LuCalendar,
	'sub-curriculum': LuBookOpen,
};

const CurriculumTopic = ({ topic, depth = 0, index }) => {
	const Icon = TOPIC_ICONS[topic.type] || LuBookOpen;

	return (
		<>
			<div className={`tw-flex tw-items-center tw-justify-between tw-gap-3 tw-py-2.5 ${index !== 0 ? 'tw-border-t tw-border-zc-border' : ''}`}
				style={{ paddingLeft: `${depth * 20}px` }}>
				<div className="tw-flex tw-min-w-0 tw-items-center tw-gap-2.5">
					<Icon size={16} className={topic.is_accessible ? 'tw-text-zc-primary' : 'tw-text-zc-muted'} />
					<span className={`tw-truncate tw-text-sm ${topic.is_accessible ? 'tw-text-zc-fg' : 'tw-text-zc-muted'}`}>
						{topic.name}
					</span>
				</div>
				<div className="tw-flex tw-flex-shrink-0 tw-items-center tw-gap-2.5">
					{topic.duration && <span className="tw-text-xs tw-text-zc-muted">{topic.duration}</span>}
					{topic.is_completed ? (
						<LuCheck size={16} className="tw-text-green-600" />
					) : !topic.is_accessible ? (
						<LuLock size={14} className="tw-text-zc-muted" />
					) : null}
				</div>
			</div>
			{(topic.topics || []).map((sub) => (
				<CurriculumTopic key={sub.id || sub.name} topic={sub} depth={depth + 1} />
			))}
		</>
	);
};

const CurriculumSection = ({ section, index, defaultOpen = false }) => {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const topics = section.topics || [];

	return (
		<div className="tw-overflow-hidden tw-rounded tw-border tw-border-zc-border">
			<button type="button" onClick={() => setIsOpen((o) => !o)}
				className="tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-3 tw-bg-zc-hover tw-px-4 tw-py-3">
				<span className="tw-text-sm tw-font-semibold tw-text-zc-fg">
					{section.title || `${__('Section', 'zencommunity')} ${index + 1}`}
				</span>
				<div className="tw-flex tw-flex-shrink-0 tw-items-center tw-gap-2.5">
					<span className="tw-text-xs tw-text-zc-muted">{topics.length} {__('items', 'zencommunity')}</span>
					{isOpen ? <LuChevronUp size={16} className="tw-text-zc-muted" /> : <LuChevronDown size={16} className="tw-text-zc-muted" />}
				</div>
			</button>
			{isOpen && (
				<div className="tw-px-4">
					{topics.map((topic, index) => (
						<CurriculumTopic key={topic.id || topic.name} index={index} topic={topic} />
					))}
				</div>
			)}
		</div>
	);
};

const CourseDetailSkeleton = () => (
	<div className="tw-w-full tw-animate-pulse">
		<div className="tw-mb-4 tw-h-4 tw-w-24 tw-rounded tw-bg-zc-hover" />
		<div className="tw-mb-6 tw-h-[230px] tw-rounded tw-bg-zc-hover md:tw-h-[300px]" />
		<div className="tw-flex tw-flex-col tw-items-start tw-gap-6 lg:tw-flex-row">
			<div className="tw-w-full tw-flex-1 tw-space-y-5">
				<div className="tw-h-32 tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg" />
				<div className="tw-h-48 tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg" />
			</div>
			<div className="tw-h-72 tw-w-full tw-flex-shrink-0 tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg lg:tw-w-[340px]" />
		</div>
	</div>
);

const CourseDetail = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const dispatch = useDispatch();

	const [course, setCourse] = useState(null);
	const [loading, setLoading] = useState(true);
	const [working, setWorking] = useState(false);
	const [checkout, setCheckout] = useState({ open: false, url: '' });

	const load = () => {
		setLoading(true);
		fetchCourse(id)
			.then(setCourse)
			.catch(() => setCourse(null))
			.finally(() => setLoading(false));
	};

	useEffect(load, [id]);

	const notify = (message, type = 'success') => dispatch(showNotification({ message, type, isShow: true }));

	// Submitting a review updates the rating average/count server-side
	// immediately, but the hero badge above was set from the initial page
	// load and won't reflect it on its own — refetch just that field instead
	// of the full `load()` so we don't flash the whole page back to a spinner.
	const refreshRating = () => {
		fetchCourse(id).then((updated) => {
			setCourse((prev) => (prev ? { ...prev, rating: updated.rating } : updated));
		}).catch(() => {});
	};

	const handleFreeEnroll = async () => {
		if (!current_logged_user?.user_id) { navigate('/signin'); return; }
		// When inline enroll is disabled, hand off to Academy's own page.
		if (!academyConfig.allow_free_enroll) { window.location.href = course.permalink; return; }
		setWorking(true);
		try {
			await enrollFreeCourse(id);
			notify(__('You are enrolled. Happy learning!', 'zencommunity'));
			// Take the learner straight into the native in-community learning
			// experience (server-rendered at {community}/learn/{id}).
			window.location.href = baseURL(`/learn/${id}`);
			return;
		} catch (e) {
			notify(e?.response?.data?.message || __('Could not enroll.', 'zencommunity'), 'error');
		} finally {
			setWorking(false);
		}
	};

	const handleBuy = (option) => {
		if (!current_logged_user?.user_id) { navigate('/signin'); return; }
		if (academyConfig.checkout_mode === 'redirect') { window.location.href = option.checkout_url; return; }
		if (academyConfig.checkout_mode === 'new_tab') { window.open(option.checkout_url, '_blank', 'noopener'); return; }
		setCheckout({ open: true, url: option.checkout_url });
	};

	const closeCheckout = () => {
		setCheckout({ open: false, url: '' });
		load(); // Payment may have completed (and auto-enrolled) inside the drawer.
	};

	const Shell = ({ children }) => (
		<>
			<LeftContainer><LeftSidebar /></LeftContainer>
			<CenterContainer>
				<div className="tw-my-6 tw-w-full tw-min-w-0 tw-p-4 md:tw-px-6 md:tw-py-0 lg:tw-max-w-[calc(100%-100px)] 2xl:tw-max-w-[1020px]">
					{children}
				</div>
			</CenterContainer>
		</>
	);

	if (loading) {
		return <Shell><CourseDetailSkeleton /></Shell>;
	}

	if (!course) {
		return (
			<Shell>
				<div className="tw-flex tw-flex-col tw-items-center tw-gap-3 tw-py-20">
					<p className="tw-text-lg tw-font-semibold tw-text-zc-fg">{__('Course not found', 'zencommunity')}</p>
					<button type="button" onClick={() => navigate('/courses')}
						className="tw-rounded tw-bg-zc-primary tw-px-4 tw-py-2 tw-text-sm tw-font-semibold tw-text-white hover:tw-opacity-90">
						{__('Back to courses', 'zencommunity')}
					</button>
				</div>
			</Shell>
		);
	}

	const purchaseOptions = course.purchase_options || [];
	const isPaid = purchaseOptions.length > 0 && !course.is_enrolled;
	const enrolled = course.is_enrolled || course.can_access;

	const metaItems = [
		course.is_scorm
			? { icon: LuPackage, label: __('SCORM course', 'zencommunity') }
			: course.lesson_count > 0 && { icon: LuBookOpen, label: `${course.lesson_count} ${__('lessons', 'zencommunity')}` },
		course.duration && { icon: LuClock, label: course.duration },
		course.rating?.count > 0 && { icon: LuStar, label: `${Number(course.rating.average).toFixed(1)} (${course.rating.count})` },
		course.author && { icon: LuUsers, label: course.author },
	].filter(Boolean);

	return (
		<>
			<Shell>
				<Link to="/courses" className="tw-mb-4 tw-flex tw-w-fit tw-items-center tw-gap-1.5 tw-text-sm tw-text-zc-muted hover:tw-text-zc-fg">
					<LuArrowLeft size={16} /> {__('All courses', 'zencommunity')}
				</Link>

				{/* Hero */}
				<div className="tw-relative tw-mb-6 tw-min-h-[230px] tw-overflow-hidden tw-rounded tw-bg-zc-primary md:tw-min-h-[300px]">
					{course.thumbnail && (
						<img src={course.thumbnail} alt="" className="tw-absolute tw-inset-0 tw-h-full tw-w-full tw-object-cover" />
					)}
					<div className="tw-absolute tw-inset-0"
						style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.25))' }} />
					<div className="tw-relative tw-flex tw-min-h-[230px] tw-flex-col tw-justify-end tw-gap-3 tw-p-6 md:tw-min-h-[300px] md:tw-p-8">
						{course.categories?.length > 0 && (
							<div className="tw-flex tw-flex-wrap tw-gap-2">
								{course.categories.map((c) => (
									<span key={c.id} className="tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-white tw-backdrop-blur"
										style={{ background: 'rgba(255,255,255,0.2)' }}>
										{c.name}
									</span>
								))}
							</div>
						)}
						<h1 className="tw-max-w-xl tw-text-xl tw-font-bold tw-leading-tight tw-text-white md:tw-text-2xl">
							{course.title}
						</h1>
						<div className="tw-flex tw-flex-wrap tw-gap-x-5 tw-gap-y-2 tw-text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
							{metaItems.map((m, i) => (
								<div key={i} className="tw-flex tw-items-center tw-gap-1.5">
									<m.icon size={15} /> {m.label}
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="tw-flex tw-w-full tw-flex-col tw-items-start tw-gap-6 lg:tw-flex-row">
					{/* Main */}
					<div className="tw-w-full tw-min-w-0 tw-flex-1 tw-space-y-5">
						<div className="tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg tw-p-5">
							<h2 className="tw-mb-3 tw-text-base tw-font-semibold tw-text-zc-fg">{__('About this course', 'zencommunity')}</h2>
							<div
								className="zencom-course-detail__content tw-text-zc-fg"
								dangerouslySetInnerHTML={{ __html: course.content || `<p>${__('No description provided.', 'zencommunity')}</p>` }}
							/>
						</div>

						{course.curriculum?.length > 0 && (
							<div className="tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg tw-p-5">
								<h2 className="tw-mb-0.5 tw-text-base tw-font-semibold tw-text-zc-fg">{__('Curriculum', 'zencommunity')}</h2>
								<p className="tw-mb-3 tw-text-sm tw-text-zc-muted">{__('What this course covers, in order.', 'zencommunity')}</p>
								<div className="tw-flex tw-flex-col tw-gap-2.5">
									{course.curriculum.map((section, idx) => (
										<CurriculumSection key={idx} section={section} index={idx} defaultOpen={idx === 0} />
									))}
								</div>
							</div>
						)}

						{course.groups?.length > 0 && (
							<div className="tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg tw-p-5">
								<h2 className="tw-text-base tw-font-semibold tw-text-zc-fg">{__('Community spaces', 'zencommunity')}</h2>
								<p className="tw-mt-1 tw-text-sm tw-text-zc-muted">{__('Enrolling gives you access to these community spaces.', 'zencommunity')}</p>
								<div className="tw-mt-4 tw-flex tw-flex-wrap tw-gap-2.5">
									{course.groups.map((g) => (
										<button key={g.id} type="button" onClick={() => navigate(`/group/${g.id}`)}
											className="tw-flex tw-items-center tw-gap-1.5 tw-rounded tw-border tw-border-zc-border tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-text-zc-fg hover:tw-bg-zc-hover">
											<LuUsers size={15} /> {g.name}
										</button>
									))}
								</div>
							</div>
						)}

						<CourseReviews courseId={course.id} rating={course.rating} enrolled={enrolled} isComplete={!!course.is_complete} onReviewed={refreshRating} />

						<CourseQA courseId={course.id} />
					</div>

					{/* Sidebar CTA */}
					<div className="tw-sticky tw-top-5 tw-w-full tw-flex-shrink-0 tw-overflow-hidden tw-rounded tw-bg-zc-bg lg:tw-static lg:tw-w-[340px]"
						style={{ }}>
						{course.thumbnail && (
							<div className="tw-relative tw-h-44 tw-w-full">
								<img src={course.thumbnail} alt={course.title} className="tw-h-full tw-w-full tw-object-cover" />
								{course.intro_video?.url && (
									<a href={course.intro_video.url} target="_blank" rel="noopener noreferrer"
										className="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-black/30 tw-text-white hover:tw-bg-black/45">
										<span className="tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-rounded-full tw-bg-white/90 tw-text-zc-primary">
											<LuPlay size={20} />
										</span>
									</a>
								)}
							</div>
						)}

						<div className="tw-p-5">
							{enrolled ? (
								<>
									{course.is_complete ? (
										<div className="tw-mb-3.5 tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-semibold tw-text-green-600">
											<LuAward size={16} /> {__('Course completed', 'zencommunity')}
										</div>
									) : (
										<>
											<div className="tw-mb-2.5 tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-medium tw-text-green-600">
												<LuCheck size={16} /> {__('You are enrolled', 'zencommunity')}
											</div>
											{course.completion_percentage > 0 && (
												<div className="tw-mb-3.5">
													<div className="tw-mb-1.5 tw-flex tw-items-center tw-justify-between tw-text-sm tw-text-zc-muted">
														<span>{__('Progress', 'zencommunity')}</span>
														<span>{course.completion_percentage}%</span>
													</div>
													<div className="tw-h-1.5 tw-overflow-hidden tw-rounded-full tw-bg-zc-hover">
														<div className="tw-h-full tw-rounded-full tw-bg-zc-primary" style={{ width: `${course.completion_percentage}%` }} />
													</div>
												</div>
											)}
										</>
									)}

									<button type="button" onClick={() => { window.location.href = baseURL(`/learn/${course.id}`); }}
										className="tw-flex tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded tw-bg-zc-primary tw-py-2.5 tw-text-sm tw-font-semibold tw-text-white hover:tw-opacity-90">
										<LuPlay size={16} /> {course.is_complete ? __('Review course', 'zencommunity') : __('Start learning', 'zencommunity')}
									</button>

									{course.certificate_url && (
										<button type="button" onClick={() => window.open(course.certificate_url, '_blank', 'noopener')}
											className="tw-mt-2.5 tw-flex tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded tw-border tw-border-zc-border tw-py-2.5 tw-text-sm tw-font-semibold tw-text-zc-fg hover:tw-bg-zc-hover">
											<LuAward size={16} /> {__('View certificate', 'zencommunity')}
										</button>
									)}
								</>
							) : (
								<>
									<div className="zencom-price tw-mb-4 tw-text-2xl tw-font-bold tw-text-zc-fg"
										dangerouslySetInnerHTML={{ __html: course.price_html }} />

									{isPaid ? (
										purchaseOptions.length === 1 ? (
											<button type="button" disabled={working} onClick={() => handleBuy(purchaseOptions[0])}
												className="tw-w-full tw-rounded tw-bg-zc-primary tw-py-2.5 tw-text-sm tw-font-semibold tw-text-white hover:tw-opacity-90 disabled:tw-opacity-40">
												{__('Purchase now', 'zencommunity')}
											</button>
										) : (
											<div className="tw-flex tw-flex-col tw-gap-2.5">
												<p className="tw-text-sm tw-font-medium tw-text-zc-fg">{__('Choose a plan', 'zencommunity')}</p>
												{purchaseOptions.map((opt) => (
													<button key={opt.price_id} type="button" onClick={() => handleBuy(opt)}
														className="tw-flex tw-w-full tw-items-center tw-justify-between tw-rounded tw-border tw-border-zc-border tw-px-3.5 tw-py-2.5 tw-text-sm hover:tw-bg-zc-hover">
														<span className="tw-font-medium tw-text-zc-fg">{opt.price_name || __('Buy', 'zencommunity')}</span>
														<span className="zencom-price tw-font-semibold tw-text-zc-fg" dangerouslySetInnerHTML={{ __html: opt.price_html }} />
													</button>
												))}
											</div>
										)
									) : (
										<button type="button" disabled={working} onClick={handleFreeEnroll}
											className="tw-w-full tw-rounded tw-bg-zc-primary tw-py-2.5 tw-text-sm tw-font-semibold tw-text-white hover:tw-opacity-90 disabled:tw-opacity-40">
											{__('Enroll for free', 'zencommunity')}
										</button>
									)}
								</>
							)}

							{metaItems.length > 0 && (
								<div className="tw-mt-5 tw-flex tw-flex-col tw-gap-2.5 tw-border-t tw-border-zc-border tw-pt-4">
									{metaItems.map((m, i) => (
										<div key={i} className="tw-flex tw-items-center tw-gap-2.5 tw-text-sm tw-text-zc-muted">
											<m.icon size={15} className="tw-text-zc-primary" /> {m.label}
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</Shell>

			<CheckoutDrawer isOpen={checkout.open} url={checkout.url} onClose={closeCheckout} />
		</>
	);
};

export default CourseDetail;
