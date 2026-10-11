import React, { useState } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import ZenComAvatar from '@Components/Chakra/ZenComAvatar';
import './styles.scss';

// Facebook's web chat heads sit in a fixed column at the bottom-right corner
// — they don't float free around the page the way a mobile overlay bubble
// does. Dropping the drag behavior here matches that: a minimized
// conversation always lives at a predictable spot, stacked by index.
const ChatHeadBubble = ({ conv, index, onToggleWindow, onDismiss }) => {
    const [hovered, setHovered] = useState(false);

    const displayName = conv.isGroup
        ? (conv.name || conv.first_name || 'Group')
        : [conv.first_name, conv.last_name].filter(Boolean).join(' ') || 'Unknown';

    return (
        /* 68×68 outer wrapper owns all hover events — ✕ button is always inside this zone */
        <Box
            position="fixed"
            right="8px"
            bottom={`calc(8px + ${index} * 60px)`}
            width="68px"
            height="68px"
            overflow="visible"
            // Must out-rank every ordinary in-page popover/select/reaction-picker
            // (those use z-index 100000 — see Reactions/styles.scss, Posts/index.js,
            // PostForm/index.js), or a left-open one bleeds through the chat head
            // UI on top of it. Still below true modals/dialogs, which should cover it.
            zIndex={100101 + index}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            userSelect="none"
        >
            {/* ✕ dismiss — top-left of wrapper, always inside hover zone */}
            {hovered && (
                <Flex
                    position="absolute"
                    top="10px"
                    left="12px"
                    width="20px"
                    height="20px"
                    borderRadius="50%"
                    bg="gray.600"
                    color="white"
                    fontSize="11px"
                    fontWeight="700"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    zIndex={2}
                    transition="background 0.1s"
                    onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                    _hover={{ bg: 'red.500' }}
                >
                    ✕
                </Flex>
            )}

            {/* Avatar circle — click to expand into a window */}
            <Box
                className="zc-chathead-bubble__avatar"
                position="absolute"
                bottom="0"
                right="0"
                width="52px"
                height="52px"
                borderRadius="50%"
                cursor="pointer"
                boxShadow="0 2px 8px rgba(0,0,0,0.22)"
                overflow="hidden"
                transition="transform 0.1s ease"
                _hover={{ transform: 'scale(1.05)' }}
                onClick={onToggleWindow}
            >
                <ZenComAvatar
                    // Confirmed live via devtools: without this, ZenComAvatar
                    // falls through every named variant branch to its default
                    // fallback (a Stack wrapping the avatar + an optional
                    // name/time block), not a bare circle. That Stack measured
                    // ~90px tall against this 52px clipping circle, so the
                    // avatar rendered shifted down and clipped at the bottom —
                    // this is what the earlier CSS "top: -20px" symptom
                    // actually was. "simple" is what every other bare-circle
                    // avatar usage in this app already uses (e.g. the chat
                    // window's own header avatar).
                    variant="simple"
                    showHoverCard={false}
                    src={conv.avatar_url}
                    userID={conv.isGroup ? null : conv.id}
                    groupID={conv.isGroup ? conv.id : null}
                    size="lg"
                    // The "lg" token is Chakra's own fixed theme size, not
                    // necessarily this wrapper's 52px — without boxSize the
                    // avatar didn't actually fill the clipping circle, so
                    // whatever sat behind it showed through at the mismatched
                    // edge instead of a clean solid circle.
                    boxSize="52px"
                    userName={displayName}
                />
            </Box>

            {/* Unread badge — top-right of the circle */}
            {conv.unread > 0 && (
                <Flex
                    position="absolute"
                    top="2px"
                    right="2px"
                    width="20px"
                    height="20px"
                    borderRadius="50%"
                    bg="red.500"
                    color="white"
                    fontSize="10px"
                    fontWeight="700"
                    alignItems="center"
                    justifyContent="center"
                    border="2px solid var(--zencom-background)"
                    zIndex={1}
                    pointerEvents="none"
                >
                    {conv.unread > 9 ? '9+' : conv.unread}
                </Flex>
            )}
        </Box>
    );
};

export default ChatHeadBubble;
