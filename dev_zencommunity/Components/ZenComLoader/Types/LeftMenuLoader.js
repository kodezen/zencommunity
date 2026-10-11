import { Skeleton, Box, Flex, SkeletonCircle } from "@chakra-ui/react";

function LeftMenuLoader() {
  return (
    <Flex direction="column" gap={2} paddingBottom={4} marginBottom={4}>

      {/* MAIN section label */}
      <Skeleton height="10px" width="38px" mx="16px" my="4px" />

      {/* MAIN menu items: Feeds, Groups, Members, Chat */}
      <Flex direction="column" gap={2} px="16px">
        {[50, 70, 85, 48].map((w, idx) => (
          <Flex key={idx} p="8px" align="center" gap={3}>
            <SkeletonCircle size="6" flexShrink={0} />
            <Skeleton height="14px" width={`${w}px`} />
          </Flex>
        ))}
      </Flex>

      {/* SUPPORT section */}
      <Box borderTop="1px solid var(--zencom-border-color)" pt={2} px="16px">
        <Skeleton height="10px" width="58px" mt="8px" mb="10px" />
        <Flex direction="column" gap={2}>
          {[58, 78].map((w, idx) => (
            <Flex key={idx} p="8px" align="center" gap={3}>
              <SkeletonCircle size="6" flexShrink={0} />
              <Skeleton height="14px" width={`${w}px`} />
            </Flex>
          ))}
        </Flex>
      </Box>

      {/* COLLECTIONS section */}
      <Box borderTop="1px solid var(--zencom-border-color)" pt={4} px="16px">
        <Skeleton height="10px" width="90px" mb="12px" />

        {/* Collection toggle row with caret */}
        <Flex p="8px" align="center" justify="space-between">
          <Flex gap={3} alignItems="center" flex="1">
            <SkeletonCircle size="6" flexShrink={0} />
            <Skeleton height="14px" width="110px" />
          </Flex>
          <SkeletonCircle size="3" />
        </Flex>

        {/* Expanded sub-items with small avatars */}
        <Flex direction="column" gap={1} pl="8px" mt={1}>
          {[95, 95, 95, 95, 95].map((w, idx) => (
            <Flex key={idx} p="6px 8px" align="center" gap={2}>
              <SkeletonCircle size="5" flexShrink={0} />
              <Skeleton height="13px" width={`${w}px`} />
            </Flex>
          ))}
        </Flex>
      </Box>

    </Flex>
  );
}

export default LeftMenuLoader;
