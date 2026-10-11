import React from 'react';
import { Box } from '@chakra-ui/react';
import { IoMoon } from 'react-icons/io5';
import { GoSun } from 'react-icons/go';
import useZenTheme from '@Hooks/useZenTheme';

/**
 * Light/dark mode toggle block.
 */
const ThemeToggle = () => {
    const { isDark, toggleTheme } = useZenTheme(window.ZencommunityGlobal?.theme_settings);

    return (
        <Box
            as="button"
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle light/dark mode"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            p="8px"
            cursor="pointer"
            borderRadius="6px"
            color="var(--zencom-font-color)"
        >
            {isDark ? <GoSun size={20} /> : <IoMoon size={20} />}
        </Box>
    );
};

export default ThemeToggle;
