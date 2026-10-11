import { useState } from 'react';
import { Button, } from '@chakra-ui/react';
import { Formik } from 'formik';
import { useDispatch } from 'react-redux';
import { __ } from '@wordpress/i18n';
import { createTicket, } from '@Redux/slices/ticketSlice/ticketSlice';
import ZCDrawer from '@Components/Drawer';
import { LuPlus } from 'react-icons/lu';
import CreateTicketFormInner from './CreateTicketFormInner';
import { useStyles } from '../../../utils/chakra';
import AutoSaveDraft from '@Components/Formik/AutoSaveDraft';
import { useUnsavedChangesGuard } from '@Hooks/useUnsavedChangesGuard';

const TICKET_DRAFT_KEY = 'zencom_draft_ticket';

const CreateTicket = ({
    ticketDrawerOpen,
    setOpenTicketDrawer
}) => {
    const [showDesc, setShowDesc] = useState(false);
    const dispatch = useDispatch();

    const ticketSubmit = async (values, actions) => {
        actions.setSubmitting(true);
        const payload = {
            title: values.title,
            content: values.content,
            product_id: values.product_id,
            type_id: values.type_id,
            priority_id: values.priority_id,
            assignee_id: values.assignee_id,
            add_media_ids: values.add_media_ids,
            meta: { is_ai_enabled: !!values.is_ai_enabled },
        };
        try {
            await dispatch(createTicket(payload)).unwrap();
            actions.resetForm();
            setShowDesc(false);
            setOpenTicketDrawer(false);
            actions.setSubmitting(false);
        } catch (error) {
            console.error(error);
        } finally {
            actions.setSubmitting(false);
        }
    };

    const { primaryBtn, primaryBtnInsideContent, primaryBtnInsideContentTrans } = useStyles();

    return (
        <>
            <Button
                {...primaryBtn}
                onClick={() => setOpenTicketDrawer(true)}
                width="fit-content"
            >
                <LuPlus />
                {__("Add New Ticket", "zencommunity")}
            </Button>

            <Formik
                initialValues={{ title: '', content: '', product_id: '', type_id: '', priority_id: '', assignee_id: '', add_media_ids: [], is_ai_enabled: false }}
                onSubmit={ticketSubmit}
                enableReinitialize
            >
                {({ values, handleChange, handleSubmit, isSubmitting, resetForm, dirty }) => {
                    useUnsavedChangesGuard(ticketDrawerOpen && dirty && !isSubmitting);

                    const confirmDiscard = () =>
                        !dirty || window.confirm(__('You have unsaved changes. Leave without creating this ticket?', 'zencommunity'));

                    return (
                    <ZCDrawer
                        title={__("Create new ticket", "zencommunity")}
                        size="lg"
                        bodyPadding="0px"
                        headerPadding="16px"
                        bodyFlowY={{md:"hidden", base:"auto"}}
                        isOpen={ticketDrawerOpen}
                        closeOnInteractOutside={false}
                        onClose={() => {
                            if (!confirmDiscard()) {
                                return;
                            }
                            setOpenTicketDrawer(false);
                        }}
                        footerButtons={
                            <>
                                <Button
                                    type="button"
                                    p="8px 14px"
                                    fontSize="14px"
                                    fontWeight="500"
                                    lineHeight="20px"
                                    marginRight="8px"
                                    onClick={() => {
                                        if (!confirmDiscard()) {
                                            return;
                                        }
                                        setShowDesc(false);
                                        resetForm();
                                        setOpenTicketDrawer(false)
                                    }}
                                    {...primaryBtnInsideContentTrans}
                                >
                                    {__('Cancel', 'zencommunity')}
                                </Button>

                                <Button
                                    type="button"
                                    p="8px 14px"
                                    fontSize="14px"
                                    fontWeight="500"
                                    lineHeight="20px"
                                    disabled={!values.title?.trim() || isSubmitting}
                                    loading={isSubmitting}
                                    onClick={handleSubmit}
                                    {...primaryBtnInsideContent}
                                >
                                    {__('Create ticket', 'zencommunity')}
                                </Button>
                            </>
                        }
                    >
                        <AutoSaveDraft
                            draftKey={TICKET_DRAFT_KEY}
                            fields={['title', 'content', 'product_id', 'type_id', 'priority_id']}
                        />
                        <CreateTicketFormInner
                            ticketDrawerOpen={ticketDrawerOpen}
                            handleChange={handleChange}
                            showDesc={showDesc}
                            setShowDesc={setShowDesc}
                        />
                    </ZCDrawer>
                    );
                }}
            </Formik>
        </>
    );
};

export default CreateTicket;
