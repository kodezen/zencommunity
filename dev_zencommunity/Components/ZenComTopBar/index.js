import React from 'react';
import { Flex, useBreakpointValue } from '@chakra-ui/react';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';
import Subtext from '@Components/Labels/Subtext';
import { useStyles } from '@Utils/chakra';

const ZenComTopBar = ({
    title = "",
    subtitle = "",
    leftContent,
    rightContent,
    titleSize = "24px",
    titleWeight = "600",
    titleColor = "var(--zencom-font-color)",
    subtitleSize = "14px",
    subtitleWeight = "400",
    marginBottom = "40px",
    padding = "16px 0",
    borderBottomWidth = "1px",
    isStickyScroll = false,
}) => {
    const isMobile = useBreakpointValue({ base: true, md: false });
    const { subTextColor } = useStyles();

    const stickyStyles = isStickyScroll ? {
        position: "sticky",
        top: "0",
        zIndex: 1000,
        bg: "var(--zencom-body-background)",
    } : {};

    const commonStyles = {
        alignItems: "center",
        gap: 6,
        width: "100%",
        borderBottomWidth,
        borderColor: 'var(--zencom-border-color)',
        padding,
        marginBottom,
        transition: isStickyScroll ? "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        ...stickyStyles
    };

    const titleWrap = (
        <Flex direction="column">
            <ZCLabel
                label={title}
                fontSize={titleSize}
                fontWeight={titleWeight}
                color={titleColor}
            />
            {subtitle && (
                <Subtext
                    fontSize={subtitleSize} 
                    fontWeight={subtitleWeight} 
                >
                    {subtitle}
                </Subtext>
            )}
        </Flex>
    );

    if (leftContent) {
        return (
            <Flex {...commonStyles}>
                {leftContent}
                <Flex justifyContent="space-between" width="100%" alignItems="center">
                    {titleWrap}
                    {rightContent}
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex
            {...commonStyles}
            justifyContent={rightContent ? "space-between" : "flex-start"}
        >
            {titleWrap}
            {rightContent}
        </Flex>
    );
};

export default ZenComTopBar;
