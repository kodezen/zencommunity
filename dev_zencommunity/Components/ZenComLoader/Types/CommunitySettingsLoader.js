import React from "react";
import { VStack, Flex, Box, Skeleton, } from "@chakra-ui/react";
import { useStyles } from "../../../utils/chakra";

const CommunitySettingsLoader = () => {
  const { settingsContent } = useStyles();
  return (
    <Flex {...settingsContent} mt={'50px'}>
      {/* TopBar Skeleton */}
      <Flex justifyContent={'space-between'}>
        <Skeleton height="36px" width="60%" mb={4} />
        <Skeleton height="36px" width="10%" mb={4} />
      </Flex>
      <Skeleton height="24px" width="40%" mb={2} />

      {/* Community setup header */}
      <Skeleton height="20px" width="30%" mb={2} />
      

      {/* Form Container */}
      <Box
        width="100%"
        padding="24px"
        gap="24px"
        display="flex"
        flexDirection="column"
        alignItems="center"
        bg="var(--zencom-background)"
        borderRadius="4px"
        border="1px"
        borderColor="gray.200"
      >
        {/* Site Logo Upload */}
        <Flex justifyContent="space-between" w="100%" mb={6}>
          <VStack align="flex-start" spacing={2}>
            <Skeleton height="14px" width="120px" />
            <Skeleton height="12px" width="200px" />
            <Skeleton height="32px" width="100px" mt={2} />
          </VStack>
          <Skeleton width='100px' height="100px" />
        </Flex>

        {/* Community Title */}
        <Flex justifyContent="space-between" w="100%" mb={4}>
          <VStack align="flex-start" spacing={1}>
            <Skeleton height="14px" width="140px" />
            <Skeleton height="12px" width="220px" />
          </VStack>
          <Skeleton height="36px" width="224px" />
        </Flex>

        {/* Community Path */}
        <Flex justifyContent="space-between" w="100%" mb={4}>
          <VStack align="flex-start" spacing={1}>
            <Skeleton height="14px" width="140px" />
            <Skeleton height="12px" width="220px" />
          </VStack>
          <Skeleton height="36px" width="224px" />
        </Flex>

        {/* Portal Access Settings */}
        <Flex justifyContent="space-between" w="100%" mb={4}>
          <VStack align="flex-start" spacing={1}>
            <Skeleton height="14px" width="180px" />
            <Skeleton height="12px" width="220px" />
          </VStack>
          <Flex gap="6">
            <Skeleton height="36px" width="80px" />
            <Skeleton height="36px" width="80px" />
            <Skeleton height="36px" width="80px" />
          </Flex>
        </Flex>

        {/* Role Access Settings (optional) */}
        <Flex justifyContent="space-between" w="100%" mb={4}>
          <VStack align="flex-start" spacing={1} width="50%">
            <Skeleton height="14px" width="180px" />
            <Skeleton height="12px" width="220px" />
          </VStack>
          <Skeleton height="36px" width="224px" />
        </Flex>

        {/* Checkboxes */}
        <VStack align="flex-start" spacing={4} w="100%" mb={4}>
          <Skeleton height="20px" width="50%" />
          <Skeleton height="20px" width="60%" />
        </VStack>

        {/* Notification Position */}
        <Flex justifyContent="space-between" w="100%">
          <VStack align="flex-start" spacing={1}>
            <Skeleton height="14px" width="180px" />
            <Skeleton height="12px" width="220px" />
          </VStack>
          <Skeleton height="36px" width="224px" />
        </Flex>
      </Box>
    </Flex>
  );
};

export default CommunitySettingsLoader;
