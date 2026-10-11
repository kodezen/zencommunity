import React, { useEffect, useState, useCallback } from 'react';
import { __ } from '@wordpress/i18n';
import { useParams, useNavigate } from 'react-router-dom';
import moment from 'moment';
import { LuTrophy, LuAward, LuLock, LuArrowLeft, LuStar, LuShieldCheck, LuCrown } from 'react-icons/lu';
import LeftContainer from '@Components/Layouts/LeftContainer';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';
import CenterContainer from '@Components/Layouts/CenterContainer';
import { current_logged_user } from '@Utils/helper';
import { gameengineConfig, fetchUserGamification, fetchUserRanks, fetchUserBadges, fetchUserHistory, fetchUserJourney } from './api';

const GamificationDetail = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const userId = id || current_logged_user?.user_id;
	const isOwn = !id || Number(id) === Number(current_logged_user?.user_id);

	const [profile, setProfile] = useState(null);
	const [ranks, setRanks] = useState([]);
	const [badges, setBadges] = useState([]);
	const [journey, setJourney] = useState([]);
	const [history, setHistory] = useState([]);
	const [historyTotal, setHistoryTotal] = useState(0);
	const [historyPage, setHistoryPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [historyLoading, setHistoryLoading] = useState(true);
	const perPage = 20;

	useEffect(() => {
		if (!userId || !gameengineConfig.enabled) {
			setLoading(false);
			return;
		}
		setLoading(true);
		Promise.all([
			fetchUserGamification(userId),
			fetchUserRanks(userId),
			fetchUserBadges(userId),
			fetchUserJourney(userId),
		])
			.then(([p, r, b, j]) => { setProfile(p); setRanks(r || []); setBadges(b || []); setJourney(j || []); })
			.catch(() => { setProfile(null); setRanks([]); setBadges([]); setJourney([]); })
			.finally(() => setLoading(false));
	}, [userId]);

	const loadHistory = useCallback(() => {
		if (!userId || !gameengineConfig.enabled) {
			setHistoryLoading(false);
			return;
		}
		setHistoryLoading(true);
		fetchUserHistory(userId, { page: historyPage, per_page: perPage })
			.then((d) => { setHistory(d.items || []); setHistoryTotal(d.total || 0); })
			.catch(() => { setHistory([]); setHistoryTotal(0); })
			.finally(() => setHistoryLoading(false));
	}, [userId, historyPage]);

	useEffect(loadHistory, [loadHistory]);

	const totalHistoryPages = Math.max(1, Math.ceil(historyTotal / perPage));

	if (!gameengineConfig.enabled) {
		return (
			<>
				<LeftContainer><LeftSidebar /></LeftContainer>
				<CenterContainer>
					<div className="tw-flex tw-flex-col tw-items-center tw-gap-2 tw-py-20 tw-text-center">
						<p className="tw-text-lg tw-font-semibold tw-text-zc-fg">{__('Gamification is not available', 'zencommunity')}</p>
					</div>
				</CenterContainer>
			</>
		);
	}

	return (
		<>
			<LeftContainer><LeftSidebar /></LeftContainer>
			<CenterContainer>
				<div className="tw-my-6 tw-w-full tw-min-w-0 tw-p-4 md:tw-px-6 md:tw-py-0">
					<button type="button" onClick={() => navigate(-1)}
						className="tw-mb-4 tw-flex tw-items-center tw-gap-1.5 tw-text-sm tw-text-zc-muted hover:tw-text-zc-fg">
						<LuArrowLeft size={16} /> {__('Back', 'zencommunity')}
					</button>

					<div className="tw-mb-5 tw-flex tw-items-center tw-gap-2.5">
						<LuTrophy className="tw-text-zc-primary" size={24} />
						<div>
							<h1 className="tw-text-2xl tw-font-semibold tw-text-zc-fg">
								{isOwn ? __('Achievements', 'zencommunity') : __("Member's Achievements", 'zencommunity')}
							</h1>
							<p className="tw-mt-0.5 tw-text-sm tw-text-zc-muted">{__('Ranks, badges, and points history.', 'zencommunity')}</p>
						</div>
					</div>

					{loading ? (
						<div className="tw-animate-pulse">
							<div className="tw-mb-6 tw-flex tw-flex-wrap tw-items-center tw-gap-4 tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg tw-p-5">
								<div className="tw-h-14 tw-w-14 tw-flex-shrink-0 tw-rounded-full tw-bg-zc-hover" />
								<div className="tw-min-w-0 tw-flex-1 tw-space-y-2">
									<div className="tw-h-4 tw-w-32 tw-rounded tw-bg-zc-hover" />
									<div className="tw-h-3 tw-w-16 tw-rounded tw-bg-zc-hover" />
								</div>
								<div className="tw-flex tw-items-center tw-gap-6">
									{Array.from({ length: 3 }).map((_, i) => (
										<div key={i} className="tw-flex tw-items-center tw-gap-2.5">
											<div className="tw-h-9 tw-w-9 tw-rounded tw-bg-zc-hover" />
											<div className="tw-space-y-1.5">
												<div className="tw-h-3.5 tw-w-10 tw-rounded tw-bg-zc-hover" />
												<div className="tw-h-3 tw-w-16 tw-rounded tw-bg-zc-hover" />
											</div>
										</div>
									))}
								</div>
							</div>

							<div className="tw-mb-8">
								<div className="tw-mb-3 tw-h-4 tw-w-28 tw-rounded tw-bg-zc-hover" />
								<div className="tw-flex tw-items-start tw-gap-8 tw-overflow-hidden tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg tw-p-5">
									{Array.from({ length: 6 }).map((_, i) => (
										<div key={i} className="tw-flex tw-w-[88px] tw-flex-shrink-0 tw-flex-col tw-items-center tw-gap-2">
											<div className="tw-h-14 tw-w-14 tw-rounded-full tw-bg-zc-hover" />
											<div className="tw-h-3 tw-w-16 tw-rounded tw-bg-zc-hover" />
										</div>
									))}
								</div>
							</div>

							<div className="tw-mb-8">
								<div className="tw-mb-3 tw-h-4 tw-w-24 tw-rounded tw-bg-zc-hover" />
								<div className="tw-divide-y tw-divide-zc-border tw-overflow-hidden tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg">
									{Array.from({ length: 4 }).map((_, i) => (
										<div key={i} className="tw-flex tw-items-center tw-gap-3 tw-px-4 tw-py-3.5">
											<div className="tw-h-9 tw-w-9 tw-flex-shrink-0 tw-rounded-full tw-bg-zc-hover" />
											<div className="tw-min-w-0 tw-flex-1 tw-space-y-1.5">
												<div className="tw-h-3.5 tw-w-28 tw-rounded tw-bg-zc-hover" />
												<div className="tw-h-3 tw-w-40 tw-rounded tw-bg-zc-hover" />
											</div>
											<div className="tw-h-3 tw-w-12 tw-rounded tw-bg-zc-hover" />
										</div>
									))}
								</div>
							</div>

							<div>
								<div className="tw-mb-3 tw-h-4 tw-w-16 tw-rounded tw-bg-zc-hover" />
								<div className="tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 md:tw-grid-cols-5 tw-gap-3">
									{Array.from({ length: 5 }).map((_, i) => (
										<div key={i} className="tw-flex tw-flex-col tw-items-center tw-gap-2 tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-4">
											<div className="tw-h-12 tw-w-12 tw-rounded tw-bg-zc-hover" />
											<div className="tw-h-3 tw-w-14 tw-rounded tw-bg-zc-hover" />
										</div>
									))}
								</div>
							</div>
						</div>
					) : (
						<>
							{profile?.enabled && (
								<div className="tw-mb-6 tw-flex tw-flex-wrap tw-items-center tw-gap-4 tw-rounded tw-border tw-border-zc-primary tw-bg-zc-bg tw-p-5">
									<span className="tw-flex tw-h-14 tw-w-14 tw-flex-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-zc-primary-soft tw-text-zc-primary">
										{profile.rank?.icon ? <img src={profile.rank.icon} alt="" className="tw-h-9 tw-w-9 tw-rounded-full tw-object-cover" /> : <LuTrophy size={24} />}
									</span>
									<div className="tw-min-w-0 tw-flex-1">
										<p className="tw-text-base tw-font-semibold tw-text-zc-fg">{profile.rank?.title || __('Unranked', 'zencommunity')}</p>
										<p className="tw-text-sm tw-text-zc-muted">{profile.points} {__('pts', 'zencommunity')}</p>
									</div>

									<div className="tw-flex tw-flex-wrap tw-items-center tw-gap-5 md:tw-gap-6">
										<div className="tw-flex tw-items-center tw-gap-2.5">
											<span className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded tw-bg-zc-primary-soft tw-text-zc-primary">
												<LuStar size={16} />
											</span>
											<div>
												<p className="tw-text-sm tw-font-semibold tw-text-zc-fg">{profile.points}</p>
												<p className="tw-text-[12px] tw-text-zc-muted">{__('Total Points', 'zencommunity')}</p>
											</div>
										</div>

										{badges.length > 0 && (
											<div className="tw-flex tw-items-center tw-gap-2.5 tw-border-l tw-border-zc-border tw-pl-5 md:tw-pl-6">
												<span className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded tw-bg-zc-primary-soft tw-text-zc-primary">
													<LuShieldCheck size={16} />
												</span>
												<div>
													<p className="tw-text-sm tw-font-semibold tw-text-zc-fg">
														{badges.filter((b) => b.earned).length}/{badges.length}
													</p>
													<p className="tw-text-[12px] tw-text-zc-muted">{__('Badges', 'zencommunity')}</p>
												</div>
											</div>
										)}

										{profile.position && (
											<div className="tw-flex tw-items-center tw-gap-2.5 tw-border-l tw-border-zc-border tw-pl-5 md:tw-pl-6">
												<span className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded tw-bg-amber-100 tw-text-amber-500">
													<LuCrown size={16} />
												</span>
												<div>
													<p className="tw-text-sm tw-font-semibold tw-text-zc-fg">#{profile.position}</p>
													<p className="tw-text-[12px] tw-text-zc-muted">{__('Community Rank', 'zencommunity')}</p>
												</div>
											</div>
										)}
									</div>
								</div>
							)}

							{journey.length > 0 && (
								<section className="tw-mb-8">
									<h2 className="tw-mb-3 tw-text-base tw-font-semibold tw-text-zc-fg">{__('Your journey', 'zencommunity')}</h2>
									<div className="tw-flex tw-items-start tw-gap-3 tw-overflow-x-auto tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg tw-p-5">
										{journey.map((step, i) => {
											const lastCompletedIdx = journey.reduce((acc, s, idx) => (s.status === 'completed' ? idx : acc), -1);
											const isCurrent = i === lastCompletedIdx;
											const isDone = step.status === 'completed';
											return (
												<React.Fragment key={`${step.type}-${step.id}`}>
													{i > 0 && (
														<div className="tw-mt-7 tw-w-8 tw-flex-shrink-0 tw-border-t-2 tw-border-dashed tw-border-zc-border" />
													)}
													<div title={step.status === 'locked' ? (step.restriction_message || step.title) : step.title}
														className="tw-flex tw-w-[88px] tw-flex-shrink-0 tw-flex-col tw-items-center tw-gap-1.5 tw-text-center">
														<div className={`tw-relative tw-flex tw-h-14 tw-w-14 tw-items-center tw-justify-center tw-rounded-full tw-border-2 ${isCurrent ? 'tw-border-zc-primary' : 'tw-border-zc-border'}`}>
															<span className={`tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-full ${isDone ? 'tw-bg-zc-primary-soft tw-text-zc-primary' : 'tw-bg-zc-hover tw-text-zc-muted'}`}>
																{step.icon
																	? <img src={step.icon} alt="" className="tw-h-full tw-w-full tw-object-cover" />
																	: isDone ? <LuTrophy size={20} /> : <LuLock size={16} />}
															</span>
														</div>
														<p className={`tw-line-clamp-2 tw-text-[11px] tw-font-medium ${isCurrent ? 'tw-text-zc-primary' : isDone ? 'tw-text-zc-fg' : 'tw-text-zc-muted'}`}>
															{step.title}
														</p>
													</div>
												</React.Fragment>
											);
										})}
									</div>
								</section>
							)}

							<section className="tw-mb-8">
								<h2 className="tw-mb-3 tw-text-base tw-font-semibold tw-text-zc-fg">{__('Rank ladder', 'zencommunity')}</h2>
								<div className="tw-divide-y tw-divide-zc-border tw-overflow-hidden tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg">
									{ranks.map((rank) => {
										const nextRankId = ranks.find((r) => !r.achieved)?.id;
										const isNext = rank.id === nextRankId;
										const percent = isNext && rank.min_points > 0
											? Math.min(99, Math.round(((profile?.points || 0) / rank.min_points) * 100))
											: 0;
										return (
											<div key={rank.id} className="tw-flex tw-items-center tw-gap-3 tw-px-4 tw-py-3.5">
												<span className={`tw-flex tw-h-9 tw-w-9 tw-flex-shrink-0 tw-items-center tw-justify-center tw-rounded-full ${
													isNext
														? 'tw-bg-zc-primary tw-text-white'
														: rank.achieved
															? 'tw-bg-zc-primary-soft tw-text-zc-primary'
															: 'tw-bg-zc-hover tw-text-zc-muted'
												}`}>
													{rank.icon
														? <img src={rank.icon} alt="" className="tw-h-6 tw-w-6 tw-rounded-full tw-object-cover" />
														: rank.achieved || isNext ? <LuTrophy size={16} /> : <LuLock size={14} />}
												</span>
												<div className="tw-min-w-0 tw-flex-1">
													<p className="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-medium tw-text-zc-fg">
														<span className="tw-truncate">{rank.title}</span>
														{rank.achieved && (
															<span className="tw-flex-shrink-0 tw-rounded tw-bg-green-100 tw-px-1.5 tw-py-0.5 tw-text-[11px] tw-font-medium tw-text-green-700">
																{__('Achieved', 'zencommunity')}
															</span>
														)}
													</p>
													{!rank.achieved && (
														<p className="tw-truncate tw-text-[13px] tw-text-zc-muted">
															{isNext && percent > 0
																? `${rank.points_needed} ${__('points to go', 'zencommunity')} — ${__("you're", 'zencommunity')} ${percent}% ${__('of the way there', 'zencommunity')}`
																: `${rank.points_needed} ${__('points to go…', 'zencommunity')}`}
														</p>
													)}
												</div>
												<span className="tw-flex-shrink-0 tw-text-[13px] tw-text-zc-muted">
													{rank.min_points}+ {__('pts', 'zencommunity')}
												</span>
											</div>
										);
									})}
								</div>
							</section>

							<section className="tw-mb-8">
								<h2 className="tw-mb-3 tw-text-base tw-font-semibold tw-text-zc-fg">{__('Badges', 'zencommunity')}</h2>
								{badges.length === 0 ? (
									<p className="tw-text-sm tw-text-zc-muted">{__('No badges available yet.', 'zencommunity')}</p>
								) : (
									<div className="tw-grid tw-grid-cols-2 sm:tw-grid-cols-3 md:tw-grid-cols-5 tw-gap-3">
										{badges.map((badge) => (
											<div key={badge.id} title={badge.earned ? badge.title : (badge.secret ? __('Secret badge', 'zencommunity') : `${badge.title} — ${badge.required_points} ${__('points', 'zencommunity')}`)}
												className={`tw-flex tw-flex-col tw-items-center tw-gap-1.5 tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-4 tw-text-center ${badge.earned ? '' : 'tw-opacity-70'}`}>
												<span className={`tw-flex tw-h-12 tw-w-12 tw-items-center tw-justify-center tw-overflow-hidden tw-rounded ${badge.earned ? 'tw-bg-zc-primary-soft' : 'tw-bg-zc-hover'}`}>
													{badge.image ? <img src={badge.image} alt={badge.title} className="tw-h-full tw-w-full tw-object-cover" /> : (badge.earned ? <LuAward size={20} className="tw-text-zc-primary" /> : <LuLock size={18} className="tw-text-zc-muted" />)}
												</span>
												<p className="tw-line-clamp-2 tw-text-[12px] tw-font-semibold tw-text-zc-fg">{badge.title}</p>
												{badge.earned && badge.earned_at ? (
													<p className="tw-text-[11px] tw-text-zc-muted">{moment(badge.earned_at).format('MMM D, YYYY')}</p>
												) : !badge.earned && !badge.secret && badge.required_points > 0 ? (
													<p className="tw-line-clamp-1 tw-text-[11px] tw-text-zc-muted">{badge.required_points} {__('points', 'zencommunity')}</p>
												) : null}
											</div>
										))}
									</div>
								)}
							</section>

							<section>
								<h2 className="tw-mb-3 tw-text-base tw-font-semibold tw-text-zc-fg">{__('Points history', 'zencommunity')}</h2>
								{historyLoading ? (
									<div className="tw-space-y-2">
										{Array.from({ length: 5 }).map((_, i) => <div key={i} className="tw-h-12 tw-animate-pulse tw-rounded tw-bg-zc-hover" />)}
									</div>
								) : history.length === 0 ? (
									<p className="tw-text-sm tw-text-zc-muted">{__('No points activity yet.', 'zencommunity')}</p>
								) : (
									<div className="tw-divide-y tw-divide-zc-border tw-overflow-hidden tw-rounded tw-border tw-border-zc-border tw-bg-zc-bg">
										{history.map((entry, idx) => (
											<div key={idx} className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-px-4 tw-py-3">
												<div className="tw-min-w-0">
													<p className="tw-truncate tw-text-sm tw-text-zc-fg">{entry.label}</p>
													<p className="tw-text-[12px] tw-text-zc-muted">{moment(entry.created_at).format('MMM D, YYYY h:mm A')}</p>
												</div>
												<span className={`tw-flex-shrink-0 tw-text-sm tw-font-semibold ${entry.points >= 0 ? 'tw-text-green-600' : 'tw-text-red-500'}`}>
													{entry.points >= 0 ? '+' : ''}{entry.points}
												</span>
											</div>
										))}
									</div>
								)}

								{totalHistoryPages > 1 && !historyLoading && (
									<div className="tw-mt-4 tw-flex tw-items-center tw-justify-center tw-gap-3">
										<button type="button" disabled={historyPage <= 1} onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
											className="tw-rounded tw-border tw-border-zc-border tw-px-4 tw-py-2 tw-text-sm tw-text-zc-fg disabled:tw-opacity-40 hover:tw-bg-zc-hover">
											{__('Previous', 'zencommunity')}
										</button>
										<span className="tw-px-2 tw-text-sm tw-text-zc-muted">{historyPage} / {totalHistoryPages}</span>
										<button type="button" disabled={historyPage >= totalHistoryPages} onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
											className="tw-rounded tw-border tw-border-zc-border tw-px-4 tw-py-2 tw-text-sm tw-text-zc-fg disabled:tw-opacity-40 hover:tw-bg-zc-hover">
											{__('Next', 'zencommunity')}
										</button>
									</div>
								)}
							</section>
						</>
					)}
				</div>
			</CenterContainer>
		</>
	);
};

export default GamificationDetail;
