import { useEffect, useState } from "react";

export function useStyles() {
    const [isDark, setIsDark] = useState(() => {
        if (typeof window === "undefined") return false;
        return localStorage.getItem("zencommunitytheme") === "dark";
    });

    useEffect(() => {
        const handleCustomEvent = (e) => setIsDark(e.detail === "dark");
        const handleStorage = (e) => {
            if (e.key === "zencommunitytheme") setIsDark(e.newValue === "dark");
        };

        window.addEventListener("zenthemechange", handleCustomEvent);
        window.addEventListener("storage", handleStorage);
        return () => {
            window.removeEventListener("zenthemechange", handleCustomEvent);
            window.removeEventListener("storage", handleStorage);
        };
    }, []);

    return {
        isDark,
        // --- theme styles ---
        primaryBtn: {
            size: "sm",
            bg: isDark ? "var(--zencom-background)" : "var(--zencom-primary-color)",
            // A filled button draws its own edge. Bordering it in the shared
            // grey put a lighter ring around the fill — visible on "Add New
            // Ticket" and "Reset Filters" — so the border follows the
            // background instead of contradicting it. Kept rather than
            // dropped: it holds the button the same size as the outline
            // variants beside it.
            border: isDark ? "1px solid var(--zencom-background)" : "1px solid var(--zencom-primary-color)",
            _hover: {
                bg: isDark ? "var(--zencom-secondary-color)" : "color-mix(in srgb, var(--zencom-primary-color) 90%, transparent)",
                border: "1px solid transparent",
            },
            focusRing: "none",
        },
        primaryBtnInsideContent: {
            size: "sm",
            bg: isDark ? "var(--zencom-secondary-color)" : "var(--zencom-primary-color)",
            color: isDark ? "var(--zencom-font-color)" : "#fff",
            // border: isDark ? "1px solid var(--zencom-secondary-color)" : "1px solid var(--zencom-border-color)",
            _hover: {
                bg: isDark ? "var(--zencom-background)" : "color-mix(in srgb, var(--zencom-primary-color) 90%, transparent)",
            },
            focusRing: "none",
        },
        primaryBtnInsideContentTrans: {
            size: "sm",
            bg: "transparent",
            border: isDark ? "1px solid var(--zencom-secondary-color)" : "1px solid var(--zencom-border-color)",
            color: "var(--zencom-font-color)",
            _hover: {
                bg: isDark ? "var(--zencom-secondary-color)" : "color-mix(in srgb, var(--zencom-primary-color) 90%, transparent)",
                color: isDark ? "var(--zencom-font-color)" : "#fff",
                border: "1px solid transparent",
            },
            focusRing: "none",
        },
        // Borderless icon button for inline actions (comment like / reply).
        iconBtnInsideContent: {
            size: "xs",
            variant: "ghost",
            minWidth: "32px",
            height: "32px",
            paddingInline: "6px",
            gap: "4px",
            bg: "transparent",
            border: "none",
            color: "var(--zencom-font-color)",
            _hover: { bg: "var(--zencom-secondary-color)" },
            focusRing: "none",
        },
        commonInput: {
            color: "var(--zencom-font-color) !important",
            borderColor: "var(--zencom-border-color)",
            outline: "var(--zencom-border-color)",
            _active: { borderColor: "var(--zencom-border-color)" },
            focusRing: "var(--zencom-border-color)",
            _placeholder: {
                color: isDark ? "color-mix(in srgb, var(--zencom-font-color) 60%, transparent) !important" : "color-mix(in srgb, var(--zencom-font-color) 60%, transparent) !important"
            }
        },
        subTextColor: {
            color: isDark ? "color-mix(in srgb, var(--zencom-font-color) 70%, transparent) !important" : "color-mix(in srgb, var(--zencom-font-color) 60%, transparent) !important"
        },

        // --- static styles ---
        settingsContent: {
            flexDirection: "column",
            w: { base: "100%", sm: "100%", md: "100%", xl: "900px" },
            mx: "auto",
            padding: { base: "12px", sm: "12px", md: "10px" },
            marginBottom: "100px",
        },
        settingsInner: {
            bg: "var(--zencom-background)", p: 6, border: "1px solid var(--zencom-border-color)", borderRadius: "4px"
        },
        commonBtn: {
            bg: "var(--zencom-primary-color)",
            color: "var(--zencom-font-color)",
            borderRadius: "full",
            boxSize: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s ease",
            _hover: { bg: "var(--zencom-secondary-color)" },
        },
        clearPrimaryBtn: {
            size: "sm", bg: "transparent", color: "var(--zencom-primary-color)", padding: "0", minW: "auto", height: "auto"
        },
        clearBtn: {
            size: "sm", bg: "transparent", color: "var(--zencom-primary-color)", _hover: { color: "var(--zencom-primary-color)" }
        },
        secondaryBtn: {
            size: "sm", bg: "transparent", color: "var(--zencom-font-color)"
        },
        xCloseBtn: {
            size: "xs",
            color: "var(--zencom-font-color)",
            bg: "transparent",
            border: "1px solid var(--zencom-border-color)",
            _hover: { bg: "var(--zencom-body-background)" },
            focusRing: "none",
        },
        responsiveContent: {
            minW: "0",
            maxW: { base: "100%", md: "100%", lg: "680px", xl: "700px" },
            width: "100%",
            padding: { base: "16px", md: "24px", },
            margin: "0 0 56px 0"
        },
        responsiveContent5: {
            minW: "100%",
            maxW: "100%",
            margin: "40px 0 56px 0"
        },
        responsiveContentTicket: {
            minW: { base: "100%", md: "100%", lg: "calc(100% - 382px)", xl: "calc(100% - 764px)", "2xl": "720px" },
            maxW: { base: "100%", md: "100%", lg: "calc(100% - 382px)", xl: "calc(100% - 764px)", "2xl": "720px" },
        },
        ticketReply: {
            minW: { base: "100%", md: "100%", lg: "calc(100% - 420px)", xl: "calc(100% - 804px)", "2xl": "720px" },
            maxW: { base: "100%", md: "100%", lg: "calc(100% - 420px)", xl: "calc(100% - 804px)", "2xl": "720px" },
        },
        responsiveContent1: {
            minW: { base: "100%", md: "100%", lg: "680px", xl: "880px", "2xl": "1020px" },
            maxW: { base: "100%", md: "100%", lg: "680px", xl: "880px", "2xl": "1020px" },
            ml: { lg: "24%", xl: "24%", "2xl": "15%" },
            padding: { base: "2", lg: "0" }
        },
        responsiveContent2p: {
            maxW: { base: "100%", sm: "100%", md: "100%", lg: "700px", "2xl": "1020px" },
            minW: { base: "100%", sm: "100%", md: "100%", lg: "700px", "2xl": "1020px" },
            ml: { xl: "24%", "2xl": "15%" }
        },
        responsiveContent2: {
            maxW: { base: "100%", sm: "100%", md: "100%", lg: "800px", xl: "880px", "2xl": "1020px" },
            minW: { base: "100%", sm: "100%", md: "100%", lg: "800px", xl: "880px", "2xl": "1020px" },
            ml: { xl: "24%", "2xl": "15%" }
        },
        responsiveContent4: {
            maxW: { base: "100%", sm: "100%", md: "100%", lg: "730px", xl: "880px", "2xl": "1020px" },
            minW: { base: "100%", sm: "100%", md: "100%", lg: "730px", xl: "880px", "2xl": "1020px" },
            ml: { lg: "24%", xl: "18%", "2xl": "15%" },
            padding: { base: "16px", md: "24px", },
        },
        responsiveContent3: {
            padding: { base: "16px", md: "24px", },
            maxW: { base: "100%", sm: "100%", md: "100%", lg: "calc(100% - 100px)", "2xl": "1020px" },
            minW: { base: "100%", sm: "100%", md: "100%", lg: "calc(100% - 100px)", "2xl": "1020px" },
            margin: "0 0 56px 0"
            // margin: { base: "16px 0 56px 0", md: "24px 0 56px 0", }
            // ml: { xl: "24%", "2xl": "15%" }
        },
        paddingScreen: { pl: { lg: "10%", xl: "0" } },
        ticketResponsive: {
            maxW: { base: "calc(100% - 104px)", sm: "calc(100% - 104px)", md: "calc(100% - 104px)", lg: "calc(608px - 104px)", xl: "calc(650px - 104px)", "2xl": "720px" },
            minW: { base: "calc(100% - 104px)", sm: "calc(100% - 104px)", md: "calc(100% - 104px)", lg: "calc(696px - 104px)", xl: "calc(650px - 104px)", "2xl": "720px" }
        },
    };
}
