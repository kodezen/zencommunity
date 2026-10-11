import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Flex,
    Field,
    Icon,
    IconButton,
    Input,
    InputGroup,
    Link,
    Text,
    VStack,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff, FiUser } from "react-icons/fi";
import { ErrorMessage, Formik } from "formik";
import { __, sprintf } from '@wordpress/i18n';
import {
    API, community_path, isLoggedIn, namespace, site_url, google_login_status,
    allow_member_registration, override_wp_registration, wp_users_can_register, register_page_url,
} from '@Utils/helper';
import { useDispatch } from 'react-redux';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import ZenComLoader from '@Components/ZenComLoader';
import { useStyles } from '../../utils/chakra';
import LoginWithGoogle from './SocialsLogin/LoginWithGoogle';
import { useNavigate } from 'react-router-dom';

/**
 * A `?redirect_to=` query param on the signin URL sends the user back to
 * wherever they came from (e.g. a "log in to comment" link on a blog post)
 * instead of always landing on the community dashboard. Restricted to
 * same-origin targets — an unchecked redirect_to would be an open redirect,
 * and this value isn't validated server-side anywhere before use.
 */
const getSafeRedirectTo = () => {
    try {
        // URLSearchParams#get already percent-decodes the value — decoding
        // it again here would double-decode any '%' the target URL itself
        // contains.
        const redirectTo = new URLSearchParams(window.location.search).get('redirect_to');
        if (!redirectTo) return null;
        return redirectTo.startsWith(site_url) ? redirectTo : null;
    } catch (e) {
        return null;
    }
};

const ErrorMessageRender = ({errors, name}) => {
    if(!errors[`${name}`]) return;
    return (
        <Text color={'var(--zencom-warning)'} fontSize={'12px'} marginTop={'8px'}>
            {errors[`${name}`]  ? (
                <div>{errors[`${name}`]}</div>
            ) : null}
            <ErrorMessage name={name} />
        </Text>
    )
}

const Login = ({ isNew }) => {
    const { clearPrimaryBtn } = useStyles();
    // register_page_url means the "Select Registration Page" setting points
    // elsewhere (WordPress's native page, or a custom WP Page) - that's a
    // separate destination this in-app form doesn't gate. Otherwise, mirror the
    // server-side gate in Auth::signup(): registration needs the community's
    // own toggle on, plus either the "Override WordPress Registration Setting"
    // toggle or WP core's own "Anyone can register" option.
    const canRegister = !!register_page_url || (!!allow_member_registration && (!!override_wp_registration || !!wp_users_can_register));
    const [showRegister, setShowRegister] = useState(isNew && canRegister && !register_page_url);
    const [checkAuth, setCheckAuth] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const label = showRegister ? "Sign Up" : "Login";
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn) {
            window.location.href = getSafeRedirectTo() || (site_url + community_path);
        } else if (isNew && register_page_url) {
            // Registration is configured to happen on a different page - bounce
            // straight there instead of showing the in-app signup form.
            window.location.href = register_page_url;
        } else {
            setCheckAuth(false);
        }
    }, [])
    const onSubmit = async (values, action) => {
        try {
            action.setSubmitting(true);

            const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            if (showRegister) {
                const { first_name, last_name,  email, password } = values;

                if (!first_name) {
                    dispatch(showNotification({
                        message: __('First Name required.', 'zencommunity'),
                        isShow: true,
                        type: 'error',
                    }));
                    action.setSubmitting(false);
                    return;
                }
                if (!last_name) {
                    dispatch(showNotification({
                        message: __('Last Name required.', 'zencommunity'),
                        isShow: true,
                        type: 'error',
                    }));
                    action.setSubmitting(false);
                    return;
                }

                if (!isValidEmail(email)) {
                    dispatch(showNotification({
                        message: __('Please enter a valid email address.', 'zencommunity'),
                        isShow: true,
                        type: 'error',
                    }));
                    action.setSubmitting(false);
                    return;
                }

                if (password.length < 6) {
                    dispatch(showNotification({
                        message: __('Password must be at least 6 characters.', 'zencommunity'),
                        isShow: true,
                        type: 'error',
                    }));
                    action.setSubmitting(false);
                    return;
                }
            } else {
                const { user, password } = values;

                if (!user || !password) {
                    dispatch(showNotification({
                        message: __('Please enter username/email and password.', 'zencommunity'),
                        isShow: true,
                        type: 'error',
                    }));
                    action.setSubmitting(false);
                    return;
                }

                if (user.includes('@') && !isValidEmail(user)) {
                    dispatch(showNotification({
                        message: __('Invalid email format.', 'zencommunity'),
                        isShow: true,
                        type: 'error',
                    }));
                    action.setSubmitting(false);
                    return;
                }
            }

            const authUrl = showRegister ? "/auth/signup" : "/auth/signin";

            await API.post(namespace + authUrl, { ...values }).then((res) => {
                if (showRegister && res?.data?.requires_confirmation) {
                    // Claiming an existing guest account: finished via the emailed link.
                    setShowRegister(false);
                    dispatch(showNotification({
                        message: res.data.message,
                        isShow: true,
                        type: 'success',
                    }));
                } else if (showRegister) {
                    setShowRegister(false);
                    action.setValues({
                        user: values.email,
                        password: ''
                    })
                } else {
                    // force reload for nonce regenerate
                    window.location.replace(getSafeRedirectTo() || (site_url + community_path));
                }
            });
        } catch (error) {
            console.error({ error });
            dispatch(showNotification({
                message: error?.response?.data?.message || error?.message,
                isShow: true,
                type: 'error',
            }));
        } finally {
            action.setSubmitting(false);
        }
    };

    const initialValues = useMemo(() => {
        if (showRegister) {
            return {
                email: "",
                password: "",
                remember_me: true,
                first_name: "",
                last_name: "",
            }
        } else {
            return {
                user: "",
                password: "",
                remember_me: true,
            }
        }
    }, [showRegister])

    if (checkAuth) return <Box width={{ base: "100%", md: "100%", lg: "600px" }}><ZenComLoader maxW={{ base: "100%", md: "100%", lg: "600px" }} margin="20px auto" /></Box>;

    const LoginRegisterSwitching = (!showRegister && !canRegister) ? null : (
        <Button variant="transparent" border='none' width="100%"
            onClick={() => {
                if (showRegister) {
                    setShowRegister(false);
                    return;
                }
                if (!canRegister) return;
                if (register_page_url) {
                    window.location.href = register_page_url;
                    return;
                }
                setShowRegister(true);
            }}
        >
            {showRegister ? (
                <Flex justify="space-between" align="center" gap={2}>
                    <ZCLabel
                        label={__('Already have an account?', 'zencommunity')}
                        type='simple'
                    />
                    <Button {...clearPrimaryBtn}>
                        {__('Login', 'zencommunity')}
                    </Button>
                </Flex>
            ) : (
                <Flex justify="space-between" align="center" gap={2} >
                    <ZCLabel
                        label={__(`Don't have an account?`, 'zencommunity')}
                        type='simple'
                    />
                    <Button {...clearPrimaryBtn}>
                        {__('Signup', 'zencommunity')}
                    </Button>
                </Flex>
            )}
        </Button>
    )

    return (
        <Formik
            enableReinitialize={true}
            initialValues={initialValues}
            validate={(values) => {
                const errors = {};
                
                if (!values) {
                    return errors;
                }
                
                if (showRegister) {
                    if (!values.email) {
                        errors.email = __('Eamil is Required.', 'zencommunity');
                    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(values.email)) {
                        errors.email = __('Invalid email address', 'zencommunity');
                    }
                    
                    if (!values.password) {
                        errors.password = __('Password is Missing.', 'zencommunity');
                    } else if (!values.first_name) {
                        errors.first_name = __('First Name is Required.', 'zencommunity');
                    } else if (!values.last_name) {
                        errors.last_name = __('Last Name is Required.', 'zencommunity');
                    }
                } else {
                    if (!values.user) {
                        errors.user = __('Eamil/Username is Required.', 'zencommunity');
                    } else if (!values.password) {
                        errors.password = __('Password is Missing.', 'zencommunity');
                    }
                }
                return errors;
            }}
            onSubmit={onSubmit}
        >
            {({values, setFieldValue, dirty, isSubmitting, handleSubmit, errors}) => {
                return (
                    <Flex justifyContent="center" alignItems="center" height="90vh">
                        <Box
                            width="380px"
                            background={'var(--zencom-background)'}
                            p={8}
                            borderRadius="8px"
                            mx="auto"
                            height='fit-content'
                        >
                            <Flex direction="column" align="center" mb={6}>
                                <Icon as={FiUser} boxSize={14} color={'var(--zencom-font-color)'} borderWidth="1px" borderRadius="50%" padding="14px" mb={2} />

                                <ZCLabel
                                    label={sprintf(__('%s to account', 'zencommunity'), label)}
                                    type='heading'
                                    lineHeight="32px"
                                />

                                <ZCLabel
                                    label={sprintf(__('Enter details to %s', 'zencommunity'), label)}
                                    type='simple'
                                    fontSize='16px'
                                    lineHeight="24px"
                                />
                            </Flex>

                            <Flex flexDirection="column" gap={3} color={"var(--zencom-font-color)"}>
                                {showRegister && (
                                    <>
                                        <Flex justify="space-between" align="center" gap={4}>
                                            <Field.Root required gap={0}>
                                                <Field.Label marginBottom={'10px'}>
                                                    {__('First Name', 'zencommunity')} <Field.RequiredIndicator />
                                                </Field.Label>
                                                <Input autoComplete="given-name" name='first_name' color={'var(--zencom-font-color) !important'} fontSize="12px" type='text' placeholder={__('Enter First Name', 'zencommunity')} variant="outline" value={values?.first_name ?? ""} onChange={(e) => setFieldValue('first_name', e.target.value)} />

                                            </Field.Root>

                                            <Field.Root required gap={0}>
                                                <Field.Label marginBottom={'10px'} >
                                                    {__('Last Name', 'zencommunity')} <Field.RequiredIndicator />
                                                </Field.Label>
                                                <Input  autoComplete="family-name" name="last_name" color={'var(--zencom-font-color) !important'} fontSize="12px" type='text' placeholder={__('Enter Last Name', 'zencommunity')} variant="outline" value={values?.last_name ?? ""} onChange={(e) => setFieldValue('last_name', e.target.value)} />
                                            </Field.Root>
                                        </Flex>
                                        <Box marginTop={'-10px'}>
                                            <ErrorMessageRender errors={errors} name={'first_name'} />
                                            <ErrorMessageRender errors={errors} name={'last_name'} />
                                        </Box>
                                    </>
                                )}

                                <Field.Root required gap={0}>
                                    <Field.Label marginBottom={'10px'}>
                                        {__('Email', 'zencommunity')} <Field.RequiredIndicator />
                                    </Field.Label>
                                    <Input autocomplete="email username" name='email' type='text' color={'var(--zencom-font-color) !important'} fontSize="12px" placeholder={showRegister ? __('Enter Email', 'zencommunity') : __('Enter Username or Email', 'zencommunity')} variant="outline" value={showRegister ? values.email : values.user} onChange={(e) => setFieldValue(showRegister ? 'email' : 'user', e.target.value)} />
                                    <ErrorMessageRender errors={errors} name={'email'} />
                                    <ErrorMessageRender errors={errors} name={'user'} />
                                </Field.Root>

                                <Field.Root required gap={0}>
                                    <Field.Label marginBottom={'10px'}>
                                        {__('Password', 'zencommunity')} <Field.RequiredIndicator />
                                    </Field.Label>

                                    <InputGroup
                                        endElement={
                                            <IconButton
                                                variant="ghost"
                                                size="sm"
                                                aria-label={__('Toggle password visibility', 'zencommunity')}
                                                onClick={() => setShowPassword((v) => !v)}
                                                color="var(--zencom-font-color)"
                                            >
                                                {showPassword ? <FiEyeOff /> : <FiEye />}
                                            </IconButton>
                                        }
                                    >
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete={showRegister ? 'new-password' : 'current-password'}
                                            name='password'
                                            key={`password-${showRegister}`}
                                            fontSize="12px"
                                            placeholder={__('Enter password', 'zencommunity')}
                                            variant="outline"
                                            color={'var(--zencom-font-color) !important'}
                                            defaultValue=""
                                            onChange={(e) => setFieldValue('password', e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSubmit();
                                                }
                                            }}
                                        />
                                    </InputGroup>
                                    <ErrorMessageRender errors={errors} name={'password'} />
                                </Field.Root>
                            </Flex>

                            {!showRegister && (
                                <Flex justify="space-between" align="center" m="1.5rem 0">
                                    <Checkbox.Root size="sm" checked={values.remember_me} onChange={(e) => setFieldValue('remember_me', e.target.checked)}>
                                        <Checkbox.HiddenInput />
                                        <Checkbox.Control />
                                        <Checkbox.Label color={'var(--zencom-font-color)'}>{__('Keep me logged in', 'zencommunity')}</Checkbox.Label>
                                    </Checkbox.Root>

                                    {/* <Link color="blue.500" fontSize="sm">
                                        {__('Forgot Password?', 'zencommunity')}
                                    </Link> */}
                                    <Button
                                        bg="transparent"
                                        color={"var(--zencom-primary-color)"}
                                        onClick={() => navigate('/reset-password')}
                                        padding={0}
                                        textDecoration={'none'}
                                    >
                                        {__('Reset Password', 'zencommunity')}
                                    </Button>
                                </Flex>
                            )}

                            <Box position="fixed" top="5px" right="6px" zIndex={'999'}>
                                {LoginRegisterSwitching}
                            </Box>
                            <VStack gap={"24px"}>
                                <Button bg="var(--zencom-primary-color)" width="100%" mt={`${showRegister ? "1.5rem" : "0"}`} onClick={handleSubmit} loading={isSubmitting} disabled={!dirty}>
                                    {showRegister ? __('Sign Up', 'zencommunity') : __('Login', 'zencommunity')}
                                </Button>

                                {
                                    google_login_status && (
                                        <>
                                            <Flex
                                                align="center"
                                                justify="center"
                                                color="var(--zencom-font-color)"
                                                w="100%"
                                                gap={3}
                                                _before={{
                                                    content: '""',
                                                    flex: 1,
                                                    borderBottom: '1px solid var(--zencom-border-color)',
                                                
                                                }}
                                                _after={{
                                                    content: '""',
                                                    flex: 1,
                                                    borderBottom: '1px solid var(--zencom-border-color)',
                                                    
                                                }}
                                            >
                                                <Text fontSize="sm" color="var(--zencom-font-color)">
                                                    {__('OR', 'zencommunity')}
                                                </Text>
                                            </Flex>
                                            <LoginWithGoogle />
                                        </>
                                    )
                                }

                            </VStack>


                            {LoginRegisterSwitching}

                            {/* <Text fontSize="sm" color="gray.500" textAlign="center" m="1.5rem 0">
                                {__('OR', 'zencommunity')}
                            </Text>

                            <Flex direction="column" gap="1rem">
                                <Button variant="outline" width="100%">
                                    <FcGoogle />
                                    {sprintf(__('%s with Google', 'zencommunity'), label)}
                                </Button>

                                <Button variant="outline" width="100%">
                                    <FaFacebook />
                                    {sprintf(__('%s with Facebook', 'zencommunity'), label)}
                                </Button>
                            </Flex> */}
                        </Box>
                    </Flex>
                )
            }}
        </Formik>
    );
};

export default Login;
