import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight, Rocket, Loader2 } from 'lucide-react';
import { __, sprintf } from '@wordpress/i18n';
import { admin_dashboard_url, generateSlug, is_pro_active, plugin_root_url } from '@Utils/helper';
import { fetchCommunitySettings, updateCommunitySettings } from '@Redux/slices/settingsSlice/settingsSlice';
import { createGroup } from '@Redux/slices/groupSlice/groupSlice';
import { createFeedPost } from '@Redux/slices/feedSlice/feedSlice';
import { WizardPrimaryButton, WizardSecondaryButton } from './WizardButton';
import WizardSidebar, { SIDEBAR_STEPS } from './WizardSidebar';
import EnvironmentCheck from './steps/EnvironmentCheck';
import CommunityDetails from './steps/CommunityDetails';
import ArchetypeSelect from './steps/ArchetypeSelect';
import SettingsStep from './steps/SettingsStep';
import ExtendStep from './steps/ExtendStep';
import LaunchSummary from './steps/LaunchSummary';
import { ARCHETYPES } from './constants';
import './setup-wizard.scss';

const STEP_COUNT = 6;

// A real, immediately-reloadable location for whichever step is showing —
// not just in-memory `useState` — so a hard reload (or a Back/Forward tap)
// lands back on the same step instead of always restarting the wizard at 1.
// `includes/setup.php` only branches on `page`, so a `step` param riding
// alongside it needs no server-side changes to keep working.
const STEP_PARAM = 'step';

const stepFromUrl = () => {
	const n = parseInt( new URLSearchParams( window.location.search ).get( STEP_PARAM ), 10 );
	return n >= 1 && n <= STEP_COUNT ? n : 1;
};

const pushStepUrl = ( n ) => {
	const params = new URLSearchParams( window.location.search );
	params.set( STEP_PARAM, String( n ) );
	window.history.pushState( { zcStep: n }, '', `${window.location.pathname}?${params.toString()}` );
};

// Reused directly rather than through helper.js's named-export list, since
// those two are new (Assets::env_check(), added alongside this wizard) and
// not yet part of that curated destructure.
const env = window.ZencommunityGlobal?.env_check;

const SetupWizard = () => {
	const dispatch = useDispatch();
	const settingsData = useSelector( ( s ) => s.settings?.data?.settings );
	const [step, setStep] = useState( stepFromUrl );
	const [direction, setDirection] = useState( 'forward' );
	const [details, setDetails] = useState( { name: '', path: '', visibility: '', visibilityRoles: [], loadOnEntireSite: false } );
	const [settingsStep, setSettingsStep] = useState( {
		overrideWpRegistration: false,
		loginPage: 'zencommunity',
		registerPage: 'zencommunity',
		canSeeAllMembers: 'guest',
		allowMemberRegistration: true,
		enableDateOfBirthField: false,
		allowMessagingMinors: false,
	} );
	const [detailsSeeded, setDetailsSeeded] = useState( false );
	const [archetype, setArchetype] = useState( null );
	// Step 3's "Set up your Space" fields, sent with createGroup() on launch.
	const [space, setSpace] = useState( {
		name: '', slug: '', slugTouched: false, description: '',
		privacy: 'public', membersVisibility: 'members_only',
		featureMediaId: null, featuredUrl: '',
	} );

	// Picking a type pre-fills the Space from that type's demo (name, slug,
	// privacy), but never overwrites a name the visitor has already typed.
	const selectArchetype = ( id ) => {
		setArchetype( id );
		const demo = ARCHETYPES.find( ( a ) => a.id === id )?.demoSpace;
		if ( ! demo ) return;
		setSpace( ( prev ) => ( prev.nameTouched ? prev : {
			...prev,
			name: demo.name,
			slug: prev.slugTouched ? prev.slug : demo.slug,
			privacy: demo.privacy || prev.privacy,
		} ) );
	};
	const [launching, setLaunching] = useState( false );
	// True once everything has saved and all that's left is the redirect —
	// fades the whole wizard out instead of cutting straight from the
	// "Launching…" button to a blank flash as the page unloads.
	const [launched, setLaunched] = useState( false );

	// Step 2 requires a name, Step 3 requires a chosen content type — every
	// other step has nothing of its own to gate, now that the shared footer
	// below is used from Step 2 onward instead of Step 2 owning its own
	// Back/Next row.
	const canProceed =
		( step !== 2 || !! details.name.trim() ) &&
		( step !== 3 || ( !! archetype && ( archetype === 'blank' || !! space.name.trim() ) ) );
	const isLastStep = step === STEP_COUNT;

	// Loads whatever is already configured — blank on a fresh install, real
	// values when this is a "Re-run Setup Wizard" pass — so Step 2 never
	// shows an existing community's name/URL as empty just because this page
	// starts its own Redux store fresh (see SetupWizardApp.js).
	useEffect( () => {
		dispatch( fetchCommunitySettings() );
	}, [dispatch] );

	// Seeds the draft exactly once, the first time real settings arrive —
	// not on every store update, or a background refetch (e.g. after the
	// logo upload inside CommunityDetails) would clobber in-progress typing.
	useEffect( () => {
		if ( ! detailsSeeded && settingsData ) {
			setDetails( {
				name: settingsData.name || '',
				path: ( settingsData.path || '' ).replace( /^\/+/, '' ),
				visibility: settingsData.community_visibility || 'guest',
				visibilityRoles: settingsData.community_visibility_roles || [],
				loadOnEntireSite: !! settingsData.load_on_entire_site,
			} );
			setSettingsStep( {
				overrideWpRegistration: !! settingsData.override_wp_registration,
				loginPage: settingsData.login_page || 'zencommunity',
				registerPage: settingsData.register_page || 'zencommunity',
				canSeeAllMembers: settingsData.can_see_all_members || 'guest',
				allowMemberRegistration: settingsData.allow_member_registration ?? true,
				enableDateOfBirthField: !! settingsData.enable_date_of_birth_field,
				allowMessagingMinors: !! settingsData.allow_messaging_minors,
			} );
			setDetailsSeeded( true );
		}
	}, [settingsData, detailsSeeded] );

	// Keeps the URL's `step` in sync with Back/Forward browser navigation,
	// the counterpart to `pushStepUrl` below (used on every forward/back
	// click) — together they make each step reachable and reload-safe on
	// its own URL instead of living only in this component's memory.
	useEffect( () => {
		const onPopState = () => {
			setDirection( 'backward' );
			setStep( stepFromUrl() );
		};
		window.addEventListener( 'popstate', onPopState );
		return () => window.removeEventListener( 'popstate', onPopState );
	}, [] );

	const changeStep = ( next, dir ) => {
		setDirection( dir );
		setStep( next );
		pushStepUrl( next );
	};

	const goBack = () => {
		changeStep( Math.max( 1, step - 1 ), 'backward' );
	};

	// Leaves the wizard entirely from the welcome step, same destination as a
	// completed Launch — for the visitor who just wants the plugin active
	// with its defaults and to configure things later from Settings.
	const skipToApp = () => {
		window.location.href = admin_dashboard_url || 'admin.php?page=zencommunity-settings';
	};

	const handleLaunch = async () => {
		const chosen = ARCHETYPES.find( ( a ) => a.id === archetype );
		setLaunching( true );

		try {
			// Every step from 2 onward only ever wrote to local state (Step 5's
			// Add-ons toggles are the one exception — those are real plugin
			// installs/activations, not a settings field, so they still act
			// immediately when clicked). Everything else is batched into one
			// save here, so the wizard only ever hits the API — and only ever
			// shows the "Settings updated successfully" toast — once, on
			// Launch, not once per step along the way.
			const pathValue = details.path.trim();
			// Mirrors CommunitySettings.js's own rule: a blank/root path only
			// makes sense together with "load on the entire site" — force it
			// on rather than saving an unreachable/root community path with
			// the toggle left off.
			const loadOnEntireSite = pathValue ? details.loadOnEntireSite : true;

			const payload = {
				name: details.name.trim(),
				path: pathValue,
				load_on_entire_site: loadOnEntireSite,
				community_visibility: details.visibility,
				can_see_all_members: settingsStep.canSeeAllMembers,
				allow_member_registration: settingsStep.allowMemberRegistration,
				enable_date_of_birth_field: settingsStep.enableDateOfBirthField,
				allow_messaging_minors: settingsStep.allowMessagingMinors,
				// Not part of the documented settings schema — a harmless
				// breadcrumb, kept only because the endpoint merges the
				// payload as-is rather than enforcing an allowlist.
				first_space_type: archetype,
			};
			if ( details.visibility === 'roles' ) {
				payload.community_visibility_roles = details.visibilityRoles || [];
			}
			// Login & Registration is Pro-gated (see SettingsStep.js) — only
			// sent once Pro is actually active, so a free-tier run never
			// overwrites these with the still-default values its own locked
			// inputs were seeded with.
			if ( is_pro_active ) {
				payload.override_wp_registration = settingsStep.overrideWpRegistration;
				payload.login_page = settingsStep.loginPage;
				payload.register_page = settingsStep.registerPage;
			}

			await dispatch( updateCommunitySettings( payload ) ).unwrap();

			// Best-effort, same as Classes\Seeder's own default-content step:
			// a failure here must never block the launch redirect below, since
			// the actual settings (already saved above) are what "launching"
			// really means. "Blank" has no `demoSpace` at all — nothing to do.
			if ( chosen?.demoSpace ) {
				try {
					const formData = {
						name: space.name.trim() || chosen.demoSpace.name,
						slug: space.slug || generateSlug( space.name ) || chosen.demoSpace.slug,
						description: space.description,
						privacy: space.privacy,
						// `archetype` is itself a real SpaceType key (see
						// constants.js) for every card except "blank", which
						// never reaches here since it has no `demoSpace`.
						type: archetype,
					};
					formData.meta = {
						...( chosen.demoSpace.meta || {} ),
						members_visibility: space.membersVisibility,
						approval_required: space.privacy !== 'public',
					};
					if ( space.featureMediaId ) {
						formData.media_ids = [space.featureMediaId];
						formData.featured_img = space.featureMediaId;
					}

					const group = await dispatch( createGroup( { category_id: 0, formData } ) ).unwrap();

					// Only single-page/external-link/resource-library skip
					// this — their content lives in `meta` above, and the
					// frontend doesn't even render a Discussion tab for them
					// (see Pages/GroupDetails's allowedTabsByType), so a feed
					// post there would just be unreachable clutter.
					if ( group?.id && chosen.demoSpace.post ) {
						await dispatch(
							createFeedPost( {
								group_id: group.id,
								formData: chosen.demoSpace.post,
							} )
						).unwrap();
					}
				} catch ( error ) {
					// A slug collision (e.g. re-running the wizard a second
					// time) or similar is expected here often enough that it
					// shouldn't surface as a launch failure.
				}
			}

			// Keep the button showing "Launching…" (rather than snapping back
			// to idle) and fade the whole wizard out instead — the toast gets
			// its moment to register, and the hand-off to the full-page
			// navigation below reads as one continuous motion instead of a
			// cut: spinner stop, flat pause, then a hard jump.
			setLaunched( true );
			setTimeout( () => {
				// Full navigation, not client-side: `is_configured` is computed
				// server-side on page load, so this is what actually makes the
				// wizard stop reappearing.
				window.location.href = admin_dashboard_url || 'admin.php?page=zencommunity-settings';
			}, 500 );
		} catch ( error ) {
			setLaunching( false );
		}
	};

	const goNext = () => {
		if ( isLastStep ) {
			handleLaunch();
			return;
		}

		// Every step from 2 onward only ever writes to local state now — the
		// API is only ever called once, from handleLaunch() on the final
		// "Launch Community" click (Step 5's Add-ons toggles are the one
		// exception: those are real plugin installs/activations, not a
		// settings field, so they still act immediately when clicked).
		changeStep( Math.min( STEP_COUNT, step + 1 ), 'forward' );
	};

	const stepAnimClass = direction === 'forward' ? 'zc-wizard-step-enter' : 'zc-wizard-step-enter-back';

	// Step 1 is the full-bleed welcome hero with its own buttons
	// (EnvironmentCheck.js) — no sidebar, no footer.
	if ( step === 1 ) {
		return (
			<div
				className="tw-fixed tw-inset-0 tw-z-[9999] tw-flex tw-flex-col tw-overflow-y-auto tw-bg-zc-bg"
				// A quiet ambient glow tinted from the live brand color
				// (Brand & Style) rather than a hardcoded blue.
				style={{
					backgroundImage:
						'radial-gradient(900px circle at 10% -10%, color-mix(in srgb, var(--zencom-primary-color) 8%, transparent), transparent 60%), ' +
						'radial-gradient(700px circle at 100% 100%, color-mix(in srgb, var(--zencom-primary-color) 6%, transparent), transparent 55%)',
				}}
			>
				<div className="tw-flex tw-flex-1 tw-items-center tw-justify-center">
					<div key={step} className={`tw-w-full tw-max-w-[1200px] tw-px-6 tw-py-6 ${stepAnimClass}`}>
						<EnvironmentCheck env={env} onNext={goNext} onSkip={skipToApp} />
					</div>
				</div>
			</div>
		);
	}

	const stepIndex = SIDEBAR_STEPS.findIndex( ( s ) => s.id === step ) + 1;
	const busy = launching;

	return (
		<div className={`zc-wizard-shell${launched ? ' is-leaving' : ''}`}>
			<WizardSidebar
				current={step}
				onSelect={( id ) => changeStep( id, 'backward' )}
				onExit={skipToApp}
				disabled={busy}
			/>

			<main className="zc-wizard-main">
				<div className="zc-wizard-mobilebar">
					<img src={plugin_root_url + '/assets/images/text_logo.svg'} alt="ZenCommunity" />
					<WizardSecondaryButton onClick={skipToApp}>{__( 'Exit setup', 'zencommunity' )}</WizardSecondaryButton>
				</div>

				<div className="zc-wizard-content">
					<p className="zc-wizard-eyebrow">
						{sprintf( __( 'Step %1$d of %2$d', 'zencommunity' ), stepIndex, SIDEBAR_STEPS.length )}
					</p>

					<div key={step} className={stepAnimClass}>
						{step === 2 && <CommunityDetails value={details} onChange={setDetails} />}
						{step === 3 && (
							<ArchetypeSelect
								selected={archetype}
								onSelect={selectArchetype}
								space={space}
								onSpaceChange={( next ) => setSpace( { ...next, nameTouched: next.nameTouched || next.name !== space.name } )}
							/>
						)}
						{step === 4 && <SettingsStep value={settingsStep} onChange={setSettingsStep} isProActive={is_pro_active} />}
						{step === 5 && <ExtendStep />}
						{step === 6 && <LaunchSummary archetype={archetype} space={space} />}
					</div>
				</div>

				<div className="zc-wizard-footer">
					<div className="zc-wizard-footer__inner">
						<WizardSecondaryButton size="sm" onClick={goBack} disabled={busy}>
							<ChevronLeft className="tw-h-4 tw-w-4" />
							{__( 'Back', 'zencommunity' )}
						</WizardSecondaryButton>

						<WizardPrimaryButton size="sm" onClick={goNext} disabled={! canProceed || busy}>
							{isLastStep ? (
								<>
									{launching ? <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" /> : <Rocket className="tw-h-4 tw-w-4" />}
									{launching ? __( 'Launching…', 'zencommunity' ) : __( 'Launch Community', 'zencommunity' )}
								</>
							) : (
								<>
									{__( 'Next', 'zencommunity' )}
									<ChevronRight className="tw-h-4 tw-w-4" />
								</>
							)}
						</WizardPrimaryButton>
					</div>
				</div>
			</main>
		</div>
	);
};

export default SetupWizard;
