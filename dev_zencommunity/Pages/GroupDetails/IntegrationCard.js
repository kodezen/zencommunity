import React from 'react';
import { Flex } from '@chakra-ui/react';

const IntegrationCard = ({ content, checkbox }) => {
    return (
        <Flex justifyContent={'space-between'} width={'100%'}>
            <>{content}</>
            <>{checkbox}</>
        </Flex>
    );
};

export default IntegrationCard;