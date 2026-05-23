import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Xeivora | Unified AI Intelligence",
  description:
    "Xeivora is a unified AI intelligence workspace for routing prompts across models, tools, agents, memory, and workflows."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
