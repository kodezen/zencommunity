import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import ChatBoxHeader from './ChatBoxHeader';
import ChatBox from './ChatBox';
import { __ } from '@wordpress/i18n';
import ZCLabel from '@Components/Chakra/Labels/ZCLabel';

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
    membersMessages,
    fetchMessages,
}) => {
    return (
        <>
            <Flex
                direction="column"
                bg="transparent"
                height="100%"
                width="100%"
                display={{
                    base: selectedUser ? "flex" : "none",
                    md: selectedUser ? "flex" : "none",
                    lg: "flex"
                }}
                position="relative"
            >
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
                    membersMessages={membersMessages}
                    fetchMessages={fetchMessages}
                    isLargeScreen={isLargeScreen}
                    isMediumScreen={isMediumScreen}
                    isMobile={isMobile}
                />
            </Flex>
        </>
    );
};

export default ChatContent;
