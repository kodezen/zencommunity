import React from 'react';
import Group from './Group';
import LeftContainer from '@Components/Layouts/LeftContainer';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';
import CenterContainer from '@Components/Layouts/CenterContainer';

const GroupDetails = () => {
    return (
        <>
            <LeftContainer>
                <LeftSidebar />
            </LeftContainer>

            <CenterContainer>
                <Group />
            </CenterContainer>
        </>
    );
};

export default GroupDetails;
