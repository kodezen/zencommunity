import React from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { __ } from '@wordpress/i18n';

const StatCard = ({ label, count, buttonLabel, onView }) => (
    <Box
        flex="1 1 auto"
        minWidth="160px"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        bg="var(--zencom-background)"
        border="1px solid var(--zencom-border-color)"
        borderRadius="8px"
        px={4}
        py={3}
    >
        <Box>
            <Text fontSize="xs" color="gray.500" fontWeight="500" mb={0.5}>
                {label}
            </Text>
            <Text fontSize="xl" fontWeight="700" color="var(--zencom-font-color)" lineHeight="1">
                {count}
            </Text>
        </Box>
        <Button
            size="xs"
            variant="outline"
            borderColor="var(--zencom-border-color)"
            color="var(--zencom-font-color)"
            _hover={{ bg: 'var(--zencom-secondary-color)' }}
            onClick={onView}
        >
            {buttonLabel}
        </Button>
    </Box>
);

const GroupStatsBanner = ({ featuredCount = 0, pendingCount = 0, eventCount = 0, onNavigate }) => {
    return (
        <Flex flexWrap="wrap" gap={3} width="100%">
            {featuredCount > 0 && (
                <StatCard
                    label={__('Featured Posts', 'zencommunity')}
                    count={featuredCount}
                    buttonLabel={__('View', 'zencommunity')}
                    onView={() => onNavigate('featured')}
                />
            )}
            {pendingCount > 0 && (
                <StatCard
                    label={__('Pending Posts', 'zencommunity')}
                    count={pendingCount}
                    buttonLabel={__('View', 'zencommunity')}
                    onView={() => onNavigate('pending-posts')}
                />
            )}
            {eventCount > 0 && (
                <StatCard
                    label={__('Events', 'zencommunity')}
                    count={eventCount}
                    buttonLabel={__('View', 'zencommunity')}
                    onView={() => onNavigate('events')}
                />
            )}
        </Flex>
    );
};

export default GroupStatsBanner;
