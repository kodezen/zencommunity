import { Box, Flex, Skeleton } from "@chakra-ui/react";
import { useStyles } from "../../../utils/chakra";

const SocialLoginLoader = () => {
  const { settingsContent } = useStyles();
  return (
    <Box {...settingsContent} mt={'50px'}>
          {/* Top Bar Skeleton */}
          <Flex justifyContent="space-between" alignItems="center" mb="40px">
            <Skeleton height="32px" width="40%" />
            <Skeleton height="36px" width="120px" borderRadius="6px" />
          </Flex>
    
        
          
            {/* Checkbox skeleton */}
            <Flex flexDirection="column"  width="100%" padding="24px" gap="24px"  bg="var(--zencom-background)" borderRadius="4px" border="1px" borderColor="gray.200">
              <Flex justifyContent={'space-between'}>
                <Skeleton height="20px" width="250px" /> 
                <Skeleton height="20px" width="50px" />
              </Flex>
              <Skeleton height="16px" width="180px" />
            </Flex>
          </Box>
        
  );
};

export default SocialLoginLoader;
