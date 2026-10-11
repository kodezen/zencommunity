import React from 'react';
import { Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { __ } from '@wordpress/i18n';
import { isLoggedIn } from '@Utils/helper';
import ShowProfile from '@Components/Header/Components/ShowProfile';

/**
 * Identity block — the user's avatar + profile menu when signed in, or a
 * sign-in button for guests.
 */
const Identity = () => {
    const navigate = useNavigate();

    if (isLoggedIn) {
        return <ShowProfile />;
    }

    return (
        <Button colorPalette="blue" onClick={() => navigate('/signin')}>
            {__('Login', 'zencommunity')}
        </Button>
    );
};

export default Identity;
