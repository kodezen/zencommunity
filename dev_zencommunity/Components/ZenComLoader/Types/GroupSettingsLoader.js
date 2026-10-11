import React from 'react';
import { Box, Flex, Skeleton, Stack } from '@chakra-ui/react';


const GroupSettingsLoader = () => {
  return (
    <Box
      maxW={{ base: "100%", sm: "100%", md: "100%", lg: "900px" }}
      minW={{ base: "100%", sm: "100%", md: "100%", lg: "900px" }}
      margin="40px auto 0px auto"
      padding={{ base: "4", lg: "0" }}
      className="zencom-animate-fade"
    >
      <Box padding="40px 0 0 0"></Box>

      {/* Top Bar Skeleton */}
      <Flex justify="space-between" align="center" mb={8} px={6} py={4} bg="var(--zencom-background)" borderRadius="6px">
          <Stack spacing={2} flex={1}>
              <Skeleton height="24px" width="200px" />
              <Skeleton height="14px" width="300px" />
          </Stack>
          <Skeleton height="36px" width="120px" borderRadius="md" />
      </Flex>

      {/* Basic Section */}
      <Box mb={10}>
          <Stack spacing={2} mb={4} px={6}>
              <Skeleton height="20px" width="100px" />
              <Skeleton height="14px" width="250px" />
          </Stack>
          <Flex direction="column" gap={5} bg="var(--zencom-background)" borderRadius="6px" p={6}>
              <Stack spacing={3}>
                  <Box>
                      <Skeleton height="14px" width="120px" mb={2} />
                      <Skeleton height="40px" width="100%" borderRadius="md" />
                  </Box>
                  <Box>
                      <Skeleton height="14px" width="100px" mb={2} />
                      <Skeleton height="40px" width="100%" borderRadius="md" />
                  </Box>
                  <Box>
                      <Skeleton height="14px" width="140px" mb={2} />
                      <Skeleton height="100px" width="100%" borderRadius="md" />
                  </Box>
                  <Box>
                      <Skeleton height="14px" width="110px" mb={2} />
                      <Skeleton height="40px" width="100%" borderRadius="md" />
                  </Box>
              </Stack>
          </Flex>
      </Box>

      {/* Images Section */}
      <Box mb={10}>
          <Stack spacing={2} mb={4} px={6}>
              <Skeleton height="20px" width="80px" />
              <Skeleton height="14px" width="280px" />
          </Stack>
          <Flex direction="column" gap={5} bg="var(--zencom-background)" borderRadius="6px" p={6}>
              {/* Cover Image */}
              <Stack spacing={3}>
                  <Skeleton height="14px" width="60px" />
                  <Flex gap={4}>
                      <Skeleton height="120px" width="120px" borderRadius="md" />
                      <Stack spacing={2} flex={1}>
                          <Skeleton height="36px" width="100px" borderRadius="md" />
                          <Skeleton height="14px" width="150px" />
                      </Stack>
                  </Flex>
              </Stack>

              {/* Separator */}
              <Box borderTop="1px solid var(--zencom-border-color)" my={4}></Box>

              {/* Feature Image */}
              <Stack spacing={3}>
                  <Skeleton height="14px" width="80px" />
                  <Flex gap={4}>
                      <Skeleton height="120px" width="120px" borderRadius="md" />
                      <Stack spacing={2} flex={1}>
                          <Skeleton height="36px" width="100px" borderRadius="md" />
                          <Skeleton height="14px" width="150px" />
                      </Stack>
                  </Flex>
              </Stack>
          </Flex>
      </Box>

      {/* Group Chat Section */}
      <Box mb={10}>
          <Stack spacing={2} mb={4} px={6}>
              <Skeleton height="20px" width="110px" />
              <Skeleton height="14px" width="260px" />
          </Stack>
          <Flex direction="column" gap={5} bg="var(--zencom-background)" borderRadius="6px" p={6}>
              <Flex align="center" gap={3}>
                  <Skeleton height="20px" width="40px" borderRadius="md" />
                  <Stack spacing={1} flex={1}>
                      <Skeleton height="14px" width="150px" />
                      <Skeleton height="12px" width="200px" />
                  </Stack>
              </Flex>
          </Flex>
      </Box>

      {/* Settings Section */}
      <Box mb={10}>
          <Stack spacing={2} mb={4} px={6}>
              <Skeleton height="20px" width="80px" />
              <Skeleton height="14px" width="300px" />
          </Stack>
          <Flex direction="column" gap={5} bg="var(--zencom-background)" borderRadius="6px" p={6}>
              <Stack spacing={4}>
                  {/* Privacy Settings */}
                  <Box>
                      <Skeleton height="14px" width="60px" mb={2} />
                      <Flex gap={4}>
                          <Skeleton height="20px" width="60px" />
                          <Skeleton height="20px" width="70px" />
                          <Skeleton height="20px" width="60px" />
                      </Flex>
                  </Box>

                  {/* Member Visibility */}
                  <Box>
                      <Skeleton height="14px" width="130px" mb={2} />
                      <Skeleton height="40px" width="100%" borderRadius="md" />
                  </Box>

                  {/* Toggles */}
                  {[1, 2, 3].map((i) => (
                      <Flex key={i} align="center" gap={3}>
                          <Skeleton height="20px" width="40px" borderRadius="md" />
                          <Stack spacing={1} flex={1}>
                              <Skeleton height="14px" width="160px" />
                              <Skeleton height="12px" width="200px" />
                          </Stack>
                      </Flex>
                  ))}
              </Stack>
          </Flex>
      </Box>

      {/* Academy LMS Section (if active) */}
      <Box mb={10}>
          <Stack spacing={2} mb={4} px={6}>
              <Skeleton height="20px" width="140px" />
              <Skeleton height="14px" width="300px" />
          </Stack>
          <Flex direction="column" gap={5} bg="var(--zencom-background)" borderRadius="6px" p={6}>
              <Stack spacing={4}>
                  {[1, 2, 3, 4, 5].map((i) => (
                      <Box key={i}>
                          <Skeleton height="14px" width="120px" mb={2} />
                          <Skeleton height="40px" width="100%" borderRadius="md" />
                      </Box>
                  ))}
                  <Box>
                      <Skeleton height="14px" width="100px" mb={2} />
                      <Skeleton height="40px" width="100%" borderRadius="md" />
                  </Box>
              </Stack>
          </Flex>
      </Box>

      <Box padding="0 0 40px 0"></Box>
    </Box>
  );
};

export default GroupSettingsLoader;