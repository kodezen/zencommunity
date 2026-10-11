import React, { useEffect, useState } from 'react';
import { Box, Flex, Icon, Text, Textarea, Button, Skeleton } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { useSearchParams } from 'react-router-dom';
import { FaStar } from 'react-icons/fa';
import { IoCheckmarkCircle, IoAlertCircleOutline } from 'react-icons/io5';
import { API, namespace } from '@Utils/helper';
import { useStyles } from '../../utils/chakra';

/**
 * Public, no-login page behind the CSAT link emailed to a client once their
 * AI-handled chat is closed (see Hooks::send_feedback_email() in the Live
 * Chat addon). Access is governed entirely by the chat_id/token pair in the
 * URL — the same shape as a password-reset link — so this route sits outside
 * <PrivateRoutes> in communityRouter.js.
 */
const STATE = {
    LOADING: 'loading',
    READY: 'ready',
    SUBMITTED: 'submitted',
    UNAVAILABLE: 'unavailable',
};

const LiveChatFeedback = () => {
    const [searchParams] = useSearchParams();
    const chatId = searchParams.get('chat_id');
    const token = searchParams.get('token');
    const { commonInput, primaryBtnInsideContent } = useStyles();

    const [state, setState] = useState(STATE.LOADING);
    const [unavailableMessage, setUnavailableMessage] = useState('');
    const [chatName, setChatName] = useState('');
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        if (!chatId || !token) {
            setUnavailableMessage(__('This feedback link is invalid.', 'zencommunity'));
            setState(STATE.UNAVAILABLE);
            return;
        }

        API.get(`${namespace}/live-chat/feedback`, { params: { chat_id: chatId, token } })
            .then(({ data }) => {
                if (!data?.valid) {
                    setUnavailableMessage(data?.message || __('This feedback link is invalid.', 'zencommunity'));
                    setState(STATE.UNAVAILABLE);
                    return;
                }
                setChatName(data?.chat?.name || '');
                setState(STATE.READY);
            })
            .catch((err) => {
                setUnavailableMessage(err?.response?.data?.message || __('This feedback link is invalid or has expired.', 'zencommunity'));
                setState(STATE.UNAVAILABLE);
            });
    }, [chatId, token]);

    const submit = async () => {
        if (!rating || submitting) return;
        setSubmitting(true);
        setSubmitError('');
        try {
            await API.post(`${namespace}/live-chat/feedback`, {
                chat_id: chatId,
                token,
                rating,
                message: comment,
            });
            setState(STATE.SUBMITTED);
        } catch (err) {
            setSubmitError(err?.response?.data?.message || __('Could not submit your feedback. Please try again.', 'zencommunity'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box
            maxW="440px"
            bg="var(--zencom-background)"
            p={8}
            borderRadius="md"
            mx="auto"
            mt={{ base: '30px', md: '90px', lg: '60px' }}
        >
            {state === STATE.LOADING && (
                <Flex direction="column" gap="3">
                    <Skeleton height="24px" width="60%" />
                    <Skeleton height="16px" width="80%" />
                    <Skeleton height="80px" width="100%" mt="4" />
                </Flex>
            )}

            {state === STATE.UNAVAILABLE && (
                <Flex direction="column" align="center" textAlign="center" gap="2">
                    <Icon as={IoAlertCircleOutline} boxSize={12} color="var(--zencom-font-color)" opacity={0.6} />
                    <Text fontSize="lg" fontWeight="600" color="var(--zencom-font-color)">
                        {__('Link unavailable', 'zencommunity')}
                    </Text>
                    <Text fontSize="sm" color="gray.500">{unavailableMessage}</Text>
                </Flex>
            )}

            {state === STATE.SUBMITTED && (
                <Flex direction="column" align="center" textAlign="center" gap="2">
                    <Icon as={IoCheckmarkCircle} boxSize={12} color="var(--zencom-primary-color)" />
                    <Text fontSize="lg" fontWeight="600" color="var(--zencom-font-color)">
                        {__('Thanks for your feedback!', 'zencommunity')}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                        {__("We've shared it with our support team.", 'zencommunity')}
                    </Text>
                </Flex>
            )}

            {state === STATE.READY && (
                <>
                    <Flex direction="column" align="center" mb={6} textAlign="center">
                        <Text fontSize="xl" fontWeight="bold" color="var(--zencom-font-color)">
                            {__('How was your support chat?', 'zencommunity')}
                        </Text>
                        {chatName ? (
                            <Text fontSize="sm" color="gray.500" mt={1}>{chatName}</Text>
                        ) : null}
                    </Flex>

                    <Flex justify="center" gap="2" mb={4}>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <Box
                                as="button"
                                key={n}
                                type="button"
                                onClick={() => setRating(n)}
                                onMouseEnter={() => setHover(n)}
                                onMouseLeave={() => setHover(0)}
                                cursor="pointer"
                                aria-label={__('Rate', 'zencommunity')}
                            >
                                <Icon
                                    as={FaStar}
                                    boxSize={8}
                                    color={n <= (hover || rating) ? 'var(--zencom-primary-color)' : 'var(--zencom-border-color)'}
                                />
                            </Box>
                        ))}
                    </Flex>

                    <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        placeholder={__('Tell us more (optional)', 'zencommunity')}
                        {...commonInput}
                    />

                    {submitError ? (
                        <Text fontSize="sm" color="red.400" mt={2}>{submitError}</Text>
                    ) : null}

                    <Button
                        width="100%"
                        mt={4}
                        disabled={!rating || submitting}
                        onClick={submit}
                        loading={submitting}
                        loadingText={__('Submitting…', 'zencommunity')}
                        {...primaryBtnInsideContent}
                    >
                        {__('Submit feedback', 'zencommunity')}
                    </Button>
                </>
            )}
        </Box>
    );
};

export default LiveChatFeedback;
