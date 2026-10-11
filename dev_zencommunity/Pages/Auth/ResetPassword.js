import React, { useState } from 'react';
import {
    Box,
    Button,
    Flex,
    Field,
    Icon,
    Input,
    Text,
} from '@chakra-ui/react';
import { CiUnlock } from "react-icons/ci";
import { __ } from '@wordpress/i18n';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { API, namespace } from '@Utils/helper';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const ResetPassword = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // A key+login pair on the URL means this is the link from the reset
    // email - show the "set a new password" form instead of the "request a
    // link" one. useState so switching tabs/windows doesn't re-read a URL
    // that a successful submit below has already cleared.
    const [params] = useState(() => new URLSearchParams(window.location.search));
    const login = params.get('login');
    const key = params.get('key');
    const isSettingNewPassword = Boolean(login && key);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const notify = (message, type = 'error') =>
        dispatch(showNotification({ message, isShow: true, type }));

    const handleRequestLink = async () => {
        if (!isValidEmail(email)) {
            notify(__('Please enter a valid email address.', 'zencommunity'));
            return;
        }
        setSubmitting(true);
        try {
            const { data } = await API.post(namespace + '/auth/lost-password', { email });
            notify(data?.message, 'success');
        } catch (error) {
            notify(error?.response?.data?.message || error?.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSetNewPassword = async () => {
        if (password.length < 6) {
            notify(__('Password must be at least 6 characters.', 'zencommunity'));
            return;
        }
        if (password !== confirmPassword) {
            notify(__('Passwords do not match.', 'zencommunity'));
            return;
        }
        setSubmitting(true);
        try {
            const { data } = await API.post(namespace + '/auth/reset-password', { login, key, password });
            notify(data?.message, 'success');
            navigate('/signin');
        } catch (error) {
            notify(error?.response?.data?.message || error?.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box
            maxW="384px"
            bg="var(--zencom-background)"
            p={8}
            borderRadius="md"
            mx="auto"
            mt={{ base: "30px", md: "90px", lg: "30px"}}
        >
            <Flex direction="column" align="center" mb={6}>
                <Icon as={CiUnlock } boxSize={14} borderWidth="1px" borderRadius="50%" padding="14px" mb={2} />

                <Text fontSize="2xl" fontWeight="bold" mb={1}>
                    {isSettingNewPassword
                        ? __('Set a new password', 'zencommunity')
                        : __('Reset password', 'zencommunity')}
                </Text>

                <Text fontSize="md" color="gray.500" textAlign="center">
                    {isSettingNewPassword
                        ? __('Choose a new password for your account.', 'zencommunity')
                        : __('Enter your email to reset your password', 'zencommunity')}
                </Text>
            </Flex>

            {isSettingNewPassword ? (
                <>
                    <Field.Root required>
                        <Field.Label>
                            {__('New password', 'zencommunity')} <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                            autoComplete="new-password"
                            type="password"
                            placeholder={__('Enter new password', 'zencommunity')}
                            variant="outline"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </Field.Root>

                    <Field.Root required mt={4}>
                        <Field.Label>
                            {__('Confirm password', 'zencommunity')} <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                            autoComplete="new-password"
                            type="password"
                            placeholder={__('Re-enter new password', 'zencommunity')}
                            variant="outline"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </Field.Root>

                    <Button
                        bg="var(--zencom-primary-color)"
                        width="100%"
                        mt={6}
                        loading={submitting}
                        onClick={handleSetNewPassword}
                    >
                        {__('Save new password', 'zencommunity')}
                    </Button>
                </>
            ) : (
                <>
                    <Field.Root required>
                        <Field.Label>
                            Email <Field.RequiredIndicator />
                        </Field.Label>
                        <Input
                            autoComplete="off"
                            type="email"
                            placeholder={__('Enter your email', 'zencommunity')}
                            variant="outline"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </Field.Root>

                    <Button
                        bg="var(--zencom-primary-color)"
                        width="100%"
                        mt={6}
                        loading={submitting}
                        onClick={handleRequestLink}
                    >
                        {__('Send reset link', 'zencommunity')}
                    </Button>
                </>
            )}
        </Box>
    );
};

export default ResetPassword;
