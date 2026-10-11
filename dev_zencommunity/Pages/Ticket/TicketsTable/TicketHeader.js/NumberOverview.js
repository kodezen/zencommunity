import React from 'react';
import { Flex, Skeleton, Box } from '@chakra-ui/react';
import { __, sprintf } from '@wordpress/i18n';
import ZCLabel from "@Components/Chakra/Labels/ZCLabel";
import { current_user_can, global_roles } from '@Utils/helper';
import Subtext from '@Components/Labels/Subtext';

const isSupportAgent = !!global_roles?.support_agent || current_user_can?.manage_options;

const Card = ({ label, value, loading, skeletonWidth = "24px", width = "100%" }) => (
    <Flex
        direction="column"
        background="var(--zencom-background)"
        color="var(--zencom-font-color)"
        border="1px solid var(--zencom-border-color)"
        borderRadius="6px"
        gap="8px"
        align="start"
        justifyContent="space-between"
        p={4}
        width={width}
        className="zencom-animate-fade"
    >
        <Subtext>
            {label}
        </Subtext>

        {loading ? (
            <Skeleton height="16px" width={skeletonWidth} />
        ) : (
            <ZCLabel
                label={sprintf(__('%d', 'zencommunity'), Number(value))}
                fontSize="16px"
                fontWeight="500"
                lineHeight="24px"
            />
        )}
    </Flex>
);

const NumberOverview = ({ loading, products = [], stats = {}, isMobile }) => {
    return (
        <>
            {isMobile ? (
                <>
                    <ZCLabel
                        label={__("Open tickets", "zencommunity")}
                        fontSize="16px"
                        fontWeight="500"
                        lineHeight="24px"
                        mb="8px"
                    />

                    <Flex gap="5px" m="16px 0">
                        <Card
                            label={__("Your tickets", "zencommunity")}
                            value={stats?.you}
                            loading={loading}
                            skeletonWidth="28px"
                            width={{ base: "100%", md: "50%" }}
                        />

                        {(global_roles?.support_agent || current_user_can?.manage_options) && (
                            <Card
                                label={__("Product", "zencommunity")}
                                value={products.length}
                                loading={loading}
                                width={{ base: "100%", md: "50%" }}
                            />
                        )}
                    </Flex>

                    <Flex gap="5px" m="16px 0">
                        <ZCLabel
                            label={__("Ticket overview", "zencommunity")}
                            fontSize="16px"
                            fontWeight="500"
                            lineHeight="24px"
                        />

                        <Subtext fontSize="16px" fontWeight="500">
                            {__("(this month)", "zencommunity")}
                        </Subtext>
                    </Flex>

                    <Flex gap="5px">
                        <Card
                            label={__("Created tickets", "zencommunity")}
                            value={stats?.this_month?.created}
                            loading={loading}
                            skeletonWidth="32px"
                            width="calc(100% / 3)"
                        />

                        <Card
                            label={__("Unsolved", "zencommunity")}
                            value={stats?.this_month?.unresolved}
                            loading={loading}
                            width="calc(100% / 3)"
                        />

                        <Card
                            label={__("Resolved tickets", "zencommunity")}
                            value={stats?.this_month?.resolved}
                            loading={loading}
                            width="calc(100% / 3)"
                        />
                    </Flex>
                </>
            ) : (
                <Flex
                    direction="column"
                    gap="20px"
                    className='zencom-ticket-overview'
                // className='zencom-ticket-overview zencom-animate-fade'
                >
                    <Box
                        display="grid"
                        gridTemplateColumns={isSupportAgent ? "repeat(5, 1fr)" : "repeat(4, 1fr)"}
                        gap="16px"
                    >
                        <Box gridColumn={isSupportAgent ? "1 / span 2" : "1 / span 1"}>
                            <ZCLabel
                                label={__("Open tickets", "zencommunity")}
                                fontSize="16px"
                                fontWeight="500"
                                lineHeight="24px"
                                mb="8px"
                            />
                        </Box>

                        <Box gridColumn={isSupportAgent ? "3 / span 3" : "2 / span 3"}>
                            <Flex gap="5px" mb="8px">
                                <ZCLabel
                                    label={__("Ticket overview", "zencommunity")}
                                    fontSize="16px"
                                    fontWeight="500"
                                    lineHeight="24px"
                                />

                                <Subtext fontSize="16px" fontWeight="500">
                                    {__("(this month)", "zencommunity")}
                                </Subtext>
                            </Flex>
                        </Box>

                        <Card
                            label={__("Your tickets", "zencommunity")}
                            value={stats?.you}
                            loading={loading}
                            skeletonWidth="28px"
                        />

                        {(global_roles?.support_agent || current_user_can?.manage_options) && (
                            <Card
                                label={__("Product", "zencommunity")}
                                value={products.length}
                                loading={loading}
                            />
                        )}

                        <Card
                            label={__("Created tickets", "zencommunity")}
                            value={stats?.this_month?.created}
                            loading={loading}
                            skeletonWidth="32px"
                        />

                        <Card
                            label={__("Unsolved", "zencommunity")}
                            value={stats?.this_month?.unresolved}
                            loading={loading}
                        />

                        <Card
                            label={__("Resolved tickets", "zencommunity")}
                            value={stats?.this_month?.resolved}
                            loading={loading}
                        />
                    </Box>
                </Flex>
            )}
        </>
    );
};

export default NumberOverview;
