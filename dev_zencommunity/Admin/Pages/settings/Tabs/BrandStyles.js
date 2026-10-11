import React from 'react';
import { __ } from '@wordpress/i18n';
import { useFormikContext } from 'formik';
import { Palette, Sun, Moon } from 'lucide-react';
import { PrimaryButton } from '../../../Components/ui';
import Color from '../../../Components/FormikColor';
import ZenComTopBar from '../../../Components/ZenComTopBar';
import useZenTheme from '@Hooks/useZenTheme';
import WizardCard from '../../SetupWizard/WizardCard';

/**
 * `elevated`: an opt-in variant for the Setup Wizard's Brand & Style sub-tab
 * (SettingsStep.js) — same data/logic, same <Color> swatches, just without
 * this component's own embedded ZenComTopBar header and flat
 * `tw-rounded tw-border …` card recipe, which is the real Settings page's
 * look and was the reason this sub-tab still read as "a settings page"
 * dropped into the wizard even after every step around it was redesigned.
 * Left off (default), the real Settings > Brand & Style page renders exactly
 * as it always has — same pattern as ExtendCommunity's own `elevated` prop.
 */
const BrandStyles = ( { elevated = false } ) => {
    const { values, submitForm, dirty } = useFormikContext();
    // autoApply:false — preview Save always renders with the Light Mode
    // colors above, regardless of any dark mode a visitor toggled on the
    // live community (see FullSettings.js's ThemeApplier for the full why).
    const { updateThemeSettings } = useZenTheme(window.ZencommunityGlobal.theme_settings, { autoApply: false });

    const save = async () => {
        // submitForm() persists to the DB; updateThemeSettings() applies
        // colors to CSS variables immediately so the UI reflects changes
        // without a full reload (PHP re-injects theme_settings on reload).
        await submitForm();
        await updateThemeSettings(values?.theme);
    };

    const lightSwatches = (
        <>
            <div className="tw-flex tw-w-full tw-flex-wrap tw-justify-start tw-gap-4">
                <Color fullWidth={false} name="theme.light.primary_color" title="Primary Color" resetValue="#2A3BEE" />
                <Color fullWidth={false} name="theme.light.secondary_color" title="Secondary Color" resetValue="#EBEDFF" />
                <Color fullWidth={false} name="theme.light.text_color" title="Text Color" resetValue="#1A1A1A" />
            </div>
            <div className="tw-flex tw-w-full tw-flex-wrap tw-justify-start tw-gap-4 tw-mt-4">
                <Color fullWidth={false} name="theme.light.content_body_color" title="Content Body Color" resetValue="#F6F7F8" />
                <Color fullWidth={false} name="theme.light.content_background_color" title="Content Background Color" resetValue="#ffffff" />
                <Color fullWidth={false} name="theme.light.border_color" title="Border Color" resetValue="#CBD1D7" />
            </div>
        </>
    );

    const darkSwatches = (
        <>
            <div className="tw-flex tw-w-full tw-flex-wrap tw-justify-between tw-gap-4">
                <Color fullWidth={false} name="theme.dark.primary_color" title="Primary Color" resetValue="#fff" />
                <Color fullWidth={false} name="theme.dark.secondary_color" title="Secondary Color" resetValue="#303030" />
                <Color fullWidth={false} name="theme.dark.text_color" title="Text Color" resetValue="#F6F7F8" />
            </div>
            <div className="tw-flex tw-w-full tw-flex-wrap tw-justify-between tw-gap-4 tw-mt-4">
                <Color fullWidth={false} name="theme.dark.content_body_color" title="Content Body Color" resetValue="#262626" />
                <Color fullWidth={false} name="theme.dark.content_background_color" title="Content Background Color" resetValue="#1C1C1C" />
                <Color fullWidth={false} name="theme.dark.border_color" title="Border Color" resetValue="#363636" />
            </div>
        </>
    );

    if ( elevated ) {
        return (
            <div className="tw-flex tw-flex-col tw-gap-5">
                <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-4">
                    <div className="tw-flex tw-items-start tw-gap-3.5">
                        <span className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-xl tw-bg-amber-100 tw-text-amber-600">
                            <Palette className="tw-h-5 tw-w-5" />
                        </span>
                        <div>
                            <h3 className="tw-m-0 tw-text-[17px] tw-font-bold tw-text-zc-fg">{__( 'Platform Brand Identity', 'zencommunity' )}</h3>
                            <p className="tw-m-0 tw-mt-0.5 tw-text-[13px] tw-text-zc-muted">{__( 'Customize and manage the visual brand identity across the entire community platform.', 'zencommunity' )}</p>
                        </div>
                    </div>
                    <PrimaryButton onClick={save} disabled={!dirty}>{__( 'Save changes', 'zencommunity' )}</PrimaryButton>
                </div>

                <WizardCard
                    icon={Sun}
                    color="amber"
                    title={__( 'Light Mode Colors', 'zencommunity' )}
                    hint={__( 'Used when a member is browsing in light mode.', 'zencommunity' )}
                >
                    {lightSwatches}
                </WizardCard>

                <WizardCard
                    icon={Moon}
                    color="slate"
                    title={__( 'Dark Mode Colors', 'zencommunity' )}
                    hint={__( 'Used when a member switches to dark mode.', 'zencommunity' )}
                >
                    {darkSwatches}
                </WizardCard>
            </div>
        );
    }

    return (
        <>
            <div className="zencom-animate-fade tw-flex tw-max-w-[900px] tw-mx-auto tw-flex-col tw-p-3 tw-mb-[100px]">
                <ZenComTopBar
                    isStickyScroll={true}
                    title={__("Platform Brand Identity", "zencommunity")}
                    subtitle={__("Customize and manage the visual brand identity across the entire community platform.", "zencommunity")}
                    rightContent={
                        <PrimaryButton onClick={save} disabled={!dirty} >{__("Save changes", "zencommunity")}</PrimaryButton>
                    }
                />

                <div className="tw-mb-6 tw-flex tw-flex-col tw-items-start tw-gap-2.5 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
                    <ZenComTopBar
                        title={__("Light Mode Colors", "zencommunity")}
                        titleSize="16px"
                        marginBottom="0"
                        padding="0 0 10px 0"
                        borderBottomWidth="1px"
                    />

                    <div className="tw-w-full tw-pt-4">
                        {lightSwatches}
                    </div>
                </div>

                {/* Dark Mode Colors */}
                <div className="tw-flex tw-flex-col tw-items-start tw-gap-2.5 tw-rounded-xl tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-p-6">
                    <ZenComTopBar
                        title={__('Dark Mode Colors', "zencommunity")} titleSize="16px"
                        marginBottom="0"
                        padding="0 0 10px 0"
                        borderBottomWidth="1px"
                    />

                    <div className="tw-w-full tw-pt-4">
                        {darkSwatches}
                    </div>
                </div>
            </div>
        </>
    );
};

export default BrandStyles;
