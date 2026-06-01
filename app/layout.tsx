import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeScript } from "@/components/theme/theme-script";

import "./globals.css";

export const metadata: Metadata = {
  title: "Xeivora | Unified AI Intelligence",
  description:
    "Xeivora is a unified AI intelligence workspace for routing prompts across models, tools, agents, memory, and workflows.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/xeivora-icon.svg", type: "image/svg+xml" }
    ],
    shortcut: ["/icon.svg"],
    apple: ["/apple-icon.svg"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html data-theme="dark" lang="en" suppressHydrationWarning>
      <body>
        <ThemeScript />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
