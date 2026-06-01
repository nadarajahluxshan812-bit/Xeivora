"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type XeivoraTheme = "dark" | "light";

export const XEIVORA_THEME_STORAGE_KEY = "xeivora-theme";

function resolveBrowserTheme(): XeivoraTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  const saved = window.localStorage.getItem(XEIVORA_THEME_STORAGE_KEY);
  if (saved === "dark" || saved === "light") {
    return saved;
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
  setTheme: (theme: XeivoraTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [resolvedTheme, setResolvedTheme] = useState<XeivoraTheme>("dark");

  useEffect(() => {
    const nextTheme = resolveBrowserTheme();
    setResolvedTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      resolvedTheme,
      setTheme(theme) {
        setResolvedTheme(theme);
        applyTheme(theme);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(XEIVORA_THEME_STORAGE_KEY, theme);
        }
      },
      toggleTheme() {
        const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
        setResolvedTheme(nextTheme);
        applyTheme(nextTheme);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(XEIVORA_THEME_STORAGE_KEY, nextTheme);
        }
      }
    }),
    [resolvedTheme]
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

