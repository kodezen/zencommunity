import React from 'react';
import { Box, Flex, Skeleton, } from '@chakra-ui/react';
import { useStyles } from '../../../utils/chakra';

const PrivacyLoader = () => {
  const { settingsContent } = useStyles();
  return (
    <Box {...settingsContent} mt={'50px'} bg="var(--zencom-background)">
      {/* Top Bar Skeleton */}
      <Flex justifyContent="space-between" alignItems="center" mb="40px">
        <Skeleton height="32px" width="40%" />
        <Skeleton height="36px" width="120px" borderRadius="6px" />
      </Flex>

      {/* Settings Inner Skeleton */}
      <Box p="24px" borderRadius="4px" bg="var(--zencom-background)" border="1px solid #E0E4E8">
        {/* Member visibility select */}
        <Flex justifyContent="space-between" alignItems="center" mb="24px">
          <Flex flexDirection="column" gap="8px">
            <Skeleton height="16px" width="200px" />
            <Skeleton height="14px" width="150px" />
          </Flex>
          <Skeleton height="36px" width="164px" borderRadius="6px" />
        </Flex>

        {/* Checkbox skeleton */}
        <Flex flexDirection="column" gap="12px">
          <Skeleton height="20px" width="250px" />
          <Skeleton height="16px" width="180px" />
        </Flex>
      </Box>
    </Box>
  );
};

export default PrivacyLoader;
