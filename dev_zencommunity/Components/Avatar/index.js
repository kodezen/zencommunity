import { Avatar } from '@chakra-ui/react';
import React from 'react';

const ZCAvatar = ({ name, src, ...props }) => {
    return (
        <Avatar.Root {...props}>
            <Avatar.Fallback name={name} />
            <Avatar.Image src={src} alt={name} />
        </Avatar.Root>
    );
};

export default ZCAvatar;