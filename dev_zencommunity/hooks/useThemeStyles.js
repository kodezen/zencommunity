import { useEffect, useState } from "react";

export default function useThemeStyles() {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem("zencommunitytheme") === "dark";
    });

    useEffect(() => {
        const current = localStorage.getItem("zencommunitytheme") === "dark";
        setIsDark(current);

        const handleStorage = (e) => {
            if (e.key === "zencommunitytheme") {
                setIsDark(e.newValue === "dark");
            }
        };

        const handleCustomEvent = (e) => {
            setIsDark(e.detail === "dark");
        };

        window.addEventListener("storage", handleStorage);
        window.addEventListener("zenthemechange", handleCustomEvent);

        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("zenthemechange", handleCustomEvent);
        };
    }, []);

    const primaryBtn = {
        size: "sm",
        bg: isDark ? "var(--zencom-background)" : "var(--zencom-primary-color)",
        border: "1px solid var(--zencom-border-color)",
        _hover: {
            bg: isDark
                ? "var(--zencom-secondary-color)"
                : "color-mix(in srgb, var(--zencom-primary-color) 90%, transparent)",
        },
        focusRing: "none",
    };

    const primaryBtnInsideContent = {
        size: "sm",
        bg: isDark ? "var(--zencom-secondary-color)" : "var(--zencom-primary-color)",
        color: isDark ? "var(--zencom-font-color)" : "#fff",
        border: "1px solid var(--zencom-border-color)",
        _hover: {
            bg: isDark
                ? "var(--zencom-background)"
                : "color-mix(in srgb, var(--zencom-primary-color) 90%, transparent)",
        },
        focusRing: "none",
    };

    const primaryBtnInsideContentTrans = {
        size: "sm",
        bg: "transparent",
        border: "1px solid var(--zencom-border-color)",
        color: "var(--zencom-font-color)",
        _hover: {
            bg: isDark
                ? "var(--zencom-secondary-color)"
                : "color-mix(in srgb, var(--zencom-primary-color) 90%, transparent)",
            color: isDark ? "var(--zencom-primary-color)" : "#fff",
        },
        focusRing: "none",
    };

    return { isDark, primaryBtn, primaryBtnInsideContent, primaryBtnInsideContentTrans };
}
