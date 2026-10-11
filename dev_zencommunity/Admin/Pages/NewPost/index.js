import React, { useEffect, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { LuCalendarDays, LuFilePen } from 'react-icons/lu';
import { MdOutlineEditNote, MdOutlinePerson, MdHeadphones, MdOutlineVideoLibrary, MdOutlineMic } from 'react-icons/md';
import { CgPoll } from 'react-icons/cg';
import { fetchAllGroups } from '@Redux/slices/groupSlice/groupSlice';
import { fetchSingleFeed } from '@Redux/slices/feedSlice/feedSlice';
import { is_pro_active, feed_types, getAddonActiveStatus } from '@Utils/helper';
import { PageHeader, EmptyState, Skeleton } from '../../Components/ui';
import { useAdminRouter } from '../../Components/AdminRouter';
import PostForm from './PostForm';
import AnonymousPostForm from './AnonymousPostForm';
import PollForm from './PollForm';
import MediaForm from './MediaForm';
import EventForm from './EventForm';
import TicketForm from './TicketForm';
import ProTag from '../../Components/ProTag';
import UpgradeMessage from '../../Components/UpgradeMessage';
import { upgradeProModal } from '@Redux/slices/upgradeToProSlice/upgradeToProSlice';

/**
 * wp-admin "New Post" screen — reachable from the Posts screen's "New Post"
 * button (admin.php?page=zencommunity-new-post), not its own sidebar entry,
 * same relationship as WordPress's post-new.php to edit.php.
 *
 * Mirrors the member-facing composer's post-type tabs (Components/Posts/index.js):
 * Post and Poll always, Anonymous Post/Video/Audio PRO-tagged without Pro, Tickets behind the
 * TicketingSystem addon — rebuilt with the admin dashboard's Tailwind ui kit
 * instead of the SPA's Chakra/Formik composer. Event isn't one of that
 * composer's tabs (the SPA creates events from a Group's own Events tab,
 * Pages/GroupDetails/Events.js, via the same createEvent thunk this reuses)
 * but is exposed here too, unconditionally like Post.
 */
const NewPost = () => {
	const dispatch = useDispatch();
	const { pageProps, params, navigate } = useAdminRouter();
	const groups = useSelector((state) => state.groups?.data) || [];
	const activeAddons = useSelector((state) => state.addons?.activeAddons);
	const feeds = useSelector((state) => state.feeds?.data) || [];
	const [type, setType] = useState('post');
	const [fetchingPost, setFetchingPost] = useState(false);

	// Editing an existing post reuses this same page/route — Posts screen's
	// Edit button navigates here with both { post } (so the form has the data
	// instantly, no round-trip) and ?id= in the URL. pageProps is in-memory
	// only, so a reload loses it; params.id survives the reload and is used to
	// re-fetch the post here instead of silently falling back to a blank New
	// Post form. There's just the one form in edit mode (Space/type aren't
	// editable, matching the SPA's own edit form,
	// Components/PostForm/PostEditForm.js:446 disables the group select too).
	const editingId = pageProps?.post?.id ?? params?.id;
	const editingPost = pageProps?.post || (editingId ? feeds.find((f) => String(f.id) === String(editingId)) : undefined);

	useEffect(() => {
		dispatch(fetchAllGroups());
	}, []);

	useEffect(() => {
		if (!editingId || pageProps?.post || editingPost) return;
		setFetchingPost(true);
		dispatch(fetchSingleFeed(editingId)).finally(() => setFetchingPost(false));
	}, [editingId]);

	const spaceOptions = groups.map((g) => ({ label: g.name, value: String(g.id) }));

	const tabs = [
		{ value: 'post', label: __('Post', 'zencommunity'), icon: MdOutlineEditNote },
		// Types provided by ZenCommunity Pro stay visible without it, tagged
		// PRO; clicking one opens the upgrade dialog instead of its form.
		{ value: 'anonymous', label: __('Anonymous Post', 'zencommunity'), icon: MdOutlinePerson, isPro: !is_pro_active },
		{ value: 'poll', label: __('Poll', 'zencommunity'), icon: CgPoll },
		{ value: 'video', label: __('Video', 'zencommunity'), icon: MdOutlineVideoLibrary, isPro: !(feed_types || []).includes('video') },
		{ value: 'audio', label: __('Audio', 'zencommunity'), icon: MdOutlineMic, isPro: !(feed_types || []).includes('audio') },
		{ value: 'event', label: __('Event', 'zencommunity'), icon: LuCalendarDays },
		...(getAddonActiveStatus(activeAddons, 'TicketingSystem') ? [{ value: 'tickets', label: __('Tickets', 'zencommunity'), icon: MdHeadphones }] : []),
	];

	const backToPosts = () => navigate('zencommunity-posts');

	return (
		<div className="tw-pb-[100px]">
			<PageHeader icon={LuFilePen} breadcrumbs={[{ label: __('Posts', 'zencommunity'), page: 'zencommunity-posts' }]}
				title={editingId ? __('Edit Post', 'zencommunity') : __('New Post', 'zencommunity')}
				subtitle={
					editingId
						? __('Update this post.', 'zencommunity')
						: __('Publish a post, poll, or ticket into any Space.', 'zencommunity')
				}
			/>

			{editingId && !editingPost ? (
				// Edit route (?id=…) but the post isn't in hand yet — either still
				// fetching (reload/deep-link case) or the fetch came back empty
				// (bad id / deleted post). Never fall through to the blank New
				// Post tabs here, or a reload would silently swap Edit for Create.
				fetchingPost ? (
					<div className="tw-grid tw-grid-cols-1 tw-items-start tw-gap-6 lg:tw-grid-cols-[1fr_320px]">
						<div className="tw-flex tw-flex-col tw-gap-4 tw-rounded-xl tw-bg-white tw-p-6 tw-border tw-border-solid tw-border-zc-border">
							<Skeleton className="tw-h-3.5 tw-w-24" />
							<Skeleton className="tw-h-9 tw-w-full tw-rounded" />
							<Skeleton className="tw-h-3.5 tw-w-20" />
							<Skeleton className="tw-h-40 tw-w-full tw-rounded" />
						</div>
						<div className="tw-flex tw-flex-col tw-gap-4 tw-rounded-xl tw-bg-white tw-p-5 tw-border tw-border-solid tw-border-zc-border">
							<Skeleton className="tw-h-3.5 tw-w-16" />
							<Skeleton className="tw-h-9 tw-w-full tw-rounded" />
							<Skeleton className="tw-h-3.5 tw-w-28" />
							<Skeleton className="tw-h-24 tw-w-full tw-rounded" />
							<Skeleton className="tw-h-9 tw-w-full tw-rounded" />
						</div>
					</div>
				) : (
					<EmptyState>{__('This post could not be found.', 'zencommunity')}</EmptyState>
				)
			) : (
				<>
					{!editingPost && (
						<div className="tw-mb-4 tw-flex tw-w-fit tw-gap-1 tw-rounded tw-bg-white tw-p-1.5 tw-border tw-border-solid tw-border-zc-border">
							{tabs.map((tab) => {
								const active = type === tab.value;
								return (
									<button
										key={tab.value}
										type="button"
										onClick={() => (tab.isPro ? dispatch(upgradeProModal(true)) : setType(tab.value))}
										className={
											'tw-group tw-relative tw-inline-flex tw-cursor-pointer tw-items-center tw-gap-1.5 tw-overflow-hidden tw-rounded tw-border-0 tw-px-3 tw-py-1.5 tw-text-sm tw-font-medium tw-transition-colors ' +
											(active ? 'tw-bg-zc-primary tw-text-white' : 'tw-bg-transparent tw-text-zc-fg')
										}
									>
										{/* Hover fill: scales in from the center rather than the
										background just appearing, matching the same sweep used on
										the Space-type cards. */}
										{!active && (
											<span
												aria-hidden="true"
												className="tw-absolute tw-inset-0 tw-origin-center tw-scale-x-0 tw-bg-zc-secondary tw-transition-transform tw-duration-200 tw-ease-out group-hover:tw-scale-x-100"
											/>
										)}
										<tab.icon size={15} className="tw-relative" />
										<span className="tw-relative">{tab.label}</span>
										{tab.isPro && <span className="tw-relative tw-inline-flex"><ProTag /></span>}
									</button>
								);
							})}
						</div>
					)}

					{editingPost && <PostForm spaceOptions={spaceOptions} onDone={backToPosts} editingPost={editingPost} />}
					{!editingPost && type === 'post' && <PostForm spaceOptions={spaceOptions} onDone={backToPosts} />}
					{!editingPost && type === 'anonymous' && <AnonymousPostForm spaceOptions={spaceOptions} onDone={backToPosts} />}
					{!editingPost && type === 'poll' && <PollForm spaceOptions={spaceOptions} onDone={backToPosts} />}
					{!editingPost && type === 'video' && <MediaForm type="video" spaceOptions={spaceOptions} onDone={backToPosts} />}
					{!editingPost && type === 'audio' && <MediaForm type="audio" spaceOptions={spaceOptions} onDone={backToPosts} />}
					{!editingPost && type === 'event' && <EventForm spaceOptions={spaceOptions} onDone={backToPosts} />}
					{!editingPost && type === 'tickets' && <TicketForm onDone={backToPosts} />}
				</>
			)}
			<UpgradeMessage />
		</div>
	);
};

export default NewPost;
