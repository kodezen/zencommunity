import React from 'react';
import UserNotification from '@Components/UserNotification';
import { isLoggedIn } from '@Utils/helper';

/**
 * Notifications bell block — the same real-time notifications dropdown used in
 * the header, as a standalone block.
 */
const Notifications = () => {
    if (!isLoggedIn) return null;
    return <UserNotification />;
};

export default Notifications;
