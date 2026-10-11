import {
    Button,
    Flex,
    Input,
    Separator,
    Box,
    Textarea,
    CloseButton,
} from '@chakra-ui/react';
import { Form, useFormikContext } from 'formik';
import { useState } from 'react';
import { FaChevronDown } from 'react-icons/fa6';
import { useDispatch, useSelector } from 'react-redux';
import { __ } from '@wordpress/i18n';
import {
    fetchTicketLabels,
    fetchTicketProducts,
} from '@Redux/slices/ticketSlice/ticketSlice';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import ZCSelect from '@Components/Select';
import { useEffect } from 'react';
import { API, createSelectOptionsFromArray, current_logged_user, getAddonActiveStatus, global_roles, mediaFileUploader, namespace, site_url } from '@Utils/helper';
import { LuUser } from 'react-icons/lu';
import { IoIosArrowUp } from 'react-icons/io';
import { MdClose } from 'react-icons/md';
import { GoPlus } from 'react-icons/go';
import PostTextWithMention from '@Components/PostTextWithMention';
import CheckBoxAndSwitch from '@Components/CheckBoxAndSwitch';
import { ROLE_SUPPORT_AGENT } from '@Utils/roles';

const CreateTicketFormInner = ({
    ticketDrawerOpen,
    handleChange,
    showDesc,
    setShowDesc
}) => {
    const { products, typeLabels, priorityLabels } = useSelector((s) => s.tickets);
    const activeAddons = useSelector((s) => s?.addons?.activeAddons);
    const isAiActive = getAddonActiveStatus(activeAddons, 'AiAgent');
    const isAgentOrAdmin = current_logged_user?.is_site_admin || global_roles?.[ROLE_SUPPORT_AGENT];
    const [assigneeOptions, setAssigneeOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openTicketInfo, setOpenTicketInfo] = useState(true);
    const [openAssignInfo, setOpenAssignInfo] = useState(true);
    const dispatch = useDispatch();
    const [uploadedImages, setUploadedImages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    const {values, setFieldValue } = useFormikContext();

    useEffect(() => {
        if (!ticketDrawerOpen) return;
        (async () => {
            try {
                setLoading(true);
                await Promise.all([
                    dispatch(fetchTicketProducts()),
                    dispatch(fetchTicketLabels({ labelType: 'types' })),
                    dispatch(fetchTicketLabels({ labelType: 'priorities' })),
                ]);
            } finally {
                setLoading(false);
            }
        })();
    }, [ticketDrawerOpen]);

    useEffect(() => {
        (async () => {
            await API.get(`${namespace}/members?role=${ROLE_SUPPORT_AGENT}`)
                .then(res => {
                    const options = res.data.records.map((item) => ({
                        label: `${item.first_name} ${item.last_name}`,
                        value: item.id,
                        avatar: item.avatar_url
                    }))
                    setAssigneeOptions(options);
                })
        })()
    }, [ticketDrawerOpen])

    const productOptions = createSelectOptionsFromArray(products);
    const typeOptions = createSelectOptionsFromArray(typeLabels);
    const priorityOptions = createSelectOptionsFromArray(priorityLabels);

    const handleImageChange = async (event, type, editorRef, updateContent) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const res = await mediaFileUploader(type, file);
            if (res?.id) {
                const newImage = {
                    id: res.id,
                    url: res.source_url || res.url || res.guid?.rendered,
                    name: file.name
                };
                setFieldValue('add_media_ids', [...values.add_media_ids, res.id])

                const updatedImages = [...uploadedImages, newImage];
                setUploadedImages(updatedImages);

                if (editorRef.current) {
                    const img = document.createElement('img');
                    img.src = newImage.url.startsWith('http') ? newImage.url : site_url + newImage.url;
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    img.style.display = 'block';
                    img.style.margin = '10px 0';
                    img.setAttribute('data-image-id', res.id);

                    editorRef.current.appendChild(img);
                    updateContent();
                }
            }
        } catch (err) {
            console.error("Image upload failed", err);
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleRemoveImage = (imageId, editorRef, updateContent) => {
        const updatedImages = uploadedImages.filter(img => img.id !== imageId);
        setUploadedImages(updatedImages);

        if (editorRef.current) {
            const imgElement = editorRef.current.querySelector(`img[data-image-id="${imageId}"]`);
            if (imgElement) {
                imgElement.remove();
                updateContent();
            }
        }
    };

    return (
        <Form>
            <Box h="100vh" display="flex" overflow="hidden" justifyContent="space-between" background={'var(--zencom-background)'} color={'var(--zencom-font-color)'}>
                <Flex w="60%" direction="column" p="16px 0">
                    <Input
                        name="title"
                        fontSize="36px"
                        fontWeight="400"
                        lineHeight="38px"
                        border="none"
                        css={{ '--focus-color': 'transparent' }}
                        style={{ caretColor: 'var(--zencom-primary-color)' }}
                        fontFamily="var(--zencom-font)"
                        p="0 16px"
                        placeholder={__('Ticket title...', 'zencommunity')}
                        value={values.title}
                        onChange={(e) => {
                            handleChange(e);
                        }}
                    />

                    <Flex justifyContent="space-between" alignItems="center" margin="24px 0" p="0 16px">
                        <Button
                            type="button"
                            background="transparent"
                            color="var(--zencom-font-color)"
                            p="0"
                            fontSize="14px"
                            fontWeight="500"
                            lineHeight="20px"
                            border="none"
                            onClick={() => setShowDesc(!showDesc)}
                        >
                            <GoPlus /> {__('Add Description', 'zencommunity')}
                        </Button>
                        {showDesc && (
                            <CloseButton
                                size="xs"
                                onClick={() => setShowDesc(!showDesc)}
                            >
                                <MdClose />
                            </CloseButton>
                        )}
                    </Flex>

                    {showDesc && (
                        <Box padding={'0 16px'} width={'100%'}>
                            <PostTextWithMention
                                value={values?.content}
                                onChangeHandler={(html) => setFieldValue("content", html)}
                                placeholder={__('Ticket description', 'zencommunity')}
                                minHeight="400px"
                                padding="8px 0px"
                                showToolbar={true}
                                uploadedImages={uploadedImages}
                                isUploading={isUploading}
                                onImageChange={handleImageChange}
                                onRemoveImage={handleRemoveImage}
                                imageType='ticket_attachments'
                            />
                        </Box>
                    )}
                </Flex>

                <Separator orientation="vertical" borderColor="var(--zencom-border-color)" />

                <Flex w="40%" direction="column">
                    <Flex
                        p="12px 16px"
                        bg="var(--zencom-background)"
                        borderBottom="1px solid var(--zencom-border-color)"
                        justifyContent="space-between"
                        alignItems="center"
                        onClick={() => setOpenTicketInfo(!openTicketInfo)}
                    >
                        <ZCLabel
                            label={__("Ticket information", "zencommunity")}
                            fontSize="14px"
                            fontWeight="500"
                        />
                        {openTicketInfo ? <IoIosArrowUp /> : <FaChevronDown />}
                    </Flex>

                    {openTicketInfo && (
                        <Flex gap="16px" flexDirection="column" alignItems="center" p="16px" background="var(--zencom-background)">
                            <ZCSelect
                                label={__("Product", "zencommunity")}
                                name="product_id"
                                options={productOptions}
                                width="100%"
                                showClear={false}
                            />
                            <ZCSelect
                                label={__("Type", "zencommunity")}
                                name="type_id"
                                options={typeOptions}
                                width="100%"
                                showClear={false}
                            />
                            <ZCSelect
                                label={__("Priority", "zencommunity")}
                                name="priority_id"
                                options={priorityOptions}
                                width="100%"
                                showClear={false}
                            />
                        </Flex>
                    )}

                    {(current_logged_user?.is_site_admin || global_roles?.[ROLE_SUPPORT_AGENT]) && (
                        <>
                            <Flex
                                p="12px 16px"
                                bg="var(--zencom-background)"
                                borderBottom="1px solid var(--zencom-border-color)"
                                borderTop="1px solid var(--zencom-border-color)"
                                borderRadius="4px"
                                justifyContent="space-between"
                                alignItems="center"
                                onClick={() => setOpenAssignInfo(!openAssignInfo)}
                            >
                                <ZCLabel
                                    label={__("Assignee", "zencommunity")}
                                    fontSize="14"
                                    fontWeight="500"
                                />
                                {openAssignInfo ? <IoIosArrowUp /> : <FaChevronDown />}
                            </Flex>

                            {openAssignInfo && (
                                <Flex p="12px 16px">
                                    <ZCSelect
                                        name='assignee_id'
                                        options={assigneeOptions}
                                        width="100%"
                                        showClear={false}
                                        icon={LuUser}
                                    />
                                </Flex>
                            )}
                        </>
                    )}

                    {isAiActive && isAgentOrAdmin && (
                        <Flex p="16px" borderTop="1px solid var(--zencom-border-color)">
                            <CheckBoxAndSwitch
                                width="100%"
                                label={__("Enable AI auto-reply", "zencommunity")}
                                des={__("Let the AI agent answer this ticket automatically until a human takes over.", "zencommunity")}
                                isChecked={!!values.is_ai_enabled}
                                onChange={(checked) => setFieldValue('is_ai_enabled', checked)}
                            />
                        </Flex>
                    )}
                </Flex>
            </Box>
        </Form>
    );
};

export default CreateTicketFormInner;
