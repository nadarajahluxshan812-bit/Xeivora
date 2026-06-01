"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type XeivoraTheme = "dark" | "light";
export type XeivoraThemePreference = XeivoraTheme | "system";

export const XEIVORA_THEME_STORAGE_KEY = "xeivora-theme";

function resolveBrowserThemePreference(): XeivoraThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const saved = window.localStorage.getItem(XEIVORA_THEME_STORAGE_KEY);
  if (saved === "dark" || saved === "light" || saved === "system") {
    return saved;
  }

  return "system";
}

function resolveThemeFromPreference(preference: XeivoraThemePreference): XeivoraTheme {
  if (preference === "dark" || preference === "light") {
    return preference;
  }

  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: XeivoraTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

type ThemeContextValue = {
  resolvedTheme: XeivoraTheme;
  themePreference: XeivoraThemePreference;
  setTheme: (theme: XeivoraThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [resolvedTheme, setResolvedTheme] = useState<XeivoraTheme>("dark");
  const [themePreference, setThemePreference] = useState<XeivoraThemePreference>("system");

  useEffect(() => {
    const nextPreference = resolveBrowserThemePreference();
    const nextTheme = resolveThemeFromPreference(nextPreference);
    setThemePreference(nextPreference);
    setResolvedTheme(nextTheme);
    applyTheme(nextTheme);

    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = () => {
      const currentPreference = window.localStorage.getItem(XEIVORA_THEME_STORAGE_KEY);
      if (currentPreference === "system" || !currentPreference) {
        const systemTheme = media.matches ? "light" : "dark";
        setResolvedTheme(systemTheme);
        applyTheme(systemTheme);
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      resolvedTheme,
      themePreference,
      setTheme(theme) {
        setThemePreference(theme);
        const nextResolvedTheme = resolveThemeFromPreference(theme);
        setResolvedTheme(nextResolvedTheme);
        applyTheme(nextResolvedTheme);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(XEIVORA_THEME_STORAGE_KEY, theme);
        }
      },
      toggleTheme() {
        const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
        setThemePreference(nextTheme);
        setResolvedTheme(nextTheme);
        applyTheme(nextTheme);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(XEIVORA_THEME_STORAGE_KEY, nextTheme);
        }
      }
    }),
    [resolvedTheme, themePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useXeivoraTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useXeivoraTheme must be used within ThemeProvider.");
  }

  return context;
}
