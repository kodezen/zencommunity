import React from 'react';
import { __ } from "@wordpress/i18n";
import { Box, Button, Image } from '@chakra-ui/react';
import { site_url, theme_settings, show_cover_placeholder } from '@Utils/helper';
import { useStyles } from '../../utils/chakra';

const isThemeDark = theme_settings?.theme_mode === "dark";

const GroupCover = ({
    groupData,
    isAdmin,
    handleImageChange,
    handleRemoveCoverImg,
    cover,
}) => {
    const { primaryBtnInsideContent } = useStyles();
    const hasCustomCover = !!groupData?.meta?.cover_img_url;
    return (
        <>
            {(hasCustomCover || show_cover_placeholder) ? (
                <Image
                    src={hasCustomCover ? site_url + groupData?.meta?.cover_img_url : cover}
                    alt={__("Group Cover", "zencommunity")}
                    borderRadius="md"
                    h="320px"
                    w="100%"
                    objectFit="cover"
                    className={!hasCustomCover ? 'zencom-cover-placeholder' : ''}
                    // The placeholder is a light-gray raster asset with no dark variant;
                    // invert it so it doesn't clash with the dark theme. Never touch a
                    // real uploaded cover photo.
                    filter={!hasCustomCover && isThemeDark ? "invert(1) hue-rotate(180deg)" : undefined}
                />
            ) : (
                <Box borderRadius="md" h="320px" w="100%" background="var(--zencom-secondary-color)" />
            )}

            {isAdmin && (
                <>
                    <Button
                        position="absolute"
                        top="16px"
                        right="110px"
                        size="sm"
                        {...primaryBtnInsideContent}
                        onClick={() => document.getElementById('group-cover-upload').click()}
                    >
                        {__('Change Cover', 'zencommunity')}
                    </Button>

                    <Button
                        position="absolute"
                        top="16px"
                        right="16px"
                        size="sm"
                        bg="var(--zencom-danger-color, red)"
                        color="white"
                        onClick={handleRemoveCoverImg}
                    >
                        {__('Remove', 'zencommunity')}
                    </Button>
                    <input
                        id="group-cover-upload"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageChange(e, 'group_cover')}
                    />
                </>
            )}
        </>
    );
};

export default GroupCover;
