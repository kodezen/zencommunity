import React, { useEffect, useState } from 'react';
import { Box, Flex, Button, Text, Spinner } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroupEvents, createEvent, updateEvent } from '@Redux/slices/eventSlice/eventSlice';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import EventCard from '@Components/EventCard/EventCard';
import EventForm from '@Components/EventForm/EventForm';
import NoDataPost from '@Components/NoDataPost';
import { useStyles } from '../../utils/chakra';

const FILTERS = [
    { value: 'upcoming', label: __('Upcoming', 'zencommunity') },
    { value: 'past', label: __('Past', 'zencommunity') },
];

const Events = ({ groupId, isAdmin = false, onFeedRefresh, canFetch = true }) => {
    const { primaryBtnInsideContent } = useStyles();
    const dispatch = useDispatch();
    const { events, loading } = useSelector((state) => state.events);
    const [filter, setFilter] = useState('upcoming');
    const [formOpen, setFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);

    useEffect(() => {
        if (canFetch) {
            dispatch(fetchGroupEvents({ groupId, filter }));
        }
    }, [groupId, filter, canFetch]);

    const handleCreate = async (values, formik) => {
        formik.setSubmitting(true);
        try {
            await dispatch(createEvent({ groupId, data: values })).unwrap();
            dispatch(showNotification({ message: __('Event created!', 'zencommunity'), isShow: true, type: 'success' }));
            setFormOpen(false);
            formik.resetForm();
            onFeedRefresh?.();
        } catch (err) {
            dispatch(showNotification({ message: __('Failed to create event.', 'zencommunity'), isShow: true, type: 'error' }));
        } finally {
            formik.setSubmitting(false);
        }
    };

    const handleUpdate = async (values, formik) => {
        formik.setSubmitting(true);
        try {
            await dispatch(updateEvent({ eventId: editingEvent.id, data: values })).unwrap();
            dispatch(showNotification({ message: __('Event updated!', 'zencommunity'), isShow: true, type: 'success' }));
            setEditingEvent(null);
            onFeedRefresh?.();
        } catch (err) {
            dispatch(showNotification({ message: __('Failed to update event.', 'zencommunity'), isShow: true, type: 'error' }));
        } finally {
            formik.setSubmitting(false);
        }
    };

    const handleEdit = (event) => {
        setEditingEvent(event);
    };

    return (
        <Box>
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Flex gap={2}>
                    {FILTERS.map((f) => (
                        <Button
                            key={f.value}
                            variant="plain"
                            size="sm"
                            bg={filter === f.value ? 'var(--zencom-primary-color)' : 'transparent'}
                            color={filter === f.value ? 'var(--zencom-secondary-color)' : 'var(--zencom-font-color)'}
                            border="1px solid var(--zencom-border-color)"
                            _hover={{ opacity: 0.85 }}
                            onClick={() => setFilter(f.value)}
                        >
                            {f.label}
                        </Button>
                    ))}
                </Flex>

                {isAdmin && (
                    <Button
                        variant="plain"
                        {...primaryBtnInsideContent}
                        onClick={() => setFormOpen(true)}
                    >
                        {__('+ Create Event', 'zencommunity')}
                    </Button>
                )}
            </Flex>

            {loading ? (
                <Flex justifyContent="center" py={10}>
                    <Spinner color="var(--zencom-primary-color)" />
                </Flex>
            ) : events.length === 0 ? (
                <div style={{ background: 'var(--zencom-background)' }}>
                    <NoDataPost
                        title={
                            filter === 'upcoming'
                                ? __('No upcoming events', 'zencommunity')
                                : __('No past events', 'zencommunity')
                        }
                    />
                </div>
            ) : (
                <Flex direction="column" gap={4}>
                    {events.map((event) => (
                        <EventCard
                            key={event.id}
                            event={event}
                            isAdmin={isAdmin}
                            onEdit={handleEdit}
                        />
                    ))}
                </Flex>
            )}

            <EventForm
                isOpen={formOpen}
                onClose={() => setFormOpen(false)}
                onSubmit={handleCreate}
            />

            {editingEvent && (
                <EventForm
                    isOpen={!!editingEvent}
                    isEdit
                    initialValues={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSubmit={handleUpdate}
                />
            )}
        </Box>
    );
};

export default Events;
