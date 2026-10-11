import { API, current_logged_user } from "@Utils/helper";
import { useEffect, useState, useCallback } from "react";

export default function useZenTheme(initialThemeSettings, { autoApply = true } = {}) {
  // autoApply=false: the caller wants brand *colors* applied to :root (e.g.
  // wp-admin mirroring the community's palette) but must never inherit the
  // dark/light *mode* a visitor toggled on the live frontend — that flag
  // lives in localStorage, shared across the whole browser origin including
  // wp-admin, so without this an admin who'd flipped dark mode on the
  // community would find wp-admin dark too. Pin to "light" and never read
  // or listen for the frontend's stored mode in that case.
  const getStoredTheme = () => {
    if (!autoApply) return "light";
    if (typeof window === "undefined") return "light";
    return localStorage.getItem("zencommunitytheme") || "light";
  };

  const [themeMode, setThemeMode] = useState(getStoredTheme);
  const [themeSettings, setThemeSettings] = useState(initialThemeSettings);

  const isDark = themeMode === "dark";
  
  /**  Apply CSS variables to :root */
  const applyTheme = useCallback(
    async (mode = themeMode, settings = themeSettings) => {
      if (!settings) return;

      const root = document.documentElement;
      const activeTheme =
        mode === "dark" ? settings?.dark : settings?.light;

      if (!activeTheme) return;

      root.style.setProperty("--zencom-primary-color", activeTheme.primary_color);
      root.style.setProperty("--zencom-secondary-color", activeTheme.secondary_color);
      root.style.setProperty("--zencom-body-background", activeTheme.content_body_color);
      root.style.setProperty("--zencom-background", activeTheme.content_background_color);
      root.style.setProperty("--zencom-font-color", activeTheme.text_color);
      root.style.setProperty("--zencom-border-color", activeTheme.border_color);

      // Menu items (sidebar nav, ticket views, etc.) tint their active/hover
      // label & icon with this — reusing --zencom-primary-color there reads
      // fine in light mode (dark text page, bold blue highlight) but is
      // near-illegible in dark mode (saturated blue on a near-black bg looks
      // blurry from poor contrast), so dark mode highlights with the page's
      // own text color instead.
      root.style.setProperty(
        "--zencom-menu-active-color",
        mode === "dark" ? activeTheme.text_color : activeTheme.primary_color
      );

      root.style.setProperty(
        "--zencom-shadow",
        mode === "dark"
          ? "0px 0px 1px rgba(255, 255, 255, 0.10), 0px 2px 4px rgba(0, 0, 0, 0.55)"
          : "0px 0px 1px 0px rgba(20, 26, 36, 0.30), 0px 2px 4px 0px rgba(20, 26, 36, 0.10)"
      );
    },
    [themeMode, themeSettings]
  );

  /**
   * Re-apply theme whenever:
   * - theme mode changes
   * - theme settings change
   */
  useEffect(() => {
    applyTheme(themeMode, themeSettings);
  }, [themeMode, themeSettings, applyTheme]);

  /** Sync theme across browser tabs — skipped entirely when autoApply is off */
  useEffect(() => {
    if (!autoApply) return;
    const handleStorage = (e) => {
      if (e.key === "zencommunitytheme") {
        const newMode = e.newValue || "light";
        setThemeMode(newMode);
      }
    };

    // Same-tab sync: toggleTheme dispatches `zenthemechange`, so every
    // useZenTheme instance (FSE runtime, ThemeToggle block, SPA ThemeApplier)
    // stays in sync instead of re-asserting a stale mode on the next render.
    const handleThemeChange = (e) => {
      const newMode = e?.detail || localStorage.getItem("zencommunitytheme") || "light";
      setThemeMode(newMode);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("zenthemechange", handleThemeChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("zenthemechange", handleThemeChange);
    };
  }, []);

  /** Toggle theme */
  const toggleTheme = async () => {
      const newMode = themeMode === "dark" ? "light" : "dark";

      localStorage.setItem("zencommunitytheme", newMode);
      setThemeMode(newMode);

      // ADD THIS — notifies useThemeStyles on the same tab
      window.dispatchEvent(new CustomEvent("zenthemechange", { detail: newMode }));

      if (!current_logged_user) return;
      try {
        await API.post(`/zencommunity/v1/theme/${newMode}`);
        if (window?.ZencommunityGlobal?.theme_settings) {
          window.ZencommunityGlobal.theme_settings.theme_mode = newMode;
        }
      } catch (err) {
        console.error("Theme update failed:", err);
      }
  };

  /** Manually set theme mode */
  const setTheme = (mode) => {
    localStorage.setItem("zencommunitytheme", mode);
    setThemeMode(mode);
  };

  /** Manually update theme settings */
  const updateThemeSettings = async (newSettings) => {
    setThemeSettings({...themeSettings, ...newSettings});
    await applyTheme(themeMode, {...themeSettings, ...newSettings});
    window.ZencommunityGlobal.theme_settings = {...themeSettings, ...newSettings};
  };

  return {
    themeMode,
    isDark,
    toggleTheme,
    setTheme,
    applyTheme,
    updateThemeSettings,
  };
}
