import React from 'react';
import LeftContainer from '@Components/Layouts/LeftContainer';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';
import CenterContainer from '@Components/Layouts/CenterContainer';
import Member from './Member';

const Members = () => {
    return (
        <>
            <LeftContainer>
                <LeftSidebar />
            </LeftContainer>

            <CenterContainer>
                <Member />
            </CenterContainer>
        </>
    );
};

export default Members;
