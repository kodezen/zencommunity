import { Flex, Box, Skeleton, SkeletonText, VStack, Button } from "@chakra-ui/react";
import { useStyles } from "../../../utils/chakra";

const CustomizationLoader = () => {
  const { settingsContent } = useStyles();
  return (
    <Flex {...settingsContent} mt={'50px'}>
      
      {/* Top Bar */}
      <Flex justifyContent="space-between" alignItems="center" mb="24px">
        <Skeleton height="36px" width="200px" />
        <Skeleton height="32px" width="120px" />
      </Flex>

      {/* Section Heading */}
      <Skeleton height="28px" width="150px" mb="16px" />
     

      <Box width="100%" padding="24px" gap="24px"  bg="var(--zencom-background)" borderRadius="4px" border="1px" borderColor="gray.200">
        {/* Default feed sort */}
      <Flex justifyContent="space-between" alignItems="center" mb="16px">
        <VStack align="start" spacing={2}>
          <Skeleton height="20px" width="200px" />
          <Skeleton height="16px" width="250px" />
        </VStack>
        <Skeleton height="36px" width="160px" />
      </Flex>

      {/* Post title requirements */}
      <Flex justifyContent="space-between" alignItems="center" mb="16px">
        <VStack align="start" spacing={2}>
          <Skeleton height="20px" width="200px" />
          <Skeleton height="16px" width="250px" />
        </VStack>
        <Flex gap="6">
          <Skeleton height="36px" width="80px" />
          <Skeleton height="36px" width="80px" />
        </Flex>
      </Flex>

      {/* Profile social media links */}
      <Flex justifyContent="space-between" alignItems="center" mb="16px">
        <VStack align="start" spacing={2}>
          <Skeleton height="20px" width="200px" />
          <Skeleton height="16px" width="250px" />
        </VStack>
        <Skeleton height="36px" width="120px" />
      </Flex>

      {/* Customize Login/Signup Form */}
      <Flex justifyContent="space-between" alignItems="center" mb="16px">
        <VStack align="start" spacing={2}>
          <Skeleton height="20px" width="200px" />
          <Skeleton height="16px" width="250px" />
        </VStack>
        <Skeleton height="36px" width="120px" />
      </Flex>
      </Box>
    </Flex>
  );
};

export default CustomizationLoader;
