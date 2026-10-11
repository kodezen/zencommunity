
import { __ } from '@wordpress/i18n';
import ZenComTopBar from '../../../../Components/ZenComTopBar';
import GeneralSettings from './GeneralSettings';
import EmailTemplateSettings from './EmailTemplateSettings';

const EmailNotifications = () => {
    return (
        <div className="zencom-animate-fade tw-flex tw-w-full tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
            <ZenComTopBar
                isStickyScroll={true}
                title={__("Email", "zencommunity")}
                subtitle={__("Manage all notification settings.", "zencommunity")}
            />

            <GeneralSettings />
            <EmailTemplateSettings />
        </div>
    );
};

export default EmailNotifications;