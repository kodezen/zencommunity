import React, { useState, useEffect } from 'react';
import { __ } from '@wordpress/i18n';
import { Button, Clipboard, IconButton, Input, InputGroup, Flex, Text } from '@chakra-ui/react';
import { CiInstagram, CiTwitter, CiMail } from 'react-icons/ci';
import { FaFacebookF, FaLinkedinIn } from 'react-icons/fa6';
import ZenComModal from '@Components/ZenComModal/ZenComModal';
import { useDispatch } from 'react-redux';
import { showNotification } from '@Redux/slices/notificationSlice/notificationSlice';
import { copyToClipboard, permitted_social_sites_for_link_sharing } from '@Utils/helper';
import { useStyles } from '../../utils/chakra';

import "./styles.scss";

const shareIn = (sharableLink) => {
    const url = encodeURIComponent(sharableLink);
    const text = encodeURIComponent('Check this out');

    return [
        {
            icon: <CiInstagram />,
            label: 'Instagram',
            slug: 'instagram',
            // Instagram does NOT support direct link sharing
            value: 'https://www.instagram.com/',
            note: 'Instagram does not support direct link sharing',
        },
        {
            icon: <FaFacebookF />,
            label: 'Facebook',
            slug: 'facebook',
            value: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        },
        {
            icon: <CiTwitter />,
            label: 'X',
            slug: 'x',
            value: `https://x.com/intent/tweet?url=${url}&text=${text}`,
        },
        {
            icon: <FaLinkedinIn />,
            label: 'LinkedIn',
            slug: 'linkedin',
            value: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        },
        {
            icon: <CiMail />,
            label: 'Email',
            slug: 'email',
            value: `mailto:?subject=${text}&body=${url}`,
        },
    ];
};

const ClipboardIconButton = () => {
    return (
        <Clipboard.Trigger asChild>
            <IconButton variant="surface" size="xs" me="-2">
                <Clipboard.Indicator />
            </IconButton>
        </Clipboard.Trigger>
    )
};

const ZenComShare = ({ setIsShareOpen, isShareOpen, sharableLink }) => {
    const dispatch = useDispatch();

    const handleCopyLink = () => {
        copyToClipboard(sharableLink);

        dispatch(
            showNotification({
                message: __("Link copied", "zencommunity"),
                isShow: true,
                type: "success",
            })
        );
    };


    const [filteredShareOptions, setFilteredShareOptions] = useState([]);

    useEffect(() => {
        const permittedPlatforms = permitted_social_sites_for_link_sharing || [];
        const permittedOptions = shareIn(sharableLink).filter(item => {
            const platformMap = {
                'Facebook': 'facebook',
                'LinkedIn': 'linkedin',
                'Instagram': 'instagram',
                'X': 'x',
                // 'Thread': 'thread',
                // 'Github' : 'github'
            };
            if (permittedPlatforms.includes(item.slug)) return platformMap[item.label]
        });
        setFilteredShareOptions(permittedOptions);
    }, []);

    const { commonInput } = useStyles();

    return (
        <ZenComModal
            isOpen={isShareOpen}
            onRequestClose={() => setIsShareOpen(false)}
            title={__('Share', 'zencommunity')}
            isEnabledResize={false}
            isEnabledHeader={true}
            size="small"
            suffix='post-share'
        >
            <Clipboard.Root value={sharableLink} onStatusChange={handleCopyLink}>
                <InputGroup endElement={<ClipboardIconButton />}>
                    <Clipboard.Input asChild>
                        <Input
                            value={sharableLink}
                            {...commonInput}
                        />
                    </Clipboard.Input>
                </InputGroup>
            </Clipboard.Root>

            <Flex justifyContent="center" gap={4} width="100%" mt={5}>
                {filteredShareOptions.length === 0 ? (
                    <Text color='var(--zencom-font-color)'>
                        {__('No social sharing options available. Configure in settings.', 'zencommunity')}
                    </Text>
                ) : (
                    filteredShareOptions.map((Item, index) => (
                        <Button
                            as="a"
                            href={Item.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            bg="var(--zencom-body-background)"
                            color="var(--zencom-font-color)"
                            padding="10px 26px"
                            key={index}
                            aria-label={`Share on ${Item.label}`}
                        >
                            {Item.icon}
                        </Button>
                    ))
                )}
            </Flex>
        </ZenComModal>
    );
};

export default ZenComShare;
