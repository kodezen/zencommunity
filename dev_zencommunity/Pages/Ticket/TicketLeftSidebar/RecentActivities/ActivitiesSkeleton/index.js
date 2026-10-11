import {Flex,  Skeleton } from '@chakra-ui/react';
import { __} from '@wordpress/i18n';

const ActivitiesSkeleton = () => {
    return (
        <Flex
            p="12px"
            gap="8px"
            alignItems="flex-start"
            mb="8px"
            borderRadius="4px"
            background={'var(--zencom-background)'}
        >
            <Skeleton boxSize="40px" borderRadius="full" />
            
            <Flex direction="column" flex="1">
                <Skeleton height="16px" width="70%" mb="2" />
                <Skeleton height="14px" width="90%" mb="2" />
                <Skeleton height="12px" width="40%" />
            </Flex>
        </Flex>
    );
};

export default ActivitiesSkeleton;