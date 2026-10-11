import React from 'react';
import Profile from './Profile';
import LeftContainer from '@Components/Layouts/LeftContainer';
import LeftSidebar from '@Components/Sidebar/LeftSidebar';
import CenterContainer from '@Components/Layouts/CenterContainer';

const Profiles = () => {
  return (
    <>
      <LeftContainer>
        <LeftSidebar />
      </LeftContainer>

      <CenterContainer>
        <Profile />
      </CenterContainer>
    </>
  );
};

export default Profiles;
