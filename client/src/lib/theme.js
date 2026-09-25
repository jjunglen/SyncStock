import { useEffect, useState } from "react";

// Light/dark mode for the customer dashboard. Saved per browser;
// defaults to the device setting. Marketing and merchant pages stay dark.
const KEY = "syncstock_theme";

export function getSavedTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Storage blocked — fall through to the device setting
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState(getSavedTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // Not saved — still applies for this visit
    }
  }, [theme]);

  // Leaving the dashboard (e.g. to the marketing site) goes back to dark
  useEffect(() => () => delete document.documentElement.dataset.theme, []);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  return { theme, toggleTheme };
}
