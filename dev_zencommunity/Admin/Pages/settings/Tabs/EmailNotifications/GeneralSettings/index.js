import { __ } from '@wordpress/i18n';
import ZenComTopBar from '../../../../../Components/ZenComTopBar';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCommunityEamilGeneralSettings, updateCommunityEamilGeneralSettings } from '@Redux/slices/settingsSlice/settingsSlice';
import { Formik } from 'formik';
import AutoSave from '../../../../../Components/AutoSave';
import { useEffect, useState } from 'react';
import BlockEditor from '../../../../../Components/BlockEditor';
import { Field, Skeleton } from '../../../../../Components/ui';

const GeneralSettings = () => {
    const {email} = useSelector(state => state.settings)
    const [loading, setLoading] = useState(false)
    const dispatch = useDispatch();
    useEffect(() => {
        if(!email || Object.keys(email).length === 0) {
            setLoading(true)
            dispatch(fetchCommunityEamilGeneralSettings()).then(() => setLoading(false));
        }
    }, [])

    const onSubmitHandler = (values, action) => {
        dispatch(updateCommunityEamilGeneralSettings(values));
    }

    return (
        <>
            <ZenComTopBar
                title={__("Mailing settings", "zencommunity")}
                subtitle={__("Set your from name, email, and email footer. These configurations will be used to send emails from ZenCommunity", "zencommunity")}
                titleSize="16px"
                subtitleSize="sm"
                subtitleWeight="normal"
                marginBottom="16px"
                padding="0"
                borderBottomWidth="0"
            />
            {loading ? (
                <div className="tw-mb-[24px] tw-flex tw-flex-col tw-gap-[20px] tw-rounded tw-bg-white tw-p-6 tw-border tw-border-solid tw-border-zc-border">
                    <div className="tw-flex tw-w-full tw-flex-col tw-gap-4 md:tw-flex-row">
                        <div className="tw-flex tw-w-full tw-flex-col tw-gap-2 md:tw-w-1/2">
                            <Skeleton className="tw-h-3.5 tw-w-20" />
                            <Skeleton className="tw-h-9 tw-w-full tw-rounded" />
                        </div>
                        <div className="tw-flex tw-w-full tw-flex-col tw-gap-2 md:tw-w-1/2">
                            <Skeleton className="tw-h-3.5 tw-w-20" />
                            <Skeleton className="tw-h-9 tw-w-full tw-rounded" />
                        </div>
                    </div>
                    <Skeleton className="tw-h-3.5 tw-w-24" />
                    <Skeleton className="tw-h-32 tw-w-full tw-rounded" />
                </div>
            ) : (
                <Formik
                    enableReinitialize={true}
                    initialValues={{
                        footer_text: "",
                        from: {
                            email: "",
                            name: ""
                        },
                        ...email
                    }}
                    onSubmit={onSubmitHandler}
                >
                    {({values, setFieldValue}) => {
                        return (
                            <div className="tw-mb-[24px] tw-flex tw-flex-col tw-gap-[20px] tw-rounded tw-bg-white tw-p-6 tw-border tw-border-solid tw-border-zc-border">
                                <AutoSave debounceMs={1000} />
                                <div className="tw-flex tw-flex-col tw-gap-6">
                                    <div className="tw-flex tw-w-full tw-flex-col tw-items-center tw-justify-between tw-gap-4 md:tw-flex-row">
                                        <div className="tw-flex tw-w-full tw-flex-col tw-gap-2 md:tw-w-1/2">
                                            <Field label={__('From name', 'zencommunity')} required>
                                                <input
                                                    type="text"
                                                    name="from.name"
                                                    placeholder={__('Ex. John Doe', 'zencommunity')}
                                                    value={values.from.name}
                                                    onChange={(e) => setFieldValue("from.name", e.target.value)}
                                                    className="tw-m-0 tw-block tw-w-full tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-2 tw-text-sm tw-text-zc-fg focus:tw-border-zc-primary focus:tw-outline-none"
                                                />
                                            </Field>
                                        </div>

                                        <div className="tw-flex tw-w-full tw-flex-col tw-gap-2 md:tw-w-1/2">
                                            <Field label={__('From email', 'zencommunity')} required>
                                                <input
                                                    type="text"
                                                    name="from.email"
                                                    placeholder={__('Ex. johndoe@example.com', 'zencommunity')}
                                                    value={values.from.email}
                                                    onChange={(e) => setFieldValue("from.email", e.target.value)}
                                                    className="tw-m-0 tw-block tw-w-full tw-rounded tw-border tw-border-solid tw-border-zc-border tw-bg-zc-bg tw-px-3 tw-py-2 tw-text-sm tw-text-zc-fg focus:tw-border-zc-primary focus:tw-outline-none"
                                                />
                                            </Field>
                                        </div>
                                    </div>

                                    <Field label={__('Footer text', 'zencommunity')}>
                                        <BlockEditor
                                            placeholder={__('Thank you', 'zencommunity')}
                                            defaultValue={values?.footer_text}
                                            name={'footer_text'}
                                            saveValueHandler={setFieldValue}
                                            suffix='email-footer'
                                        />
                                    </Field>
                                </div>
                            </div>
                        )
                    }}
                </Formik>
            )}
        </>

    );
};

export default GeneralSettings;
