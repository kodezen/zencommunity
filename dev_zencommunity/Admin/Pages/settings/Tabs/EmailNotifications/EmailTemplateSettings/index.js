import React, { useState } from 'react';
import { fetchCommunityEamilTemplate, updateCommunityEamilTemplate } from '@Redux/slices/settingsSlice/settingsSlice';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import ZenComTopBar from '../../../../../Components/ZenComTopBar';
import { __, sprintf } from '@wordpress/i18n';
import EmailForm from '../EmailForm/EmailForm';
import { Skeleton } from '../../../../../Components/ui';

const EmailTemplateSettings = () => {
    const {email_template} = useSelector(state => state.settings)
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        dispatch(fetchCommunityEamilTemplate()).finally(() => setLoading(false));
    }, [])

    if (loading) {
        return (
            <div>
                {[...Array(2)].map((_, idx) => (
                    <div key={idx} className="tw-mb-[16px] tw-flex tw-flex-col tw-gap-[20px] tw-rounded tw-bg-white tw-p-6 tw-border tw-border-solid tw-border-zc-border">
                        <Skeleton className="tw-h-4 tw-w-48" />
                        <Skeleton className="tw-h-3.5 tw-w-64" />
                        <Skeleton className="tw-h-16 tw-w-full tw-rounded" />
                        <Skeleton className="tw-h-16 tw-w-full tw-rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div>
            {email_template.length > 0 && email_template.map((template, parentIdx) => {
                if (!template.events.length) {
                    return null;
                }

                return(
                    <React.Fragment key={parentIdx}>
                        <ZenComTopBar
                            title={template.label + " " +  __("Email ", "zencommunity")}
                            subtitle={sprintf( __('%s', 'zencommunity'), template.sub_title)}
                            titleSize="16px"
                            subtitleSize="sm"
                            subtitleWeight="normal"
                            marginBottom="16px"
                            padding="0"
                            borderBottomWidth="0"
                        />
                        <div className="tw-mb-[16px] tw-flex tw-flex-col tw-gap-[20px] tw-rounded tw-bg-white tw-p-6 tw-border tw-border-solid tw-border-zc-border">
                            {template.events.map((event, idx) => {
                                return (
                                        <EmailForm key={idx} item={event} parentIdx={parentIdx} />
                                    )
                                })
                            }
                        </div>
                    </React.Fragment>
                )
            })}
        </div>
    );
};

export default EmailTemplateSettings;
