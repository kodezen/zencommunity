import React from 'react';
import ChatBoxHeader from './ChatBoxHeader';
import ChatBox from './ChatBox';
import { __ } from '@wordpress/i18n';

const ChatContent = ({
    isLargeScreen,
    selectedUser,
    fetchBlockedUsers,
    isBlockedUser,
    blockedUser,
    setBlockedUser,
    handleBackToUsers,
    dataLoading,
    isMediumScreen,
    messages,
    setMessages,
    isMobile,
    setMembersMessages,
    fetchMessages,
}) => {
    return (
        <>
            <ChatBoxHeader
                selectedUser={selectedUser}
                fetchBlockedUsers={fetchBlockedUsers}
                isBlocked={isBlockedUser}
                blockedUser={blockedUser}
                setBlockedUser={setBlockedUser}
                onBack={handleBackToUsers}
                showBackButton={isMobile || isMediumScreen}
                showMenuButton={isMediumScreen}
                dataLoading={dataLoading}
                isLargeScreen={isLargeScreen}
            />

            <ChatBox
                messages={messages}
                setMessages={setMessages}
                selectedUser={selectedUser}
                isBlocked={blockedUser.find(item => parseInt(item.id) === parseInt(selectedUser.id) ?? false) ?? false}
                setMembersMessages={setMembersMessages}
                fetchMessages={fetchMessages}
                isLargeScreen={isLargeScreen}
                isMediumScreen={isMediumScreen}
                isMobile={isMobile}
            />
        </>
    );
};

export default ChatContent;
