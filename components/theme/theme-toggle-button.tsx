"use client";

import { Moon, SunMedium } from "lucide-react";

import { cn } from "@/lib/utils";
import { useXeivoraTheme } from "@/components/theme/theme-provider";

export function ThemeToggleButton({
  className = "",
  compact = false
}: {
  className?: string;
  compact?: boolean;
}) {
  const { resolvedTheme, toggleTheme } = useXeivoraTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex items-center justify-center rounded-full border transition-colors",
        compact ? "h-10 w-10" : "h-11 w-11",
        "border-[color:var(--site-border-soft)] bg-[color:var(--site-ghost-bg)] text-[color:var(--site-text)] hover:border-[color:var(--site-border)] hover:bg-[color:var(--site-ghost-hover)]",
        className
      )}
      onClick={toggleTheme}
      type="button"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
