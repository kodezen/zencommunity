import { Formik, useFormikContext } from 'formik';
import React from 'react';
import {
    Box,
    Flex,
    Text,
    Button,
    Input,
    Textarea,
    Tag,
    InputGroup,
} from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';
import { profileInitialValue } from './helper';
import { API, namespace, enable_date_of_birth_field } from '@Utils/helper';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import ZCSelect from '@Components/Select';
import { useDispatch } from 'react-redux';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { useStyles } from '@Utils/chakra';

const followPrivacyOptions = [
    { label: __('Everyone', 'zencommunity'), value: 'everyone' },
    { label: __('Logged-in users only', 'zencommunity'), value: 'logged_user' },
    { label: __('Only me', 'zencommunity'), value: 'profile_owner' },
];

const EditAbout = ({ profileData, setIsEdit, setProfileData }) => {
    const { primaryBtnInsideContent } = useStyles();
    const dispatch = useDispatch();
    const onSubmitHandler = async (values, actions) => {
        actions.setSubmitting(true);
        try {
            const res = await API.post(namespace + `/member/profile`, { ...values });
            if (res.status === 200) {
                actions.setSubmitting(false);
                dispatch(showNotification({
                    message: __('Profile Updated Successfully!', 'zencommunity'),
                    isShow: true,
                    type: 'success',
                }));
                setProfileData({ ...profileData, ...res.data });
                setIsEdit(false);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            actions.setSubmitting(false);
        }
    };

    return (
        <Formik
            enableReinitialize={true}
            initialValues={profileInitialValue(profileData)}
            onSubmit={onSubmitHandler}
        >
            {({ values, setFieldValue, submitForm, isSubmitting, dirty }) => {
                return (
                    <Flex width="100%" direction={"column"} mt="40px">
                        <Box mb="16px">
                            <ZCLabel
                                label={__('About', 'zencommunity')}
                                fontWeight="600"
                                fontSize='16px'
                            />
                            <ZCLabel
                                label={__('Your personal details to complete your profile.', 'zencommunity')}
                                type="subTitle"
                                fontWeight="400"
                                color='gray.500'
                            />
                        </Box>

                        <Box
                            mb="40px"
                            gap={4}
                            w="100%"
                            background="var(--zencom-background)"
                            color="var(--zencom-font-color)"
                            borderRadius="sm"
                            p="24px"
                        >
                            <Flex direction={{base:"column", md:"row"}} gap="24px" mb="24px">
                                <Flex direction="column" gap="6px" flex="1">
                                    <Text mb={1} fontSize="sm" fontWeight={"semibold"} display={'flex'} gap='2'>
                                        {__('First name', 'zencommunity')}
                                        <Text color='red'>*</Text>
                                    </Text>
                                    <Input placeholder={__('Ex. John', 'zencommunity')} defaultValue="" value={values?.first_name} onChange={(e) => setFieldValue("first_name", e.target.value)} />
                                </Flex>
                                <Flex direction="column" gap="6px" flex="1">
                                    <Text mb={1} fontSize="sm" fontWeight={"semibold"}>
                                        {__('Last name', 'zencommunity')}
                                        <Tag.Root size={"sm"} ml={"4px"} bg={"#E0E4E8"} color={"#454F59"}>
                                            <Tag.Label display={"flex"} gap={2} alignItems={"center"} >
                                                {__('optional', 'zencommunity')}
                                            </Tag.Label>
                                        </Tag.Root>
                                    </Text>
                                    <Input placeholder={__('Ex. Smith', 'zencommunity')} defaultValue="" value={values?.last_name} onChange={(e) => setFieldValue("last_name", e.target.value)} />
                                </Flex>
                            </Flex>

                            <Flex direction={{base:"column", md:"row"}} gap="24px" mb="24px">
                                <Flex direction="column" gap="6px" flex="1">
                                    <Text mb={1} fontSize="sm" fontWeight={"semibold"}>
                                        {__('Display name', 'zencommunity')}
                                        <Tag.Root size={"sm"} ml={"4px"} bg={"#E0E4E8"} color={"#454F59"}>
                                            <Tag.Label display={"flex"} gap={2} alignItems={"center"} >
                                                {__('optional', 'zencommunity')}
                                            </Tag.Label>
                                        </Tag.Root>
                                    </Text>
                                    <Input
                                        placeholder={__('Ex. J. Smith', 'zencommunity')}
                                        defaultValue=""
                                        value={values?.meta.display_name}
                                        onChange={(e) => setFieldValue("meta.display_name", e.target.value)}
                                    />
                                    <Text fontSize="xs" color="gray.500">
                                        {__('Shown across the community instead of your real name.', 'zencommunity')}
                                    </Text>
                                </Flex>
                                <Flex direction="column" gap="6px" flex="1">
                                    <Text mb={1} fontSize="sm" fontWeight={"semibold"}>
                                        {__('Pronouns', 'zencommunity')}
                                        <Tag.Root size={"sm"} ml={"4px"} bg={"#E0E4E8"} color={"#454F59"}>
                                            <Tag.Label display={"flex"} gap={2} alignItems={"center"} >
                                                {__('optional', 'zencommunity')}
                                            </Tag.Label>
                                        </Tag.Root>
                                    </Text>
                                    <Input
                                        placeholder={__('Ex. she/her, he/him, they/them', 'zencommunity')}
                                        defaultValue=""
                                        value={values?.meta.pronouns}
                                        onChange={(e) => setFieldValue("meta.pronouns", e.target.value)}
                                    />
                                    <Text fontSize="xs" color="gray.500">
                                        {__('Shown next to your name and in hover cards.', 'zencommunity')}
                                    </Text>
                                </Flex>
                            </Flex>

                            {enable_date_of_birth_field && (
                                <Flex direction={{base:"column", md:"row"}} gap="24px" mb="24px">
                                    <Flex direction="column" gap="6px" flex="1">
                                        <Text mb={1} fontSize="sm" fontWeight={"semibold"}>
                                            {__('Date of birth', 'zencommunity')}
                                            <Tag.Root size={"sm"} ml={"4px"} bg={"#E0E4E8"} color={"#454F59"}>
                                                <Tag.Label display={"flex"} gap={2} alignItems={"center"} >
                                                    {__('optional', 'zencommunity')}
                                                </Tag.Label>
                                            </Tag.Root>
                                        </Text>
                                        <Input
                                            type="date"
                                            value={values?.meta.date_of_birth}
                                            onChange={(e) => setFieldValue("meta.date_of_birth", e.target.value)}
                                        />
                                    </Flex>
                                    <Flex direction="column" gap="6px" flex="1" />
                                </Flex>
                            )}

                            <Flex direction={{base:"column", md:"row"}} gap="24px" mb="24px">
                                <Flex direction="column" gap="6px" flex="1">
                                    <ZCLabel
                                        label={__('Email', 'zencommunity')}
                                        fontWeight="semibold"
                                        fontSize="sm"
                                    />
                                    <Input
                                        disabled
                                        placeholder="saiful@example.com"
                                        defaultValue=""
                                        value={values?.email}
                                        onChange={(e) => setFieldValue("email", e.target.value)} />
                                </Flex>
                                <Flex direction="column" gap="6px" flex="1">
                                    <Text mb={1} fontSize="sm" fontWeight={"semibold"}>
                                        {__('Website URL', 'zencommunity')}
                                        <Tag.Root size={"sm"} ml={"4px"} bg={"#E0E4E8"} color={"#454F59"}>
                                            <Tag.Label display={"flex"} gap={2} alignItems={"center"} >
                                                {__('optional', 'zencommunity')}
                                            </Tag.Label>
                                        </Tag.Root>
                                    </Text>
                                    <Input
                                        placeholder="http://academylms.local"
                                        defaultValue=""
                                        value={values?.meta.website_url}
                                        onChange={(e) => setFieldValue("meta.website_url", e.target.value)} />
                                </Flex>
                            </Flex>

                            <Flex width="100%" gap="6px" direction="column">
                                <ZCLabel
                                    label={__('Bio', 'zencommunity')}
                                    fontWeight="semibold"
                                    fontSize="sm"
                                />
                                <Textarea placeholder={__('Type your bio here', 'zencommunity')} defaultValue="" h="100px" value={values?.bio} onChange={(e) => setFieldValue("bio", e.target.value)} />
                            </Flex>
                        </Box>

                        <Box mb="16px">
                            <ZCLabel
                                label={__('Social links', 'zencommunity')}
                                fontWeight="600"
                                fontSize='16px'
                            />
                            <ZCLabel
                                label={__('Your social media profiles so others can follow or connect with you.', 'zencommunity')}
                                type="subTitle"
                                fontWeight="400"
                                color='gray.500'
                            />
                        </Box>
                        
                        <Box
                            mb="40px"
                            gap={4}
                            w="100%"
                            borderRadius="sm"
                            p="24px"
                            background="var(--zencom-background)"
                        >
                            <Flex mb="24px" gap="24px" w="100%" direction={{base:"column", md:"row"}}>
                                <Flex direction="column" gap="6px" flex="1">
                                    <ZCLabel
                                        label={__('Facebook', 'zencommunity')}
                                        fontWeight="semibold"
                                        fontSize="sm"
                                    />
                                    <InputGroup startAddon="https://facebook.com/">
                                        <Input placeholder={__('Username', 'zencommunity')} value={values?.meta.social_links?.facebook} onChange={(e) => setFieldValue("meta.social_links.facebook", e.target.value)} color="var(--zencom-font-color)"/>
                                    </InputGroup>
                                </Flex>
                                <Flex direction="column" gap="6px" flex="1">
                                    <ZCLabel
                                        label={__('Instagram', 'zencommunity')}
                                        fontWeight="semibold"
                                        fontSize="sm"
                                    />
                                    <InputGroup startAddon="https://instagram.com/">
                                        <Input placeholder={__('Username', 'zencommunity')} color="var(--zencom-font-color)" value={values?.meta.social_links?.instagram} onChange={(e) => setFieldValue("meta.social_links.instagram", e.target.value)} />
                                    </InputGroup>
                                </Flex>
                            </Flex>
                            <Flex mb={4} gap={4} w={"100%"} direction={{base:"column", md:"row"}}>
                                <Flex direction="column" gap="6px" flex={"1"}>
                                    <ZCLabel
                                        label={__('Linkedin', 'zencommunity')}
                                        fontWeight="semibold"
                                        fontSize="sm"
                                    />
                                    <InputGroup startAddon="https://linkedin.com/in/">
                                        <Input placeholder={__('Username', 'zencommunity')} color="var(--zencom-font-color)" value={values?.meta.social_links?.linkedin} onChange={(e) => setFieldValue("meta.social_links.linkedin", e.target.value)} />
                                    </InputGroup>
                                </Flex>
                                <Flex direction="column" gap="6px" flex={"1"}>
                                    <ZCLabel
                                        label={__('Twitter/X', 'zencommunity')}
                                        fontWeight="semibold"
                                        fontSize="sm"
                                    />
                                    <InputGroup startAddon="https://x.com/">
                                        <Input placeholder={__('Username', 'zencommunity')} color="var(--zencom-font-color)" value={values?.meta.social_links?.x} onChange={(e) => setFieldValue("meta.social_links.x", e.target.value)} />
                                    </InputGroup>
                                </Flex>
                            </Flex>
                            <Flex direction="column" gap="6px" mb={4}>
                                <ZCLabel
                                    label={__('Youtube', 'zencommunity')}
                                    fontWeight="semibold"
                                    fontSize="sm"
                                />
                                <InputGroup startAddon="https://youtube.com/">
                                    <Input placeholder={__('Username', 'zencommunity')} color="var(--zencom-font-color)" value={values?.meta.social_links?.youtube} onChange={(e) => setFieldValue("meta.social_links.youtube", e.target.value)} />
                                </InputGroup>
                            </Flex>
                        </Box>

                        <Box mb="16px">
                            <ZCLabel
                                label={__('Privacy', 'zencommunity')}
                                fontWeight="600"
                                fontSize='16px'
                            />
                            <ZCLabel
                                label={__('Choose who can see your connections.', 'zencommunity')}
                                type="subTitle"
                                fontWeight="400"
                                color='gray.500'
                            />
                        </Box>
                        <Flex
                            mb="40px"
                            gap="24px"
                            w="100%"
                            background="var(--zencom-background)"
                            borderRadius="sm"
                            p="24px"
                            direction={{base:"column", md:"row"}}
                        >
                            <Flex direction="column" gap="6px" flex="1">
                                <ZCLabel
                                    label={__('Who can see your followers', 'zencommunity')}
                                    fontWeight="semibold"
                                    fontSize="sm"
                                />
                                <ZCSelect
                                    name="meta.follow_privacy.followers"
                                    options={followPrivacyOptions}
                                    _defaultValue={values?.meta.follow_privacy?.followers}
                                    width="100%"
                                    showClear={false}
                                />
                            </Flex>
                            <Flex direction="column" gap="6px" flex="1">
                                <ZCLabel
                                    label={__('Who can see who you follow', 'zencommunity')}
                                    fontWeight="semibold"
                                    fontSize="sm"
                                />
                                <ZCSelect
                                    name="meta.follow_privacy.following"
                                    options={followPrivacyOptions}
                                    _defaultValue={values?.meta.follow_privacy?.following}
                                    width="100%"
                                    showClear={false}
                                />
                            </Flex>
                        </Flex>

                        <Box mb="16px">
                            <ZCLabel
                                label={__('Username', 'zencommunity')}
                                fontWeight="600"
                                fontSize='16px'
                            />
                            <ZCLabel
                                label={__('Customize your community username', 'zencommunity')}
                                type="subTitle"
                                fontWeight="400"
                                color='gray.500'
                            />
                        </Box>
                        <Flex
                            mb="40px"
                            gap="6px"
                            w="100%"
                            background="var(--zencom-background)"
                            borderRadius="sm"
                            p="24px"
                            direction="column"
                        >
                            <ZCLabel
                                label={__('Community account username', 'zencommunity')}
                                fontWeight="semibold"
                                fontSize="sm"
                            />
                            <InputGroup startAddon="@">
                                <Input
                                    placeholder={__('Username', 'zencommunity')}
                                    color="var(--zencom-font-color)"
                                    value={values?.username}
                                    onChange={(e) => setFieldValue("username", e.target.value)}
                                />
                            </InputGroup>

                        </Flex>

                        <Box mb="12px" display={"flex"} justifyContent={"flex-end"} gap={"16px"} pt={"20px"}>
                            <Button
                                colorPalette='red'
                                onClick={() => setIsEdit(false)}
                            >
                                {__('Cancel', 'zencommunity')}
                            </Button>
                            <Button
                                {...primaryBtnInsideContent}
                                onClick={submitForm}
                                loading={isSubmitting}
                                disabled={!dirty}
                            >
                                {__('Save Changes', 'zencommunity')}
                            </Button>
                        </Box>
                    </Flex>
                )
            }}
        </Formik>
    );
};

export default EditAbout;
