import React, { useState } from 'react';
import {
    Button,
    Icon,
} from "@chakra-ui/react"
import { __ } from '@wordpress/i18n';
import { IoAdd } from 'react-icons/io5';
import { useDispatch } from 'react-redux';
import { cerateCollection, updateCollection } from '@Redux/slices/collectionSlice/collectionSlice';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { LuPencil } from 'react-icons/lu';
import ZenComModalFormik from '@Components/ZenComModal/ZenComModalFormik';
import CreateCollectionFormInner from './CreateCollectionFormInner';
import { useStyles } from '../../../utils/chakra';

const CreateCollection = ({ btnLabel = "", formData = null }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { clearBtn } = useStyles();
    const dispatch = useDispatch();

    const onSubmitHandler = (values, action) => {
        action.setSubmitting(true);
        if (values.id) {
            dispatch(updateCollection(values)).finally(() => {
                action.setSubmitting(false);
                dispatch(showNotification({
                    message: __('Collection has been updated Successfully', 'zencommunity'),
                    isShow: true,
                    type: 'success',
                }));
                setIsOpen(false);
                action.resetForm();
            })
        } else {
            dispatch(cerateCollection(values)).finally(() => {
                action.setSubmitting(false);
                dispatch(showNotification({
                    message: __('Collection has been created Successfully', 'zencommunity'),
                    isShow: true,
                    type: 'success',
                }));
                setIsOpen(false);
                action.resetForm();
            })
        }
    };

    return (
        <>
            <Button
                {...clearBtn}
                margin={!formData && 3}
                // border={formData && "1px solid var(--zencom-border-color)"}
                onClick={() => setIsOpen(!isOpen)}
            >
                {formData ? <Icon as={LuPencil} boxSize="14px" color={formData && 'var(--zencom-font-color)'} /> : <Icon as={IoAdd} color={formData && 'var(--zencom-font-color)'} />}
                {btnLabel}
            </Button>
            
            <ZenComModalFormik
                isOpen={isOpen}
                onRequestClose={() => setIsOpen(!isOpen)}
                title={formData ? __('Update Collection', 'zencommunity') : __('Create Collection', 'zencommunity')}
                isEnabledFooter={false}
                formik={{
                    enableReinitialize: true,
                    initialValues: {
                        name: "",
                        slug: "",
                        description: "",
                        ...formData,
                    },
                    onSubmit: onSubmitHandler,
                }}
                submitButtonLabel={formData ? __('Update', 'zencommunity') : __('Create', 'zencommunity')}
                suffix='create-collection'
                size='medium'
            >
                <CreateCollectionFormInner setIsOpen={setIsOpen}/>
            </ZenComModalFormik>
        </>
    );
};

export default CreateCollection;
