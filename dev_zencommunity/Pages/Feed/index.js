import React from 'react';
import { Flex } from '@chakra-ui/react';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';
import FeedPosts from './FeedPosts';
import RightSidebar from '@Components/Sidebar/RightSidebar';
import LeftContainer from '@Components/Layouts/LeftContainer';
import CenterContainer from '@Components/Layouts/CenterContainer';
import RightContainer from '@Components/Layouts/RightContainer';

const Feed = () => {
    return (
        <Flex direction="row" gap="24px" justifyContent="space-around" alignItems="flex-start">
            <LeftContainer>
                <LeftSidebar />
            </LeftContainer>

            <CenterContainer>
                <FeedPosts />
            </CenterContainer>

            <RightContainer>
                <RightSidebar />
            </RightContainer>
        </Flex>
    );
};

export default Feed;
