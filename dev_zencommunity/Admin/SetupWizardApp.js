import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from '@Redux/store';
import SetupWizard from './Pages/SetupWizard';
import Notification from './Components/Notification';
import './settings.scss';
import './admin-tailwind.css';

// Entirely separate webpack entry/DOM document from Settings.js (see
// includes/setup.php — a hidden wp-admin page that renders a standalone
// HTML document and `die`s before WordPress's normal admin template, and
// therefore the Settings.js bundle, ever loads). The wizard used to be a
// client-side branch inside Settings.js's AdminApp, gated on a flag read
// once via useState — correct in principle, but it meant a single stale or
// racing rebuild of that *shared* bundle could silently break the wizard
// (or the Dashboard) with no error to point at. Reuses the same
// `ZencommunityGlobal` global (see Setup::enqueue_assets() -> a plain
// Assets::localized_data() call) and the same #ZenCommunitySettingsElement
// mount id as Settings.js, so SetupWizard's own code needed no changes.
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('ZenCommunitySettingsElement');
    if (!container) return;

    const root = createRoot(container);
    root.render(
        <Provider store={store}>
            <Notification />
            <SetupWizard />
            {/* Portal target for modals/drawers (see Admin/Components/ui/Modal.js
            and Admin/settings.js's own identical sibling div). Without this,
            Modal falls back to rendering inline wherever it's called from — and
            SetupWizard/index.js wraps every step's content in a
            zc-wizard-step-enter(-back) class whose animation leaves a lingering
            `transform: translateX(0)` after it finishes (animation-fill-mode:
            both), which creates a CSS containing block for fixed-position
            descendants and would size/trap a Modal to that step's content box
            instead of the real viewport. Sitting here, a sibling of
            <SetupWizard/> at the root, keeps modals out of that trap while
            staying a descendant of #ZenCommunitySettingsElement (required for
            Tailwind's scoped utilities). */}
            <div id="zc-admin-modal-root" />
        </Provider>
    );
});
